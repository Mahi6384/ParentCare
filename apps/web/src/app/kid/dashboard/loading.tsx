export default function KidDashboardLoading() {
  const shimmer: React.CSSProperties = {
    background: 'var(--pc-surface)',
    border: '0.5px solid var(--pc-hair)',
    borderRadius: 12,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--pc-bg)' }}>
      {/* Nav bar */}
      <div style={{ height: 60, background: 'var(--pc-surface)', borderBottom: '0.5px solid var(--pc-hair)' }} />

      <div className="pc-shell pc-body-pad">

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Greeting */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ height: 36, width: 280, ...shimmer }} />
            <div style={{ height: 18, width: 360, ...shimmer }} />
          </div>

          {/* 7-day strip */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} style={{ flex: 1, height: 72, ...shimmer }} />
            ))}
          </div>

          {/* Feed cards */}
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 100, ...shimmer }} />
          ))}
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ height: 180, ...shimmer }} />
          <div style={{ height: 140, ...shimmer }} />
          <div style={{ height: 130, ...shimmer }} />
        </div>

      </div>
    </div>
  )
}
