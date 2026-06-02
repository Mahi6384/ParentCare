import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ResultPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: instance } = await supabase
    .from('task_instances')
    .select('id, tasks ( title, type )')
    .eq('id', id)
    .eq('parent_id', user!.id)
    .single()

  if (!instance) notFound()

  const task = instance.tasks as unknown as { title: string; type: string }

  // Latest submission for this instance, joined with its AI result
  const { data: submission } = await supabase
    .from('submissions')
    .select('id, photo_url, submitted_at, ai_results ( result, confidence, reasoning )')
    .eq('task_instance_id', id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single()

  type AIResult = { result: string; confidence: number; reasoning: string }
  const aiResult = submission?.ai_results as unknown as AIResult | null

  // Highest streak for this parent across all tasks
  const { data: streakRow } = await supabase
    .from('streaks')
    .select('current_streak')
    .eq('parent_id', user!.id)
    .order('current_streak', { ascending: false })
    .limit(1)
    .single()

  const streak = streakRow?.current_streak ?? 0
  const passed = !aiResult || aiResult.result === 'passed'

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--pc-bg)',
      color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)',
      maxWidth: 430, margin: '0 auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Back nav */}
      <div style={{ padding: '54px 22px 0' }}>
        <Link
          href="/parent/dashboard"
          style={{ fontSize: 15, color: 'var(--pc-ink3)', textDecoration: 'none' }}
        >
          ← Wapas
        </Link>
      </div>

      {/* Submitted photo */}
      {submission?.photo_url && (
        <div style={{ margin: '20px 22px 0', borderRadius: 16, overflow: 'hidden' }}>
          <img
            src={submission.photo_url}
            alt="Submitted photo"
            style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Result card */}
      <div style={{ padding: '20px 22px 0' }}>
        <div className="pc-card" style={{ padding: 22 }}>
          {/* Status dot + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: passed ? 'var(--pc-ok)' : 'var(--pc-bad)', flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'var(--pc-mono)', fontSize: 11, letterSpacing: '0.08em', fontWeight: 700,
              color: passed ? 'var(--pc-ok)' : 'var(--pc-bad)',
            }}>
              {passed ? 'HO GAYA, PAPA' : 'DOBARA KOSHISH KAREIN'}
            </span>
          </div>

          {/* Main message */}
          <div className="font-serif" style={{ fontSize: 22, lineHeight: 1.3, marginBottom: 12 }}>
            {passed
              ? `${task.title} bahut accha hua! 🎉`
              : 'Koi baat nahi — kal phir try karein.'}
          </div>

          {/* Agent reasoning */}
          {aiResult?.reasoning && (
            <div style={{ fontSize: 14, color: 'var(--pc-ink2)', lineHeight: 1.6, marginBottom: 18 }}>
              {aiResult.reasoning}
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 10 }}>
            {aiResult?.confidence != null && (
              <StatChip label="CONFIDENCE" value={aiResult.confidence.toFixed(2)} />
            )}
            {streak > 0 && (
              <StatChip label="STREAK" value={`⚡ ${streak} din`} highlight />
            )}
          </div>
        </div>
      </div>

      {/* Saathi message */}
      {passed && (
        <div style={{ padding: '16px 22px 0' }}>
          <div style={{
            padding: '14px 16px', borderRadius: 14,
            background: 'var(--pc-brand-tint)',
            border: '0.5px solid var(--pc-brand-soft)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--pc-brand)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              S
            </div>
            <div style={{ fontSize: 14, color: 'var(--pc-brand-deep)', fontStyle: 'italic', lineHeight: 1.55 }}>
              "Rohan ko aapki photo bhej di hai. Bahut achha kiya aaj!"
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ padding: '24px 22px 44px', marginTop: 'auto' }}>
        <Link
          href="/parent/dashboard"
          style={{
            display: 'block', width: '100%', padding: '18px 0',
            background: 'var(--pc-brand)', color: '#fff',
            borderRadius: 16, textDecoration: 'none',
            fontSize: 17, fontWeight: 700, textAlign: 'center',
          }}
        >
          Theek hai
        </Link>
      </div>
    </div>
  )
}

function StatChip({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      flex: 1, padding: '10px 12px', textAlign: 'center',
      background: 'var(--pc-surface2)', borderRadius: 10,
    }}>
      <div style={{ fontFamily: 'var(--pc-mono)', fontSize: 10, color: 'var(--pc-ink3)', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--pc-mono)', fontSize: 18, fontWeight: 700, marginTop: 3,
        color: highlight ? 'var(--pc-brand)' : 'var(--pc-ink)',
      }}>
        {value}
      </div>
    </div>
  )
}
