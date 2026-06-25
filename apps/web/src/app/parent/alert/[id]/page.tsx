import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDict } from '@/lib/i18n/server'
import AlertScreen from './AlertScreen'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AlertPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getDict()

  const { data: instance } = await supabase
    .from('task_instances')
    .select('id, status, due_at, tasks ( title, type )')
    .eq('id', id)
    .eq('parent_id', user!.id)
    .single()

  if (!instance) notFound()

  const task = instance.tasks as unknown as { title: string; type: string }

  // Get kid's first name for "Rohan wants you to..." copy
  const { data: family } = await supabase
    .from('families')
    .select('kid_id')
    .eq('parent_id', user!.id)
    .single()

  let kidName = t.alert.kidFallback
  if (family?.kid_id) {
    const { data: kid } = await supabase
      .from('users')
      .select('name')
      .eq('id', family.kid_id)
      .single()
    kidName = kid?.name?.split(' ')[0] ?? t.alert.kidFallback
  }

  const dueTime = new Date(instance.due_at).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  })

  const typeIcons: Record<string, string> = {
    walk: '🚶', diet: '🍽️', medicine: '💊', sleep: '😴', exercise: '🏃', custom: '✅',
  }
  const typeLabels = t.typeLabels as Record<string, string>

  return (
    <AlertScreen
      instanceId={id}
      icon={typeIcons[task.type] ?? '✅'}
      label={typeLabels[task.type] ?? t.typeLabels.fallback}
      taskTitle={task.title}
      taskType={task.type}
      kidName={kidName}
      dueTime={dueTime}
      alreadyDone={!['pending', 'in_progress'].includes(instance.status)}
    />
  )
}
