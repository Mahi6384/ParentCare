import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import KidNavBar from '@/components/kid/KidNavBar'

/*
  /kid/tasks — Task management list (artboard companion to /kid/tasks/new).

  Server Component: reads the kid's own tasks (RLS "tasks: kid owns" allows this)
  and renders a scannable list. Creating happens on /kid/tasks/new; this page is
  the home the nav "Tasks" tab points to, so it must never 404.

  No client JS — it's a read-only list. Edit/delete can be layered on later as a
  small client action without touching this shell.
*/

// Display maps kept module-level so they're built once, not per-request.
const TYPE_ICONS: Record<string, string> = {
  walk: '🚶', diet: '🍽️', medicine: '💊', sleep: '😴', exercise: '🏃', custom: '✨',
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: 'Every day', weekly: 'Weekly', once: 'Just once', custom: 'Every other day',
}

export default async function KidTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: family }] = await Promise.all([
    supabase.from('users').select('name').eq('id', user!.id).single(),
    supabase.from('families').select('id').eq('kid_id', user!.id).single(),
  ])

  const { data: tasks } = family?.id
    ? await supabase
        .from('tasks')
        .select('id, title, type, proof_type, recurrence, schedule_time, is_active')
        .eq('family_id', family.id)
        .order('schedule_time', { ascending: true })
    : { data: [] }

  return (
    <div style={{ background: 'var(--pc-bg)', minHeight: '100vh', color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)' }}>
      <KidNavBar userName={profile?.name ?? ''} activeTab="tasks" />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <h1 className="font-serif" style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
            Tasks
          </h1>
          <Link href="/kid/tasks/new" className="pc-pill pc-pill-brand" style={{ textDecoration: 'none' }}>
            ＋ New task
          </Link>
        </div>
        <p style={{ color: 'var(--pc-ink2)', fontSize: 15, marginTop: 0, marginBottom: 28 }}>
          Everything you&apos;ve set up for Papa. Saathi reminds him and verifies each one.
        </p>

        {/* Empty state */}
        {(!tasks || tasks.length === 0) ? (
          <div style={{
            padding: 40, borderRadius: 16, textAlign: 'center',
            border: '0.5px solid var(--pc-hair)', background: 'var(--pc-surface)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div className="font-serif" style={{ fontSize: 22, fontWeight: 500 }}>No tasks yet</div>
            <p style={{ color: 'var(--pc-ink2)', marginTop: 8, fontSize: 15 }}>
              Create your first task — a walk, medicine reminder, or anything custom.
            </p>
            <Link
              href="/kid/tasks/new"
              style={{
                display: 'inline-block', marginTop: 14, padding: '10px 20px', borderRadius: 10,
                background: 'var(--pc-brand)', color: '#fff', textDecoration: 'none',
                fontSize: 14, fontWeight: 600,
              }}
            >
              Create your first task →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks.map(task => {
              const icon = TYPE_ICONS[task.type] ?? '✨'
              const time = task.schedule_time ? task.schedule_time.slice(0, 5) : '—'
              const recurrence = RECURRENCE_LABELS[task.recurrence] ?? task.recurrence
              return (
                <div
                  key={task.id}
                  className="pc-card"
                  style={{
                    padding: 16, display: 'flex', alignItems: 'center', gap: 14,
                    opacity: task.is_active ? 1 : 0.55,
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: 'var(--pc-brand-tint)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
                  }}>
                    {icon}
                  </div>

                  {/* Title + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 600,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--pc-ink3)', marginTop: 2 }}>
                      {recurrence} · {time}
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span className={`pc-pill ${task.proof_type === 'photo' ? 'pc-pill-brand' : 'pc-pill-neutral'}`}>
                      {task.proof_type === 'photo' ? '📷 Photo' : 'No proof'}
                    </span>
                    {!task.is_active && <span className="pc-pill pc-pill-neutral">Paused</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
