export default function ParentDashboardLoading() {
  const shimmer: React.CSSProperties = {
    background: 'var(--pc-surface)',
    border: '0.5px solid var(--pc-hair)',
    borderRadius: 16,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--pc-bg)' }}>
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>

        {/* Greeting area */}
        <div style={{ padding: '54px 22px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ height: 14, width: 160, ...shimmer }} />
          <div style={{ height: 40, width: 220, ...shimmer }} />
          <div style={{ height: 18, width: 300, ...shimmer }} />
        </div>

        {/* Hero card */}
        <div style={{ padding: '16px 18px 8px' }}>
          <div style={{ height: 160, borderRadius: 22, background: 'var(--pc-surface)', border: '0.5px solid var(--pc-hair)' }} />
        </div>

        {/* Task list */}
        <div style={{ padding: '14px 18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 72, ...shimmer }} />
          ))}
        </div>

      </div>
    </div>
  )
}
