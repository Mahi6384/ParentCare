import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '../lib/push'

/*
  reminderSweep — fires the "your task is due" push around each task's due_at.

  Runs on a fixed interval from the long-lived worker (see index.ts). Each run:
    1. find pending instances due "around now" that haven't been reminded
    2. push a deep link to that instance's full-screen alert
    3. stamp reminder_sent_at so the next run skips it

  Why a polling sweep instead of a per-task timer? Timing precision here is
  human-scale (±a few minutes is invisible to someone taking medicine), and a
  sweep is self-healing: a missed run is simply caught by the next one, with
  reminder_sent_at guaranteeing we never double-send.
*/

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const LEAD_MINUTES = 5      // ping up to 5 min BEFORE due_at
const LOOKBACK_MINUTES = 60 // ...but never resurrect a reminder older than this

export async function runReminderSweep(): Promise<{ checked: number; sent: number }> {
  const now = Date.now()
  const windowStart = new Date(now - LOOKBACK_MINUTES * 60_000).toISOString()
  const windowEnd = new Date(now + LEAD_MINUTES * 60_000).toISOString()

  const { data: due, error } = await supabase
    .from('task_instances')
    .select('id, parent_id, due_at, tasks ( title )')
    .eq('status', 'pending')
    .is('reminder_sent_at', null)
    .gte('due_at', windowStart)
    .lte('due_at', windowEnd)

  if (error) {
    console.error('[reminder-sweep] query failed:', error.message)
    return { checked: 0, sent: 0 }
  }

  let sent = 0
  for (const inst of due ?? []) {
    const task = inst.tasks as unknown as { title: string } | null
    const title = task?.title ?? 'a task'

    const res = await sendPushToUser(inst.parent_id, {
      title: 'ParentCare reminder',
      body: `Time for: ${title}`,
      url: `/parent/alert/${inst.id}`, // tapping opens the full-screen alert for this instance
    })

    // Stamp only when we actually delivered. If the parent has no device yet,
    // leave it unstamped so they're caught once they install (within the window).
    if (res.ok) {
      await supabase
        .from('task_instances')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', inst.id)
      sent++
    }
  }

  console.log(`[reminder-sweep] checked ${due?.length ?? 0}, sent ${sent}`)
  return { checked: due?.length ?? 0, sent }
}
