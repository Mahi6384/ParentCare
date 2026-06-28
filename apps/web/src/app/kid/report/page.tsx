import { createClient } from '@/lib/supabase/server'
import KidNavBar from '@/components/kid/KidNavBar'
import SaathiMark from '@/components/ui/SaathiMark'
import ProgressCharts, { type Week } from '@/components/kid/ProgressCharts'
import Link from 'next/link'

/*
  Kid Progress page (/kid/report) — habit trends over the last 8 weeks.

  This replaces the old "weekly insight prose" placeholder. The data is built
  entirely from task_instances (real, reliable) rather than nutrition_json,
  which the live Gemini verifier never populates. Each task type becomes a
  category line, so Exercise and Diet (nutrition) progression are both visible.

  The Server Component owns the fetch + aggregation; ProgressCharts (client)
  only draws what we pass it.
*/

const WEEKS = 8
const WEEK_MS = 7 * 86_400_000
const DONE = new Set(['passed', 'flagged'])           // counts as "kept up"
const CATEGORY_KEYS = ['exercise', 'diet', 'walk', 'medicine', 'sleep', 'custom'] as const

export default async function KidProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: family }] = await Promise.all([
    supabase.from('users').select('name').eq('id', user!.id).single(),
    supabase.from('families').select('parent_id').eq('kid_id', user!.id).single(),
  ])

  // Window start = Monday-agnostic; we bucket relative to (now - 8 weeks).
  const now = Date.now()
  const windowStart = now - WEEKS * WEEK_MS

  const { data: instances } = family?.parent_id
    ? await supabase
        .from('task_instances')
        .select('due_at, status, tasks ( type )')
        .eq('parent_id', family.parent_id)
        .gte('due_at', new Date(windowStart).toISOString())
        .order('due_at', { ascending: true })
    : { data: [] }

  // ── Build 8 empty weekly buckets, oldest → newest ──────────────────────────
  const weeks: (Week & { total: number; done: number })[] = Array.from({ length: WEEKS }, (_, i) => {
    const start = new Date(windowStart + i * WEEK_MS)
    return {
      label:    start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      rate:     0,
      exercise: 0, diet: 0, walk: 0, medicine: 0, sleep: 0, custom: 0,
      total: 0, done: 0,
    }
  })

  // ── Fold each instance into its week + category ────────────────────────────
  for (const inst of instances ?? []) {
    const idx = Math.min(
      WEEKS - 1,
      Math.floor((new Date(inst.due_at).getTime() - windowStart) / WEEK_MS),
    )
    if (idx < 0) continue
    const w = weeks[idx]
    w.total += 1
    if (DONE.has(inst.status)) {
      w.done += 1
      const type = (inst.tasks as unknown as { type: string } | null)?.type
      const key = (CATEGORY_KEYS as readonly string[]).includes(type ?? '') ? type! : 'custom'
      w[key as (typeof CATEGORY_KEYS)[number]] += 1
    }
  }

  // Completion rate per week (rounded %). Weeks with no scheduled tasks stay 0.
  for (const w of weeks) {
    w.rate = w.total > 0 ? Math.round((w.done / w.total) * 100) : 0
  }

  const totalDone = weeks.reduce((s, w) => s + w.done, 0)
  const hasData = weeks.some(w => w.total > 0)

  return (
    <div style={{ background: 'var(--pc-bg)', minHeight: '100vh', color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)' }}>
      <KidNavBar activeTab="report" userName={profile?.name ?? ''} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <SaathiMark size={32} />
          <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
            Progress
          </h1>
        </div>
        <p style={{ color: 'var(--pc-ink2)', fontSize: 15, marginTop: 6, marginBottom: 32 }}>
          How your parent's habits have trended over the last 8 weeks
          {hasData && <> — <strong>{totalDone}</strong> tasks completed in that time.</>}
        </p>

        {/* No parent linked */}
        {!family?.parent_id && (
          <div style={{
            padding: 24, borderRadius: 14, textAlign: 'center',
            background: 'var(--pc-surface)', border: '0.5px solid var(--pc-hair)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔗</div>
            <div className="font-serif" style={{ fontSize: 18, marginBottom: 6 }}>No parent connected yet</div>
            <p style={{ color: 'var(--pc-ink3)', fontSize: 14 }}>Link your parent to start tracking trends.</p>
            <Link
              href="/kid/family"
              style={{
                display: 'inline-block', marginTop: 12, padding: '10px 20px', borderRadius: 10,
                background: 'var(--pc-brand)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600,
              }}
            >
              View family settings →
            </Link>
          </div>
        )}

        {/* Empty state — parent linked but no instances yet */}
        {family?.parent_id && !hasData && (
          <div style={{
            padding: 40, borderRadius: 16, textAlign: 'center',
            border: '0.5px solid var(--pc-hair)', background: 'var(--pc-surface)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
            <div className="font-serif" style={{ fontSize: 22, fontWeight: 500 }}>Not enough data yet</div>
            <p style={{ color: 'var(--pc-ink2)', marginTop: 8, fontSize: 15 }}>
              Once your parent starts completing tasks, their trends will appear here.
            </p>
          </div>
        )}

        {/* Charts */}
        {family?.parent_id && hasData && <ProgressCharts weeks={weeks} />}
      </div>
    </div>
  )
}
