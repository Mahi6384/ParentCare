// ─── Input types (what Claude passes to each tool) ────────────────────────────

export interface GetParentHistoryInput {
  parent_id: string
  days: number
}

export interface GetNutritionTrendInput {
  parent_id: string
  days: number
}

export interface GetMissedTasksInput {
  parent_id: string
  days: number
}

export interface GetFamilyContextInput {
  parent_id: string
}

export interface GetHealthProfileInput {
  parent_id: string
}

export interface GenerateExerciseRoutineInput {
  parent_id: string
}

export interface GenerateMealPlanInput {
  parent_id: string
}

export interface VerifyPhotoInput {
  storage_path: string
  task_type: string
  task_title: string
}

export interface ReadMedicationLabelInput {
  storage_path: string
}

export interface SendWhatsappTextInput {
  to: string
  message: string
}

export interface SendWhatsappVoiceInput {
  to: string
  audio_url: string
}

export interface TriggerFullscreenAlertInput {
  parent_id: string
  title: string
  body: string
  severity: 'low' | 'medium' | 'high'
}

export interface SendKidAlertInput {
  kid_id: string
  message: string
  alert_type: 'result' | 'concern' | 'streak' | 'suggestion'
}

export interface UpdateTaskResultInput {
  task_instance_id: string
  submission_id: string
  result: 'passed' | 'failed' | 'flagged'
  confidence: number
  reasoning: string
  nutrition_json?: Record<string, unknown>
  medication_json?: Record<string, unknown>
}

export interface ScheduleFollowupInput {
  parent_id: string
  delay_hours: number
  reason: string
  check_type: string
}

export interface SuggestTaskInput {
  kid_id: string
  task_type: string
  title: string
  reasoning: string
  frequency: 'daily' | 'weekly'
}

export interface FlagHealthConcernInput {
  parent_id: string
  concern_type: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface AddAgentNoteInput {
  parent_id: string
  note: string
  note_type: 'observation' | 'recommendation' | 'concern' | 'praise'
}

// ─── Union of all tool inputs (used in executor switch) ──────────────────────

export type ToolInput =
  | GetParentHistoryInput
  | GetNutritionTrendInput
  | GetMissedTasksInput
  | GetFamilyContextInput
  | GetHealthProfileInput
  | GenerateExerciseRoutineInput
  | GenerateMealPlanInput
  | VerifyPhotoInput
  | ReadMedicationLabelInput
  | SendWhatsappTextInput
  | SendWhatsappVoiceInput
  | TriggerFullscreenAlertInput
  | SendKidAlertInput
  | UpdateTaskResultInput
  | ScheduleFollowupInput
  | SuggestTaskInput
  | FlagHealthConcernInput
  | AddAgentNoteInput
