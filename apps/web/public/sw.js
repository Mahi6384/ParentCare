self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'ParentCare'
  const body  = data.body  ?? 'Saathi ka sandesh hai.'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  '/icons/icon-192x192.png',
      // badge = the small status-bar glyph. Android keeps only the
      // alpha channel and tints it, so this must be a monochrome,
      // transparent-background asset — not the full-colour app icon.
      badge: '/icons/badge-96x96.png',
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
