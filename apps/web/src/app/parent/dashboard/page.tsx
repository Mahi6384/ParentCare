import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SaathiMark from '@/components/ui/SaathiMark'
import NotificationSubscriber from './NotificationSubscriber'
import { getDict } from '@/lib/i18n/server'
import CompleteTaskButtons from '@/components/parent/CompleteTaskButtons'

/*
  Parent Dashboard — ParentHome artboard (artboard #06 in the design).

  Design decisions:
  - Max-width 430px, centred — mirrors the iOS PWA frame in the design.
  - All UI text comes from the i18n dictionary (English default, Hindi toggle
    in Profile). The parent-facing copy is warm and non-technical.
  - Hero card: full-width saffron card for the top pending task.
    This is what the parent should do RIGHT NOW.
  - Task list: remaining tasks, done ones greyed out at 65% opacity.
  - Saathi message: brief, encouraging, derived from real task counts.
  - Bottom tab bar: Today / History / Profile.

  Tasks are real task_instances joined to tasks, scoped to today (UTC window).
*/

export default async function ParentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Dictionary for the parent's chosen language (cookie-driven).
  const t = await getDict()

  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', user!.id)
    .single()

  // Derive first name for the greeting ("Hello, Ramesh 🙏")
  const firstName = profile?.name?.split(' ')[0] ?? 'Papa'

  // Day display — e.g. "SAT · 16 AUG" (day/month names come from the dictionary)
  const today  = new Date()
  const dayStr = `${t.dashboard.days[today.getDay()]} · ${today.getDate()} ${t.dashboard.months[today.getMonth()]}`

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
        type,
        proof_type
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

  // Turn a raw task_status enum into a friendly, localized label.
  // Falls back to the raw value for the (non-terminal) statuses not in the map.
  const statusLabels = t.status as Record<string, string>
  const statusLabel = (s: string) => statusLabels[s] ?? s

  // Map DB rows → the shape the existing UI already expects.
  // "done" = any terminal status; only pending/in_progress are still actionable.
  const tasks = (instances ?? []).map(instance => {
    const task = instance.tasks as unknown as { title: string; type: string; proof_type: string }
    const dueTime = new Date(instance.due_at).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    })
    const done = !['pending', 'in_progress'].includes(instance.status)
    // Sub-label tells the parent what kind of completion this task expects.
    const subLabel = task.type === 'exercise'
      ? t.dashboard.exerciseCoach
      : task.proof_type === 'none'
        ? t.dashboard.noProof
        : t.dashboard.photoVerification
    return {
      id:        instance.id,
      type:      task.type,
      proofType: task.proof_type,
      title:     task.title,
      sub:   done ? statusLabel(instance.status) : `${dueTime} · ${subLabel}`,
      icon:  taskTypeIcons[task.type] ?? '✅',
      done,
      note:  done ? statusLabel(instance.status) : undefined,
      due:   done ? undefined : dueTime,
    }
  })

  const completed = tasks.filter(t => t.done).length
  const nextTask  = tasks.find(t => !t.done)

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: 'var(--pc-bg)', color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)' }}
    >
      <NotificationSubscriber />
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
              {' '}{t.dashboard.streakSuffix}
            </div>
          </div>

          {/* Large serif greeting */}
          <div
            className="font-serif font-medium text-[34px] text-ink"
            style={{ letterSpacing: '-0.03em', lineHeight: 1.1, marginTop: 14 }}
          >
            {t.dashboard.greeting(firstName)}
          </div>

          {/* Status subtitle */}
          <div style={{ marginTop: 6, fontSize: 17, color: 'var(--pc-ink2)', lineHeight: 1.4 }}>
            <b style={{ color: 'var(--pc-ok)' }}>{t.dashboard.tasksDone(completed)}</b>.
            {nextTask
              ? t.dashboard.nextHint(nextTask.title)
              : t.dashboard.allDone}
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

              {/* "do now" label */}
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
                {t.dashboard.doNow}
              </div>

              {/* Task title */}
              <div
                className="font-serif font-medium"
                style={{ fontSize: 30, letterSpacing: '-0.02em', marginTop: 8, lineHeight: 1.1 }}
              >
                {nextTask.title}
              </div>
              <div style={{ fontSize: 16, opacity: 0.9, marginTop: 6, lineHeight: 1.4 }}>
                {nextTask.sub}{t.dashboard.guideSuffix}
              </div>

              {/* CTA — no-proof tasks get Done/Couldn't-do-it buttons; exercise
                  goes to the coach; everything else goes to the photo submit flow. */}
              {nextTask.proofType === 'none' && nextTask.type !== 'exercise' ? (
                <CompleteTaskButtons instanceId={nextTask.id} variant="hero" />
              ) : (
                <Link
                  href={nextTask.type === 'exercise'
                    ? `/parent/task/${nextTask.id}/coach`
                    : `/parent/submit/${nextTask.id}`
                  }
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
                  {t.dashboard.startCta}
                </Link>
              )}
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
            {t.dashboard.otherTasks}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks.map(task => {
              // No-proof, non-exercise tasks complete with inline buttons (no photo);
              // those rows aren't links. Everything else links to its flow.
              const tapToComplete = !task.done && task.proofType === 'none' && task.type !== 'exercise'

              const card = (
                <div
                  style={{
                    background: 'var(--pc-surface)',
                    borderRadius: 16,
                    padding: '14px 16px',
                    border: '0.5px solid var(--pc-hair)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    opacity: task.done ? 0.65 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {/* Icon tile */}
                  <div
                    style={{
                      width: 46, height: 46, borderRadius: 12,
                      background: task.done ? 'var(--pc-surface2)' : 'var(--pc-brand-tint)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: task.done ? 20 : 22,
                    }}
                  >
                    {task.done ? '✓' : task.icon}
                  </div>

                  {/* Task info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 18, fontWeight: 600,
                        textDecoration: task.done ? 'line-through' : 'none',
                        textDecorationColor: 'var(--pc-ink4)',
                      }}
                    >
                      {task.title}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--pc-ink2)', marginTop: 2 }}>
                      {task.sub}
                    </div>
                  </div>

                  {/* Right side — inline Done/Not-done for no-proof tasks, else time/status */}
                  {tapToComplete ? (
                    <CompleteTaskButtons instanceId={task.id} variant="row" />
                  ) : (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {task.done
                        ? <span style={{ fontSize: 13, color: 'var(--pc-ok)', fontWeight: 600 }}>{task.note}</span>
                        : <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pc-brand-deep)' }}>{task.due}</span>
                      }
                    </div>
                  )}
                </div>
              )

              // Tap-to-complete rows must NOT be wrapped in a link (the buttons
              // handle the action); all other rows link to their flow.
              return tapToComplete ? (
                <div key={task.id}>{card}</div>
              ) : (
                <Link
                  key={task.id}
                  href={task.done ? '#' : task.type === 'exercise'
                    ? `/parent/task/${task.id}/coach`
                    : `/parent/submit/${task.id}`
                  }
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  {card}
                </Link>
              )
            })}
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
                {t.dashboard.saathiTitle}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 16, lineHeight: 1.45, color: 'var(--pc-ink)', fontStyle: 'italic' }}>
                &ldquo;{t.dashboard.saathiMessage(completed, tasks.length)}&rdquo;
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
            { label: t.nav.today,   icon: '☀️', href: '/parent/dashboard', active: true  },
            { label: t.nav.history, icon: '📋', href: '/parent/itihaas',   active: false },
            { label: t.nav.profile, icon: '👤', href: '/parent/profile',   active: false },
          ].map(({ label, icon, href, active }) => (
            <Link
              key={label}
              href={href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                color: active ? 'var(--pc-brand)' : 'var(--pc-ink3)',
                textDecoration: 'none',
                flex: 1,
              }}
            >
              <span style={{ fontSize: 24 }}>{icon}</span>
              <span style={{ fontSize: 11.5, fontWeight: active ? 700 : 500 }}>{label}</span>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
