// Shown immediately on navigation while the server component fetches data.
// Next.js wraps this in a Suspense boundary at the route segment level.
export default function NewTaskLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--pc-bg)' }}>
      {/* Nav bar height placeholder */}
      <div style={{ height: 60, background: 'var(--pc-surface)', borderBottom: '0.5px solid var(--pc-hair)' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, padding: '24px 28px 60px' }}>

        {/* Left — form skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ height: 14, width: 120, borderRadius: 6, background: 'var(--pc-surface)' }} />
          <div style={{ height: 36, width: 260, borderRadius: 8, background: 'var(--pc-surface)' }} />
          <div style={{ height: 18, width: 380, borderRadius: 6, background: 'var(--pc-surface)' }} />

          {/* Template picker skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginTop: 8 }}>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                style={{ height: 86, borderRadius: 12, background: 'var(--pc-surface)', border: '0.5px solid var(--pc-hair)' }}
              />
            ))}
          </div>
        </div>

        {/* Right — sidebar skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ height: 220, borderRadius: 12, background: 'var(--pc-surface)', border: '0.5px solid var(--pc-hair)' }} />
          <div style={{ height: 110, borderRadius: 12, background: 'var(--pc-surface)', border: '0.5px solid var(--pc-hair)' }} />
        </div>

      </div>
    </div>
  )
}
