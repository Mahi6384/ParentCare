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

export default function VerifyScreen({
  instanceId, taskTitle, photoUrl, submissionId,
}: Props) {
  const router = useRouter()
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!submissionId) return

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
        setDone(true)
        setTimeout(() => router.push(`/parent/task/${instanceId}/result`), 400)
      }
    }, 3000)

    return () => clearInterval(poll)
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

      {/* Photo */}
      {photoUrl && (
        <div style={{ margin: '24px 22px 0', borderRadius: 16, overflow: 'hidden' }}>
          <img
            src={photoUrl}
            alt="Submitted photo"
            style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Status card */}
      <div style={{ padding: '24px 22px 0' }}>
        <div className="pc-card" style={{
          padding: '28px 24px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 16, textAlign: 'center',
        }}>
          {done ? (
            <span style={{ fontSize: 36 }}>✓</span>
          ) : (
            <span style={{
              display: 'inline-block', width: 32, height: 32,
              border: '3px solid var(--pc-brand)', borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'spin 0.9s linear infinite',
            }} />
          )}
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--pc-ink)' }}>
              {done ? 'Ho gaya!' : 'Saathi dekh raha hai...'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--pc-ink3)', marginTop: 6 }}>
              {done
                ? 'Result aa gaya, redirect ho rahe hain'
                : 'Aapki photo analyze ho rahi hai. Isme 1–2 minute lag sakte hain.'}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
