import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

/*
  push.ts — the single place that sends a Web Push notification.

  Owns the VAPID configuration (done once at module load) so that any caller
  that imports sendPushToUser automatically has push configured. Both the
  Nudge Agent (executor.ts) and the reminder sweep use this — no duplicate
  webpush wiring anywhere else.
*/

// VAPID identifies *us* as the legitimate sender to the browser's push service.
// Without it the push service rejects the request. Optional in dev: if the keys
// aren't set we just log and every send becomes a no-op rather than crashing.
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  const email = process.env.VAPID_EMAIL ?? 'noreply@parentcare.app'
  webpush.setVapidDetails(
    email.startsWith('mailto:') ? email : `mailto:${email}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
} else {
  console.warn('[push] web-push disabled — VAPID keys not set')
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface PushPayload {
  title: string
  body: string
  url?: string // where tapping the notification takes the user; defaults to dashboard
}

/*
  Sends `payload` to every device the user has registered.
  Returns ok:false / 'no_subscription' when the user has no registered device
  (e.g. hasn't installed the PWA / granted permission yet) so the caller can
  decide whether to retry later.
*/
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ ok: boolean; reason?: string }> {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, keys_json')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) {
    return { ok: false, reason: 'no_subscription' }
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/parent/dashboard',
  })

  // allSettled: one expired device shouldn't stop the others from receiving it.
  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys_json as { p256dh: string; auth: string } },
        body,
      ),
    ),
  )

  return { ok: true }
}
