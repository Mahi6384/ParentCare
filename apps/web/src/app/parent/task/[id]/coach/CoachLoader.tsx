'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CoachUI from './CoachUI'
import type { ExerciseStep } from './page'

interface Props {
  instanceId: string
  taskTitle:  string
  mockSteps:  ExerciseStep[]
}

export default function CoachLoader({ instanceId, taskTitle, mockSteps }: Props) {
  const [steps, setSteps]     = useState<ExerciseStep[] | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [usedMock, setUsedMock] = useState(false)

  useEffect(() => {
    fetch('/api/exercise-coach/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskInstanceId: instanceId }),
    }).catch(() => {})

    const supabase = createClient()
    const poll = setInterval(async () => {
      const { data: routine } = await supabase
        .from('exercise_routines')
        .select('exercise_steps ( step_index, section, name, reps, duration_sec, rest_sec, modification )')
        .eq('task_instance_id', instanceId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const realSteps = routine?.exercise_steps as ExerciseStep[] | undefined
      if (realSteps?.length) {
        clearInterval(poll)
        clearTimeout(timeout)
        setSteps(realSteps.sort((a, b) => a.step_index - b.step_index))
      }
    }, 3000)

    // After 45s show an error — don't silently swap in mock data
    const timeout = setTimeout(() => {
      clearInterval(poll)
      setTimedOut(true)
    }, 45000)

    return () => {
      clearInterval(poll)
      clearTimeout(timeout)
    }
  }, [instanceId])

  // Timeout — show explicit error with opt-in fallback
  if (timedOut && !steps) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--pc-bg)',
        color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 32, maxWidth: 430, margin: '0 auto', gap: 16, textAlign: 'center',
      }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div className="font-serif" style={{ fontSize: 24, lineHeight: 1.3 }}>
          Routine nahi bana
        </div>
        <div style={{ fontSize: 15, color: 'var(--pc-ink3)', lineHeight: 1.5 }}>
          Saathi abhi busy hai. Aap default routine se shuru kar sakte hain, ya baad mein try karein.
        </div>
        <button
          onClick={() => { setUsedMock(true); setSteps(mockSteps) }}
          style={{
            marginTop: 8, padding: '14px 28px',
            background: 'var(--pc-brand)', color: '#fff', border: 'none',
            borderRadius: 14, fontSize: 16, fontWeight: 700,
            fontFamily: 'var(--pc-body)', cursor: 'pointer',
          }}
        >
          Default routine use karein
        </button>
        <button
          onClick={() => { setTimedOut(false) }}
          style={{
            padding: '10px 20px',
            background: 'none', color: 'var(--pc-ink3)',
            border: '0.5px solid var(--pc-hair)', borderRadius: 10,
            fontSize: 14, fontFamily: 'var(--pc-body)', cursor: 'pointer',
          }}
        >
          Wapas jaao
        </button>
      </div>
    )
  }

  // Still loading
  if (!steps) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--pc-bg)',
        color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 32, maxWidth: 430, margin: '0 auto', gap: 20,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--pc-brand)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700,
        }}>
          S
        </div>
        <div className="font-serif" style={{ fontSize: 26, textAlign: 'center', lineHeight: 1.3 }}>
          Routine bana raha hoon...
        </div>
        <div style={{ fontSize: 15, color: 'var(--pc-ink3)', textAlign: 'center' }}>
          Saathi aapki health profile padh raha hai
        </div>
        <div style={{
          width: 40, height: 40,
          border: '3px solid var(--pc-brand)', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 0.9s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <CoachUI
      instanceId={instanceId}
      taskTitle={taskTitle}
      steps={steps}
      usedMock={usedMock}
    />
  )
}
