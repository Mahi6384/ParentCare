'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id:   string
  from: 'saathi' | 'user'
  text: string
}

interface QuestionOption {
  label: string
  value: string
}

interface Question {
  id:           string
  messages:     string[]          // Saathi can send multiple bubbles per question
  type:         'text' | 'single' | 'multi'
  placeholder?: string
  options?:     QuestionOption[]
  ack:          (answer: string | string[]) => string
}

// ─── Conversation definition (Option A — hardcoded) ──────────────────────────
// In Option B these messages will come from Claude in real-time.
// The shape stays the same; only the data source changes.

const INTRO: string[] = [
  'Namaste Papa 🙏',
  'Main aapka health companion hoon — naam Saathi hai. Pehle thoda aapke baare mein jaanna chahta hoon.',
]

const QUESTIONS: Question[] = [
  {
    id:          'age',
    messages:    ['Aapki umar kitni hai?'],
    type:        'text',
    placeholder: 'Jaise: 68',
    ack:         ()  => 'Acha ji 😊',
  },
  {
    id:       'conditions',
    messages: [
      'Koi bimari hai jo main jaanu?',
      'Jaise BP, sugar, ghutne ka dard, dil ki bimari?',
    ],
    type: 'multi',
    options: [
      { label: 'BP / High blood pressure', value: 'hypertension'     },
      { label: 'Diabetes / Sugar',         value: 'diabetes'         },
      { label: 'Ghutne ka dard',           value: 'knee_pain'        },
      { label: 'Dil ki bimari',            value: 'heart_condition'  },
      { label: 'Koi nahi',                 value: 'none'             },
    ],
    ack: (v) => (v as string[]).includes('none')
      ? 'Bahut acha — koi badi takleef nahi 👍'
      : 'Theek hai. Main dhyan rakhunga.',
  },
  {
    id:       'restrictions',
    messages: ['Doctor ne koi exercise mana ki hai — jaise daudna ya koodna?'],
    type:     'multi',
    options:  [
      { label: 'Daudna nahi',          value: 'no_running'       },
      { label: 'Koodna nahi',          value: 'no_jumping'       },
      { label: 'Vajan uthana nahi',    value: 'no_heavy_lifting' },
      { label: 'Koi restriction nahi', value: 'none'             },
    ],
    ack: () => 'Samajh gaya. Routine mein yeh sab dhyan rakhunga.',
  },
  {
    id:       'duration',
    messages: ['Kitni der exercise kar sakte hain aaram se?'],
    type:     'single',
    options:  [
      { label: '10 minute', value: '10' },
      { label: '20 minute', value: '20' },
      { label: '30 minute', value: '30' },
    ],
    ack: (v) => `${v} minute — bilkul sahi. Routine bhi waise hi hoga.`,
  },
  {
    id:       'equipment',
    messages: ['Ghar mein koi exercise equipment hai?'],
    type:     'multi',
    options:  [
      { label: 'Dumbbells',        value: 'dumbbells'         },
      { label: 'Resistance bands', value: 'resistance_bands'  },
      { label: 'Yoga mat',         value: 'yoga_mat'          },
      { label: 'Kuch nahi',        value: 'none'              },
    ],
    ack: () => 'Theek hai.',
  },
  {
    id:       'food_region',
    messages: ['Aap khaane mein kya prefer karte hain?'],
    type:     'single',
    options:  [
      { label: 'North Indian',    value: 'north_indian' },
      { label: 'South Indian',    value: 'south_indian' },
      { label: 'Gujarati',        value: 'gujarati'     },
      { label: 'Bengali',         value: 'bengali'      },
      { label: 'Mix / Kuch bhi', value: 'mixed'        },
    ],
    ack: (v) => {
      const opt = QUESTIONS.find(q => q.id === 'food_region')
        ?.options?.find(o => o.value === v)
      return `${opt?.label ?? v} — noted 😊`
    },
  },
]

