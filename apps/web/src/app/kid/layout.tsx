import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// This layout protects ALL /kid/* routes.
// If not authenticated or wrong role → redirect.
// Middleware already handles unauthenticated redirects,
// but this double-checks the role (middleware doesn't check role to avoid extra DB calls).

export default async function KidLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'kid') redirect('/auth/login')

  return <>{children}</>
}
