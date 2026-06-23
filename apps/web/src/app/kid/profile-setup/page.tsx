'use client'

import { useRouter } from 'next/navigation'
import ProfileChat, { type Question } from '@/components/onboarding/ProfileChat'

/*
  /kid/profile-setup — the kid fills out their parent's health profile.

  Same chat engine as parent onboarding, but the voice is third-person English
  ("How old is your parent?") because the kid is answering ABOUT the parent.
  The value codes match the parent script exactly, so the server maps both the
  same way.

  onComplete POSTs to /api/health-profile/submit, which either writes the real
  profile (if a parent is linked) or stashes it as pending (if not).
*/

const INTRO: string[] = [
  'Hey! 👋',
  "Let's set up your parent's health profile so I can tailor every task to them.",
]

const QUESTIONS: Question[] = [
  {
    id: 'age',
    messages: ['How old is your parent?'],
    type: 'text',
    placeholder: 'e.g. 68',
    ack: () => 'Got it 😊',
  },
  {
    id: 'conditions',
    messages: [
      'Do they have any health conditions I should know about?',
      'Like BP, diabetes, knee pain, or a heart condition?',
    ],
    type: 'multi',
    options: [
      { label: 'High blood pressure', value: 'hypertension' },
      { label: 'Diabetes',            value: 'diabetes' },
      { label: 'Knee / joint pain',   value: 'knee_pain' },
      { label: 'Heart condition',     value: 'heart_condition' },
      { label: 'None',                value: 'none' },
    ],
    ack: v => (v as string[]).includes('none')
      ? "Great — nothing major to worry about 👍"
      : "Noted. I'll keep these in mind for every task.",
  },
  {
    id: 'restrictions',
    messages: ['Has their doctor told them to avoid any exercises — like running or jumping?'],
    type: 'multi',
    options: [
      { label: 'No running',       value: 'no_running' },
      { label: 'No jumping',       value: 'no_jumping' },
      { label: 'No heavy lifting', value: 'no_heavy_lifting' },
      { label: 'No restrictions',  value: 'none' },
    ],
    ack: () => "Understood. I'll keep routines safe for them.",
  },
  {
    id: 'duration',
    messages: ['How long can they comfortably exercise?'],
    type: 'single',
    options: [
      { label: '10 minutes', value: '10' },
      { label: '20 minutes', value: '20' },
      { label: '30 minutes', value: '30' },
    ],
    ack: v => `${v} minutes — perfect. I'll size routines to that.`,
  },
  {
    id: 'equipment',
    messages: ['Any exercise equipment at home?'],
    type: 'multi',
    options: [
      { label: 'Dumbbells',        value: 'dumbbells' },
      { label: 'Resistance bands', value: 'resistance_bands' },
      { label: 'Yoga mat',         value: 'yoga_mat' },
      { label: 'Nothing',          value: 'none' },
    ],
    ack: () => 'Okay, got it.',
  },
  {
    id: 'food_region',
    messages: ['What food do they usually prefer?'],
    type: 'single',
    options: [
      { label: 'North Indian', value: 'north_indian' },
      { label: 'South Indian', value: 'south_indian' },
      { label: 'Gujarati',     value: 'gujarati' },
      { label: 'Bengali',      value: 'bengali' },
      { label: 'Mixed / Any',  value: 'mixed' },
    ],
    ack: v => {
      const opt = QUESTIONS.find(q => q.id === 'food_region')?.options?.find(o => o.value === v)
      return `${opt?.label ?? v} — noted 😊`
    },
  },
]

const DONE_MESSAGES: string[] = [
  "Perfect! Your parent's profile is ready 🌟",
  "I'll use this to tailor every task. Taking you back to add tasks…",
]

export default function KidProfileSetupPage() {
  const router = useRouter()

  async function save(ans: Record<string, string | string[]>) {
    await fetch('/api/health-profile/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: ans }),
    })
    setTimeout(() => router.push('/kid/tasks/new'), 1000)
  }

  return (
    <ProfileChat
      intro={INTRO}
      questions={QUESTIONS}
      doneMessages={DONE_MESSAGES}
      onComplete={save}
      statusLine="online · English"
      savingLabel="Saving profile…"
    />
  )
}
