import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /auth/logout
// Clears the Supabase session (cookies) and sends the user to the login page.
//
// Why a POST route (not a Link)?
//   Signing out is a state-changing action. GET requests can be triggered by
//   prefetch/crawlers/<img> tags — a stray GET could log users out unexpectedly.
//   A form POST is the safe, conventional way to mutate auth state.
//
// Why status 303?
//   The form submits a POST. NextResponse.redirect defaults to 307, which
//   *preserves the method* — the browser would re-POST to /auth/login and fail.
//   303 (See Other) tells the browser to follow up with a GET. Exactly what we want.

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/auth/login`, { status: 303 })
}
