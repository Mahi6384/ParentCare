'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/*
  OverrideControl — the kid's manual override on a single task instance.

  Client Component because it needs onClick + a loading state + a refresh.
  It's intentionally tiny and self-contained: it POSTs to /api/instances/override
  and, on success, calls router.refresh() so the Server Component dashboard
  re-renders with the new status. No local result state to keep in sync — the
  server stays the source of truth.
*/

type Result = 'passed' | 'flagged' | 'failed'

const OPTIONS: { value: Result; label: string; color: string }[] = [
  { value: 'passed',  label: 'Verified', color: 'var(--pc-ok)'   },
  { value: 'flagged', label: 'Flag',     color: 'var(--pc-warn)' },
  { value: 'failed',  label: 'Failed',   color: 'var(--pc-bad)'  },
]

// Map the current instance status onto one of the three override values so we
// can highlight which one is active. submitted/pending have no active result.
const STATUS_TO_RESULT: Record<string, Result | undefined> = {
  passed:  'passed',
  flagged: 'flagged',
  failed:  'failed',
  skipped: 'failed',
}

export default function OverrideControl({
  instanceId,
  status,
}: {
  instanceId: string
  status: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = STATUS_TO_RESULT[status]

  async function override(result: Result) {
    if (saving || result === active) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/instances/override', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ instanceId, result }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(error ?? 'Failed')
      }
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          alignSelf: 'flex-start', marginTop: 6,
          fontSize: 11.5, fontWeight: 500, color: 'var(--pc-ink3)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          textDecoration: 'underline', textUnderlineOffset: 2,
        }}
      >
        Override result
      </button>
    )
  }

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--pc-ink3)' }}>Set result:</span>
        {OPTIONS.map(opt => {
          const isActive = opt.value === active
          return (
            <button
              key={opt.value}
              type="button"
              disabled={saving || isActive}
              onClick={() => override(opt.value)}
              style={{
                fontSize: 11.5, fontWeight: 600,
                padding: '4px 10px', borderRadius: 99,
                cursor: saving || isActive ? 'default' : 'pointer',
                color: isActive ? '#fff' : opt.color,
                background: isActive ? opt.color : 'var(--pc-surface)',
                border: `0.5px solid ${opt.color}`,
                opacity: saving && !isActive ? 0.5 : 1,
              }}
            >
              {opt.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          style={{
            fontSize: 11, color: 'var(--pc-ink3)', background: 'none',
            border: 'none', cursor: 'pointer', padding: '4px 4px',
          }}
        >
          Cancel
        </button>
      </div>
      {error && <span style={{ fontSize: 11, color: 'var(--pc-bad)' }}>{error}</span>}
    </div>
  )
}
