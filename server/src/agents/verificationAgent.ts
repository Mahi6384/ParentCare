import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { tools } from '../tools/schemas'
import { executeTool } from '../tools/executor'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/*
  runVerificationAgent — the core agentic loop.

  Flow:
  1. Fetch submission + task_instance from Supabase to get context
  2. Generate a signed URL for the photo
  3. Send initial message to Claude with the photo + task context
  4. Claude iterates: calls tools → we execute → return results → Claude calls more tools
  5. Loop exits when stop_reason === 'end_turn'
  6. Claude must have called update_task_result before ending — if not, we flag and log

  Model choice:
  - claude-sonnet-4-6 for the main loop (needs vision for photo verification)
  - Switch to claude-haiku-4-5 for text-only loops in Phase 2 to save cost
*/
export async function runVerificationAgent(
  submissionId: string,
  storagePath:  string
): Promise<void> {

  // ── 1. Load context from DB ─────────────────────────────────────────────
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

  // ── 2. Generate signed URL for the photo ───────────────────────────────
  const { data: signed } = await supabase
    .storage
    .from('photos')
    .createSignedUrl(storagePath, 60 * 10) // 10-minute expiry — enough for one agent run

  if (!signed?.signedUrl) throw new Error('Could not generate signed URL for photo')

  // ── 3. Build initial message ────────────────────────────────────────────
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

  const initialContent: Anthropic.MessageParam['content'] = [
    {
      type: 'image',
      source: { type: 'url', url: signed.signedUrl },
    },
    {
      type: 'text',
      text: `Please verify this submission.

Task: "${task.title}" (type: ${task.type})
Parent ID: ${instance.parent_id}
Task instance ID: ${instance.id}
Submission ID: ${submission.id}
Due at: ${instance.due_at}
Submitted at: ${submission.submitted_at}

Start by checking recent history, then analyse the photo, then record the result.`,
    },
  ]

  // ── 4. Tool-use loop ────────────────────────────────────────────────────
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: initialContent },
  ]

  const toolsCalledThisRun: string[] = []
  let resultRecorded = false

  while (true) {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      system:     systemPrompt,
      tools,
      messages,
    })

    // Track tool calls for the audit log
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        toolsCalledThisRun.push(block.name)
        if (block.name === 'update_task_result') resultRecorded = true
      }
    }

    // Exit when Claude is done
    if (response.stop_reason === 'end_turn') break

    // Execute all tool calls Claude made in this turn
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue

      let toolOutput: unknown
      try {
        toolOutput = await executeTool(block.name, block.input as Record<string, unknown>)
      } catch (err) {
        toolOutput = { error: (err as Error).message }
      }

      toolResults.push({
        type:        'tool_result',
        tool_use_id: block.id,
        content:     JSON.stringify(toolOutput),
      })
    }

    // Push assistant turn + tool results back into the conversation
    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user',      content: toolResults })
  }

  // ── 5. Safety net: if agent forgot to record the result ─────────────────
  if (!resultRecorded) {
    console.error(`[agent] update_task_result was never called for submission ${submissionId}`)
    await supabase
      .from('task_instances')
      .update({ status: 'flagged', updated_at: new Date().toISOString() })
      .eq('id', instance.id)
  }

  // ── 6. Audit log ────────────────────────────────────────────────────────
  await supabase
    .from('agent_decisions')
    .insert({
      loop_type:    'verification',
      parent_id:    instance.parent_id,
      tools_called: toolsCalledThisRun,
      reasoning:    messages.at(-1)?.content ?? null,
    })

  console.log(`[agent] verification complete for submission ${submissionId} — tools: ${toolsCalledThisRun.join(', ')}`)
}
