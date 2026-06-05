'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ExerciseStep } from './page'

interface Props {
  instanceId: string
  taskTitle:  string
  steps:      ExerciseStep[]
  usedMock?:  boolean
}

const SECTION_DESC: Record<string, string> = {
  'Warm-up':   'Shareer ko taiyaar karein',
  'Main Set':  'Main exercises',
  'Cool-down': 'Dhire se band karein',
}

// Saathi's voice guidance per exercise — these get spoken aloud via Web Speech API
const SAATHI_LINES: Record<string, string> = {
  'Wall push-ups':          'Papa, deewar se thoda door kadam rakhiye. Saans andar lete hue jhukiye, bahar lete hue wapas aayein.',
  'Chair-assisted squats':  'Kursi ko pakad ke dheere neeche jaayein. Ghutne ko aage toes se aage na jaane den.',
  'Seated knee extensions': 'Yeh ghutne ke dard ke liye bahut faydemand hai. Poori tarah seedhi karein, ek second rukein.',
  'Neck rolls':             'Dheere se ek taraf, phir doosri taraf. Koi jaldi nahi.',
  'Shoulder shrugs':        'Kaandhon ko upar le jaayein, ek second rukein, phir dheere neeche.',
  'Calf stretch':           'Ek pair ko peeche rakho, dono pair zameen par. Dheere aage jhukein.',
  'Deep breathing':         'Naak se andar lo, chaar tak gino. Munh se bahar nikalo, aath tak gino.',
}

