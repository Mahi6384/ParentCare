import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Root page — just a smart redirect based on auth state + role
export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → go to login
  if (!user) redirect('/auth/login')

  // Logged in → check role and redirect to the right dashboard
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'kid') redirect('/kid/dashboard')
  if (profile?.role === 'parent') redirect('/parent/dashboard')

  // No profile yet (edge case) → back to login
  redirect('/auth/login')
}
