import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function ParentItihaasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div
      style={{ background: 'var(--pc-bg)', minHeight: '100vh', color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)' }}
    >
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '54px 22px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <Link
            href="/parent/dashboard"
            style={{ color: 'var(--pc-ink2)', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}
          >
            ←
          </Link>
          <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
            Itihaas
          </h1>
        </div>

        <p style={{ color: 'var(--pc-ink2)', fontSize: 16, marginBottom: 32 }}>
          Aapke saare purane kaam yahan dikhenge.
        </p>

        <div
          style={{
            padding: 28, borderRadius: 16,
            border: '0.5px solid var(--pc-hair)', background: 'var(--pc-surface)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div className="font-serif" style={{ fontSize: 20, fontWeight: 500 }}>
            Abhi koi history nahi
          </div>
          <p style={{ color: 'var(--pc-ink2)', marginTop: 8, fontSize: 14 }}>
            Jaise aap kaam complete karenge, yahan dikhai dega.
          </p>
        </div>

      </div>
    </div>
  )
}
