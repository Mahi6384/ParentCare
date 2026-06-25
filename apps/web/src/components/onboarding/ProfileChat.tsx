'use client'

import { useState, useEffect, useRef } from 'react'

/*
  ProfileChat — the reusable conversational health-profile builder.

  Extracted from /onboarding/chat so two callers can share one chat engine:
    • Parent onboarding (Hindi, first-person — "Aapki umar kitni hai?")
    • Kid profile-setup  (English, third-person — "How old is your parent?")

  This component owns ONLY the conversation UX (bubbles, typing indicator,
  chips, text input). It is data-source agnostic: the caller passes the script
  (intro / questions / doneMessages) and an onComplete handler that decides
  where the collected answers go (parent upsert vs kid pending-save).
*/

// ── Public types (callers import these to build their question script) ──

export interface QuestionOption {
  label: string
  value: string
}

export interface Question {
  id:           string
  messages:     string[]                                  // Saathi can send multiple bubbles
  type:         'text' | 'single' | 'multi'
  placeholder?: string
  options?:     QuestionOption[]
  ack:          (answer: string | string[]) => string     // Saathi's reply after the answer
}

interface ProfileChatProps {
  intro:        string[]
  questions:    Question[]
  doneMessages: string[]
  onComplete:   (answers: Record<string, string | string[]>) => Promise<void>
  statusLine?:  string                                     // header subtitle, e.g. "online · English"
  savingLabel?: string                                     // shown while onComplete runs
}

// ── Internal types ──

interface ChatMessage {
  id:   string
  from: 'saathi' | 'user'
  text: string
}

let msgCounter = 0
const uid = () => `msg-${++msgCounter}`

// ── Component ──

