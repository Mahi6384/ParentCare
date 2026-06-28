import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SaathiMark from '@/components/ui/SaathiMark'
import KidNavBar from '@/components/kid/KidNavBar'
import OverrideControl from '@/components/kid/OverrideControl'
import KidRealtime from '@/components/kid/KidRealtime'

/*
  Kid Dashboard — Overview artboard (artboard #02 in the design).
  Layout: 60px top bar + scrollable two-column body:
    LEFT  : greeting + 7-day strip + verification feed
    RIGHT : streaks + concern + agent suggestion + family panel

  Static placeholder data is used for:
    - 7-day strip (will read from task_instances once built)
    - Verification feed (will read from task_instances + ai_results)
    - Streaks (will read from streaks table)
    - Concern + suggestion (will come from AI health agent)

  The real family data (parent linked?) comes from Supabase now.
*/

// ── Small shared primitives ──────────────────────────────────

// Dot — semantic status indicator
function Dot({ color, size = 5 }: { color: string; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size, height: size,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }}
    />
  )
}

// Pill — semantic badge with four tones matching theme.jsx
function Pill({
  children, tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'brand' | 'ok' | 'warn' | 'bad'
}) {
  return (
    <span className={`pc-pill pc-pill-${tone}`}>{children}</span>
  )
}

// Card — surface with hairline border + soft shadow
function Card({
  children, pad = 18, style = {},
}: {
  children: React.ReactNode
  pad?: number
  style?: React.CSSProperties
}) {
  return (
    <div className="pc-card" style={{ padding: pad, ...style }}>
      {children}
    </div>
  )
}

// DotRule — journal-style hairline divider with centre dot
function DotRule({ style = {} }: { style?: React.CSSProperties }) {
  return (
    <div className="pc-rule" style={style}>
      <span
        style={{
          width: 3, height: 3, borderRadius: '50%',
          background: 'var(--pc-ink4)', flexShrink: 0,
        }}
      />
    </div>
  )
}

// ── Feed card ────────────────────────────────────────────────

type FeedTone = 'ok' | 'warn' | 'bad' | 'pending'

interface FeedItem {
  time:       string
  task:       string
  tone:       FeedTone
  streak?:    number
  reason:     string
  confidence?: number
  instanceId?: string  // present only for real task_instances → enables override
  status?:    string   // raw task_instances.status, drives the override active state
}

function FeedCard({ item }: { item: FeedItem }) {
  const tones = {
    ok:      { label: 'Verified',  dot: 'var(--pc-ok)' },
    warn:    { label: 'Flagged',   dot: 'var(--pc-warn)' },
    bad:     { label: 'Failed',    dot: 'var(--pc-bad)' },
    pending: { label: 'Pending',   dot: 'var(--pc-ink3)' },
  }
  const t = tones[item.tone]

  return (
    <Card pad={0}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Meta row: time · status pill · streak · confidence */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="font-mono text-[11px] text-ink-3">{item.time}</span>
          <Dot color="var(--pc-ink4)" size={3} />
          <Pill tone={item.tone === 'pending' ? 'neutral' : item.tone}>
            <Dot color={t.dot} size={5} /> {t.label}
          </Pill>

          {/* {item.streak !== undefined && item.streak > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold"
              style={{ color: 'var(--pc-brand-deep)' }}
            >
              🔥 {item.streak}
            </span>
          )} */}

          {item.confidence && (
            <span className="font-mono text-[11px] text-ink-3 ml-auto">
              conf {item.confidence.toFixed(2)}
            </span>
          )}
        </div>

        {/* Task name — serif display */}
        <div
          className="font-serif font-medium text-[17px] text-ink leading-tight"
          style={{ letterSpacing: '-0.015em' }}
        >
          {item.task}
        </div>

        {/* Saathi reasoning */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <SaathiMark size={18} ring={false} />
          <p className="text-[12.5px] leading-[1.55] text-ink-2 m-0 flex-1">
            {item.reason}
          </p>
        </div>

        {/* Pending actions */}
        {item.tone === 'pending' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button className="pc-btn-ghost text-xs py-1.5 px-3">Send voice nudge now</button>
            <button className="pc-btn-ghost text-xs py-1.5 px-3">Skip for today</button>
          </div>
        )}

        {/* Manual override — kid is the final authority on the result.
            Only on real instances that have actually been acted on (not
            still-pending ones, where there's no result yet to correct). */}
        {item.instanceId && item.tone !== 'pending' && (
          <OverrideControl instanceId={item.instanceId} status={item.status ?? ''} />
        )}
      </div>
    </Card>
  )
}

