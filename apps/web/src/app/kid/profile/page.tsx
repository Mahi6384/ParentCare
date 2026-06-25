import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ThemeToggle from '@/components/theme/ThemeToggle'

/*
  /kid/profile — the kid's account screen, reached from the nav avatar.

  Mirrors /parent/profile but without the language toggle: the kid side isn't
  wrapped in LanguageProvider, and LanguageToggle depends on that context.
  ThemeToggle only needs ThemeProvider (mounted at the root), so it's safe here.

  The whole point of this page is the Sign out action — it POSTs to /auth/logout,
  the route we just added.
*/

export default async function KidProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ background: 'var(--pc-bg)', minHeight: '100vh', color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)' }}>
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '54px 22px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <Link href="/kid/dashboard" style={{ color: 'var(--pc-ink2)', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>
            ←
          </Link>
          <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
            Profile
          </h1>
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: 'var(--pc-brand-tint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--pc-display)', fontSize: 30, fontWeight: 600, color: 'var(--pc-brand-deep)',
          }}>
            {profile?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="font-serif" style={{ fontSize: 26, fontWeight: 500 }}>
            {profile?.name ?? 'You'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--pc-ink2)' }}>
            {profile?.email ?? user.email}
          </div>
        </div>

        {/* Appearance */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 12.5, fontWeight: 600, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--pc-ink3)', marginBottom: 10,
          }}>
            Appearance
          </div>
          <ThemeToggle />
        </div>

        {/* Sign out */}
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            style={{
              width: '100%', padding: '14px 0',
              background: 'var(--pc-surface)', border: '0.5px solid var(--pc-hair)',
              borderRadius: 14, fontSize: 16, fontWeight: 600,
              color: 'var(--pc-bad)', cursor: 'pointer', fontFamily: 'var(--pc-body)',
            }}
          >
            Sign out
          </button>
        </form>

      </div>
    </div>
  )
}
