import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getDict } from '@/lib/i18n/server'
import SubmitForm from './SubmitForm'

/*
  /parent/submit/[instanceId] — Photo Submission Page

  Server Component: fetches the task_instance + task title so the parent
  knows what they're submitting proof for.

  The actual photo capture + upload lives in <PhotoUpload> (Client Component)
  which will be added in Step 2. For now this is the page shell.
*/

interface Props {
  params: Promise<{ instanceId: string }>
}

export default async function SubmitPage({ params }: Props) {
  const { instanceId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getDict()

  // Fetch the instance, confirm it belongs to this parent and is still pending
  const { data: instance } = await supabase
    .from('task_instances')
    .select(`
      id,
      status,
      due_at,
      tasks ( title, type )
    `)
    .eq('id', instanceId)
    .eq('parent_id', user!.id)
    .single()

  if (!instance) notFound()

  const task = instance.tasks as unknown as { title: string; type: string }

  const taskTypeIcons: Record<string, string> = {
    walk: '🚶', diet: '🍽️', medicine: '💊',
    sleep: '😴', exercise: '💪', custom: '✅',
  }
  const icon = taskTypeIcons[task.type] ?? '✅'

  const dueTime = new Date(instance.due_at).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  })

  const alreadyDone = !['pending', 'in_progress'].includes(instance.status)
  const statusLabels = t.status as Record<string, string>

  return (
    <div
      style={{ minHeight: '100vh', background: 'var(--pc-bg)', color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)' }}
    >
      <div className="w-full max-w-[430px] mx-auto flex flex-col" style={{ padding: '0 0 40px' }}>

        {/* Back nav */}
        <div style={{ padding: '54px 22px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/parent/dashboard"
            style={{ fontSize: 15, color: 'var(--pc-ink3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ← {t.common.back}
          </Link>
        </div>

        {/* Task header */}
        <div style={{ padding: '28px 22px 0' }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>{icon}</div>
          <div
            className="font-serif font-medium"
            style={{ fontSize: 32, letterSpacing: '-0.02em', lineHeight: 1.1 }}
          >
            {task.title}
          </div>
          <div style={{ marginTop: 8, fontSize: 16, color: 'var(--pc-ink2)' }}>
            {alreadyDone
              ? t.submit.doneStatus(statusLabels[instance.status] ?? instance.status)
              : t.submit.dueSub(dueTime)
            }
          </div>
        </div>

        {/* Photo upload + submit */}
        <div style={{ padding: '32px 22px 0' }}>
          {alreadyDone ? (
            <div
              style={{
                padding: 20, borderRadius: 16, background: 'var(--pc-surface)',
                border: '0.5px solid var(--pc-hair)', textAlign: 'center',
                color: 'var(--pc-ink3)', fontSize: 15,
              }}
            >
              {t.submit.alreadyDoneCard}
            </div>
          ) : (
            <SubmitForm instanceId={instanceId} parentId={user!.id} />
          )}
        </div>

      </div>
    </div>
  )
}
