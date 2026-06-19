'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

export function useNotificationSubscription() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') return

    async function subscribe() {
      // 1. Register the service worker if not already registered
      const reg = await navigator.serviceWorker.register('/sw.js')

      // 2. Check if already subscribed — no need to re-subscribe
      const existing = await reg.pushManager.getSubscription()
      if (existing) return

      // 3. Ask the parent for notification permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      // 4. Subscribe to the Push Service — PushManager accepts the raw base64url string
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: VAPID_PUBLIC_KEY,
      })

      // 5. Extract endpoint and keys from the subscription object
      const subJson  = sub.toJSON()
      const endpoint = sub.endpoint
      const keys     = subJson.keys ?? {}

      // 6. Save to Supabase — upsert so re-subscribing a device updates the row
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('push_subscriptions').upsert(
        { user_id: user.id, endpoint, keys_json: keys },
        { onConflict: 'user_id' }
      )
    }

    subscribe().catch(console.error)
  }, [])
}
