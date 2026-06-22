'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SaathiMark from '@/components/ui/SaathiMark'
import type { HealthProfile, ProofType, RecurrenceType } from '@/types'

/*
  NewTaskForm — Client Component for the task creation form.

  Receives family_id and health_profile from the parent Server Component
  (page.tsx). The Server Component fetches data; this component handles
  all interactivity: template selection, form state, and submission.

  Architecture note:
    TEMPLATE_DEFAULTS is defined OUTSIDE the component function. This
    means JavaScript creates it once at module load time, not on every
    re-render. If it lived inside the component, React would rebuild the
    entire object on every state change — a waste. The saathiText field
    is a function (not a string) because it needs to interpolate
    healthProfile, which only arrives at render time as a prop.
*/

// ── Types ─────────────────────────────────────────────────────

type TemplateKey = 'walk' | 'diet' | 'medicine' | 'sleep' | 'exercise' | 'custom'

interface FormState {
  selectedTemplate: TemplateKey | null
  title:        string
  recurrence:   RecurrenceType  // 'daily' | 'weekly' | 'once'
  scheduleTime: string          // "HH:MM" — empty string if not set
  proofType:    ProofType       // 'photo' | 'none'
}

interface NewTaskFormProps {
  familyId:       string | undefined
  healthProfile:  HealthProfile | null
  parentId:       string | null
  parentTimezone: string
}

// ── Template configuration ────────────────────────────────────
// Defined outside the component so it is never recreated on re-renders.

const TEMPLATE_DEFAULTS: Record<TemplateKey, {
  label:        string
  emoji:        string
  defaultTitle: string
  defaultTime:  string
  defaultProof: ProofType
  saathiText:   (hp: HealthProfile | null) => string
}> = {
  walk: {
    label:        'Walk',
    emoji:        '🚶',
    defaultTitle: 'Morning Walk',
    defaultTime:  '07:30',
    defaultProof: 'photo',
    saathiText: hp => {
      const dur = hp?.preferred_duration ?? 20
      const hasKneePain = hp?.conditions?.includes('knee_pain') ?? false
      return hasKneePain
        ? `Saathi will adapt this to a ${dur}-min flat-surface walk — no slopes or stairs, given the knee condition. Photo at the start or end confirms completion.`
        : `Saathi will set this as a ${dur}-min walk and verify completion from the photo. Location and posture will be noted.`
    },
  },
  diet: {
    label:        'Diet',
    emoji:        '🍽️',
    defaultTitle: 'Lunch — Dal, Roti, Sabzi',
    defaultTime:  '13:00',
    defaultProof: 'photo',
    saathiText: hp => {
      const region = hp?.food_region ?? 'regional'
      const restrictions = hp?.restrictions ?? []
      const noRestrictions = restrictions.length === 0 || restrictions.every(r => r === 'none')
      return `Saathi will analyse the meal photo for ${region} components and flag protein or micronutrient gaps. ${
        noRestrictions ? 'No dietary restrictions noted.' : `Restrictions on file: ${restrictions.filter(r => r !== 'none').join(', ')}.`
      }`
    },
  },
  medicine: {
    label:        'Medicine',
    emoji:        '💊',
    defaultTitle: 'Morning Medicine',
    defaultTime:  '09:00',
    defaultProof: 'photo',
    saathiText: hp => {
      const age = hp?.age
      return age
        ? `Saathi will read the medication label and cross-reference with the health profile. Age ${age} noted for dosage context. Blister count will be tracked for adherence.`
        : `Saathi will read the medication label from the photo and verify it matches the prescription on file.`
    },
  },
  sleep: {
    label:        'Sleep',
    emoji:        '😴',
    defaultTitle: 'Sleep by 10 PM',
    defaultTime:  '22:00',
    defaultProof: 'none',
    saathiText: hp => {
      const hasHypertension = hp?.conditions?.includes('hypertension') ?? false
      return hasHypertension
        ? `Good sleep is especially important for blood pressure management. Saathi will send a gentle reminder 30 min before bedtime and track the streak without requiring photo proof.`
        : `Saathi will send a gentle reminder at the scheduled time and automatically track the bedtime streak. No photo proof needed.`
    },
  },
  exercise: {
    label:        'Exercise',
    emoji:        '🏃',
    defaultTitle: 'Evening Exercise',
    defaultTime:  '17:30',
    defaultProof: 'photo',
    saathiText: hp => {
      const dur        = hp?.preferred_duration ?? 20
      const fitness    = hp?.fitness_level ?? 'sedentary'
      const eq         = hp?.equipment ?? []
      const hasEq      = eq.length > 0 && !eq.every(e => e === 'none')
      const eqText     = hasEq ? `using ${eq.filter(e => e !== 'none').join(', ')}` : 'bodyweight only'
      const conditions = hp?.conditions ?? []
      const mods = conditions.includes('knee_pain')
        ? ' No running or jumping — chair-assisted and wall exercises only.'
        : ''
      return `Saathi will generate a fresh ${dur}-min ${fitness} routine each morning, ${eqText}.${mods} A photo after completion confirms it happened.`
    },
  },
  custom: {
    label:        'Custom',
    emoji:        '✨',
    defaultTitle: '',                 // empty — the kid writes their own
    defaultTime:  '09:00',
    defaultProof: 'photo',
    saathiText: () =>
      'Your own task. Saathi will remind Papa at the time you set. Choose whether a photo is needed — if not, Papa just taps Done.',
  },
}

