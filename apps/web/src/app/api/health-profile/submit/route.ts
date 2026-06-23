import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// POST /api/health-profile/submit
// Body: { answers: Record<string, string | string[]> }
//
// The kid authors the parent's health profile. Two cases:
//   • Parent already linked → upsert directly into health_profiles for parent_id.
//   • No parent yet         → stash the mapped profile on families.pending_health_profile,
//                             to be materialized when a parent joins (see /api/family/join).
//
// Why the service role? The kid can't write a row keyed to the parent
// (RLS: "health_profiles: parent owns" allows only auth.uid() = parent_id).
// This route runs server-side and bypasses RLS for the parent-linked case.

type Answers = Record<string, string | string[]>

// Map raw chat answers → a health_profiles row shape (without parent_id).
// Both callers (parent vs kid scripts) use the same value codes, so this is shared.
function buildProfile(ans: Answers) {
  const arr = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v.filter(x => x !== 'none') : []

  return {
    age:                 ans.age ? parseInt(ans.age as string, 10) : null,
    conditions:          arr(ans.conditions),
    restrictions:        arr(ans.restrictions),
    fitness_level:       'sedentary' as const,
    equipment:           arr(ans.equipment),
    preferred_duration:  ans.duration ? parseInt(ans.duration as string, 10) : 20,
    food_region:         (ans.food_region as string) || 'north_indian',
    language_preference: 'hinglish',
  }
}

export async function POST(request: Request) {
  const { answers } = await request.json()

  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'answers required' }, { status: 400 })
  }

  // 1. Authenticate the caller (the kid)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // 2. Find the kid's family
  const admin = createServiceClient()
  const { data: family, error: famError } = await admin
    .from('families')
    .select('id, parent_id')
    .eq('kid_id', user.id)
    .single()

  if (famError || !family) {
    return NextResponse.json({ error: 'Family not found' }, { status: 404 })
  }

  const profile = buildProfile(answers as Answers)

  // 3a. Parent linked → write the real profile
  if (family.parent_id) {
    const { error } = await admin.from('health_profiles').upsert(
      { parent_id: family.parent_id, ...profile, updated_at: new Date().toISOString() },
      { onConflict: 'parent_id' },
    )
    if (error) {
      console.error('[health-profile/submit] upsert error:', error)
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
    }
    return NextResponse.json({ success: true, applied: true })
  }

  // 3b. No parent yet → stash as pending on the family row
  const { error } = await admin
    .from('families')
    .update({ pending_health_profile: profile })
    .eq('id', family.id)

  if (error) {
    console.error('[health-profile/submit] pending save error:', error)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
  return NextResponse.json({ success: true, applied: false })
}
