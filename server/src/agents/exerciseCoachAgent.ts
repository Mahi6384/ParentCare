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
  runExerciseCoachAgent — Loop 2.

  Triggered when a parent opens an exercise task.
  Reads their health profile, generates a safe personalised routine,
  and saves it via the generate_exercise_routine tool.

  The coach UI polls exercise_routines by task_instance_id.
  Once this agent writes the row, the UI replaces MOCK_STEPS with real steps.
*/
export async function runExerciseCoachAgent(
  taskInstanceId: string
): Promise<void> {

  // ── 1. Load task instance context ────────────────────────────────────────────
  const { data: instance } = await supabase
    .from('task_instances')
    .select('id, parent_id, tasks ( title, type )')
    .eq('id', taskInstanceId)
    .single()

  if (!instance) throw new Error(`Task instance ${taskInstanceId} not found`)

  const task = instance.tasks as unknown as { title: string; type: string }
  console.log(`[coach-agent] loaded — task: "${task.title}" parent: ${instance.parent_id}`)

  // ── 2. Set up Gemini model ────────────────────────────────────────────────────
  const systemPrompt = `You are Saathi, an AI exercise coach for ParentCare.

Your job is to generate a safe, personalised exercise routine for an elderly parent based on their health profile.

## Your process
1. Call get_health_profile(parent_id) to read their age, conditions, restrictions, fitness level, and equipment.
2. Call get_parent_history(parent_id, days=7) to check recent exercise compliance.
3. Design a routine with 3 sections: Warm-up (2–3 steps), Main Set (4–6 steps), Cool-down (2–3 steps).
4. Call generate_exercise_routine with the full steps array to save the routine.

## Routine rules
- Total duration should match preferred_duration from health profile (default 20 min).
- Every step must have a 'modification' if the parent has any conditions or restrictions.
- Use reps for strength exercises, duration_sec for holds/stretches.
- Add rest_sec (15–30s) after harder steps.
- Never suggest high-impact moves (no jumping, no running) unless fitness_level is 'active'.
- Prefer exercises doable with no equipment unless equipment is listed.

## Step format
Each step needs: section, name, reps OR duration_sec, rest_sec (optional), modification (if needed).

## Tone
Steps should be safe for someone's parent — conservative, encouraging, joint-friendly.`

  const model = genAI.getGenerativeModel({
    model:             'gemini-2.5-flash',
    systemInstruction: systemPrompt,
    tools:             [{ functionDeclarations: geminiTools }],
  })

  // ── 3. Tool-use loop ──────────────────────────────────────────────────────────
  const chat = model.startChat()

  let response: Awaited<ReturnType<typeof chat.sendMessage>> | undefined
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[coach-agent] attempt ${attempt}: sending message to Gemini...`)
      response = await chat.sendMessage(
        `Generate an exercise routine for this session.

Task: "${task.title}"
Parent ID: ${instance.parent_id}
Task Instance ID: ${instance.id}

Start by reading the health profile, then generate and save the routine.`
      )
      console.log('[coach-agent] Gemini responded — checking for tool calls...')
      break
    } catch (err: unknown) {
      const msg = (err as Error).message ?? ''
      if (attempt < 3 && msg.includes('503')) {
        console.log(`[coach-agent] 503 on attempt ${attempt}, retrying in 6s...`)
        await new Promise(r => setTimeout(r, 6000))
        continue
      }
      throw err
    }
  }

  if (!response) throw new Error('No response from Gemini after 3 attempts')

  const toolsCalledThisRun: string[] = []
  let routineGenerated = false

  while (true) {
    const calls = response.response.functionCalls()
    if (!calls || calls.length === 0) break

    const functionResponses = await Promise.all(
      calls.map(async (call) => {
        toolsCalledThisRun.push(call.name)
        if (call.name === 'generate_exercise_routine') routineGenerated = true

        console.log(`[coach-agent] → tool: ${call.name} args: ${JSON.stringify(call.args).slice(0, 200)}`)

        let result: unknown
        try {
          result = await executeTool(call.name, call.args as Record<string, unknown>)
        } catch (err) {
          result = { error: (err as Error).message }
        }

        console.log(`[coach-agent] ← result: ${JSON.stringify(result).slice(0, 200)}`)

        return {
          functionResponse: {
            name:     call.name,
            response: { result },
          },
        }
      })
    )

    console.log('[coach-agent] tool results sent — waiting for next Gemini response...')
    response = await chat.sendMessage(functionResponses)
  }

  if (!routineGenerated) {
    console.error(`[coach-agent] generate_exercise_routine never called for instance ${taskInstanceId}`)
  }

  console.log(`[coach-agent] done — instance ${taskInstanceId} — tools: ${toolsCalledThisRun.join(', ')}`)
}
