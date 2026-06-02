import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/*
  GET /api/cron/create-instances

  Runs every day at midnight IST via Vercel Cron (see vercel.json).
  For every active task, checks whether a task_instance already exists
  for today. If not, creates one.

  Why a separate cron instead of creating instances on demand?
  - Parents open the app at 7 AM and expect to see today's tasks already
    listed. On-demand creation would mean the list is empty until the first
    page load triggers a check — bad UX.
  - A cron that runs at midnight IST ensures instances exist before anyone
    wakes up.

  Security: Vercel sends Authorization: Bearer <CRON_SECRET> with every
  cron invocation. We verify this header to prevent anyone from triggering
  the cron manually.
*/

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // UTC+5:30

function todayInIST(): string {
  // Returns today's date as 'YYYY-MM-DD' in IST
  const now    = new Date()
  const istNow = new Date(now.getTime() + IST_OFFSET_MS)
  return istNow.toISOString().slice(0, 10)
}

function dueDateTimeInIST(dateStr: string, scheduleTime: string | null): string {
  // Combines today's date with the task's schedule_time (or 08:00 default)
  // and returns a UTC timestamptz string.
  const time     = scheduleTime ?? '08:00:00'
  const istStr   = `${dateStr}T${time}+05:30`
  return new Date(istStr).toISOString()
}

export async function GET(req: NextRequest) {
  // ── Auth check ───────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin  = createServiceClient()
  const today  = todayInIST()
  let created  = 0
  let skipped  = 0

  // ── Fetch all active daily tasks with their family ────────────────
  const { data: tasks, error: tasksErr } = await admin
    .from('tasks')
    .select(`
      id,
      schedule_time,
      recurrence,
      families ( parent_id )
    `)
    .eq('is_active', true)
    .eq('recurrence', 'daily')

  if (tasksErr) {
    console.error('[cron] tasks fetch failed:', tasksErr.message)
    return NextResponse.json({ error: tasksErr.message }, { status: 500 })
  }

  for (const task of tasks ?? []) {
    const family = task.families as unknown as { parent_id: string | null } | null
    const parentId = family?.parent_id

    // Skip tasks whose family has no parent linked yet
    if (!parentId) {
      skipped++
      continue
    }

    // ── Check if an instance already exists for today ─────────────
    const { data: existing } = await admin
      .from('task_instances')
      .select('id')
      .eq('task_id', task.id)
      .eq('parent_id', parentId)
      .gte('due_at', `${today}T00:00:00+05:30`)
      .lt('due_at',  `${today}T23:59:59+05:30`)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    // ── Create the instance ────────────────────────────────────────
    const { error: insertErr } = await admin
      .from('task_instances')
      .insert({
        task_id:   task.id,
        parent_id: parentId,
        due_at:    dueDateTimeInIST(today, task.schedule_time),
        status:    'pending',
      })

    if (insertErr) {
      console.error(`[cron] insert failed for task ${task.id}:`, insertErr.message)
    } else {
      created++
    }
  }

  console.log(`[cron] create-instances done — created: ${created}, skipped: ${skipped}`)
  return NextResponse.json({ created, skipped, date: today })
}
