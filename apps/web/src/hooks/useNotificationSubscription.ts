'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

// The Push API expects the VAPID key as raw bytes. Some browsers reject a
// base64url *string*, so we convert it ourselves. Converting also lets us
// compare against an existing subscription's key to detect a key rotation.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

// True if an existing subscription was made with the SAME VAPID key we use now.
function sameKey(existing: ArrayBuffer | null | undefined, current: Uint8Array): boolean {
  if (!existing) return false
  const a = new Uint8Array(existing)
  if (a.length !== current.length) return false
  return a.every((byte, i) => byte === current[i])
}

export function useNotificationSubscription() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') return

    async function subscribe() {
      // 1. Register the service worker if not already registered
      const reg = await navigator.serviceWorker.register('/sw.js')
      const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)

      // 2. Reuse an existing browser subscription if there is one...
      let sub = await reg.pushManager.getSubscription()

      // ...UNLESS it was created with a different VAPID key (e.g. we rotated
      // keys). Such a subscription can never receive our pushes — the push
      // service rejects the JWT — so drop it and re-subscribe below.
      if (sub && !sameKey(sub.options.applicationServerKey, appServerKey)) {
        await sub.unsubscribe()
        sub = null
      }

      if (!sub) {
        // 3. Ask the parent for permission (unless already granted), then subscribe.
        if (
          Notification.permission !== 'granted' &&
          (await Notification.requestPermission()) !== 'granted'
        ) return

        // 4. Subscribe to the Push Service with the current VAPID key (as bytes)
        sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: appServerKey,
        })
      }

      // 5. Extract keys from the subscription object
      const { keys } = sub.toJSON()

      // 6. Save to Supabase — upsert keyed on (user_id, endpoint) so re-subscribing
      //    the same device updates its existing row.
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('push_subscriptions').upsert(
        { user_id: user.id, endpoint: sub.endpoint, keys_json: keys ?? {} },
        { onConflict: 'user_id,endpoint' },
      )
    }

    subscribe().catch(console.error)
  }, [])
}
