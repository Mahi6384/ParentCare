import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CoachLoader from './CoachLoader'

interface Props {
  params: Promise<{ id: string }>
}

// Placeholder routine used until Loop 2 (exerciseCoachAgent) generates real ones in Milestone B.
// Matches the example from PRODUCT_PLAN_V2.md for a 68yr parent with BP + knee pain, no equipment.
const MOCK_STEPS = [
  { step_index: 0, section: 'Warm-up',   name: 'Neck rolls',             reps: 10, duration_sec: null, rest_sec: 15, modification: null },
  { step_index: 1, section: 'Warm-up',   name: 'Shoulder shrugs',        reps: 15, duration_sec: null, rest_sec: 15, modification: null },
  { step_index: 2, section: 'Warm-up',   name: 'Seated ankle rotations', reps: 10, duration_sec: null, rest_sec: 15, modification: null },
  { step_index: 3, section: 'Main Set',  name: 'Wall push-ups',          reps: 10, duration_sec: null, rest_sec: 30, modification: 'Ghutne ke liye safe' },
  { step_index: 4, section: 'Main Set',  name: 'Chair-assisted squats',  reps: 8,  duration_sec: null, rest_sec: 30, modification: 'Kursi pakad ke karein' },
  { step_index: 5, section: 'Main Set',  name: 'Side leg raises',        reps: 10, duration_sec: null, rest_sec: 30, modification: null },
  { step_index: 6, section: 'Main Set',  name: 'Seated knee extensions', reps: 12, duration_sec: null, rest_sec: 30, modification: 'Ghutne dard mein madadgar' },
  { step_index: 7, section: 'Cool-down', name: 'Calf stretch',           reps: null, duration_sec: 30, rest_sec: 10, modification: null },
  { step_index: 8, section: 'Cool-down', name: 'Seated forward bend',    reps: null, duration_sec: 30, rest_sec: 10, modification: null },
  { step_index: 9, section: 'Cool-down', name: 'Deep breathing',         reps: null, duration_sec: 60, rest_sec: 0,  modification: null },
]

export type ExerciseStep = typeof MOCK_STEPS[number]

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
      mockSteps={MOCK_STEPS}
    />
  )
}
