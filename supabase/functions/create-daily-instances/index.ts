import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Reuse the same logic as the client-side buildDueAt in NewTaskForm.tsx.
// schedule_time comes from Postgres as "HH:MM:SS" — we slice to "HH:MM".
function buildDueAt(scheduleTime: string | null, timezone: string): string {
  const time = scheduleTime ? scheduleTime.slice(0, 5) : '00:00'
  const todayInTz = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
  const rawOffset = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(new Date())
    .find(p => p.type === 'timeZoneName')!
    .value
    .replace('GMT', '')
    .replace(/^([+-])(\d):/, '$10$2:')
  return new Date(`${todayInTz}T${time}:00${rawOffset}`).toISOString()
}

Deno.serve(async () => {
  // ── 1. All active tasks ────────────────────────────────────
  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from('tasks')
    .select('id, family_id, schedule_time')
    .eq('is_active', true)

  if (tasksError) {
    return new Response(JSON.stringify({ error: tasksError.message }), { status: 500 })
  }
  if (!tasks?.length) {
    return new Response(JSON.stringify({ created: 0 }), { status: 200 })
  }

  // ── 2. Families for those tasks (only those with a connected parent) ──
  const familyIds = [...new Set(tasks.map(t => t.family_id))]
  const { data: families, error: familiesError } = await supabaseAdmin
    .from('families')
    .select('id, parent_id')
    .in('id', familyIds)
    .not('parent_id', 'is', null)

  if (familiesError) {
    return new Response(JSON.stringify({ error: familiesError.message }), { status: 500 })
  }
  if (!families?.length) {
    return new Response(JSON.stringify({ created: 0 }), { status: 200 })
  }

  // ── 3. Parent timezones ────────────────────────────────────
  const parentIds = families.map(f => f.parent_id as string)
  const { data: parentUsers, error: usersError } = await supabaseAdmin
    .from('users')
    .select('id, timezone')
    .in('id', parentIds)

  if (usersError) {
    return new Response(JSON.stringify({ error: usersError.message }), { status: 500 })
  }

  // ── 4. Build lookup maps ───────────────────────────────────
  const familyMap   = new Map(families.map(f => [f.id, f]))
  const timezoneMap = new Map((parentUsers ?? []).map(u => [u.id, u.timezone as string]))

  // ── 5. Skip tasks that already have an instance created today ──
  // We compare against created_at (UTC) to avoid inserting twice if the
  // function is retried or triggered manually.
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1)

  const { data: existing } = await supabaseAdmin
    .from('task_instances')
    .select('task_id')
    .gte('created_at', todayStart.toISOString())
    .lt('created_at', tomorrowStart.toISOString())

  const alreadyCreated = new Set((existing ?? []).map(e => e.task_id as string))

  // ── 6. Build insert rows ───────────────────────────────────
  const rows: {
    task_id: string
    parent_id: string
    family_id: string
    due_at: string
    status: string
  }[] = []

  for (const task of tasks) {
    if (alreadyCreated.has(task.id)) continue
    const family = familyMap.get(task.family_id)
    if (!family) continue
    const timezone = timezoneMap.get(family.parent_id as string) ?? 'Asia/Kolkata'
    rows.push({
      task_id:   task.id,
      parent_id: family.parent_id as string,
      family_id: task.family_id,
      due_at:    buildDueAt(task.schedule_time, timezone),
      status:    'pending',
    })
  }

  if (!rows.length) {
    return new Response(JSON.stringify({ created: 0 }), { status: 200 })
  }

  // ── 7. Bulk insert ─────────────────────────────────────────
  const { error: insertError } = await supabaseAdmin
    .from('task_instances')
    .insert(rows)

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ created: rows.length }), { status: 200 })
})
