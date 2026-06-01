import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/*
  POST /api/submissions/create

  Body: { instanceId: string, storagePath: string }

  Steps:
  1. Verify the caller is an authenticated parent who owns this task_instance
  2. Insert a row into submissions (task_instance_id + photo_url)
  3. Update task_instances.status → 'submitted'

  We use two clients:
  - server client (anon key + RLS) to verify ownership — auth.uid() must match
  - service client to do the writes atomically without being blocked by RLS edge cases

  Why server route instead of client-side writes?
  - Atomic: if submissions insert succeeds but status update fails, we can
    roll back or return an error — client-side has no transaction support
  - Step 5 will trigger the Railway AI worker from here — external calls
    belong on the server, not the browser
*/

export async function POST(req: NextRequest) {
  const body = await req.json() as { instanceId?: string; storagePath?: string }
  const { instanceId, storagePath } = body

  if (!instanceId || !storagePath) {
    return NextResponse.json({ error: 'instanceId and storagePath are required' }, { status: 400 })
  }

  // ── 1. Verify ownership via the session-bound client ──────────
  // If the authenticated user is not the parent of this instance, the
  // select returns null and we reject with 403.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: instance } = await supabase
    .from('task_instances')
    .select('id, status, parent_id')
    .eq('id', instanceId)
    .eq('parent_id', user.id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Task instance not found or not yours' }, { status: 403 })
  }

  if (!['pending', 'in_progress'].includes(instance.status)) {
    return NextResponse.json({ error: 'Task already submitted' }, { status: 409 })
  }

  // ── 2 & 3. Insert submission + update status ───────────────────
  // Use service client so both writes succeed regardless of any RLS
  // edge case on the submissions table.
  const admin = createServiceClient()

  const { data: submission, error: subError } = await admin
    .from('submissions')
    .insert({
      task_instance_id: instanceId,
      photo_url: storagePath,
    })
    .select('id')
    .single()

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 })
  }

  const { error: updateError } = await admin
    .from('task_instances')
    .update({ status: 'submitted', updated_at: new Date().toISOString() })
    .eq('id', instanceId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Step 5 will fire the Railway AI worker here:
  // await fetch(process.env.RAILWAY_WORKER_URL + '/verify', {
  //   method: 'POST',
  //   body: JSON.stringify({ submissionId: submission.id, storagePath }),
  // })

  return NextResponse.json({ submissionId: submission.id }, { status: 201 })
}
