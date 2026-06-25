self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'ParentCare'
  const body  = data.body  ?? 'Saathi ka sandesh hai.'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data:  data.url ?? '/',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(url) && 'focus' in c)
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})
