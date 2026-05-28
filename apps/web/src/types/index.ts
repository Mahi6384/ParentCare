// ============================================================
// Shared TypeScript types across the app
// ============================================================

export type UserRole = 'kid' | 'parent'

export interface UserProfile {
  id: string
  role: UserRole
  name: string
  phone: string | null
  email: string | null
  whatsapp_number: string | null
  timezone: string
  created_at: string
  updated_at: string
}

export interface Family {
  id: string
  kid_id: string
  parent_id: string | null
  invite_code: string
  agent_enabled: boolean
  created_at: string
}

export type TaskType = 'walk' | 'diet' | 'medicine' | 'sleep' | 'exercise' | 'custom'
export type TaskStatus = 'pending' | 'in_progress' | 'submitted' | 'passed' | 'flagged' | 'failed' | 'skipped'
export type ProofType = 'photo' | 'none'
export type RecurrenceType = 'daily' | 'weekly' | 'custom' | 'once'

export interface Task {
  id: string
  kid_id: string
  family_id: string
  title: string
  type: TaskType
  proof_type: ProofType
  recurrence: RecurrenceType
  schedule_time: string | null
  note: string | null
  voice_note_url: string | null
  streak_goal: number
  is_active: boolean
  created_at: string
}

export interface TaskInstance {
  id: string
  task_id: string
  parent_id: string
  family_id: string
  due_at: string
  status: TaskStatus
  created_at: string
  updated_at: string
}

export interface HealthProfile {
  id: string
  parent_id: string
  age: number | null
  conditions: string[]
  restrictions: string[]
  fitness_level: 'sedentary' | 'light' | 'moderate' | 'active'
  equipment: string[]
  preferred_duration: number
  food_region: string
  language_preference: string
  updated_at: string
}