// ── Page component ───────────────────────────────────────────

export default async function KidDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: family }] = await Promise.all([
    supabase.from('users').select('name').eq('id', user!.id).single(),
    supabase.from('families').select('id, invite_code, parent_id').eq('kid_id', user!.id).single(),
  ])

  // ── Real feed: today's task_instances for the linked parent ────
  const toneMap: Record<string, FeedTone> = {
    pending:     'pending',
    in_progress: 'pending',
    submitted:   'pending',
    passed:      'ok',
    flagged:     'warn',
    failed:      'bad',
    skipped:     'bad',
  }

  const reasonMap: Record<string, string> = {
    pending:     'Scheduled for today. Saathi will send a reminder at the due time.',
    in_progress: 'Parent has opened this task.',
    submitted:   'Photo submitted. Waiting for Saathi to verify.',
    passed:      'Saathi verified this task as complete.',
    flagged:     'Saathi flagged this submission — review the photo.',
    failed:      'Task was not completed today.',
    skipped:     'Task was skipped.',
  }

  let feed: FeedItem[] = []
  if (family?.parent_id) {
    const now = new Date()
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const endOfDay   = new Date(startOfDay.getTime() + 86_400_000)

    const { data: instances } = await supabase
      .from('task_instances')
      .select('id, status, due_at, tasks(title)')
      .eq('parent_id', family.parent_id)
      .gte('due_at', startOfDay.toISOString())
      .lt('due_at', endOfDay.toISOString())
      .order('due_at', { ascending: true })

    feed = (instances ?? []).map(inst => {
      const title = (inst.tasks as unknown as { title: string } | null)?.title ?? 'Unknown task'
      const due   = new Date(inst.due_at)
      const time  = due.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      return {
        time,
        task:       title,
        tone:       (toneMap[inst.status] ?? 'pending') as FeedTone,
        reason:     reasonMap[inst.status] ?? '',
        instanceId: inst.id,
        status:     inst.status,
      }
    })
  } else if (family?.id) {
    // No parent linked yet → there are no task_instances. Show the tasks the kid
    // has already created so the board isn't empty, marked as waiting-for-parent.
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, schedule_time')
      .eq('family_id', family.id)
      .eq('is_active', true)
      .order('schedule_time', { ascending: true })

    feed = (tasks ?? []).map(t => ({
      time:   t.schedule_time ? t.schedule_time.slice(0, 5) : '—',
      task:   t.title,
      tone:   'pending' as FeedTone,
      reason: 'Waiting for Papa to connect — share your invite code so this starts.',
    }))
  }

  // ── 7-day strip (real data) ──────────────────────────────────
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6)
  sevenDaysAgo.setUTCHours(0, 0, 0, 0)

  const { data: weekInstances } = family?.parent_id
    ? await supabase
        .from('task_instances')
        .select('due_at, status')
        .eq('parent_id', family.parent_id)
        .gte('due_at', sevenDaysAgo.toISOString())
        .order('due_at', { ascending: true })
    : { data: [] }

  const DONE_STATUSES = new Set(['passed', 'approved', 'flagged'])
  const todayUTC = new Date().toISOString().slice(0, 10)

  const stripData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - (6 - i))
    d.setUTCHours(0, 0, 0, 0)
    const dayStr = d.toISOString().slice(0, 10)
    const dayInsts = (weekInstances ?? []).filter(inst => inst.due_at.slice(0, 10) === dayStr)
    const total = dayInsts.length
    const done  = dayInsts.filter(inst => DONE_STATUSES.has(inst.status)).length
    return {
      dayName: d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }),
      date:    d.getUTCDate(),
      done, total,
      isToday: dayStr === todayUTC,
    }
  })

  // ── Streaks (real data) ───────────────────────────────────────
  const { data: streakRows } = family?.parent_id
    ? await supabase
        .from('streaks')
        .select('current_streak, longest_streak, task_id, tasks(title, type)')
        .eq('parent_id', family.parent_id)
        .order('current_streak', { ascending: false })
        .limit(5)
    : { data: [] }

  const completedToday = feed.filter(f => f.tone === 'ok' || f.tone === 'warn').length
  const lastVerifiedItem = [...feed].reverse().find(f => f.tone === 'ok' || f.tone === 'warn')

  // streakRows is sorted current_streak desc, so the first row is the best run.
  // Surfaced as a compact 🔥 badge in the nav on small screens (see KidNavBar).
  const topStreak = (streakRows as { current_streak: number }[] | null)?.[0]?.current_streak ?? 0

  return (
    <div
      className="flex flex-col"
      style={{ minHeight: '100vh', background: 'var(--pc-bg)', color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)' }}
    >
      {/* ── Top navigation bar — extracted to KidNavBar component ── */}
      <KidNavBar userName={profile?.name ?? ''} activeTab="overview" streak={topStreak} />

      {/* Live updates — toast on agent alerts, auto-refresh on verification results */}
      <KidRealtime kidId={user!.id} parentId={family?.parent_id ?? undefined} />

      {/* ── Body — two-column grid (stacks below 880px via .pc-shell) ── */}
      <div className="pc-shell pc-body-pad" style={{ flex: 1 }}>
        {/* ══ LEFT — Feed ══════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

          {/* Greeting + parent-not-connected warning */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div
                  className="font-serif font-medium text-[30px] text-ink"
                  style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}
                >
                  Good morning, {profile?.name}.
                </div>
                {family?.parent_id ? (
                  <div className="mt-1 text-sm text-ink-2">
                    {feed.length > 0 ? (
                      <>
                        Parent has{' '}
                        <span className="font-semibold" style={{ color: 'var(--pc-ok)' }}>
                          {completedToday} of {feed.length} tasks done
                        </span>
                        {' '}today.
                      </>
                    ) : (
                      'No tasks scheduled yet today.'
                    )}
                  </div>
                ) : (
                  // Parent not yet connected — show invite nudge
                  <div
                    className="mt-3 rounded-2xl p-4"
                    style={{ background: 'var(--pc-brand-tint)', border: '0.5px solid var(--pc-brand-soft)' }}
                  >
                    <p className="font-semibold text-sm" style={{ color: 'var(--pc-brand-deep)' }}>
                      ⚠️ Parent not connected yet
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--pc-brand-deep)', opacity: 0.8 }}>
                      Share code{' '}
                      <span className="font-bold font-mono tracking-widest">{family?.invite_code}</span>
                      {' '}with your parent.
                    </p>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Link href="/kid/tasks/new" className="pc-pill pc-pill-brand" style={{ textDecoration: 'none' }}>＋ New task</Link>
              </div>
            </div>

            {/* 7-day strip — real data */}
            <div style={{ marginTop: 18, display: 'flex', gap: 6 }}>
              {stripData.map((day) => {
                const pct = day.total > 0 ? day.done / day.total : 0
                return (
                  <div
                    key={day.dayName}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 10,
                      background: day.isToday ? 'var(--pc-brand-tint)' : 'var(--pc-surface)',
                      border: `0.5px solid ${day.isToday ? 'var(--pc-brand)' : 'var(--pc-hair)'}`,
                      display: 'flex', flexDirection: 'column', gap: 7,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span
                        style={{
                          fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                          color: day.isToday ? 'var(--pc-brand-deep)' : 'var(--pc-ink3)',
                        }}
                      >
                        {day.dayName}
                      </span>
                      <span
                        className="font-serif font-medium text-[15px]"
                        style={{ color: day.isToday ? 'var(--pc-brand-deep)' : 'var(--pc-ink)' }}
                      >
                        {day.date}
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'var(--pc-hair-soft)', borderRadius: 99 }}>
                      <div
                        style={{
                          width: `${pct * 100}%`, height: '100%', borderRadius: 99,
                          background: day.isToday
                            ? 'var(--pc-brand)'
                            : pct >= 1 ? 'var(--pc-ok)' : pct >= 0.6 ? 'var(--pc-brand)' : 'var(--pc-ink4)',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 10.5, color: 'var(--pc-ink2)' }}>
                      {day.total === 0 ? '—' : `${day.done}/${day.total}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Verification feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h2
                className="font-serif font-medium text-[19px] text-ink m-0"
                style={{ letterSpacing: '-0.01em' }}
              >
                Today — verification feed
              </h2>
              <div style={{ fontSize: 12, color: 'var(--pc-ink3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {lastVerifiedItem ? (
                  <>
                    <Dot color="var(--pc-ok)" size={5} />
                    Last verified ·{' '}
                    <span className="font-mono" style={{ color: 'var(--pc-ink2)' }}>{lastVerifiedItem.time}</span>
                  </>
                ) : (
                  <>
                    <Dot color="var(--pc-ink3)" size={5} />
                    Abhi tak koi verification nahi
                  </>
                )}
              </div>
            </div>

            {feed.length === 0 ? (
              <div
                style={{
                  textAlign: 'center', padding: '48px 0',
                  color: 'var(--pc-ink3)', fontSize: 14,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No tasks scheduled for today.</div>
                <Link
                  href="/kid/tasks/new"
                  style={{ color: 'var(--pc-brand)', textDecoration: 'none', fontWeight: 500 }}
                >
                  Create your first task →
                </Link>
              </div>
            ) : (
              feed.map((item, i) => <FeedCard key={i} item={item} />)
            )}
          </div>
        </div>

        {/* ══ RIGHT rail ═══════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

          {/* Streaks — real data. Hidden ≤880px; the nav shows a 🔥 badge instead. */}
          <div className="pc-streak-card">
          <Card pad={16}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <span className="font-serif font-medium text-[16px] text-ink">Streaks</span>
              <span className="font-mono text-[11px] text-ink-3">current</span>
            </div>

            {!streakRows || streakRows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--pc-ink3)', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔥</div>
                No streaks yet — complete tasks to start building them!
              </div>
            ) : (
              (streakRows as unknown as { current_streak: number; longest_streak: number; tasks: { title: string; type: string } | null }[]).map((s, i) => {
                const taskTypeIcons: Record<string, string> = { walk: '🚶', diet: '🍽️', medicine: '💊', sleep: '😴', exercise: '💪', custom: '✅' }
                const title = s.tasks?.title ?? 'Task'
                const icon  = taskTypeIcons[s.tasks?.type ?? ''] ?? '✅'
                const pct   = s.longest_streak > 0 ? s.current_streak / s.longest_streak : 1
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 0',
                      borderTop: i ? '0.5px dashed var(--pc-hair)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'var(--pc-brand-tint)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14,
                      }}
                    >
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12.5, fontWeight: 500,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}
                      >
                        {title}
                      </div>
                      <div style={{ height: 3, background: 'var(--pc-surface2)', borderRadius: 99, marginTop: 4 }}>
                        <div
                          style={{
                            width: `${Math.min(pct, 1) * 100}%`,
                            height: '100%', borderRadius: 99,
                            background: s.current_streak >= 7 ? 'var(--pc-ok)' : 'var(--pc-brand)',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'baseline', gap: 3 }}>
                      <span className="font-serif font-medium text-[18px] text-ink">{s.current_streak}</span>
                      <span className="text-[10.5px] text-ink-3">din</span>
                    </div>
                  </div>
                )
              })
            )}
          </Card>
          </div>

          {/* Family panel */}
          {family?.parent_id && (
            <Card pad={14}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--pc-surface2)', border: '0.5px solid var(--pc-hair)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--pc-display)', fontSize: 16, fontWeight: 600,
                  }}
                >
                  P
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Papa</div>
                  <div style={{ fontSize: 11.5, color: 'var(--pc-ink3)' }}>Connected · Delhi, IST</div>
                </div>
                <span className="pc-pill pc-pill-ok">
                  <Dot color="var(--pc-ok)" size={5} /> active
                </span>
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}