export default function ProfileChat({
  intro,
  questions,
  doneMessages,
  onComplete,
  statusLine  = 'online',
  savingLabel = 'Saving…',
}: ProfileChatProps) {
  const [messages, setMessages]     = useState<ChatMessage[]>([])
  const [step, setStep]             = useState(-1)         // -1 = intro
  const [isTyping, setIsTyping]     = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [saving, setSaving]         = useState(false)
  const [answers, setAnswers]       = useState<Record<string, string | string[]>>({})
  const bottomRef                   = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Kick off on mount: send intro messages, then advance to first question
  useEffect(() => {
    sendSaathiMessages(intro, () => setStep(0))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When step advances, send the next question
  useEffect(() => {
    if (step < 0 || step >= questions.length) return
    const q = questions[step]
    setSelected(new Set())
    setInputValue('')
    sendSaathiMessages(q.messages)
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  // Queue Saathi bubbles with a typing indicator between them
  function sendSaathiMessages(texts: string[], onDone?: () => void) {
    let delay = 400
    texts.forEach((text, i) => {
      setTimeout(() => setIsTyping(true), delay - 300)
      setTimeout(() => {
        setIsTyping(false)
        setMessages(prev => [...prev, { id: uid(), from: 'saathi', text }])
        if (i === texts.length - 1) onDone?.()
      }, delay)
      delay += text.length * 18 + 400
    })
  }

  // Handle the user submitting an answer
  function submitAnswer(raw: string | string[]) {
    if (step < 0 || step >= questions.length) return
    const q = questions[step]

    const display = Array.isArray(raw)
      ? raw.map(v => q.options?.find(o => o.value === v)?.label ?? v).join(', ')
      : raw
    setMessages(prev => [...prev, { id: uid(), from: 'user', text: display }])

    const newAnswers = { ...answers, [q.id]: raw }
    setAnswers(newAnswers)

    const nextStep = step + 1
    const isLast   = nextStep >= questions.length

    sendSaathiMessages([q.ack(raw)], () => {
      if (isLast) {
        sendSaathiMessages(doneMessages, () => finish(newAnswers))
      } else {
        setStep(nextStep)
      }
    })
  }

  async function finish(ans: Record<string, string | string[]>) {
    setSaving(true)
    await onComplete(ans)
    // onComplete typically navigates away; if it doesn't, we leave saving on.
  }

  function toggleChip(value: string, isExclusive: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      if (isExclusive) {
        return next.has(value) ? new Set() : new Set([value])
      }
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.delete('none')
        next.add(value)
      }
      return next
    })
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = inputValue.trim()
    if (!val) return
    submitAnswer(val)
    setInputValue('')
  }

  const currentQ  = step >= 0 && step < questions.length ? questions[step] : null
  const showInput = currentQ && !saving

  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: 'var(--pc-bg)', maxWidth: 390, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ padding: '52px 18px 12px', background: 'var(--pc-surface)', borderBottom: '0.5px solid var(--pc-hair)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', background: 'var(--pc-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
          }}>
            S
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--pc-ink)' }}>Saathi</div>
            <div style={{ fontSize: 12, color: 'var(--pc-ok)' }}>● {statusLine}</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ textAlign: 'center', margin: '8px 0' }}>
          <span style={{ fontSize: 11, color: 'var(--pc-ink3)', background: 'var(--pc-surface2)', padding: '3px 10px', borderRadius: 999 }}>
            Today
          </span>
        </div>

        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start', marginBottom: 2 }}>
            {msg.from === 'saathi' && (
              <div style={{
                width: 26, height: 26, borderRadius: '50%', background: 'var(--pc-brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0, marginRight: 8, alignSelf: 'flex-end',
              }}>
                S
              </div>
            )}
            <div style={{
              maxWidth: '75%', padding: '10px 14px',
              borderRadius: msg.from === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.from === 'user' ? 'var(--pc-brand)' : 'var(--pc-surface)',
              color: msg.from === 'user' ? '#fff' : 'var(--pc-ink)',
              fontSize: 16, lineHeight: 1.45, boxShadow: '0 1px 2px rgba(0,0,0,0.07)',
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: 'var(--pc-brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0,
            }}>
              S
            </div>
            <div style={{
              padding: '10px 16px', background: 'var(--pc-surface)', borderRadius: '18px 18px 18px 4px',
              display: 'flex', gap: 4, alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.07)',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pc-ink3)', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {showInput && (
        <div style={{ background: 'var(--pc-surface)', borderTop: '0.5px solid var(--pc-hair)', padding: '12px 14px 28px', flexShrink: 0 }}>

          {currentQ.type === 'multi' && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {currentQ.options?.map(opt => {
                  const isSelected = selected.has(opt.value)
                  const isNone     = opt.value === 'none'
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleChip(opt.value, isNone)}
                      style={{
                        padding: '8px 14px', borderRadius: 999,
                        border: `1.5px solid ${isSelected ? 'var(--pc-brand)' : 'var(--pc-hair)'}`,
                        background: isSelected ? 'var(--pc-brand-tint)' : 'var(--pc-surface)',
                        color: isSelected ? 'var(--pc-brand-deep)' : 'var(--pc-ink2)',
                        fontSize: 14, fontWeight: isSelected ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {isSelected && '✓ '}{opt.label}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => selected.size > 0 && submitAnswer([...selected])}
                disabled={selected.size === 0}
                style={{
                  width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                  background: selected.size > 0 ? 'var(--pc-brand)' : 'var(--pc-surface2)',
                  color: selected.size > 0 ? '#fff' : 'var(--pc-ink4)',
                  fontSize: 16, fontWeight: 600, cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s', fontFamily: 'var(--pc-body)',
                }}
              >
                Done →
              </button>
            </>
          )}

          {currentQ.type === 'single' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {currentQ.options?.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => submitAnswer(opt.value)}
                  style={{
                    padding: '10px 18px', borderRadius: 999, border: '1.5px solid var(--pc-hair)',
                    background: 'var(--pc-surface)', color: 'var(--pc-ink2)',
                    fontSize: 15, cursor: 'pointer', fontFamily: 'var(--pc-body)', transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {currentQ.type === 'text' && (
            <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: 10 }}>
              <input
                type="number"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={currentQ.placeholder ?? 'Type your answer...'}
                min={1}
                max={120}
                autoFocus
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 999, border: '1.5px solid var(--pc-hair)',
                  background: 'var(--pc-bg)', color: 'var(--pc-ink)', fontSize: 17,
                  fontFamily: 'var(--pc-body)', outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                style={{
                  width: 46, height: 46, borderRadius: '50%', border: 'none',
                  background: inputValue.trim() ? 'var(--pc-brand)' : 'var(--pc-surface2)',
                  color: inputValue.trim() ? '#fff' : 'var(--pc-ink4)',
                  fontSize: 20, cursor: inputValue.trim() ? 'pointer' : 'not-allowed', flexShrink: 0, transition: 'all 0.15s',
                }}
              >
                ↑
              </button>
            </form>
          )}
        </div>
      )}

      {saving && (
        <div style={{
          textAlign: 'center', padding: '16px', fontSize: 14, color: 'var(--pc-ink3)',
          background: 'var(--pc-surface)', borderTop: '0.5px solid var(--pc-hair)',
        }}>
          {savingLabel}
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