const DONE_MESSAGES: string[] = [
  'Bahut acha! Aapka profile tayyar ho gaya 🌟',
  'Aaj se main aapka dhyan rakhunga. Dashboard khul raha hai…',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

let msgCounter = 0
const uid = () => `msg-${++msgCounter}`

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingChatPage() {
  const router                          = useRouter()
  const [messages, setMessages]         = useState<ChatMessage[]>([])
  const [step, setStep]                 = useState(-1)         // -1 = intro
  const [isTyping, setIsTyping]         = useState(false)      // "Saathi is typing…"
  const [inputValue, setInputValue]     = useState('')
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [saving, setSaving]             = useState(false)
  const [answers, setAnswers]           = useState<Record<string, string | string[]>>({})
  const bottomRef                       = useRef<HTMLDivElement>(null)

  // ── Auto-scroll to latest message ──────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // ── Kick off on mount: send intro messages ──────────────────────────────────
  useEffect(() => {
    sendSaathiMessages(INTRO, () => setStep(0))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── When step advances, send the next question ──────────────────────────────
  useEffect(() => {
    if (step < 0 || step >= QUESTIONS.length) return
    const q = QUESTIONS[step]
    setSelected(new Set())
    setInputValue('')
    sendSaathiMessages(q.messages)
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helper: queue Saathi bubbles with typing indicator between them ─────────
  function sendSaathiMessages(texts: string[], onDone?: () => void) {
    let delay = 400
    texts.forEach((text, i) => {
      setTimeout(() => setIsTyping(true), delay - 300)
      setTimeout(() => {
        setIsTyping(false)
        setMessages(prev => [...prev, { id: uid(), from: 'saathi', text }])
        if (i === texts.length - 1) onDone?.()
      }, delay)
      delay += text.length * 18 + 400   // proportional to message length
    })
  }

  // ── Handle user submitting an answer ───────────────────────────────────────
  function submitAnswer(raw: string | string[]) {
    if (step < 0 || step >= QUESTIONS.length) return
    const q = QUESTIONS[step]

    // Display user bubble
    const display = Array.isArray(raw) ? raw.map(v => {
      return q.options?.find(o => o.value === v)?.label ?? v
    }).join(', ') : raw

    setMessages(prev => [...prev, { id: uid(), from: 'user', text: display }])

    // Record answer
    const newAnswers = { ...answers, [q.id]: raw }
    setAnswers(newAnswers)

    const nextStep = step + 1
    const isLast   = nextStep >= QUESTIONS.length

    // Send ack, then next question or done flow
    sendSaathiMessages([q.ack(raw)], () => {
      if (isLast) {
        sendSaathiMessages(DONE_MESSAGES, () => saveProfile(newAnswers))
      } else {
        setStep(nextStep)
      }
    })
  }

  // ── Chip toggle logic ───────────────────────────────────────────────────────
  function toggleChip(value: string, isExclusive: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      if (isExclusive) {
        // "Koi nahi / Koi restriction nahi / Kuch nahi" clears all others
        return next.has(value) ? new Set() : new Set([value])
      }
      // Selecting a normal option clears any exclusive "none" selection
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.delete('none')
        next.add(value)
      }
      return next
    })
  }

  // ── Text input submit ───────────────────────────────────────────────────────
  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = inputValue.trim()
    if (!val) return
    submitAnswer(val)
    setInputValue('')
  }

  // ── Save health profile to Supabase ────────────────────────────────────────
  // This is the only "backend" interaction in this component.
  // We use upsert (insert or update) so re-running onboarding updates the profile.
  async function saveProfile(ans: Record<string, string | string[]>) {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    await supabase.from('health_profiles').upsert({
      parent_id:          user.id,
      age:                parseInt(ans.age as string, 10),
      conditions:         (ans.conditions as string[]).filter(v => v !== 'none'),
      restrictions:       (ans.restrictions as string[]).filter(v => v !== 'none'),
      fitness_level:      'sedentary',        // we don't ask — safe default for Phase 1
      equipment:          (ans.equipment as string[]).filter(v => v !== 'none'),
      preferred_duration: parseInt(ans.duration as string, 10),
      food_region:        ans.food_region as string,
      language_preference: 'hinglish',        // default; parent can change in profile settings
      updated_at:         new Date().toISOString(),
    }, { onConflict: 'parent_id' })

    setSaving(false)
    setTimeout(() => router.push('/parent/dashboard'), 1200)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const currentQ = step >= 0 && step < QUESTIONS.length ? QUESTIONS[step] : null
  const showInput = currentQ && !saving

  return (
    <div
      className="flex flex-col"
      style={{
        height:     '100dvh',
        background: 'var(--pc-bg)',
        maxWidth:   390,
        margin:     '0 auto',
      }}
    >

      {/* ── Header ── */}
      <div
        style={{
          padding:      '52px 18px 12px',
          background:   'var(--pc-surface)',
          borderBottom: '0.5px solid var(--pc-hair)',
          flexShrink:   0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Saathi avatar */}
          <div
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background:   'var(--pc-brand)',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              color:        '#fff',
              fontWeight:   700,
              fontSize:     15,
              flexShrink:   0,
            }}
          >
            S
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--pc-ink)' }}>
              Saathi
            </div>
            <div style={{ fontSize: 12, color: 'var(--pc-ok)' }}>
              ● online · Hinglish
            </div>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        style={{
          flex:       1,
          overflowY:  'auto',
          padding:    '16px 14px',
          display:    'flex',
          flexDirection: 'column',
          gap:        6,
        }}
      >
        {/* Date divider */}
        <div style={{ textAlign: 'center', margin: '8px 0' }}>
          <span
            style={{
              fontSize:   11,
              color:      'var(--pc-ink3)',
              background: 'var(--pc-surface2)',
              padding:    '3px 10px',
              borderRadius: 999,
            }}
          >
            Today
          </span>
        </div>

        {/* All messages */}
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display:        'flex',
              justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
              marginBottom:   2,
            }}
          >
            {msg.from === 'saathi' && (
              <div
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--pc-brand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 11,
                  flexShrink: 0, marginRight: 8, alignSelf: 'flex-end',
                }}
              >
                S
              </div>
            )}
            <div
              style={{
                maxWidth:    '75%',
                padding:     '10px 14px',
                borderRadius: msg.from === 'user'
                  ? '18px 18px 4px 18px'
                  : '18px 18px 18px 4px',
                background:  msg.from === 'user'
                  ? 'var(--pc-brand)'
                  : 'var(--pc-surface)',
                color:       msg.from === 'user' ? '#fff' : 'var(--pc-ink)',
                fontSize:    16,
                lineHeight:  1.45,
                boxShadow:   '0 1px 2px rgba(0,0,0,0.07)',
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div
              style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--pc-brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0,
              }}
            >
              S
            </div>
            <div
              style={{
                padding: '10px 16px',
                background: 'var(--pc-surface)',
                borderRadius: '18px 18px 18px 4px',
                display: 'flex', gap: 4, alignItems: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.07)',
              }}
            >
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'var(--pc-ink3)',
                    animation: `bounce 1.2s ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      {showInput && (
        <div
          style={{
            background:   'var(--pc-surface)',
            borderTop:    '0.5px solid var(--pc-hair)',
            padding:      '12px 14px 28px',
            flexShrink:   0,
          }}
        >

          {/* Multi-select chips */}
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
                        padding:     '8px 14px',
                        borderRadius: 999,
                        border:      `1.5px solid ${isSelected ? 'var(--pc-brand)' : 'var(--pc-hair)'}`,
                        background:  isSelected ? 'var(--pc-brand-tint)' : 'var(--pc-surface)',
                        color:       isSelected ? 'var(--pc-brand-deep)' : 'var(--pc-ink2)',
                        fontSize:    14,
                        fontWeight:  isSelected ? 600 : 400,
                        cursor:      'pointer',
                        transition:  'all 0.15s',
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
                  width:        '100%',
                  padding:      '13px',
                  borderRadius: 12,
                  border:       'none',
                  background:   selected.size > 0 ? 'var(--pc-brand)' : 'var(--pc-surface2)',
                  color:        selected.size > 0 ? '#fff' : 'var(--pc-ink4)',
                  fontSize:     16,
                  fontWeight:   600,
                  cursor:       selected.size > 0 ? 'pointer' : 'not-allowed',
                  transition:   'all 0.15s',
                  fontFamily:   'var(--pc-body)',
                }}
              >
                Theek hai →
              </button>
            </>
          )}

          {/* Single-select chips */}
          {currentQ.type === 'single' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {currentQ.options?.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => submitAnswer(opt.value)}
                  style={{
                    padding:     '10px 18px',
                    borderRadius: 999,
                    border:      '1.5px solid var(--pc-hair)',
                    background:  'var(--pc-surface)',
                    color:       'var(--pc-ink2)',
                    fontSize:    15,
                    cursor:      'pointer',
                    fontFamily:  'var(--pc-body)',
                    transition:  'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.target as HTMLElement).style.borderColor = 'var(--pc-brand)'
                    ;(e.target as HTMLElement).style.background = 'var(--pc-brand-tint)'
                    ;(e.target as HTMLElement).style.color      = 'var(--pc-brand-deep)'
                  }}
                  onMouseLeave={e => {
                    (e.target as HTMLElement).style.borderColor = 'var(--pc-hair)'
                    ;(e.target as HTMLElement).style.background = 'var(--pc-surface)'
                    ;(e.target as HTMLElement).style.color      = 'var(--pc-ink2)'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Text input (age) */}
          {currentQ.type === 'text' && (
            <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: 10 }}>
              <input
                type="number"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={currentQ.placeholder ?? 'Apna jawab likhiye...'}
                min={1}
                max={120}
                autoFocus
                style={{
                  flex:        1,
                  padding:     '12px 16px',
                  borderRadius: 999,
                  border:      '1.5px solid var(--pc-hair)',
                  background:  'var(--pc-bg)',
                  color:       'var(--pc-ink)',
                  fontSize:    17,
                  fontFamily:  'var(--pc-body)',
                  outline:     'none',
                }}
                onFocus={e  => { e.target.style.borderColor = 'var(--pc-brand)' }}
                onBlur={e   => { e.target.style.borderColor = 'var(--pc-hair)'  }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                style={{
                  width:        46,
                  height:       46,
                  borderRadius: '50%',
                  border:       'none',
                  background:   inputValue.trim() ? 'var(--pc-brand)' : 'var(--pc-surface2)',
                  color:        inputValue.trim() ? '#fff' : 'var(--pc-ink4)',
                  fontSize:     20,
                  cursor:       inputValue.trim() ? 'pointer' : 'not-allowed',
                  flexShrink:   0,
                  transition:   'all 0.15s',
                }}
              >
                ↑
              </button>
            </form>
          )}
        </div>
      )}

      {/* Saving indicator */}
      {saving && (
        <div
          style={{
            textAlign: 'center', padding: '16px',
            fontSize: 14, color: 'var(--pc-ink3)',
            background: 'var(--pc-surface)',
            borderTop: '0.5px solid var(--pc-hair)',
          }}
        >
          Profile save ho raha hai…
        </div>
      )}

      {/* Bounce animation */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-6px); }
        }
      `}</style>

    </div>
  )
}
