import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SaathiMark from '@/components/ui/SaathiMark'

/*
  Parent Dashboard — ParentHome artboard (artboard #06 in the design).

  Design decisions:
  - Max-width 430px, centred — mirrors the iOS PWA frame in the design.
  - Hinglish UI text throughout — the parent-facing app is warmer,
    more familiar, less technical than the kid's desktop dashboard.
  - Hero card: full-width saffron card for the top pending task.
    This is what the parent should do RIGHT NOW.
  - Task list: remaining tasks, done ones greyed out at 65% opacity.
  - Saathi message: brief, encouraging, in Hinglish.
  - Bottom tab bar: Aaj / Itihaas / Saathi / Profile.

  Placeholder tasks will be replaced by real task_instances queries
  in Step 6 of the roadmap (parent task + photo upload flow).
*/

export default async function ParentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', user!.id)
    .single()

  // Derive first name for Hinglish greeting ("Namaste, Ramesh ji 🙏")
  const firstName = profile?.name?.split(' ')[0] ?? 'Papa'

  // Day display — e.g. "SHANIWAR · 16 AUG"
  const today    = new Date()
  const dayNames = ['RAVIVAAR', 'SOMVAAR', 'MANGALVAAR', 'BUDHVAAR', 'GURUVAAR', 'SHUKRAVAAR', 'SHANIVAR']
  const months   = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const dayStr   = `${dayNames[today.getDay()]} · ${today.getDate()} ${months[today.getMonth()]}`

  // ── Today's task instances from Supabase ─────────────────
  // "Today" = UTC midnight-to-midnight window. Due_at values are stored
  // in UTC after timezone conversion, so this range captures all instances
  // created for today regardless of the parent's local timezone.
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1)

  // Join task_instances → tasks in a single query using PostgREST nested select.
  // The `tasks (...)` syntax tells Supabase to follow the FK and embed the
  // related task row inline — no separate query needed.
  const { data: instances } = await supabase
    .from('task_instances')
    .select(`
      id,
      status,
      due_at,
      tasks (
        title,
        type
      )
    `)
    .eq('parent_id', user!.id)
    .gte('due_at', todayStart.toISOString())
    .lt('due_at', tomorrowStart.toISOString())
    .order('due_at', { ascending: true })

  // Highest active streak across all this parent's tasks — shown in the pill.
  const { data: streakRows } = await supabase
    .from('streaks')
    .select('current_streak')
    .eq('parent_id', user!.id)
    .order('current_streak', { ascending: false })
    .limit(1)

  const topStreak = streakRows?.[0]?.current_streak ?? 0

  const taskTypeIcons: Record<string, string> = {
    walk: '🚶', diet: '🍽️', medicine: '💊',
    sleep: '😴', exercise: '💪', custom: '✅',
  }

  // Map DB rows → the shape the existing UI already expects.
  // "done" = any terminal status; only pending/in_progress are still actionable.
  const tasks = (instances ?? []).map(instance => {
    const task = instance.tasks as unknown as { title: string; type: string }
    const dueTime = new Date(instance.due_at).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    })
    const done = !['pending', 'in_progress'].includes(instance.status)
    return {
      id:   instance.id,
      title: task.title,
      sub:  done ? instance.status : `${dueTime} · photo verification`,
      icon: taskTypeIcons[task.type] ?? '✅',
      done,
      note: done ? instance.status : undefined,
      due:  done ? undefined : dueTime,
    }
  })

  const completed = tasks.filter(t => t.done).length
  const nextTask  = tasks.find(t => !t.done)

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: 'var(--pc-bg)', color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)' }}
    >
      {/* Centred column — mirrors the 390px iOS frame in the design */}
      <div className="w-full max-w-[430px] mx-auto flex flex-col flex-1">

        {/* ── Status + greeting ── */}
        <div style={{ padding: '54px 22px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Day label in mono uppercase */}
            <span
              className="font-mono text-[13px] text-ink-3"
              style={{ letterSpacing: '0.04em' }}
            >
              {dayStr}
            </span>

            {/* Streak counter pill */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px 5px 8px',
                background: 'var(--pc-surface)', border: '0.5px solid var(--pc-hair)',
                borderRadius: 999, fontSize: 13, color: 'var(--pc-ink2)',
              }}
            >
              🔥{' '}
              <b style={{ color: 'var(--pc-ink)', fontWeight: 700 }}>{topStreak}</b>
              {' '}din
            </div>
          </div>

          {/* Large serif greeting */}
          <div
            className="font-serif font-medium text-[34px] text-ink"
            style={{ letterSpacing: '-0.03em', lineHeight: 1.1, marginTop: 14 }}
          >
            Namaste, {firstName} 🙏
          </div>

          {/* Status subtitle */}
          <div style={{ marginTop: 6, fontSize: 17, color: 'var(--pc-ink2)', lineHeight: 1.4 }}>
            Aaj{' '}
            <b style={{ color: 'var(--pc-ok)' }}>{completed} kaam ho gaye</b>.
            {nextTask
              ? ` Ek abhi shuru karna hai — aapka ${nextTask.title}.`
              : ' Sab kaam ho gaye! Bahut acha 🌟'}
          </div>
        </div>

        {/* ── Hero card — next pending task ── */}
        {nextTask && (
          <div style={{ padding: '16px 18px 8px' }}>
            <div
              style={{
                background: 'var(--pc-brand)',
                color: '#fff',
                borderRadius: 22,
                padding: 22,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 10px 30px -10px var(--pc-brand-deep)',
              }}
            >
              {/* Concentric circle decoration — subtle, top-right */}
              <svg
                width={120} height={120} viewBox="0 0 100 100"
                style={{ position: 'absolute', right: -20, bottom: -30, opacity: 0.15 }}
              >
                {[48, 36, 24].map(r => (
                  <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="white" strokeWidth="0.5" />
                ))}
              </svg>

              {/* "abhi karna hai" label */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontWeight: 600, letterSpacing: '0.06em',
                  textTransform: 'uppercase', opacity: 0.85,
                }}
              >
                <span
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#fff', flexShrink: 0,
                  }}
                />
                abhi karna hai
              </div>

              {/* Task title */}
              <div
                className="font-serif font-medium"
                style={{ fontSize: 30, letterSpacing: '-0.02em', marginTop: 8, lineHeight: 1.1 }}
              >
                {nextTask.title}
              </div>
              <div style={{ fontSize: 16, opacity: 0.9, marginTop: 6, lineHeight: 1.4 }}>
                {nextTask.sub} — Saathi aapko guide karega.
              </div>

              {/* CTA button — navigates to photo submission for this task */}
              <Link
                href={`/parent/submit/${nextTask.id}`}
                style={{
                  marginTop: 18,
                  background: 'var(--pc-surface)', color: 'var(--pc-brand-deep)',
                  fontFamily: 'var(--pc-body)', fontSize: 18, fontWeight: 700,
                  padding: '14px 22px', borderRadius: 14,
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  textDecoration: 'none',
                }}
              >
                ▶ Shuru karein
              </Link>
            </div>
          </div>
        )}

        {/* ── Remaining tasks list ── */}
        <div style={{ flex: 1, padding: '14px 18px 22px', overflowY: 'auto' }}>
          <div
            style={{
              fontSize: 12.5, fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--pc-ink3)',
              padding: '4px 4px 10px',
            }}
          >
            Baaki ke kaam
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks.map(t => (
              <div
                key={t.id}
                style={{
                  background: 'var(--pc-surface)',
                  borderRadius: 16,
                  padding: '14px 16px',
                  border: '0.5px solid var(--pc-hair)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  opacity: t.done ? 0.65 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Icon tile */}
                <div
                  style={{
                    width: 46, height: 46, borderRadius: 12,
                    background: t.done ? 'var(--pc-surface2)' : 'var(--pc-brand-tint)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: t.done ? 20 : 22,
                  }}
                >
                  {t.done ? '✓' : t.icon}
                </div>

                {/* Task info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 18, fontWeight: 600,
                      textDecoration: t.done ? 'line-through' : 'none',
                      textDecorationColor: 'var(--pc-ink4)',
                    }}
                  >
                    {t.title}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--pc-ink2)', marginTop: 2 }}>
                    {t.sub}
                  </div>
                </div>

                {/* Time indicator */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {t.done
                    ? <span style={{ fontSize: 13, color: 'var(--pc-ok)', fontWeight: 600 }}>{t.note}</span>
                    : <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pc-brand-deep)' }}>{t.due}</span>
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Saathi message card */}
          <div
            style={{
              marginTop: 16, padding: 16,
              background: 'var(--pc-surface)',
              borderRadius: 14, border: '0.5px solid var(--pc-hair)',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}
          >
            <SaathiMark size={28} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pc-ink2)' }}>
                Saathi ka sandesh
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 16, lineHeight: 1.45, color: 'var(--pc-ink)', fontStyle: 'italic' }}>
                &ldquo;Aaj bahut acha chal raha hai — 2 kaam pehle hi ho gaye.
                Lunch mein dal zaroor lena. 🙏&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* ── Bottom tab bar ── */}
        <div
          style={{
            padding: '10px 16px 30px',
            background: 'var(--pc-surface)',
            borderTop: '0.5px solid var(--pc-hair)',
            display: 'flex',
            justifyContent: 'space-around',
          }}
        >
          {[
            { label: 'Aaj',      icon: '☀️',  active: true },
            { label: 'Itihaas', icon: '📋',  active: false },
            { label: 'Saathi',  icon: '✨',  active: false },
            { label: 'Profile', icon: '👤',  active: false },
          ].map(({ label, icon, active }) => (
            <div
              key={label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                color: active ? 'var(--pc-brand)' : 'var(--pc-ink3)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 24 }}>{icon}</span>
              <span style={{ fontSize: 11.5, fontWeight: active ? 700 : 500 }}>{label}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
