'use client'

/*
  CompleteTaskButtons — the Done / Couldn't-do-it pair for proof_type 'none'
  tasks. These tasks have no photo, so the parent just confirms the outcome.

  Two visual variants:
    'hero' — white-on-saffron, sits inside the dashboard hero card
    'row'  — compact, sits on the right of a task list row

  On click it POSTs to /api/instances/complete and refreshes the server
  components so the dashboard re-renders with the new status + streak.
*/

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/components/i18n/LanguageProvider'

export default function CompleteTaskButtons({
  instanceId,
  variant,
}: {
  instanceId: string
  variant: 'hero' | 'row'
}) {
  const router = useRouter()
  const { t } = useT()
  const [busy, setBusy] = useState(false)

  async function complete(outcome: 'done' | 'skip') {
    if (busy) return
    setBusy(true)
    const res = await fetch('/api/instances/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId, outcome }),
    })
    if (res.ok) {
      router.refresh()
    } else {
      setBusy(false)
    }
  }

  if (variant === 'hero') {
    return (
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => complete('done')}
          style={{
            flex: 1,
            background: 'var(--pc-surface)', color: 'var(--pc-brand-deep)',
            fontFamily: 'var(--pc-body)', fontSize: 17, fontWeight: 700,
            padding: '14px 0', borderRadius: 14, border: 'none',
            cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {busy ? t.dashboard.marking : `✓ ${t.dashboard.markDone}`}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => complete('skip')}
          style={{
            background: 'transparent', color: '#fff',
            fontFamily: 'var(--pc-body)', fontSize: 15, fontWeight: 600,
            padding: '14px 18px', borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.4)',
            cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          }}
        >
          {t.dashboard.notDone}
        </button>
      </div>
    )
  }

  // 'row' variant — compact, for the task list
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
      <button
        type="button"
        disabled={busy}
        onClick={() => complete('done')}
        style={{
          background: 'var(--pc-brand)', color: '#fff',
          fontFamily: 'var(--pc-body)', fontSize: 12.5, fontWeight: 600,
          padding: '7px 12px', borderRadius: 9, border: 'none',
          cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {busy ? t.dashboard.marking : `✓ ${t.dashboard.markDone}`}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => complete('skip')}
        style={{
          background: 'transparent', color: 'var(--pc-ink3)',
          fontFamily: 'var(--pc-body)', fontSize: 11.5, fontWeight: 500,
          padding: '2px 0', border: 'none',
          cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {t.dashboard.notDone}
      </button>
    </div>
  )
}