export default function CoachUI({ instanceId, taskTitle, steps }: Props) {
  const router = useRouter()
  const total = steps.length

  const [currentIdx, setCurrentIdx] = useState(0)
  const [restMode, setRestMode]     = useState(false)
  const [restCount, setRestCount]   = useState(0)
  const restTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const step = steps[currentIdx]

  // ── Voice: speak the current step's instruction via Web Speech API ──────
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'hi-IN'
    utt.rate = 0.82
    window.speechSynthesis.speak(utt)
  }, [])

  useEffect(() => {
    const line = SAATHI_LINES[step.name] ??
      `${step.name}. ${step.reps ? `${step.reps} baar karein.` : `${step.duration_sec} second.`}`
    speak(line)
    return () => { window.speechSynthesis?.cancel() }
  }, [currentIdx, step, speak])

  // ── Rest countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!restMode) return
    const secs = step.rest_sec ?? 15
    setRestCount(secs)
    restTimer.current = setInterval(() => {
      setRestCount(c => {
        if (c <= 1) {
          clearInterval(restTimer.current!)
          setRestMode(false)
          setCurrentIdx(i => i + 1)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => { if (restTimer.current) clearInterval(restTimer.current) }
  }, [restMode, step.rest_sec])

  function handleDone() {
    if (currentIdx >= total - 1) {
      window.speechSynthesis?.cancel()
      router.push(`/parent/submit/${instanceId}`)
      return
    }
    if (step.rest_sec && step.rest_sec > 0) {
      setRestMode(true)
    } else {
      setCurrentIdx(i => i + 1)
    }
  }

  function handleSkip() {
    window.speechSynthesis?.cancel()
    if (restTimer.current) clearInterval(restTimer.current)
    setRestMode(false)
    if (currentIdx >= total - 1) {
      router.push(`/parent/submit/${instanceId}`)
    } else {
      setCurrentIdx(i => i + 1)
    }
  }

  function handleExit() {
    window.speechSynthesis?.cancel()
    router.push('/parent/dashboard')
  }

  const elapsedMin = Math.round((currentIdx / total) * 20)
  const saathiLine = SAATHI_LINES[step.name] ??
    `${step.name} — dheere se karein, koi jaldi nahi.`

  // ── Rest screen ─────────────────────────────────────────────────────────
  if (restMode) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--pc-bg)',
        color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 32, maxWidth: 430, margin: '0 auto',
      }}>
        <div style={{ fontFamily: 'var(--pc-mono)', fontSize: 11, color: 'var(--pc-ink3)', letterSpacing: '0.1em', marginBottom: 16 }}>
          AARAM KAREIN
        </div>
        <div style={{ fontSize: 80, fontWeight: 800, color: 'var(--pc-brand)', lineHeight: 1 }}>{restCount}</div>
        <div className="font-serif" style={{ fontSize: 24, marginTop: 16, marginBottom: 8 }}>
          Thoda saanla lein...
        </div>
        <div style={{ fontSize: 15, color: 'var(--pc-ink3)' }}>
          Agla: <strong>{steps[currentIdx + 1]?.name}</strong>
        </div>
        <button
          onClick={() => {
            if (restTimer.current) clearInterval(restTimer.current)
            setRestMode(false)
            setCurrentIdx(i => i + 1)
          }}
          className="pc-btn-ghost"
          style={{ marginTop: 32, padding: '12px 28px', borderRadius: 12, fontSize: 15 }}
        >
          Aage badho →
        </button>
      </div>
    )
  }

  // ── Main coach screen ────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--pc-bg)',
      color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)',
      display: 'flex', flexDirection: 'column',
      maxWidth: 430, margin: '0 auto',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '54px 20px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <button
          onClick={handleExit}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--pc-ink3)', fontSize: 14, fontFamily: 'var(--pc-body)',
            display: 'flex', alignItems: 'center', gap: 6, padding: 0,
          }}
        >
          ✕ Ruko
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--pc-mono)', fontSize: 13, color: 'var(--pc-brand)', fontWeight: 600 }}>
            step {currentIdx + 1} / {total}
          </div>
          <div style={{ fontFamily: 'var(--pc-mono)', fontSize: 11, color: 'var(--pc-ink3)', marginTop: 3 }}>
            {taskTitle} · {elapsedMin} min
          </div>
        </div>
      </div>

      {/* Segmented progress bar */}
      <div style={{ padding: '14px 20px 0', display: 'flex', gap: 3 }}>
        {steps.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: 4, borderRadius: 99,
              background: i < currentIdx
                ? 'var(--pc-ok)'
                : i === currentIdx
                  ? 'var(--pc-brand)'
                  : 'var(--pc-surface3)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      {/* Exercise card */}
      <div style={{ padding: '22px 20px 0', flex: 1 }}>
        <div className="pc-card" style={{ padding: '22px 22px 24px' }}>
          {/* Badge row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{
              fontFamily: 'var(--pc-mono)', fontSize: 11,
              color: 'var(--pc-ink3)', letterSpacing: '0.08em',
            }}>
              {step.section.toUpperCase()} · #{currentIdx + 1}
            </span>
            {step.modification && (
              <span style={{
                fontSize: 11, color: 'var(--pc-ok)',
                background: '#EDF7EC', padding: '3px 8px',
                borderRadius: 99, fontWeight: 600,
              }}>
                ✓ safe
              </span>
            )}
          </div>

          {/* Name */}
          <div
            className="font-serif"
            style={{ fontSize: 32, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 6 }}
          >
            {step.name}
          </div>

          {/* Section subtitle */}
          <div style={{ fontSize: 14, color: 'var(--pc-ink2)', marginBottom: 20 }}>
            {SECTION_DESC[step.section] ?? step.section}
          </div>

          {/* Metrics chips */}
          <div style={{ display: 'flex', gap: 10 }}>
            {step.reps != null && (
              <MetricChip label="REPS" value={String(step.reps)} />
            )}
            {step.duration_sec != null && (
              <MetricChip label="TIME" value={`${step.duration_sec}s`} />
            )}
            {step.rest_sec != null && step.rest_sec > 0 && (
              <MetricChip label="REST" value={`${step.rest_sec}s`} />
            )}
          </div>

          {/* Modification note */}
          {step.modification && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 10,
              background: 'var(--pc-brand-tint)',
              fontSize: 14, color: 'var(--pc-brand-deep)',
            }}>
              💡 {step.modification}
            </div>
          )}
        </div>

        {/* Saathi speech bubble */}
        <div style={{
          marginTop: 16, padding: '14px 16px',
          background: 'var(--pc-surface)', borderRadius: 14,
          border: '0.5px solid var(--pc-hair)',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--pc-brand)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>
            S
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--pc-ink3)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.04em' }}>
              SAATHI BOL RAHA HAI
            </div>
            <div style={{ fontSize: 14, color: 'var(--pc-ink2)', fontStyle: 'italic', lineHeight: 1.55 }}>
              "{saathiLine}"
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTAs */}
      <div style={{ padding: '20px 20px 44px' }}>
        <button
          onClick={handleDone}
          style={{
            width: '100%', height: 64,
            background: 'var(--pc-ok)', color: '#fff',
            border: 'none', borderRadius: 16,
            fontSize: 20, fontWeight: 700,
            fontFamily: 'var(--pc-body)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          ✓ &nbsp;Ho gaya
        </button>

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          {[
            { label: 'Reps kam karein', action: undefined },
            { label: 'Aaram chahiye',   action: undefined },
            { label: 'Skip karein',     action: handleSkip },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                flex: 1, padding: '11px 6px',
                background: 'var(--pc-surface)', color: 'var(--pc-ink2)',
                border: '0.5px solid var(--pc-hair)', borderRadius: 10,
                fontSize: 12, fontFamily: 'var(--pc-body)', cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      flex: 1, padding: '10px 12px', textAlign: 'center',
      background: 'var(--pc-surface2)', borderRadius: 10,
      border: '0.5px solid var(--pc-surface3)',
    }}>
      <div style={{
        fontFamily: 'var(--pc-mono)', fontSize: 10,
        color: 'var(--pc-ink3)', letterSpacing: '0.08em',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--pc-mono)', fontSize: 22,
        fontWeight: 700, color: 'var(--pc-ink)', marginTop: 2,
      }}>
        {value}
      </div>
    </div>
  )
}
