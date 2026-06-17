import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VerifyScreen from './VerifyScreen'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VerifyPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: instance } = await supabase
    .from('task_instances')
    .select('id, tasks ( title, type )')
    .eq('id', id)
    .eq('parent_id', user!.id)
    .single()

  if (!instance) notFound()

  const task = instance.tasks as unknown as { title: string; type: string }

  // Most recent submission for this instance — the photo the parent just took
  const { data: submission } = await supabase
    .from('submissions')
    .select('id, photo_url')
    .eq('task_instance_id', id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <VerifyScreen
      instanceId={id}
      taskTitle={task.title}
      taskType={task.type}
      photoUrl={submission?.photo_url ?? null}
      submissionId={submission?.id ?? null}
    />
  )
}
