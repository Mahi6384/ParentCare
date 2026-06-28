'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/*
  KidRealtime — live updates on the kid's dashboard, no polling.

  Why Supabase Realtime (not Socket.io): the whole app already runs on
  Supabase, and Realtime streams Postgres changes over a single WebSocket,
  honouring the same RLS policies as our normal reads. Standing up a separate
  Socket.io server would mean a second source of truth and a second auth path
  for zero extra benefit here.

  Two subscriptions, both filtered server-side by Postgres so the browser only
  receives its own rows:
    1. notifications INSERT (user_id = this kid)  → pop a toast
    2. task_instances UPDATE (parent_id)          → refresh the feed, so a
       verification result appears the moment Saathi finishes, no reload.

  RLS still applies on the socket: 'notifications: own' and the kid's
  task_instances read policy mean a forged filter can't leak another family's
  rows.
*/

export default function KidRealtime({
  kidId,
  parentId,
}: {
  kidId: string
  parentId?: string
}) {
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`kid-realtime-${kidId}`)

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${kidId}` },
      (payload) => {
        const message = (payload.new as { message?: string }).message
        if (message) setToast(message)
        router.refresh()
      },
    )

    if (parentId) {
      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'task_instances', filter: `parent_id=eq.${parentId}` },
        () => router.refresh(),
      )
    }

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [kidId, parentId, router])

  // Auto-dismiss the toast after a few seconds.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast])

  if (!toast) return null

  return (
    <div
      role="status"
      onClick={() => setToast(null)}
      style={{
        position: 'fixed', right: 20, bottom: 20, zIndex: 50, cursor: 'pointer',
        maxWidth: 360, padding: '14px 16px', borderRadius: 14,
        background: 'var(--pc-surface)', border: '0.5px solid var(--pc-brand-soft)',
        boxShadow: '0 8px 28px rgba(31,24,18,0.16)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        fontFamily: 'var(--pc-body)',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>🪷</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pc-brand-deep)', marginBottom: 2 }}>
          Saathi
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--pc-ink)' }}>{toast}</div>
      </div>
    </div>
  )
}
