type Tool = {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
  }
}

export const tools: Tool[] = [
  // ── READ TOOLS ────────────────────────────────────────────────────────────

  {
    name: 'get_parent_history',
    description:
      'Fetch the last N days of task completions, submissions, and AI results for a parent. ' +
      'Call this first to understand recent compliance before making any decision.',
    input_schema: {
      type: 'object',
      properties: {
        parent_id: { type: 'string', description: 'UUID of the parent user' },
        days:      { type: 'number', description: 'How many days back to look (max 30)' },
      },
      required: ['parent_id', 'days'],
    },
  },

  {
    name: 'get_nutrition_trend',
    description:
      'Fetch the nutrition JSON extracted from recent meal-photo submissions. ' +
      'Use this when verifying a diet task to check if eating patterns are improving.',
    input_schema: {
      type: 'object',
      properties: {
        parent_id: { type: 'string', description: 'UUID of the parent user' },
        days:      { type: 'number', description: 'How many days of meal data to retrieve' },
      },
      required: ['parent_id', 'days'],
    },
  },

  {
    name: 'get_missed_tasks',
    description:
      'Fetch tasks the parent failed or skipped in the last N days. ' +
      'Use this to understand patterns (e.g. always skips medicine on Mondays).',
    input_schema: {
      type: 'object',
      properties: {
        parent_id: { type: 'string', description: 'UUID of the parent user' },
        days:      { type: 'number', description: 'How many days back to search' },
      },
      required: ['parent_id', 'days'],
    },
  },

  {
    name: 'get_family_context',
    description:
      'Fetch the family record linking this parent to their kid, including the kid\'s name. ' +
      'Use this when sending alerts or writing messages that should mention the kid by name.',
    input_schema: {
      type: 'object',
      properties: {
        parent_id: { type: 'string', description: 'UUID of the parent user' },
      },
      required: ['parent_id'],
    },
  },

  {
    name: 'get_health_profile',
    description:
      'Fetch the parent\'s full health profile: age, conditions, restrictions, fitness level, ' +
      'food region, medications, and preferred language. Always consult this before generating ' +
      'a routine or evaluating whether a task is appropriate.',
    input_schema: {
      type: 'object',
      properties: {
        parent_id: { type: 'string', description: 'UUID of the parent user' },
      },
      required: ['parent_id'],
    },
  },

  // ── GENERATION TOOLS ──────────────────────────────────────────────────────

  {
    name: 'generate_exercise_routine',
    description:
      'Generate a personalised weekly exercise routine based on the parent\'s health profile. ' +
      'Takes age, conditions, fitness level, and available equipment into account.',
    input_schema: {
      type: 'object',
      properties: {
        parent_id: { type: 'string', description: 'UUID of the parent user' },
      },
      required: ['parent_id'],
    },
  },

  {
    name: 'generate_meal_plan',
    description:
      'Generate a personalised weekly meal plan based on the parent\'s health profile. ' +
      'Respects dietary restrictions, food region (e.g. North Indian), and medical conditions.',
    input_schema: {
      type: 'object',
      properties: {
        parent_id: { type: 'string', description: 'UUID of the parent user' },
      },
      required: ['parent_id'],
    },
  },

  // ── PHOTO ANALYSIS TOOLS ──────────────────────────────────────────────────

  {
    name: 'verify_photo',
    description:
      'Generate a signed URL for the submission photo from Supabase Storage so you can ' +
      'include it in your analysis. Call this if you need to re-examine the photo after ' +
      'reading the task context. For the initial verification the photo is already in this message.',
    input_schema: {
      type: 'object',
      properties: {
        storage_path: { type: 'string', description: 'The storage path of the photo, e.g. <parentId>/<instanceId>.jpg' },
        task_type:    { type: 'string', description: 'Type of task: walk, diet, medicine, sleep, exercise, custom' },
        task_title:   { type: 'string', description: 'Human-readable task title for context' },
      },
      required: ['storage_path', 'task_type', 'task_title'],
    },
  },

  {
    name: 'read_medication_label',
    description:
      'Extract medication name, dosage, and instructions from a photo of a medicine box or label. ' +
      'Call this when verifying a medicine task to confirm the right medication was taken.',
    input_schema: {
      type: 'object',
      properties: {
        storage_path: { type: 'string', description: 'Storage path of the medicine label photo' },
      },
      required: ['storage_path'],
    },
  },

  // ── COMMUNICATION TOOLS ───────────────────────────────────────────────────

  {
    name: 'send_whatsapp_text',
    description:
      'Send a WhatsApp text message to a phone number via Twilio. ' +
      'Use this to notify parents of upcoming tasks or to send results to kids.',
    input_schema: {
      type: 'object',
      properties: {
        to:      { type: 'string', description: 'Recipient phone number in E.164 format, e.g. +919876543210' },
        message: { type: 'string', description: 'The message text to send (max 1600 chars)' },
      },
      required: ['to', 'message'],
    },
  },

  {
    name: 'send_whatsapp_voice',
    description:
      'Send a WhatsApp voice note to a phone number. ' +
      'Use this for elderly parents who prefer audio over text.',
    input_schema: {
      type: 'object',
      properties: {
        to:        { type: 'string', description: 'Recipient phone number in E.164 format' },
        audio_url: { type: 'string', description: 'Public URL of the audio file (MP3 or OGG)' },
      },
      required: ['to', 'audio_url'],
    },
  },

  {
    name: 'trigger_fullscreen_alert',
    description:
      'Send a high-priority Web Push notification to the parent\'s device. ' +
      'Reserve for urgent situations like a missed critical medication.',
    input_schema: {
      type: 'object',
      properties: {
        parent_id: { type: 'string', description: 'UUID of the parent user' },
        title:     { type: 'string', description: 'Notification title' },
        body:      { type: 'string', description: 'Notification body text' },
        severity:  { type: 'string', enum: ['low', 'medium', 'high'], description: 'Urgency level' },
      },
      required: ['parent_id', 'title', 'body', 'severity'],
    },
  },

  {
    name: 'send_kid_alert',
    description:
      'Store an alert for the kid\'s dashboard. The kid sees this when they next open the app. ' +
      'Use this to inform the kid of verification results, health concerns, or streak milestones.',
    input_schema: {
      type: 'object',
      properties: {
        kid_id:     { type: 'string', description: 'UUID of the kid user' },
        message:    { type: 'string', description: 'The message to show the kid' },
        alert_type: {
          type: 'string',
          enum: ['result', 'concern', 'streak', 'suggestion'],
          description: 'Category of the alert',
        },
      },
      required: ['kid_id', 'message', 'alert_type'],
    },
  },

  // ── WRITE TOOLS ───────────────────────────────────────────────────────────

  {
    name: 'update_task_result',
    description:
      'Record the verification result. Inserts a row into ai_results and updates ' +
      'task_instances.status to passed / failed / flagged. ' +
      'ALWAYS call this as the final step of every verification run.',
    input_schema: {
      type: 'object',
      properties: {
        task_instance_id: { type: 'string', description: 'UUID of the task_instance being verified' },
        submission_id:    { type: 'string', description: 'UUID of the submission row' },
        result:           { type: 'string', enum: ['passed', 'failed', 'flagged'], description: 'Verification outcome' },
        confidence:       { type: 'number', description: 'Confidence score 0–1 (e.g. 0.92)' },
        reasoning:        { type: 'string', description: 'Plain-English explanation shown to the kid' },
        nutrition_json:   { type: 'object', description: 'Structured nutrition data (diet tasks only)', additionalProperties: true },
        medication_json:  { type: 'object', description: 'Structured medication data (medicine tasks only)', additionalProperties: true },
      },
      required: ['task_instance_id', 'submission_id', 'result', 'confidence', 'reasoning'],
    },
  },

  {
    name: 'schedule_followup',
    description:
      'Queue a follow-up check for this parent after a delay. ' +
      'Use when a task was flagged and you want to re-verify in a few hours.',
    input_schema: {
      type: 'object',
      properties: {
        parent_id:   { type: 'string', description: 'UUID of the parent user' },
        delay_hours: { type: 'number', description: 'How many hours from now to schedule the follow-up' },
        reason:      { type: 'string', description: 'Why the follow-up is needed' },
        check_type:  { type: 'string', description: 'What to check (e.g. "medicine", "walk_completed")' },
      },
      required: ['parent_id', 'delay_hours', 'reason', 'check_type'],
    },
  },

  {
    name: 'suggest_task',
    description:
      'Propose a new task for the kid to review and approve. ' +
      'Use when health profile or recent trends suggest a new habit would help.',
    input_schema: {
      type: 'object',
      properties: {
        kid_id:    { type: 'string', description: 'UUID of the kid user who manages this parent' },
        task_type: { type: 'string', description: 'Task type: walk, diet, medicine, sleep, exercise, custom' },
        title:     { type: 'string', description: 'Short task title shown to the kid' },
        reasoning: { type: 'string', description: 'Why you are suggesting this task' },
        frequency: { type: 'string', enum: ['daily', 'weekly'], description: 'How often the task should recur' },
      },
      required: ['kid_id', 'task_type', 'title', 'reasoning', 'frequency'],
    },
  },

  {
    name: 'flag_health_concern',
    description:
      'Record a health concern in the database for the kid to review. ' +
      'Use when photo analysis reveals something worrying (e.g. unusual medication, signs of fatigue).',
    input_schema: {
      type: 'object',
      properties: {
        parent_id:    { type: 'string', description: 'UUID of the parent user' },
        concern_type: { type: 'string', description: 'Category: nutrition, medication, mobility, sleep, other' },
        description:  { type: 'string', description: 'Detailed description of the concern' },
        severity:     { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Urgency level' },
      },
      required: ['parent_id', 'concern_type', 'description', 'severity'],
    },
  },

  {
    name: 'add_agent_note',
    description:
      'Save a private note about this parent for future agent runs. ' +
      'Use to persist observations that don\'t fit in a health concern or task result.',
    input_schema: {
      type: 'object',
      properties: {
        parent_id: { type: 'string', description: 'UUID of the parent user' },
        note:      { type: 'string', description: 'The note text' },
        note_type: {
          type: 'string',
          enum: ['observation', 'recommendation', 'concern', 'praise'],
          description: 'Type of note',
        },
      },
      required: ['parent_id', 'note', 'note_type'],
    },
  },
]
