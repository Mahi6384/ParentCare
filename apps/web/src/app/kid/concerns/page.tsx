import { createClient } from '@/lib/supabase/server'
import KidNavBar from '@/components/kid/KidNavBar'
import SaathiMark from '@/components/ui/SaathiMark'
import Link from 'next/link'

const SEVERITY_CONFIG = {
  critical: { label: 'Critical',  bg: '#fef2f2', border: '#fca5a5', dot: '#dc2626', text: '#991b1b' },
  high:     { label: 'High',      bg: '#fff7ed', border: '#fdba74', dot: '#ea580c', text: '#9a3412' },
  medium:   { label: 'Medium',    bg: '#fefce8', border: '#fde047', dot: '#ca8a04', text: '#713f12' },
  low:      { label: 'Low',       bg: '#f0fdf4', border: '#86efac', dot: '#16a34a', text: '#14532d' },
} as const

const CONCERN_ICONS: Record<string, string> = {
  nutrition:  '🍽️',
  medication: '💊',
  mobility:   '🦵',
  sleep:      '😴',
  other:      '⚠️',
}

export default async function KidConcernsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: family }] = await Promise.all([
    supabase.from('users').select('name').eq('id', user!.id).single(),
    supabase.from('families').select('parent_id').eq('kid_id', user!.id).single(),
  ])

  const { data: concerns } = family?.parent_id
    ? await supabase
        .from('health_concerns')
        .select('id, concern_type, description, severity, acknowledged, created_at')
        .eq('parent_id', family.parent_id)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  const unacknowledged = (concerns ?? []).filter(c => !c.acknowledged).length

  return (
    <div style={{ background: 'var(--pc-bg)', minHeight: '100vh', color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)' }}>
      <KidNavBar activeTab="concerns" userName={profile?.name ?? ''} badge={unacknowledged || undefined} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <SaathiMark size={32} />
          <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
            Health Concerns
          </h1>
        </div>
        <p style={{ color: 'var(--pc-ink2)', fontSize: 15, marginTop: 6, marginBottom: 32 }}>
          Saathi flags these automatically when it spots worrying patterns in your parent's tasks.
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
        {family?.parent_id && (!concerns || concerns.length === 0) && (
          <div style={{
            padding: 40, borderRadius: 16, textAlign: 'center',
            border: '0.5px solid var(--pc-hair)', background: 'var(--pc-surface)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
            <div className="font-serif" style={{ fontSize: 22, fontWeight: 500 }}>No concerns flagged</div>
            <p style={{ color: 'var(--pc-ink2)', marginTop: 8, fontSize: 15 }}>
              Saathi will flag patterns here automatically — low protein, missed medicines, low activity.
            </p>
          </div>
        )}

        {/* Concern cards */}
        {(concerns ?? []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {concerns!.map(concern => {
              const cfg = SEVERITY_CONFIG[concern.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low
              const icon = CONCERN_ICONS[concern.concern_type] ?? '⚠️'
              const date = new Date(concern.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })

              return (
                <div
                  key={concern.id}
                  style={{
                    padding: 20, borderRadius: 14,
                    background: cfg.bg, border: `0.5px solid ${cfg.border}`,
                    opacity: concern.acknowledged ? 0.55 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>{icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                          color: cfg.text, background: cfg.border,
                          padding: '2px 8px', borderRadius: 99,
                        }}>
                          {cfg.label}
                        </span>
                        <span style={{ fontSize: 11.5, color: 'var(--pc-ink3)', textTransform: 'capitalize' }}>
                          {concern.concern_type.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--pc-ink3)', marginLeft: 'auto' }}>
                          {date}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: cfg.text }}>
                        {concern.description}
                      </p>
                      {concern.acknowledged && (
                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--pc-ink3)' }}>
                          ✓ Acknowledged
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
