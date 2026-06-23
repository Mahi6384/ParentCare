'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ProfileChat, { type Question } from '@/components/onboarding/ProfileChat'

/*
  Parent onboarding — the parent answers Saathi's questions in Hindi, first
  person ("Aapki umar kitni hai?"). All the chat UX lives in <ProfileChat>;
  this file only supplies the script and the save behaviour.

  saveProfile upserts directly into health_profiles keyed to the logged-in
  parent (RLS "health_profiles: parent owns" permits this).
*/

const INTRO: string[] = [
  'Namaste Papa 🙏',
  'Main aapka health companion hoon — naam Saathi hai. Pehle thoda aapke baare mein jaanna chahta hoon.',
]

const QUESTIONS: Question[] = [
  {
    id: 'age',
    messages: ['Aapki umar kitni hai?'],
    type: 'text',
    placeholder: 'Jaise: 68',
    ack: () => 'Acha ji 😊',
  },
  {
    id: 'conditions',
    messages: ['Koi bimari hai jo main jaanu?', 'Jaise BP, sugar, ghutne ka dard, dil ki bimari?'],
    type: 'multi',
    options: [
      { label: 'BP / High blood pressure', value: 'hypertension' },
      { label: 'Diabetes / Sugar',         value: 'diabetes' },
      { label: 'Ghutne ka dard',           value: 'knee_pain' },
      { label: 'Dil ki bimari',            value: 'heart_condition' },
      { label: 'Koi nahi',                 value: 'none' },
    ],
    ack: v => (v as string[]).includes('none')
      ? 'Bahut acha — koi badi takleef nahi 👍'
      : 'Theek hai. Main dhyan rakhunga.',
  },
  {
    id: 'restrictions',
    messages: ['Doctor ne koi exercise mana ki hai — jaise daudna ya koodna?'],
    type: 'multi',
    options: [
      { label: 'Daudna nahi',          value: 'no_running' },
      { label: 'Koodna nahi',          value: 'no_jumping' },
      { label: 'Vajan uthana nahi',    value: 'no_heavy_lifting' },
      { label: 'Koi restriction nahi', value: 'none' },
    ],
    ack: () => 'Samajh gaya. Routine mein yeh sab dhyan rakhunga.',
  },
  {
    id: 'duration',
    messages: ['Kitni der exercise kar sakte hain aaram se?'],
    type: 'single',
    options: [
      { label: '10 minute', value: '10' },
      { label: '20 minute', value: '20' },
      { label: '30 minute', value: '30' },
    ],
    ack: v => `${v} minute — bilkul sahi. Routine bhi waise hi hoga.`,
  },
  {
    id: 'equipment',
    messages: ['Ghar mein koi exercise equipment hai?'],
    type: 'multi',
    options: [
      { label: 'Dumbbells',        value: 'dumbbells' },
      { label: 'Resistance bands', value: 'resistance_bands' },
      { label: 'Yoga mat',         value: 'yoga_mat' },
      { label: 'Kuch nahi',        value: 'none' },
    ],
    ack: () => 'Theek hai.',
  },
  {
    id: 'food_region',
    messages: ['Aap khaane mein kya prefer karte hain?'],
    type: 'single',
    options: [
      { label: 'North Indian',   value: 'north_indian' },
      { label: 'South Indian',   value: 'south_indian' },
      { label: 'Gujarati',       value: 'gujarati' },
      { label: 'Bengali',        value: 'bengali' },
      { label: 'Mix / Kuch bhi', value: 'mixed' },
    ],
    ack: v => {
      const opt = QUESTIONS.find(q => q.id === 'food_region')?.options?.find(o => o.value === v)
      return `${opt?.label ?? v} — noted 😊`
    },
  },
]

const DONE_MESSAGES: string[] = [
  'Bahut acha! Aapka profile tayyar ho gaya 🌟',
  'Aaj se main aapka dhyan rakhunga. Dashboard khul raha hai…',
]

export default function OnboardingChatPage() {
  const router = useRouter()

  async function saveProfile(ans: Record<string, string | string[]>) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    await supabase.from('health_profiles').upsert({
      parent_id:           user.id,
      age:                 parseInt(ans.age as string, 10),
      conditions:          (ans.conditions as string[]).filter(v => v !== 'none'),
      restrictions:        (ans.restrictions as string[]).filter(v => v !== 'none'),
      fitness_level:       'sedentary',
      equipment:           (ans.equipment as string[]).filter(v => v !== 'none'),
      preferred_duration:  parseInt(ans.duration as string, 10),
      food_region:         ans.food_region as string,
      language_preference: 'hinglish',
      updated_at:          new Date().toISOString(),
    }, { onConflict: 'parent_id' })

    setTimeout(() => router.push('/parent/dashboard'), 1200)
  }

  return (
    <ProfileChat
      intro={INTRO}
      questions={QUESTIONS}
      doneMessages={DONE_MESSAGES}
      onComplete={saveProfile}
      statusLine="online · Hinglish"
      savingLabel="Profile save ho raha hai…"
    />
  )
}
