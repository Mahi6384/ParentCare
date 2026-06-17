import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ParentProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', user.id)
    .single()

  const firstName = profile?.name?.split(' ')[0] ?? 'Papa'

  return (
    <div
      style={{ background: 'var(--pc-bg)', minHeight: '100vh', color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)' }}
    >
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '54px 22px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <Link
            href="/parent/dashboard"
            style={{ color: 'var(--pc-ink2)', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}
          >
            ←
          </Link>
          <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
            Profile
          </h1>
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--pc-brand-tint)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32,
            }}
          >
            👤
          </div>
          <div className="font-serif" style={{ fontSize: 26, fontWeight: 500 }}>
            {profile?.name ?? firstName}
          </div>
          <div style={{ fontSize: 14, color: 'var(--pc-ink2)' }}>
            {profile?.email ?? user.email}
          </div>
        </div>

        {/* Logout */}
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            style={{
              width: '100%', padding: '14px 0',
              background: 'var(--pc-surface)',
              border: '0.5px solid var(--pc-hair)',
              borderRadius: 14,
              fontSize: 16, fontWeight: 600,
              color: 'var(--pc-bad)',
              cursor: 'pointer',
              fontFamily: 'var(--pc-body)',
            }}
          >
            Log out
          </button>
        </form>

      </div>
    </div>
  )
}
