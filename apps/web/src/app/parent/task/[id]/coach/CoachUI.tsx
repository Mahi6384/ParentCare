'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/components/i18n/LanguageProvider'
import type { ExerciseStep } from './page'

interface Props {
  instanceId: string
  taskTitle:  string
  steps:      ExerciseStep[]
}

export default function CoachUI({ instanceId, taskTitle, steps }: Props) {
  const router = useRouter()
  const { t, lang } = useT()
  const total = steps.length

  // Section descriptions and per-exercise coaching lines live in the dictionary.
  // Cast to index by the dynamic section/exercise names from the routine data.
  const sectionDesc = t.coach.sectionDesc as Record<string, string>
  const saathiLines = t.coach.saathiLines as Record<string, string>

  const [currentIdx, setCurrentIdx] = useState(0)
  const [restMode, setRestMode]     = useState(false)
  const [restCount, setRestCount]   = useState(0)
  const [repAdjustment, setRepAdjustment] = useState(0)
  const restTimer      = useRef<ReturnType<typeof setInterval> | null>(null)
  const overrideRestRef = useRef<number | null>(null)
  const [exerciseCount, setExerciseCount] = useState<number | null>(null)
  const exerciseTimer  = useRef<ReturnType<typeof setInterval> | null>(null)

  const step = steps[currentIdx]

  // ── Voice: speak the current step's instruction via Web Speech API ──────
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    // Speak in the parent's chosen language so the voice matches the on-screen text.
    utt.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
    utt.rate = 0.82
    window.speechSynthesis.speak(utt)
  }, [lang])

  // The exact words Saathi speaks — shared by the auto-play effect and the replay button.
  const spokenLine =
    saathiLines[step.name] ??
    t.coach.spokenFallback(step.name, step.reps, step.duration_sec)

  useEffect(() => {
    speak(spokenLine)
    return () => { window.speechSynthesis?.cancel() }
  }, [currentIdx, spokenLine, speak])

  // Reset rep adjustment when the step changes
  useEffect(() => { setRepAdjustment(0) }, [currentIdx])

  // ── Exercise countdown (timed steps only; the restMode dep pauses it) ─────
  // When restMode flips, the dep array changes → React runs cleanup (clearInterval)
  // then re-runs this body, which bails. No manual pause/resume to keep in sync.
  useEffect(() => {
    if (restMode || step.duration_sec == null) { setExerciseCount(null); return }
    setExerciseCount(step.duration_sec)
    exerciseTimer.current = setInterval(() => {
      setExerciseCount(c => {
        if (c == null || c <= 1) { clearInterval(exerciseTimer.current!); return 0 }
        return c - 1
      })
    }, 1000)
    return () => { if (exerciseTimer.current) clearInterval(exerciseTimer.current) }
  }, [currentIdx, step.duration_sec, restMode])

  // ── Rest countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!restMode) return
    // overrideRestRef is set by the "Need a rest" button to force 30s regardless of step.rest_sec
    const secs = overrideRestRef.current !== null ? overrideRestRef.current : (step.rest_sec ?? 15)
    overrideRestRef.current = null
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

  function handleReduceReps() {
    setRepAdjustment(a => a - 2)
  }

  function handleNeedRest() {
    window.speechSynthesis?.cancel()
    if (restTimer.current) clearInterval(restTimer.current)
    overrideRestRef.current = 30
    setRestMode(true)
  }

  const elapsedMin  = Math.round((currentIdx / total) * 20)
  const saathiLine  = saathiLines[step.name] ?? t.coach.lineFallback(step.name)
  const displayReps = step.reps != null ? Math.max(1, step.reps + repAdjustment) : undefined

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
          {t.coach.restTitle}
        </div>
        <div style={{ fontSize: 80, fontWeight: 800, color: 'var(--pc-brand)', lineHeight: 1 }}>{restCount}</div>
        <div className="font-serif" style={{ fontSize: 24, marginTop: 16, marginBottom: 8 }}>
          {t.coach.restBreath}
        </div>
        <div style={{ fontSize: 15, color: 'var(--pc-ink3)' }}>
          {t.coach.restNext}: <strong>{steps[currentIdx + 1]?.name}</strong>
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
          {t.coach.restContinue}
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
          {t.coach.stop}
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--pc-mono)', fontSize: 13, color: 'var(--pc-brand)', fontWeight: 600 }}>
            {t.coach.step} {currentIdx + 1} / {total}
          </div>
          <div style={{ fontFamily: 'var(--pc-mono)', fontSize: 11, color: 'var(--pc-ink3)', marginTop: 3 }}>
            {taskTitle} · {elapsedMin} {t.coach.min}
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
                {t.coach.safe}
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
            {sectionDesc[step.section] ?? step.section}
          </div>

          {/* Metrics chips */}
          <div style={{ display: 'flex', gap: 10 }}>
            {displayReps != null && (
              <MetricChip label={t.coach.repsLabel} value={String(displayReps)} />
            )}
            {step.duration_sec != null && (
              <MetricChip
                label={t.coach.timeLabel}
                value={exerciseCount === 0 ? '✓' : `${exerciseCount ?? step.duration_sec}s`}
                accent={exerciseCount === 0}
              />
            )}
            {step.rest_sec != null && step.rest_sec > 0 && (
              <MetricChip label={t.coach.restLabel} value={`${step.rest_sec}s`} />
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
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 11, color: 'var(--pc-ink3)', fontWeight: 600, letterSpacing: '0.04em' }}>
                {t.coach.saathiSpeaking}
              </div>
              <button
                onClick={() => speak(spokenLine)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--pc-brand)', fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--pc-body)', padding: 0,
                }}
              >
                {t.coach.replay}
              </button>
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
          {t.coach.done}
        </button>

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          {[
            { label: t.coach.reduceReps, action: handleReduceReps },
            { label: t.coach.needRest,   action: handleNeedRest  },
            { label: t.coach.skip,       action: handleSkip      },
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

function MetricChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
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
        fontWeight: 700, color: accent ? 'var(--pc-ok)' : 'var(--pc-ink)', marginTop: 2,
      }}>
        {value}
      </div>
    </div>
  )
}
