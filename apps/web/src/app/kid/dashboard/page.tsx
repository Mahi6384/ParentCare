import { createClient } from '@/lib/supabase/server'
import SaathiMark from '@/components/ui/SaathiMark'

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

          {item.streak !== undefined && item.streak > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold"
              style={{ color: 'var(--pc-brand-deep)' }}
            >
              🔥 {item.streak}
            </span>
          )}

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
      </div>
    </Card>
  )
}

// ── Page component ───────────────────────────────────────────

export default async function KidDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', user!.id)
    .single()

  const { data: family } = await supabase
    .from('families')
    .select('invite_code, parent_id')
    .eq('kid_id', user!.id)
    .single()

  // ── Placeholder feed data ────────────────────────────────
  // These will be replaced by real task_instances + ai_results
  // queries once the task system is built (Step 5 of the roadmap).
  const feed: FeedItem[] = [
    {
      time: '8:14 AM', task: 'Morning Walk',
      tone: 'ok', streak: 6,
      reason: 'Photo shows Papa walking outdoors in Lodhi Garden, full upright posture, daylight. Sixth consecutive completion — exercise schedule is firmly habitual now.',
      confidence: 0.91,
    },
    {
      time: '10:02 AM', task: 'Morning Medicine — Telma 40',
      tone: 'ok', streak: 22,
      reason: 'Medication label reads "Telma 40" — matches prescription. Blister has one tablet popped. Logged.',
      confidence: 0.96,
    },
    {
      time: '1:30 PM', task: 'Lunch — Dal, Roti, Sabzi',
      tone: 'warn', streak: 0,
      reason: 'Plate shows 2 rotis, sabzi, and rice — no dal visible despite plan. Protein gap continues (9th low-protein day in two weeks).',
      confidence: 0.84,
    },
    {
      time: '5:40 PM', task: 'Evening Walk',
      tone: 'pending',
      reason: 'Due now. Push alert sent at 5:30. Will follow up via WhatsApp voice in 20 min if no submission.',
    },
  ]

  // 7-day completion data — [Mon … Sun], value = completed / total
  // TODO: replace with real task_instance query grouped by day
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekDates = [12, 13, 14, 15, 16, 17, 18]
  const weekCompletion = [5, 4, 5, 5, 3, 0, 0] // out of 5
  const todayIndex = 4 // Friday

  return (
    <div
      className="flex flex-col"
      style={{ minHeight: '100vh', background: 'var(--pc-bg)', color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)' }}
    >
      {/* ── Top navigation bar ── */}
      <div
        style={{
          height: 60, display: 'flex', alignItems: 'center', gap: 28,
          padding: '0 28px', borderBottom: '0.5px solid var(--pc-hair)',
          background: 'var(--pc-bg)', position: 'sticky', top: 0, zIndex: 10,
        }}
      >
        {/* Logo + wordmark */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            paddingRight: 24, borderRight: '0.5px solid var(--pc-hair)', height: '100%',
          }}
        >
          <SaathiMark size={26} />
          <div style={{ lineHeight: 1.1 }}>
            <div className="font-serif font-medium text-[18px] text-ink" style={{ letterSpacing: '-0.01em' }}>
              ParentCare
            </div>
            <div className="font-mono text-[10.5px] text-ink-3 tracking-[0.04em] uppercase">
              for {profile?.name}
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            ['overview', 'Overview', true, null],
            ['tasks',    'Tasks',    false, null],
            ['concerns', 'Concerns', false, 2],
            ['report',   'Weekly Report', false, null],
            ['family',   'Family',   false, null],
          ].map(([id, label, active, badge]) => (
            <button
              key={id as string}
              style={{
                appearance: 'none', border: 0, cursor: 'pointer',
                background: active ? 'var(--pc-surface)' : 'transparent',
                color:      active ? 'var(--pc-ink)' : 'var(--pc-ink2)',
                fontFamily: 'var(--pc-body)',
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                padding: '8px 12px', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: active ? '0 0 0 0.5px var(--pc-hair)' : 'none',
              }}
            >
              {label}
              {badge && (
                <span
                  style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 5px',
                    borderRadius: 999, background: 'var(--pc-bad)',
                    color: '#fff', lineHeight: 1.4,
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 10px',
            background: 'var(--pc-surface)', border: '0.5px solid var(--pc-hair)',
            borderRadius: 999, fontSize: 12.5, color: 'var(--pc-ink3)', minWidth: 220,
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--pc-ink3)" strokeWidth={1.5} strokeLinecap="round">
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
          </svg>
          <span>Search tasks, days, photos…</span>
          <span
            style={{
              marginLeft: 'auto', fontFamily: 'var(--pc-mono)', fontSize: 10.5,
              padding: '1px 5px', border: '0.5px solid var(--pc-hair)',
              borderRadius: 4, color: 'var(--pc-ink3)',
            }}
          >
            ⌘K
          </span>
        </div>

        {/* User avatar */}
        <div
          style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--pc-surface2)', border: '0.5px solid var(--pc-hair)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--pc-display)', fontSize: 14, fontWeight: 600, color: 'var(--pc-ink)',
          }}
        >
          {profile?.name?.[0]?.toUpperCase() ?? 'U'}
        </div>
      </div>

      {/* ── Body — two-column grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 24,
          padding: '24px 28px 40px',
          flex: 1,
        }}
      >
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
                    Papa is{' '}
                    <span className="font-semibold" style={{ color: 'var(--pc-ok)' }}>
                      3 of 5 tasks
                    </span>
                    {' '}in today · last activity 2 minutes ago.
                    {/* TODO: replace with real task_instance counts */}
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
                <span className="pc-pill pc-pill-neutral">🔕 Quiet mode</span>
                <span className="pc-pill pc-pill-brand cursor-pointer">＋ New task</span>
              </div>
            </div>

            {/* 7-day strip */}
            <div style={{ marginTop: 18, display: 'flex', gap: 6 }}>
              {weekDays.map((d, i) => {
                const isToday = i === todayIndex
                const pct     = weekCompletion[i] / 5
                return (
                  <div
                    key={d}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 10,
                      background: isToday ? 'var(--pc-brand-tint)' : 'var(--pc-surface)',
                      border: `0.5px solid ${isToday ? 'var(--pc-brand)' : 'var(--pc-hair)'}`,
                      display: 'flex', flexDirection: 'column', gap: 7,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span
                        style={{
                          fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                          color: isToday ? 'var(--pc-brand-deep)' : 'var(--pc-ink3)',
                        }}
                      >
                        {d}
                      </span>
                      <span
                        className="font-serif font-medium text-[15px]"
                        style={{ color: isToday ? 'var(--pc-brand-deep)' : 'var(--pc-ink)' }}
                      >
                        {weekDates[i]}
                      </span>
                    </div>
                    {/* Thin progress bar */}
                    <div style={{ height: 4, background: 'var(--pc-hair-soft)', borderRadius: 99 }}>
                      <div
                        style={{
                          width: `${pct * 100}%`, height: '100%', borderRadius: 99,
                          background: isToday
                            ? 'var(--pc-brand)'
                            : pct === 1 ? 'var(--pc-ok)' : pct >= 0.6 ? 'var(--pc-brand)' : 'var(--pc-ink4)',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 10.5, color: 'var(--pc-ink2)' }}>
                      {i > todayIndex ? '—' : `${weekCompletion[i]}/5`}
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
                <Dot color="var(--pc-ok)" size={5} />
                Live · last reasoned{' '}
                <span className="font-mono" style={{ color: 'var(--pc-ink2)' }}>00:02:14</span>
                {' '}ago
              </div>
            </div>

            {feed.map((item, i) => <FeedCard key={i} item={item} />)}
          </div>
        </div>

        {/* ══ RIGHT rail ═══════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

          {/* Streaks */}
          <Card pad={16}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <span className="font-serif font-medium text-[16px] text-ink">Streaks</span>
              <span className="font-mono text-[11px] text-ink-3">this month</span>
            </div>
            {/* TODO: replace with real streaks table query */}
            {[
              { name: 'Medicine — Telma 40', n: 22, max: 30, icon: '💊', color: 'var(--pc-brand)' },
              { name: 'Morning walk',        n: 6,  max: 7,  icon: '🚶', color: 'var(--pc-ok)' },
              { name: 'Evening exercise',    n: 4,  max: 7,  icon: '🧘', color: 'var(--pc-brand)' },
              { name: 'Sleep by 11 PM',      n: 2,  max: 7,  icon: '🌙', color: 'var(--pc-warn)' },
            ].map((s, i) => (
              <div
                key={s.name}
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
                  {s.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12.5, fontWeight: 500,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {s.name}
                  </div>
                  <div style={{ height: 3, background: 'var(--pc-surface2)', borderRadius: 99, marginTop: 4 }}>
                    <div
                      style={{
                        width: `${(s.n / s.max) * 100}%`,
                        height: '100%', borderRadius: 99, background: s.color,
                      }}
                    />
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span className="font-serif font-medium text-[18px] text-ink">{s.n}</span>
                  <span className="text-[10.5px] text-ink-3">/ {s.max}</span>
                </div>
              </div>
            ))}
          </Card>

          {/* Health concern — saffron-tinted card */}
          <Card
            pad={16}
            style={{ background: 'var(--pc-brand-tint)', border: '0.5px solid var(--pc-brand)' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <SaathiMark size={26} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: 'var(--pc-brand-deep)',
                    marginBottom: 6,
                  }}
                >
                  Health concern <Dot color="var(--pc-brand)" size={4} /> medium
                </div>
                <div
                  className="font-serif font-medium text-[17px] text-ink leading-tight"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  Low protein intake for 9 days running.
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.55, color: 'var(--pc-ink2)' }}>
                  Lunches and dinners have been roti-and-sabzi only since the 3rd.
                  Saathi has drafted a dal-and-paneer rotation for next week.
                </p>
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  <button className="pc-btn text-xs py-1.5 px-3">Review plan</button>
                  <button className="pc-btn-ghost text-xs py-1.5 px-3">Mute concern</button>
                </div>
              </div>
            </div>
          </Card>

          {/* Agent suggestion */}
          <Card pad={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <SaathiMark size={20} />
              <span
                style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--pc-ink3)',
                }}
              >
                Saathi suggests
              </span>
            </div>
            <div
              className="font-serif font-medium text-[16px] text-ink leading-tight"
              style={{ letterSpacing: '-0.01em' }}
            >
              Add a 10-min breathing exercise before bed.
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--pc-ink2)' }}>
              Papa's sleep streak is at 2/7. Pranayama before bed has the
              strongest evidence for hypertension — and it doesn't aggravate
              his knee.
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button className="pc-btn text-xs py-1.5 px-3">✓ Approve</button>
              <button className="pc-btn-ghost text-xs py-1.5 px-3">Edit</button>
              <button className="pc-btn-ghost text-xs py-1.5 px-3" style={{ color: 'var(--pc-ink3)' }}>Dismiss</button>
            </div>
          </Card>

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
