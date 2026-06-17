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
  runNudgeAgent — Loop 3: Proactive Nudge Agent.

  Triggered every morning via Vercel cron → Next.js API route → this server.
  The cron route loops over all active families and calls this once per parent.

  The agent reads context, reasons over what the most important action is,
  and picks ONE of:
    - trigger_fullscreen_alert  (task due today, parent hasn't started)
    - send_whatsapp_text        (gentle / firm / urgent reminder)
    - send_kid_alert            (parent not active in 2+ days — kid must know)
    - flag_health_concern       (pattern is alarming)
    - suggest_task              (agent spotted a gap — drafts for kid to approve)
    - schedule_followup         (check back in N hours)
    - add_agent_note + do nothing (parent is on track)

  No hardcoded rules — the agent decides tone, channel, and timing every time.
*/
export async function runNudgeAgent(parentId: string): Promise<void> {

  // ── 1. Load today's pending task instances ─────────────────────────────────
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1)

  const { data: todayInstances } = await supabase
    .from('task_instances')
    .select('id, status, due_at, tasks ( title, type )')
    .eq('parent_id', parentId)
    .gte('due_at', todayStart.toISOString())
    .lt('due_at', tomorrowStart.toISOString())
    .order('due_at', { ascending: true })

  const pendingCount   = (todayInstances ?? []).filter(i => i.status === 'pending').length
  const completedCount = (todayInstances ?? []).filter(i =>
    ['passed', 'submitted', 'flagged'].includes(i.status)
  ).length
  const totalToday = (todayInstances ?? []).length

  // ── 2. Set up Gemini model ──────────────────────────────────────────────────
  const systemPrompt = `You are Saathi, a proactive AI health companion for ParentCare.

Every morning you check on each parent and decide the single most important action to take.

## Your process
1. Call get_family_context(parent_id) to get the kid's name and family details.
2. Call get_missed_tasks(parent_id, days=2) to see what was missed recently.
3. Call get_parent_history(parent_id, days=7) to understand the weekly trend.
4. Reason: what is the most important thing to do right now?
5. Take EXACTLY ONE of these actions:
   - trigger_fullscreen_alert — if a high-priority task is due today and parent hasn't started
   - send_whatsapp_text — gentle/firm/urgent reminder based on the pattern
   - send_kid_alert — if parent has been inactive for 2+ days (kid must be told)
   - flag_health_concern — if a health pattern is alarming (e.g. medicine missed 3+ days)
   - suggest_task — if you observe a gap that should be addressed
   - schedule_followup + add_agent_note — if parent is on track (check back later)

## Decision rules
- If today has pending tasks AND it's past 9 AM: use trigger_fullscreen_alert for the most important one.
- If medicine was missed yesterday: urgency = "urgent", mention the kid's name.
- If parent has a 7-day streak: acknowledge it, use gentle tone.
- If parent has been inactive 2+ days: alert the kid too.
- Do NOT send multiple reminders in one run. Pick ONE action.
- Always write messages in Hinglish unless the family preference is English.
- Be warm and encouraging. These are elderly parents — never be harsh.

## Context for this run
Parent ID: ${parentId}
Today's tasks: ${totalToday} total, ${pendingCount} pending, ${completedCount} done`

  const model = genAI.getGenerativeModel({
    model:             'gemini-2.0-flash',
    systemInstruction: systemPrompt,
    tools:             [{ functionDeclarations: geminiTools }],
  })

  // ── 3. Tool-use loop ────────────────────────────────────────────────────────
  const chat = model.startChat()

  let response: Awaited<ReturnType<typeof chat.sendMessage>> | undefined
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await chat.sendMessage(
        `Good morning! Please check on parent ${parentId} and decide what action to take today.
Start with get_family_context, then get_missed_tasks, then get_parent_history, then act.`
      )
      break
    } catch (err: unknown) {
      const msg = (err as Error).message ?? ''
      if (attempt < 3 && (msg.includes('503') || msg.includes('429'))) {
        console.log(`[nudge-agent] ${msg.slice(0, 30)} on attempt ${attempt}, retrying in 6s...`)
        await new Promise(r => setTimeout(r, 6000))
        continue
      }
      throw err
    }
  }

  if (!response) throw new Error('No response from Gemini after 3 attempts')

  const toolsCalledThisRun: string[] = []

  while (true) {
    const calls = response.response.functionCalls()
    if (!calls || calls.length === 0) break

    const functionResponses = await Promise.all(
      calls.map(async (call) => {
        toolsCalledThisRun.push(call.name)

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

  // ── 4. Audit log ────────────────────────────────────────────────────────────
  await supabase
    .from('agent_decisions')
    .insert({
      loop_type:    'nudge',
      parent_id:    parentId,
      tools_called: toolsCalledThisRun,
      reasoning:    response.response.text(),
    })

  console.log(`[nudge-agent] done — parent ${parentId} — tools: ${toolsCalledThisRun.join(', ')}`)
}

// ── Run over all active families ─────────────────────────────────────────────
// Called by the cron API route — loops once per family and fires the agent.
export async function runNudgeAgentForAllFamilies(): Promise<void> {
  const { data: families, error } = await supabase
    .from('families')
    .select('parent_id')
    .not('parent_id', 'is', null)

  if (error) throw new Error(`Failed to load families: ${error.message}`)

  console.log(`[nudge-agent] running for ${families?.length ?? 0} families`)

  await Promise.allSettled(
    (families ?? []).map(f =>
      runNudgeAgent(f.parent_id).catch(err =>
        console.error(`[nudge-agent] error for parent ${f.parent_id}:`, err.message)
      )
    )
  )
}
