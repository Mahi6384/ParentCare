import { createClient } from '@/lib/supabase/server'
import KidNavBar from '@/components/kid/KidNavBar'
import SaathiMark from '@/components/ui/SaathiMark'
import Link from 'next/link'

/*
  Kid Activity Log — a read-only audit trail of every autonomous decision
  Saathi (the agent) has made for this family. Each row in `agent_decisions`
  is one agent run: which loop fired, what triggered it, which tools it
  called, and its final reasoning. Turning that into a visible feed is what
  makes an autonomous agent trustworthy instead of a black box.

  Data is written server-side by the verification + nudge agents. RLS policy
  "agent_decisions: kid reads own family" lets the signed-in kid read only
  their own family's rows, so this server-side read is safe.
*/

const LOOP_CONFIG: Record<string, { label: string; icon: string; tint: string; soft: string; ink: string }> = {
  verification: { label: 'Verification', icon: '🔍', tint: '#eff6ff', soft: '#bfdbfe', ink: '#1e40af' },
  nudge:        { label: 'Morning Nudge', icon: '☀️', tint: '#fff7ed', soft: '#fed7aa', ink: '#9a3412' },
  coach:        { label: 'Exercise Coach', icon: '🏃', tint: '#f0fdf4', soft: '#bbf7d0', ink: '#166534' },
  insight:      { label: 'Weekly Insight', icon: '📊', tint: '#faf5ff', soft: '#e9d5ff', ink: '#6b21a8' },
}

// Tools the agent can call → friendly labels for the pills.
const TOOL_LABELS: Record<string, string> = {
  get_parent_history:       'Read history',
  get_nutrition_trend:      'Checked nutrition',
  get_missed_tasks:         'Checked missed tasks',
  get_family_context:       'Read family',
  get_health_profile:       'Read health profile',
  generate_exercise_routine: 'Built routine',
  generate_meal_plan:       'Built meal plan',
  verify_photo:             'Examined photo',
  read_medication_label:    'Read label',
  send_kid_alert:           'Alerted you',
  trigger_fullscreen_alert: 'Pushed alert',
  update_task_result:       'Recorded result',
  schedule_followup:        'Scheduled follow-up',
  suggest_task:             'Suggested a task',
  flag_health_concern:      'Flagged concern',
  add_agent_note:           'Saved a note',
}

export default async function KidActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: family }] = await Promise.all([
    supabase.from('users').select('name').eq('id', user!.id).single(),
    supabase.from('families').select('id, parent_id').eq('kid_id', user!.id).single(),
  ])

  const { data: decisions } = family?.id
    ? await supabase
        .from('agent_decisions')
        .select('id, loop_type, trigger_event, tools_called, reasoning, created_at')
        .eq('family_id', family.id)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  return (
    <div style={{ background: 'var(--pc-bg)', minHeight: '100vh', color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)' }}>
      <KidNavBar activeTab="activity" userName={profile?.name ?? ''} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <SaathiMark size={32} />
          <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
            Activity
          </h1>
        </div>
        <p style={{ color: 'var(--pc-ink2)', fontSize: 15, marginTop: 6, marginBottom: 32 }}>
          Every decision Saathi has made for your parent — what it looked at, what it did, and why.
        </p>

        {/* No parent linked */}
        {!family?.parent_id && (
          <div style={{
            padding: 24, borderRadius: 14, textAlign: 'center',
            background: 'var(--pc-surface)', border: '0.5px solid var(--pc-hair)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔗</div>
            <div className="font-serif" style={{ fontSize: 18, marginBottom: 6 }}>No parent connected yet</div>
            <p style={{ color: 'var(--pc-ink3)', fontSize: 14 }}>
              Share your invite code to link your parent.
            </p>
            <Link
              href="/kid/family"
              style={{
                display: 'inline-block', marginTop: 12,
                padding: '10px 20px', borderRadius: 10,
                background: 'var(--pc-brand)', color: '#fff',
                textDecoration: 'none', fontSize: 14, fontWeight: 600,
              }}
            >
              View family settings →
            </Link>
          </div>
        )}

        {/* Empty state */}
        {family?.parent_id && (!decisions || decisions.length === 0) && (
          <div style={{
            padding: 40, borderRadius: 16, textAlign: 'center',
            border: '0.5px solid var(--pc-hair)', background: 'var(--pc-surface)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🪷</div>
            <div className="font-serif" style={{ fontSize: 22, fontWeight: 500 }}>No activity yet</div>
            <p style={{ color: 'var(--pc-ink2)', marginTop: 8, fontSize: 15 }}>
              When Saathi verifies a photo or checks in each morning, you'll see exactly what it did here.
            </p>
          </div>
        )}

        {/* Decision feed */}
        {(decisions ?? []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {decisions!.map(d => {
              const cfg = LOOP_CONFIG[d.loop_type] ?? { label: d.loop_type, icon: '🤖', tint: 'var(--pc-surface)', soft: 'var(--pc-hair)', ink: 'var(--pc-ink)' }
              const tools = Array.isArray(d.tools_called) ? (d.tools_called as string[]) : []
              const when = new Date(d.created_at).toLocaleString('en-IN', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })

              return (
                <div
                  key={d.id}
                  style={{
                    padding: 20, borderRadius: 14,
                    background: 'var(--pc-surface)', border: '0.5px solid var(--pc-hair)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ fontSize: 26, flexShrink: 0, marginTop: 2 }}>{cfg.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                          color: cfg.ink, background: cfg.tint, border: `0.5px solid ${cfg.soft}`,
                          padding: '2px 8px', borderRadius: 99,
                        }}>
                          {cfg.label}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--pc-ink3)', marginLeft: 'auto' }}>
                          {when}
                        </span>
                      </div>

                      {d.reasoning && (
                        <p style={{ margin: '0 0 10px', fontSize: 14.5, lineHeight: 1.6, color: 'var(--pc-ink)' }}>
                          {d.reasoning}
                        </p>
                      )}

                      {tools.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {tools.map((t, i) => (
                            <span
                              key={`${t}-${i}`}
                              style={{
                                fontSize: 11.5, fontWeight: 500,
                                color: 'var(--pc-ink2)', background: 'var(--pc-surface2)',
                                border: '0.5px solid var(--pc-hair)',
                                padding: '3px 9px', borderRadius: 99,
                              }}
                            >
                              {TOOL_LABELS[t] ?? t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
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
