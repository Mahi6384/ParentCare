import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { taskInstanceId } = await req.json() as { taskInstanceId: string }
  if (!taskInstanceId) {
    return NextResponse.json({ error: 'taskInstanceId is required' }, { status: 400 })
  }

  // Verify the parent owns this task instance
  const { data: instance } = await supabase
    .from('task_instances')
    .select('id')
    .eq('id', taskInstanceId)
    .eq('parent_id', user.id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Task instance not found' }, { status: 404 })
  }

  // Fire-and-forget to Railway worker
  const workerUrl = process.env.RAILWAY_WORKER_URL
  if (workerUrl) {
    fetch(`${workerUrl}/jobs/exercise-coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskInstanceId }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
