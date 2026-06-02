import type { FunctionDeclaration, SchemaType } from '@google/generative-ai'

/*
  Gemini uses FunctionDeclaration[] instead of Anthropic's Tool[].
  The structure is almost identical — the only differences are:
  - 'parameters' instead of 'input_schema'
  - SchemaType enum values ('object', 'string', 'number') instead of raw strings
  We keep both files so you can see the contrast clearly.
*/

// SchemaType values are just lowercase strings — we cast to avoid importing the enum
const S = {
  OBJECT:  'object'  as unknown as SchemaType,
  STRING:  'string'  as unknown as SchemaType,
  NUMBER:  'number'  as unknown as SchemaType,
  ARRAY:   'array'   as unknown as SchemaType,
  BOOLEAN: 'boolean' as unknown as SchemaType,
}

export const geminiTools: FunctionDeclaration[] = [
  {
    name: 'get_parent_history',
    description: 'Fetch the last N days of task completions and AI results for a parent. Call this first to understand recent compliance.',
    parameters: {
      type: S.OBJECT,
      properties: {
        parent_id: { type: S.STRING, description: 'UUID of the parent user' },
        days:      { type: S.NUMBER, description: 'How many days back to look (max 30)' },
      },
      required: ['parent_id', 'days'],
    },
  },
  {
    name: 'get_nutrition_trend',
    description: 'Fetch nutrition JSON from recent meal submissions to check if eating patterns are improving.',
    parameters: {
      type: S.OBJECT,
      properties: {
        parent_id: { type: S.STRING, description: 'UUID of the parent user' },
        days:      { type: S.NUMBER, description: 'How many days of meal data to retrieve' },
      },
      required: ['parent_id', 'days'],
    },
  },
  {
    name: 'get_missed_tasks',
    description: 'Fetch tasks the parent failed or skipped recently.',
    parameters: {
      type: S.OBJECT,
      properties: {
        parent_id: { type: S.STRING, description: 'UUID of the parent user' },
        days:      { type: S.NUMBER, description: 'How many days back to search' },
      },
      required: ['parent_id', 'days'],
    },
  },
  {
    name: 'get_family_context',
    description: "Fetch the family record linking this parent to their kid, including the kid's name.",
    parameters: {
      type: S.OBJECT,
      properties: {
        parent_id: { type: S.STRING, description: 'UUID of the parent user' },
      },
      required: ['parent_id'],
    },
  },
  {
    name: 'get_health_profile',
    description: "Fetch the parent's full health profile: age, conditions, restrictions, medications. Consult before evaluating medicine or diet tasks.",
    parameters: {
      type: S.OBJECT,
      properties: {
        parent_id: { type: S.STRING, description: 'UUID of the parent user' },
      },
      required: ['parent_id'],
    },
  },
  {
    name: 'verify_photo',
    description: 'Generate a fresh signed URL for the submission photo from Supabase Storage.',
    parameters: {
      type: S.OBJECT,
      properties: {
        storage_path: { type: S.STRING, description: 'Storage path of the photo' },
        task_type:    { type: S.STRING, description: 'Type of task: walk, diet, medicine, sleep, exercise, custom' },
        task_title:   { type: S.STRING, description: 'Human-readable task title' },
      },
      required: ['storage_path', 'task_type', 'task_title'],
    },
  },
  {
    name: 'update_task_result',
    description: 'Record the verification result. Inserts into ai_results and updates task_instances.status. ALWAYS call this as your final action.',
    parameters: {
      type: S.OBJECT,
      properties: {
        task_instance_id: { type: S.STRING, description: 'UUID of the task_instance' },
        submission_id:    { type: S.STRING, description: 'UUID of the submission' },
        result:           { type: S.STRING, description: 'passed, failed, or flagged' },
        confidence:       { type: S.NUMBER, description: 'Confidence score 0–1' },
        reasoning:        { type: S.STRING, description: 'Plain-English explanation shown to the kid' },
      },
      required: ['task_instance_id', 'submission_id', 'result', 'confidence', 'reasoning'],
    },
  },
  {
    name: 'send_kid_alert',
    description: 'Store an alert for the kid dashboard about the verification result.',
    parameters: {
      type: S.OBJECT,
      properties: {
        kid_id:     { type: S.STRING, description: 'UUID of the kid user' },
        message:    { type: S.STRING, description: 'Message to show the kid' },
        alert_type: { type: S.STRING, description: 'result, concern, streak, or suggestion' },
      },
      required: ['kid_id', 'message', 'alert_type'],
    },
  },
  {
    name: 'flag_health_concern',
    description: 'Record a health concern when photo analysis reveals something worrying.',
    parameters: {
      type: S.OBJECT,
      properties: {
        parent_id:    { type: S.STRING, description: 'UUID of the parent user' },
        concern_type: { type: S.STRING, description: 'nutrition, medication, mobility, sleep, other' },
        description:  { type: S.STRING, description: 'Detailed description of the concern' },
        severity:     { type: S.STRING, description: 'low, medium, high, or critical' },
      },
      required: ['parent_id', 'concern_type', 'description', 'severity'],
    },
  },
  {
    name: 'add_agent_note',
    description: 'Save a private note about this parent for future agent runs.',
    parameters: {
      type: S.OBJECT,
      properties: {
        parent_id: { type: S.STRING, description: 'UUID of the parent user' },
        note:      { type: S.STRING, description: 'The note text' },
        note_type: { type: S.STRING, description: 'observation, recommendation, concern, or praise' },
      },
      required: ['parent_id', 'note', 'note_type'],
    },
  },
]
