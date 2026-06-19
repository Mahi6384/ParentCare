'use client'

import { useNotificationSubscription } from '@/hooks/useNotificationSubscription'

export default function NotificationSubscriber() {
  useNotificationSubscription()
  return null
}
