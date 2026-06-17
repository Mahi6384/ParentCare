'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  instanceId: string
  icon: string
  label: string
  taskTitle: string
  taskType: string
  kidName: string
  dueTime: string
  alreadyDone: boolean
}

export default function AlertScreen({
  instanceId, icon, label, taskTitle, taskType,
  kidName, dueTime, alreadyDone,
}: Props) {
  const router = useRouter()
  const [snoozed, setSnoozed] = useState(false)
  const [voicePlaying, setVoicePlaying] = useState(false)

  function handleStart() {
    if (taskType === 'exercise') {
      router.push(`/parent/task/${instanceId}/coach`)
    } else {
      router.push(`/parent/submit/${instanceId}`)
    }
  }

  function handleSnooze() {
    setSnoozed(true)
    // Real snooze API call wired in Milestone C (Web Push + snooze_log)
    setTimeout(() => router.push('/parent/dashboard'), 1400)
  }

  function toggleVoice() {
    setVoicePlaying(v => !v)
    // Real audio playback (voice_note_url from task) wired in Milestone C
  }

  if (alreadyDone) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--pc-ok)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32, textAlign: 'center', color: '#fff',
        fontFamily: 'var(--pc-body)',
      }}>
        <div>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
          <div className="font-serif" style={{ fontSize: 28, marginBottom: 10 }}>Ho gaya!</div>
          <div style={{ fontSize: 15, opacity: 0.8 }}>Yeh task pehle hi complete ho chuka hai.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--pc-brand)',
      color: '#fff',
      fontFamily: 'var(--pc-body)',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 430,
      margin: '0 auto',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 24px 0', opacity: 0.85,
      }}>
        <span style={{ fontFamily: 'var(--pc-mono)', fontSize: 11, letterSpacing: '0.08em', fontWeight: 700 }}>
          🔔 PARENTCARE
        </span>
        <span style={{ fontFamily: 'var(--pc-mono)', fontSize: 11, letterSpacing: '0.05em' }}>abhi</span>
      </div>

      {/* Icon circle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 52 }}>
        <div style={{
          width: 84, height: 84, borderRadius: '50%',
          background: 'var(--pc-brand-deep)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38,
        }}>
          {icon}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '28px 28px 0', display: 'flex', flexDirection: 'column' }}>
        {/* Mono label */}
        <div style={{
          fontFamily: 'var(--pc-mono)', fontSize: 12,
          letterSpacing: '0.1em', opacity: 0.7, marginBottom: 16,
        }}>
          {label}
        </div>

        {/* Big serif title */}
        <div
          className="font-serif"
          style={{ fontSize: 38, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 20 }}
        >
          Papa, time for your<br />
          <em>{taskTitle.toLowerCase()}.</em>
        </div>

        {/* Description */}
        <div style={{ fontSize: 16, lineHeight: 1.65, opacity: 0.85, marginBottom: 32 }}>
          <strong>{kidName}</strong> wants you to finish before <strong>{dueTime}</strong>.<br />
          Sirf 20 minute — main aapke saath hoon.
        </div>

        {/* Voice note player */}
        <div
          onClick={toggleVoice}
          style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 14, padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 14,
            marginBottom: 32, cursor: 'pointer',
          }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0,
          }}>
            {voicePlaying ? '⏸' : '▶'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{kidName}'s voice note</div>
            <div style={{ fontFamily: 'var(--pc-mono)', fontSize: 11, opacity: 0.65, letterSpacing: '0.04em' }}>
              ∿∿∿∿∿∿∿∿∿∿  00:11
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 44 }}>
          <button
            onClick={handleStart}
            style={{
              width: '100%', padding: '20px 0', borderRadius: 16,
              background: 'var(--pc-surface)', color: 'var(--pc-brand-deep)',
              border: 'none', fontSize: 18, fontWeight: 700,
              fontFamily: 'var(--pc-body)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            ▶ &nbsp;SHURU KAREIN
          </button>

          <button
            onClick={handleSnooze}
            disabled={snoozed}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 16,
              background: 'rgba(168,80,26,0.4)',
              color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
              fontSize: 15, fontWeight: 600,
              fontFamily: 'var(--pc-body)', cursor: snoozed ? 'not-allowed' : 'pointer',
              opacity: snoozed ? 0.55 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {snoozed ? 'Reminder set ✓' : '30 minute baad yaad dilaana'}
          </button>
        </div>
      </div>
    </div>
  )
}
