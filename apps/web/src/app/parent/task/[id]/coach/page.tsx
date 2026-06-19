import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CoachLoader from './CoachLoader'

interface Props {
  params: Promise<{ id: string }>
}

export interface ExerciseStep {
  step_index:   number
  section:      string
  name:         string
  reps:         number | null
  duration_sec: number | null
  rest_sec:     number | null
  modification: string | null
}

export default async function CoachPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: instance } = await supabase
    .from('task_instances')
    .select('id, status, tasks ( title, type )')
    .eq('id', id)
    .eq('parent_id', user!.id)
    .single()

  if (!instance) notFound()

  const task = instance.tasks as unknown as { title: string; type: string }

  return (
    <CoachLoader
      instanceId={id}
      taskTitle={task.title}
    />
  )
}
