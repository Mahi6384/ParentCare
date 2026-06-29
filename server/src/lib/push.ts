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
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys_json as { p256dh: string; auth: string } },
        body,
      ),
    ),
  )

  // Tally what actually went out, and collect dead endpoints to prune.
  // 404/410 from the push service means the subscription is gone (PWA
  // uninstalled, permission revoked, key rotated) — deleting it stops us
  // retrying a device that will never receive again.
  let delivered = 0
  const expiredEndpoints: string[] = []

  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      delivered++
      return
    }
    const statusCode = (r.reason as { statusCode?: number })?.statusCode
    if (statusCode === 404 || statusCode === 410) {
      expiredEndpoints.push(subs[i].endpoint)
    } else {
      console.error('[push] send failed:', (r.reason as Error)?.message ?? r.reason)
    }
  })

  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .in('endpoint', expiredEndpoints)
    console.log(`[push] pruned ${expiredEndpoints.length} dead subscription(s) for ${userId}`)
  }

  // Only a real delivery counts as success — otherwise the caller (e.g. the
  // reminder sweep) would stamp reminder_sent_at and never retry a push that
  // never arrived.
  if (delivered === 0) {
    return { ok: false, reason: 'all_sends_failed' }
  }

  return { ok: true }
}