// ── Helpers ───────────────────────────────────────────────────

// Converts a bare time string ("07:30") + IANA timezone into a UTC ISO string.
// Steps: get today's date in that timezone → glue with time → read the UTC offset
// for that timezone right now → build a full ISO string → let Date parse it to UTC.
function buildDueAt(scheduleTime: string | null, timezone: string): string {
  const time = scheduleTime || '00:00'

  // Step 1: today's calendar date in the parent's timezone, e.g. "2026-05-29"
  const todayInTz = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
  }).format(new Date())

  // Step 2: the UTC offset for this timezone right now, e.g. "GMT+5:30" → "+05:30"
  const rawOffset = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(new Date())
    .find(p => p.type === 'timeZoneName')!
    .value                                    // "GMT+5:30"
    .replace('GMT', '')                       // "+5:30"
    .replace(/^([+-])(\d):/, '$10$2:')        // "+05:30"  (pad single-digit hours)

  // Step 3: build "2026-05-29T07:30:00+05:30" — JS Date parses this correctly to UTC
  return new Date(`${todayInTz}T${time}:00${rawOffset}`).toISOString()
}

// ── Component ─────────────────────────────────────────────────

export default function NewTaskForm({ familyId, healthProfile, parentId, parentTimezone }: NewTaskFormProps) {
  const router = useRouter()

  const [form, setForm] = useState<FormState>({
    selectedTemplate: null,
    title:        '',
    recurrence:   'daily',
    scheduleTime: '',
    proofType:    'photo',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Reminder channel state — UI only, no DB column yet.
  // These will wire up to the notification system in Phase 2.
  const [reminderChannels, setReminderChannels] = useState<Set<string>>(
    new Set(['push', 'whatsapp_voice'])
  )

  // ── Handlers ────────────────────────────────────────────────

  function selectTemplate(key: TemplateKey) {
    // Full replacement, not partial merge — switching templates must
    // completely replace defaults, not carry over the old title/time.
    const d = TEMPLATE_DEFAULTS[key]
    setForm({
      selectedTemplate: key,
      title:        d.defaultTitle,
      recurrence:   'daily',
      scheduleTime: d.defaultTime,
      proofType:    d.defaultProof,
    })
    setError(null)
  }

  function toggleChannel(channel: string) {
    setReminderChannels(prev => {
      const next = new Set(prev)
      next.has(channel) ? next.delete(channel) : next.add(channel)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!familyId || !form.selectedTemplate) return

    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Session expired. Please sign in again.')
      setSubmitting(false)
      return
    }

    // .select().single() tells Supabase to return the inserted row so we get the new task's id
    const { data: newTask, error: insertError } = await supabase
      .from('tasks')
      .insert({
        kid_id:          user.id,
        family_id:       familyId,
        title:           form.title.trim(),
        type:            form.selectedTemplate,
        proof_type:      form.proofType,
        recurrence:      form.recurrence,
        schedule_time:   form.scheduleTime || null,
        note:            null,
        voice_note_url:  null,
        streak_goal:     7,
        is_active:       true,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    // Only create today's instance if a parent is connected — no parent means no one to assign it to
    if (parentId) {
      const { error: instanceError } = await supabase.from('task_instances').insert({
        task_id:   newTask.id,
        parent_id: parentId,
        family_id: familyId,
        due_at:    buildDueAt(form.scheduleTime || null, parentTimezone),
        status:    'pending',
      })

      if (instanceError) {
        setError(instanceError.message)
        setSubmitting(false)
        return
      }

      // Initialize streak row for this task — non-critical, don't block navigation on failure.
      // The nightly Edge Function and AI verifier will increment current_streak on each
      // verified completion. Without this row existing, those increments have no target.
      await supabase.from('streaks').insert({
        task_id:        newTask.id,
        parent_id:      parentId,
        current_streak: 0,
        longest_streak: 0,
      })
    }

    router.push('/kid/dashboard')
  }

  // ── Derived ─────────────────────────────────────────────────

  const preferredDuration = healthProfile?.preferred_duration ?? 20
  const templateKeys = Object.keys(TEMPLATE_DEFAULTS) as TemplateKey[]

  // ── Render ──────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--pc-ink3)', marginBottom: 20 }}>
        <Link href="/kid/dashboard" style={{ color: 'var(--pc-ink3)', textDecoration: 'none' }}>Tasks</Link>
        <span>›</span>
        <span style={{ color: 'var(--pc-ink2)', fontWeight: 500 }}>New</span>
      </div>

      {/* Heading */}
      <div
        className="font-serif font-medium text-[28px] text-ink"
        style={{ letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 6 }}
      >
        Add a new task for Papa
      </div>
      <p style={{ margin: '0 0 28px', fontSize: 14, lineHeight: 1.55, color: 'var(--pc-ink3)' }}>
        Pick a template — Saathi adapts it to Papa&apos;s health profile — or choose
        <strong> Custom</strong> to create any task of your own, with your own time,
        frequency, and whether a photo is needed.
      </p>

      {/* ── Template picker ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 32 }}>
        {templateKeys.map(key => {
          const t          = TEMPLATE_DEFAULTS[key]
          const isSelected = form.selectedTemplate === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => selectTemplate(key)}
              style={{
                padding: '16px 8px',
                borderRadius: 12,
                border: `${isSelected ? '1.5px solid var(--pc-brand)' : '0.5px solid var(--pc-hair)'}`,
                background: isSelected ? 'var(--pc-brand-tint)' : 'var(--pc-surface)',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                transition: 'all 0.15s',
                boxShadow: isSelected ? '0 0 0 3px var(--pc-brand-tint)' : 'none',
              }}
            >
              <span style={{ fontSize: 26 }}>{t.emoji}</span>
              <span style={{
                fontSize: 12.5,
                fontWeight: isSelected ? 600 : 400,
                color: isSelected ? 'var(--pc-brand-deep)' : 'var(--pc-ink2)',
              }}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Configure form — only visible once a template is selected ── */}
      {form.selectedTemplate && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Title */}
          <div>
            <label className="pc-label">Task title</label>
            <input
              type="text"
              className="pc-input"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder={form.selectedTemplate === 'custom' ? 'e.g. Call the doctor, Water the plants' : 'e.g. Morning Walk'}
              required
            />
          </div>

          {/* When — frequency + time */}
          <div>
            <label className="pc-label">When</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <select
                className="pc-input"
                value={form.recurrence}
                onChange={e => setForm(prev => ({ ...prev, recurrence: e.target.value as RecurrenceType }))}
                style={{ cursor: 'pointer' }}
              >
                <option value="daily">Every day</option>
                <option value="custom">Every other day</option>
                <option value="weekly">Weekly</option>
                <option value="once">Just once</option>
              </select>
              <input
                type="time"
                className="pc-input"
                value={form.scheduleTime}
                onChange={e => setForm(prev => ({ ...prev, scheduleTime: e.target.value }))}
              />
            </div>
          </div>

          {/* Duration — visual only in MVP; defaults to health profile preferred_duration.
              Hidden for custom tasks: a custom task ("Call grandma") has no health-profile
              duration, so showing this picker would be meaningless. */}
          {form.selectedTemplate !== 'custom' && (
          <div>
            <label className="pc-label">Duration</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[10, 15, 20, 30].map(min => {
                const isActive = min === preferredDuration
                return (
                  <button
                    key={min}
                    type="button"
                    // UI only — no onClick needed for MVP.
                    // When we build per-task duration overrides, add state here.
                    style={{
                      padding: '7px 16px',
                      borderRadius: 999,
                      border: `${isActive ? '1.5px solid var(--pc-brand)' : '0.5px solid var(--pc-hair)'}`,
                      background: isActive ? 'var(--pc-brand-tint)' : 'var(--pc-surface)',
                      fontSize: 13, fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'var(--pc-brand-deep)' : 'var(--pc-ink2)',
                      cursor: 'default',
                    }}
                  >
                    {min} min
                  </button>
                )
              })}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--pc-ink4)' }}>
              Based on Papa&apos;s health profile · change in profile settings
            </p>
          </div>
          )}

          {/* Reminder channels — UI only; notification system built in Phase 2 */}
          <div>
            <label className="pc-label">Reminder channel</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { id: 'push',           label: 'Push (full-screen)' },
                { id: 'whatsapp_voice', label: 'WhatsApp voice'     },
                { id: 'whatsapp_text',  label: 'WhatsApp text'      },
                { id: 'email_kid',      label: 'Email kid if missed' },
              ].map(({ id, label }) => {
                const on = reminderChannels.has(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleChannel(id)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 999,
                      border: `${on ? '1.5px solid var(--pc-brand)' : '0.5px solid var(--pc-hair)'}`,
                      background: on ? 'var(--pc-brand-tint)' : 'var(--pc-surface)',
                      fontSize: 13, fontWeight: on ? 600 : 400,
                      color: on ? 'var(--pc-brand-deep)' : 'var(--pc-ink2)',
                      cursor: 'pointer',
                    }}
                  >
                    {on && '✓ '}{label}
                  </button>
                )
              })}
            </div>
            {/* TODO (Phase 2): wire channels to notification system */}
            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--pc-ink4)' }}>
              Notification channels will activate in Phase 2
            </p>
          </div>

          {/* Proof type — exclusive toggle */}
          <div>
            <label className="pc-label">Proof required</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { value: 'photo' as ProofType, label: 'Photo only'        },
                { value: 'none'  as ProofType, label: 'No proof required' },
              ]).map(({ value, label }) => {
                const on = form.proofType === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, proofType: value }))}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 999,
                      border: `${on ? '1.5px solid var(--pc-brand)' : '0.5px solid var(--pc-hair)'}`,
                      background: on ? 'var(--pc-brand-tint)' : 'var(--pc-surface)',
                      fontSize: 13, fontWeight: on ? 600 : 400,
                      color: on ? 'var(--pc-brand-deep)' : 'var(--pc-ink2)',
                      cursor: 'pointer',
                    }}
                  >
                    {on && '✓ '}{label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Voice note — placeholder UI */}
          {/* TODO (Phase 2): MediaRecorder API → Supabase Storage upload → voice_note_url */}
          <div>
            <label className="pc-label">Voice note from you</label>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 12,
                border: '0.5px solid var(--pc-hair)',
                background: 'var(--pc-surface)',
              }}
            >
              <button
                type="button"
                disabled
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'var(--pc-surface2)', border: '0.5px solid var(--pc-hair)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'not-allowed', fontSize: 14, color: 'var(--pc-ink3)',
                  flexShrink: 0,
                }}
              >
                🎙
              </button>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: 28,
                    background: 'repeating-linear-gradient(90deg, var(--pc-hair) 0px, var(--pc-hair) 2px, transparent 2px, transparent 6px)',
                    borderRadius: 4,
                    opacity: 0.4,
                  }}
                />
              </div>
              <span style={{ fontSize: 12, color: 'var(--pc-ink4)', flexShrink: 0 }}>coming soon</span>
            </div>
          </div>

          {/* Saathi adaptation panel */}
          <div
            style={{
              background: 'var(--pc-brand-tint)',
              border: '0.5px solid var(--pc-brand)',
              borderRadius: 12, padding: 16,
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}
          >
            <SaathiMark size={22} />
            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: 'var(--pc-brand-deep)', marginBottom: 6,
              }}>
                Saathi will adapt this task
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--pc-ink2)' }}>
                {TEMPLATE_DEFAULTS[form.selectedTemplate].saathiText(healthProfile)}
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ── CTA row ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 32 }}>
        <button
          type="submit"
          disabled={!form.selectedTemplate || submitting}
          className="pc-btn"
          style={{ fontSize: 15, padding: '12px 24px' }}
        >
          {submitting ? 'Creating…' : 'Create task →'}
        </button>
        <Link
          href="/kid/dashboard"
          style={{ fontSize: 13.5, color: 'var(--pc-ink3)', textDecoration: 'none' }}
        >
          Cancel
        </Link>
      </div>

      {error && (
        <p style={{ marginTop: 10, fontSize: 13, color: 'var(--pc-bad)' }}>{error}</p>
      )}

    </form>
  )
}
