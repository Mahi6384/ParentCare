import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/*
  POST /api/instances/complete

  Body: { instanceId: string, outcome: 'done' | 'skip' }

  For tasks where the kid set proof_type = 'none', there's no photo and no AI
  verification — the parent just confirms whether they did it. This route is
  the server-side equivalent of the photo flow:

    'done' → status 'passed'  + bump the streak (same as a verified photo)
    'skip' → status 'skipped' + leave the streak alone

  Security: we re-check on the server that
    1. the caller is the parent who owns this instance,
    2. the instance is still actionable (pending/in_progress),
    3. the task's proof_type really is 'none'.
  (3) is the important one — without it, a crafted request could mark a
  photo-required task as done without ever uploading proof.
*/

export async function POST(req: NextRequest) {
  const body = await req.json() as { instanceId?: string; outcome?: 'done' | 'skip' }
  const { instanceId, outcome } = body

  if (!instanceId || (outcome !== 'done' && outcome !== 'skip')) {
    return NextResponse.json({ error: "instanceId and outcome ('done' | 'skip') are required" }, { status: 400 })
  }

  // ── 1. Verify ownership + load the task's proof_type via the RLS-bound client
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: instance } = await supabase
    .from('task_instances')
    .select('id, status, task_id, parent_id, tasks ( proof_type )')
    .eq('id', instanceId)
    .eq('parent_id', user.id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Task instance not found or not yours' }, { status: 403 })
  }

  if (!['pending', 'in_progress'].includes(instance.status)) {
    return NextResponse.json({ error: 'Task already completed' }, { status: 409 })
  }

  const task = instance.tasks as unknown as { proof_type: string } | null
  if (task?.proof_type !== 'none') {
    // This task needs a photo — completing it without one is not allowed.
    return NextResponse.json({ error: 'This task requires photo proof' }, { status: 400 })
  }

  // ── 2. Apply the outcome with the service client (bypasses RLS edge cases)
  const admin = createServiceClient()
  const newStatus = outcome === 'done' ? 'passed' : 'skipped'

  const { error: updateError } = await admin
    .from('task_instances')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', instanceId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // ── 3. On 'done', bump the streak — identical logic to the AI verifier
  if (outcome === 'done') {
    const { data: existing } = await admin
      .from('streaks')
      .select('current_streak, longest_streak')
      .eq('task_id', instance.task_id)
      .eq('parent_id', instance.parent_id)
      .maybeSingle()

    const next    = (existing?.current_streak ?? 0) + 1
    const longest = Math.max(next, existing?.longest_streak ?? 0)

    await admin
      .from('streaks')
      .upsert(
        {
          task_id:        instance.task_id,
          parent_id:      instance.parent_id,
          current_streak: next,
          longest_streak: longest,
          updated_at:     new Date().toISOString(),
        },
        { onConflict: 'task_id,parent_id' },
      )
  }

  return NextResponse.json({ status: newStatus }, { status: 200 })
}
