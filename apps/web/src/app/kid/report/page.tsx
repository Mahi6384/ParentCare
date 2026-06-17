import { createClient } from '@/lib/supabase/server'
import KidNavBar from '@/components/kid/KidNavBar'
import SaathiMark from '@/components/ui/SaathiMark'

export default async function KidReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', user!.id)
    .single()

  return (
    <div style={{ background: 'var(--pc-bg)', minHeight: '100vh', color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)' }}>
      <KidNavBar activeTab="report" userName={profile?.name ?? ''} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <SaathiMark size={32} />
          <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
            Weekly Report
          </h1>
        </div>
        <p style={{ color: 'var(--pc-ink2)', fontSize: 16, marginTop: 8 }}>
          A weekly AI-generated summary of your parent's health habits, trends, and recommendations.
        </p>

        <div
          style={{
            marginTop: 40, padding: 32, borderRadius: 16,
            border: '0.5px solid var(--pc-hair)', background: 'var(--pc-surface)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div className="font-serif" style={{ fontSize: 22, fontWeight: 500, color: 'var(--pc-ink)' }}>
            No reports yet
          </div>
          <p style={{ color: 'var(--pc-ink2)', marginTop: 8, fontSize: 15 }}>
            Weekly reports are coming in Phase 3 — Saathi will generate personalised health summaries every Sunday.
          </p>
        </div>
      </div>
    </div>
  )
}
