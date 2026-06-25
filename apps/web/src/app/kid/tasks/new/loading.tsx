// Shown immediately on navigation while the server component fetches data.
// Next.js wraps this in a Suspense boundary at the route segment level.
export default function NewTaskLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--pc-bg)' }}>
      {/* Nav bar height placeholder */}
      <div style={{ height: 60, background: 'var(--pc-surface)', borderBottom: '0.5px solid var(--pc-hair)' }} />

      <div className="pc-shell pc-body-pad">

        {/* Left — form skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ height: 14, width: 120, borderRadius: 6, background: 'var(--pc-surface)' }} />
          <div style={{ height: 36, width: 260, borderRadius: 8, background: 'var(--pc-surface)' }} />
          <div style={{ height: 18, width: 380, borderRadius: 6, background: 'var(--pc-surface)' }} />

          {/* Template picker skeleton */}
          <div className="pc-type-grid" style={{ marginTop: 8 }}>
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
