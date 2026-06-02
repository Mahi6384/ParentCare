'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Props {
  instanceId: string
  taskTitle: string
  taskType: string
  photoUrl: string | null
  submissionId: string | null
}

type CheckStatus = 'done' | 'active' | 'pending'

// Checklist copy adapts to task type so it reads naturally for each task
const CHECKLIST_BY_TYPE: Record<string, string[]> = {
  diet:     ['Photo mili', 'Dishes pehchaan rahe hain', '14-din ke diet se compare', 'Rohan ko message bhej rahe hain'],
  medicine: ['Photo mili', 'Dawai ka label padh rahe hain', 'Dose history check kar rahe hain', 'Rohan ko result bhej rahe hain'],
  walk:     ['Photo mili', 'Location dekh rahe hain', 'Aaj ki activity compare kar rahe hain', 'Rohan ko result bhej rahe hain'],
  exercise: ['Photo mili', 'Exercise complete dekh rahe hain', 'Streak update kar rahe hain', 'Rohan ko result bhej rahe hain'],
  default:  ['Photo mili', 'Task check kar rahe hain', 'History compare kar rahe hain', 'Rohan ko result bhej rahe hain'],
}

export default function VerifyScreen({
  instanceId, taskTitle, taskType, photoUrl, submissionId,
}: Props) {
  const router = useRouter()
  const [statuses, setStatuses] = useState<CheckStatus[]>(['done', 'active', 'pending', 'pending'])
  const [complete, setComplete] = useState(false)

  const checklistItems = CHECKLIST_BY_TYPE[taskType] ?? CHECKLIST_BY_TYPE.default

  useEffect(() => {
    if (!submissionId) return

    // Animate the checklist in sequence to show Saathi "thinking"
    const t1 = setTimeout(() => setStatuses(['done', 'done', 'active', 'pending']), 2200)
    const t2 = setTimeout(() => setStatuses(['done', 'done', 'done',   'active']),  4800)

    // Poll ai_results every 3 seconds until the agent writes a result
    const supabase = createClient()
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('ai_results')
        .select('id')
        .eq('submission_id', submissionId)
        .limit(1)
        .single()

      if (data?.id) {
        clearInterval(poll)
        setStatuses(['done', 'done', 'done', 'done'])
        setComplete(true)
        setTimeout(() => router.push(`/parent/task/${instanceId}/result`), 700)
      }
    }, 3000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearInterval(poll)
    }
  }, [submissionId, instanceId, router])

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
          style={{ fontSize: 15, color: 'var(--pc-ink3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← {taskTitle}
        </Link>
      </div>

      {/* Photo with overlay */}
      {photoUrl && (
        <div style={{ margin: '24px 22px 0', position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
          <img
            src={photoUrl}
            alt="Submitted photo"
            style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
          />
          {!complete && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.48)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: '#fff', gap: 6,
            }}>
              <div style={{ fontFamily: 'var(--pc-mono)', fontSize: 12, letterSpacing: '0.08em', fontWeight: 700 }}>
                SAATHI DEKH RAHA HAI!
              </div>
              <div style={{ fontSize: 14, opacity: 0.85 }}>aapki photo padh raha hoon...</div>
            </div>
          )}
        </div>
      )}

      {/* Checklist card */}
      <div style={{ padding: '24px 22px 0' }}>
        <div className="pc-card" style={{ padding: '4px 20px' }}>
          {checklistItems.map((label, i) => {
            const status = statuses[i]
            return (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: i < checklistItems.length - 1 ? '0.5px solid var(--pc-hair-soft)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <StatusIcon status={status} />
                  <span style={{ fontSize: 15, color: status === 'pending' ? 'var(--pc-ink3)' : 'var(--pc-ink)' }}>
                    {label}
                  </span>
                </div>
                <span style={{
                  fontFamily: 'var(--pc-mono)', fontSize: 11, letterSpacing: '0.06em',
                  color: status === 'done' ? 'var(--pc-ok)' : status === 'active' ? 'var(--pc-brand)' : 'var(--pc-ink4)',
                }}>
                  {status === 'done' ? 'OK' : status === 'active' ? '...' : 'soon'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Retake hint — greyed out */}
      <div style={{ padding: '24px 22px 0', opacity: 0.45 }}>
        <div style={{ fontSize: 14, color: 'var(--pc-ink3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          📷 Doosri photo lijiye agar zaroorat ho
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'done') {
    return <span style={{ color: 'var(--pc-ok)', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>✓</span>
  }
  if (status === 'active') {
    return (
      <span style={{
        display: 'inline-block', width: 16, height: 16,
        border: '2px solid var(--pc-brand)', borderTopColor: 'transparent',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        flexShrink: 0,
      }} />
    )
  }
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16,
      border: '1.5px solid var(--pc-ink4)', borderRadius: '50%',
      flexShrink: 0,
    }} />
  )
}
