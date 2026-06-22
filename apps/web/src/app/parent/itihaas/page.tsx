import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getDict } from '@/lib/i18n/server'

/*
  Parent History (Itihaas) — every task the parent has already finished.

  "Finished" = any terminal task_status (everything past pending/in_progress).
  We pull the most recent ~60, newest first, then group them by IST calendar
  day so the screen reads like a diary: Today / Yesterday / older dates.
*/

const TERMINAL_STATUSES = ['submitted', 'passed', 'flagged', 'failed', 'skipped']

const taskTypeIcons: Record<string, string> = {
  walk: '🚶', diet: '🍽️', medicine: '💊',
  sleep: '😴', exercise: '💪', custom: '✅',
}

// Semantic colour per outcome — verified green, flagged amber, missed red, etc.
const statusTone: Record<string, string> = {
  passed: 'var(--pc-ok)',
  flagged: 'var(--pc-warn)',
  failed: 'var(--pc-bad)',
  submitted: 'var(--pc-ink2)',
  skipped: 'var(--pc-ink3)',
}

// IST calendar-day key, e.g. "2026-06-21". en-CA formats as YYYY-MM-DD.
const istDateKey = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)

export default async function ParentItihaasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getDict()

  const { data: instances } = await supabase
    .from('task_instances')
    .select(`id, status, due_at, tasks ( title, type )`)
    .eq('parent_id', user!.id)
    .in('status', TERMINAL_STATUSES)
    .order('due_at', { ascending: false })
    .limit(60)

  const statusLabels = t.status as Record<string, string>

  // Relative day labels are computed against "now" in IST.
  const now = new Date()
  const todayKey = istDateKey(now)
  const yesterdayKey = istDateKey(new Date(now.getTime() - 86_400_000))

  // Build ordered day-groups. Instances arrive newest-first, so the first time
  // we see a date we create its group, preserving descending order.
  type Item = { id: string; title: string; icon: string; time: string; label: string; tone: string }
  const groups: { key: string; header: string; items: Item[] }[] = []

  for (const inst of instances ?? []) {
    const task = inst.tasks as unknown as { title: string; type: string }
    const d = new Date(inst.due_at)
    const key = istDateKey(d)

    let group = groups.find((g) => g.key === key)
    if (!group) {
      let header: string
      if (key === todayKey) header = t.history.today
      else if (key === yesterdayKey) header = t.history.yesterday
      else {
        // Weekday of a calendar date is timezone-independent, so reading it
        // back via Date.UTC() is safe and lets us index the localized arrays.
        const [y, m, dd] = key.split('-').map(Number)
        const weekday = new Date(Date.UTC(y, m - 1, dd)).getUTCDay()
        header = `${t.dashboard.days[weekday]} · ${dd} ${t.dashboard.months[m - 1]}`
      }
      group = { key, header, items: [] }
      groups.push(group)
    }

    group.items.push({
      id: inst.id,
      title: task.title,
      icon: taskTypeIcons[task.type] ?? '✅',
      time: d.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
      }),
      label: statusLabels[inst.status] ?? inst.status,
      tone: statusTone[inst.status] ?? 'var(--pc-ink2)',
    })
  }

  return (
    <div style={{ background: 'var(--pc-bg)', minHeight: '100vh', color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)' }}>
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '54px 22px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <Link href="/parent/dashboard" style={{ color: 'var(--pc-ink2)', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>
            ←
          </Link>
          <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
            {t.nav.history}
          </h1>
        </div>

        <p style={{ color: 'var(--pc-ink2)', fontSize: 16, marginBottom: 28 }}>
          {t.history.subtitle}
        </p>

        {groups.length === 0 ? (
          /* Empty state — only for parents who genuinely have no finished tasks */
          <div
            style={{
              padding: 28, borderRadius: 16,
              border: '0.5px solid var(--pc-hair)', background: 'var(--pc-surface)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
            <div className="font-serif" style={{ fontSize: 20, fontWeight: 500 }}>
              {t.history.emptyTitle}
            </div>
            <p style={{ color: 'var(--pc-ink2)', marginTop: 8, fontSize: 14 }}>
              {t.history.emptyBody}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {groups.map((group) => (
              <div key={group.key}>
                {/* Day header */}
                <div
                  className="font-mono"
                  style={{
                    fontSize: 12, fontWeight: 600, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: 'var(--pc-ink3)',
                    padding: '0 4px 10px',
                  }}
                >
                  {group.header}
                </div>

                {/* Tasks for that day */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: 'var(--pc-surface)',
                        borderRadius: 16,
                        padding: '14px 16px',
                        border: '0.5px solid var(--pc-hair)',
                        display: 'flex', alignItems: 'center', gap: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 46, height: 46, borderRadius: 12,
                          background: 'var(--pc-surface2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 22,
                        }}
                      >
                        {item.icon}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 600 }}>{item.title}</div>
                        <div style={{ fontSize: 14, color: 'var(--pc-ink2)', marginTop: 2 }}>{item.time}</div>
                      </div>

                      <span style={{ fontSize: 13, fontWeight: 600, color: item.tone, flexShrink: 0 }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
