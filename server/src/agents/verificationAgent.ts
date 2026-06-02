import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import { geminiTools } from '../tools/geminiSchemas'
import { executeTool } from '../tools/executor'

const genAI    = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/*
  runVerificationAgent — the core agentic loop, powered by Gemini 1.5 Flash.

  Key difference from Anthropic: Gemini doesn't accept image URLs directly.
  We fetch the photo from Supabase Storage and pass it as base64 inlineData.

  Loop logic:
  - Send initial message (image + task context)
  - Check response.functionCalls() — if non-empty, Claude wants tools
  - Execute each tool, send results back as functionResponse parts
  - Repeat until functionCalls() is empty (model finished reasoning)
*/
export async function runVerificationAgent(
  submissionId: string,
  storagePath:  string
): Promise<void> {

  // ── 1. Load context from DB ───────────────────────────────────────────────
  const { data: submission } = await supabase
    .from('submissions')
    .select('id, task_instance_id, photo_url, submitted_at')
    .eq('id', submissionId)
    .single()

  if (!submission) throw new Error(`Submission ${submissionId} not found`)

  const { data: instance } = await supabase
    .from('task_instances')
    .select('id, parent_id, due_at, tasks ( title, type )')
    .eq('id', submission.task_instance_id)
    .single()

  if (!instance) throw new Error(`Task instance for submission ${submissionId} not found`)

  const task = instance.tasks as unknown as { title: string; type: string }

  // ── 2. Fetch photo as base64 ──────────────────────────────────────────────
  // Gemini requires inline image data — it can't fetch a Supabase signed URL directly.
  const { data: signed } = await supabase
    .storage
    .from('photos')
    .createSignedUrl(storagePath, 60 * 10)

  if (!signed?.signedUrl) throw new Error('Could not generate signed URL for photo')

  const imageRes    = await fetch(signed.signedUrl)
  const imageBuffer = await imageRes.arrayBuffer()
  const imageBase64 = Buffer.from(imageBuffer).toString('base64')

  // ── 3. Set up Gemini model ────────────────────────────────────────────────
  const systemPrompt = `You are Saathi, an AI health verification agent for ParentCare.

Your job is to verify that a parent has completed their assigned health task by analysing their submitted photo, then record a result and notify the kid.

## Your verification process
1. Call get_parent_history(parent_id, days=7) to understand recent compliance before judging.
2. Call get_health_profile(parent_id) if the task type is medicine, diet, or exercise.
3. Analyse the photo carefully against the task type and title.
4. Make a decision: passed / failed / flagged.
   - passed: photo clearly shows the task was done
   - failed: photo shows the task was NOT done, or is clearly unrelated
   - flagged: task appears done but there is a health concern worth noting
5. ALWAYS call update_task_result as your final action.
6. Call send_kid_alert to notify the kid of the result.
7. If severity warrants it, call flag_health_concern.

## Tone
- Be compassionate. These are elderly parents. Err on the side of passing when in doubt.
- Be specific in your reasoning — the kid reads this.
- Never be harsh or accusatory.

## Rules
- Do not fabricate details about the photo that you cannot see.
- update_task_result MUST be called before you finish.`

  const model = genAI.getGenerativeModel({
    model:             'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    tools:             [{ functionDeclarations: geminiTools }],
  })

  // ── 4. Tool-use loop ──────────────────────────────────────────────────────
  const chat = model.startChat()

  // Initial message: photo (base64) + task context text
  let response = await chat.sendMessage([
    {
      inlineData: { data: imageBase64, mimeType: 'image/jpeg' },
    },
    {
      text: `Please verify this submission.

Task: "${task.title}" (type: ${task.type})
Parent ID: ${instance.parent_id}
Task instance ID: ${instance.id}
Submission ID: ${submission.id}
Due at: ${instance.due_at}
Submitted at: ${submission.submitted_at}

Start by checking recent history, then analyse the photo, then record the result.`,
    },
  ])

  const toolsCalledThisRun: string[] = []
  let resultRecorded = false

  while (true) {
    const calls = response.response.functionCalls()

    // No function calls → model finished reasoning
    if (!calls || calls.length === 0) break

    const functionResponses = await Promise.all(
      calls.map(async (call) => {
        toolsCalledThisRun.push(call.name)
        if (call.name === 'update_task_result') resultRecorded = true

        let result: unknown
        try {
          result = await executeTool(call.name, call.args as Record<string, unknown>)
        } catch (err) {
          result = { error: (err as Error).message }
        }

        return {
          functionResponse: {
            name:     call.name,
            response: { result },
          },
        }
      })
    )

    response = await chat.sendMessage(functionResponses)
  }

  // ── 5. Safety net ─────────────────────────────────────────────────────────
  if (!resultRecorded) {
    console.error(`[agent] update_task_result never called for submission ${submissionId}`)
    await supabase
      .from('task_instances')
      .update({ status: 'flagged', updated_at: new Date().toISOString() })
      .eq('id', instance.id)
  }

  // ── 6. Audit log ──────────────────────────────────────────────────────────
  await supabase
    .from('agent_decisions')
    .insert({
      loop_type:    'verification',
      parent_id:    instance.parent_id,
      tools_called: toolsCalledThisRun,
      reasoning:    response.response.text(),
    })

  console.log(`[agent] done — submission ${submissionId} — tools: ${toolsCalledThisRun.join(', ')}`)
}
