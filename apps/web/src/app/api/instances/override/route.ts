import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/*
  POST /api/instances/override

  Body: { instanceId: string, result: 'passed' | 'failed' | 'flagged' }

  The manual override: the kid is the final authority on whether a task was
  really done. Saathi's verification is a strong default, not the last word —
  if the AI got it wrong (marked a real walk as failed, or passed a blurry
  photo), the kid can correct the visible result here.

  Security — the caller is the KID, who does not own the instance directly;
  they own it *through the family*. So we:
    1. authenticate the caller,
    2. find the family they manage (kid_id = caller),
    3. confirm the instance belongs to that family's parent,
  then write with the service client.

  Scope note: this updates status only. It deliberately does NOT recompute
  streaks — reversing a streak correctly (e.g. passed → failed mid-run) is its
  own piece of logic, tracked as a follow-up.
*/

const ALLOWED = ['passed', 'failed', 'flagged'] as const
type OverrideResult = (typeof ALLOWED)[number]

export async function POST(req: NextRequest) {
  const body = await req.json() as { instanceId?: string; result?: string }
  const { instanceId, result } = body

  if (!instanceId || !result || !ALLOWED.includes(result as OverrideResult)) {
    return NextResponse.json(
      { error: "instanceId and result ('passed' | 'failed' | 'flagged') are required" },
      { status: 400 },
    )
  }

  // ── 1. Authenticate the caller (RLS-bound client) ──────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Find the family this kid manages ────────────────────────────────────
  const { data: family } = await supabase
    .from('families')
    .select('parent_id')
    .eq('kid_id', user.id)
    .single()

  if (!family?.parent_id) {
    return NextResponse.json({ error: 'No parent linked to your account' }, { status: 403 })
  }

  // ── 3. Confirm the instance belongs to this family's parent ────────────────
  const { data: instance } = await supabase
    .from('task_instances')
    .select('id, parent_id')
    .eq('id', instanceId)
    .eq('parent_id', family.parent_id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Task instance not found or not in your family' }, { status: 403 })
  }

  // ── 4. Apply the override (service client) ─────────────────────────────────
  const admin = createServiceClient()
  const { error: updateError } = await admin
    .from('task_instances')
    .update({ status: result, updated_at: new Date().toISOString() })
    .eq('id', instanceId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ status: result }, { status: 200 })
}
