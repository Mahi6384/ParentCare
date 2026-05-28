import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// POST /api/family/join
// Body: { code: string }
//
// Why a separate API route?
// RLS doesn't allow a parent to look up a family they're not yet linked to.
// We need the service role (bypasses RLS) to do the invite code lookup.
// Service role key must NEVER reach the client — so this lives server-side only.

export async function POST(request: Request) {
  const { code } = await request.json()

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  }

  // 1. Verify the user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // 2. Use service role to look up the family (bypasses RLS)
  const admin = createServiceClient()

  const { data: family, error: findError } = await admin
    .from('families')
    .select('id, kid_id, parent_id')
    .eq('invite_code', code.toUpperCase().trim())
    .single()

  if (findError || !family) {
    return NextResponse.json(
      { error: 'Invalid code. Please check with your son / daughter.' },
      { status: 404 }
    )
  }

  // 3. Code already used?
  if (family.parent_id) {
    return NextResponse.json(
      { error: 'This code has already been used.' },
      { status: 409 }
    )
  }

  // 4. Can't join your own family (kid joining as parent)
  if (family.kid_id === user.id) {
    return NextResponse.json(
      { error: 'You cannot join your own family code.' },
      { status: 400 }
    )
  }

  // 5. Link parent to family
  const { error: updateError } = await admin
    .from('families')
    .update({ parent_id: user.id })
    .eq('id', family.id)

  if (updateError) {
    console.error('[family/join] update error:', updateError)
    return NextResponse.json({ error: 'Failed to join. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
