import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// This route handles the magic link redirect.
// Flow:
//   1. User clicks magic link in email
//   2. Supabase redirects to /auth/callback?code=xxxx
//   3. We exchange the code for a session
//   4. We check role + onboarding status → redirect to the right page

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
  }

  const supabase = await createClient()

  // Exchange the one-time code for a real session
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_user`)
  }

  // Get their profile (role)
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // ── Kid flow ──────────────────────────────────────────────
  if (role === 'kid') {
    const { data: family } = await supabase
      .from('families')
      .select('id')
      .eq('kid_id', user.id)
      .single()

    // No family yet → onboarding (create family + get invite code)
    if (!family) {
      return NextResponse.redirect(`${origin}/onboarding/family`)
    }

    return NextResponse.redirect(`${origin}/kid/dashboard`)
  }

  // ── Parent flow ───────────────────────────────────────────
  if (role === 'parent') {
    const { data: family } = await supabase
      .from('families')
      .select('id')
      .eq('parent_id', user.id)
      .single()

    // Not linked to a family yet → onboarding (enter invite code)
    if (!family) {
      return NextResponse.redirect(`${origin}/onboarding/invite`)
    }

    return NextResponse.redirect(`${origin}/parent/dashboard`)
  }

  // No role found (trigger might not have fired yet — edge case)
  return NextResponse.redirect(`${origin}/auth/login?error=no_role`)
}
