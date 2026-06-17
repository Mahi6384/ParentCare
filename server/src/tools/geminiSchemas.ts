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
    name: 'generate_exercise_routine',
    description: 'Save a personalised exercise routine for this session. Call this after reading the health profile and deciding on appropriate exercises. Pass the full list of steps — the tool persists them to the database.',
    parameters: {
      type: S.OBJECT,
      properties: {
        task_instance_id: { type: S.STRING, description: 'UUID of the task_instance this routine belongs to' },
        parent_id:        { type: S.STRING, description: 'UUID of the parent user' },
        steps: {
          type: S.ARRAY,
          description: 'Ordered list of exercise steps',
          items: {
            type: S.OBJECT,
            properties: {
              section:      { type: S.STRING, description: 'Warm-up, Main Set, or Cool-down' },
              name:         { type: S.STRING, description: 'Exercise name in English' },
              reps:         { type: S.NUMBER, description: 'Number of repetitions (omit if time-based)' },
              duration_sec: { type: S.NUMBER, description: 'Duration in seconds (omit if rep-based)' },
              rest_sec:     { type: S.NUMBER, description: 'Rest after this step in seconds' },
              modification: { type: S.STRING, description: 'Safety note for this parent (e.g. use chair for support)' },
            },
            required: ['section', 'name'],
          },
        },
      },
      required: ['task_instance_id', 'parent_id', 'steps'],
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
  {
    name: 'suggest_task',
    description: 'Draft a new task suggestion for the kid to review and approve. Use when you observe a pattern that needs addressing (e.g. consistently skipping medicine, low activity).',
    parameters: {
      type: S.OBJECT,
      properties: {
        kid_id:    { type: S.STRING, description: 'UUID of the kid user' },
        task_type: { type: S.STRING, description: 'walk, diet, medicine, sleep, exercise, or custom' },
        title:     { type: S.STRING, description: 'Short task title shown to the parent' },
        reasoning: { type: S.STRING, description: 'Why you are suggesting this task — shown to the kid' },
        frequency: { type: S.STRING, description: 'daily or weekly' },
      },
      required: ['kid_id', 'task_type', 'title', 'reasoning', 'frequency'],
    },
  },
  {
    name: 'trigger_fullscreen_alert',
    description: 'Send a Web Push notification that opens the full-screen alert page on the parent\'s device. Use when a task is due and the parent has not started it.',
    parameters: {
      type: S.OBJECT,
      properties: {
        parent_id:         { type: S.STRING, description: 'UUID of the parent user' },
        task_instance_id:  { type: S.STRING, description: 'UUID of the task_instance to open' },
        title:             { type: S.STRING, description: 'Push notification title (short, in Hindi/Hinglish)' },
        body:              { type: S.STRING, description: 'Push notification body text' },
      },
      required: ['parent_id', 'task_instance_id', 'title', 'body'],
    },
  },
  {
    name: 'send_whatsapp_text',
    description: 'Send a WhatsApp text message to the parent. Use for gentle or firm reminders. Prefer this over push alerts for less urgent situations.',
    parameters: {
      type: S.OBJECT,
      properties: {
        parent_id: { type: S.STRING, description: 'UUID of the parent user (used to look up their WhatsApp number)' },
        message:   { type: S.STRING, description: 'The message text in the family\'s preferred language' },
        urgency:   { type: S.STRING, description: 'gentle, firm, or urgent' },
      },
      required: ['parent_id', 'message', 'urgency'],
    },
  },
  {
    name: 'schedule_followup',
    description: 'Schedule the agent to re-check this parent after a delay. Use to self-schedule: "check back in 4 hours if no submission".',
    parameters: {
      type: S.OBJECT,
      properties: {
        parent_id:   { type: S.STRING, description: 'UUID of the parent user' },
        delay_hours: { type: S.NUMBER, description: 'Hours until the next agent check (e.g. 4)' },
        reason:      { type: S.STRING, description: 'Why you are scheduling a followup' },
        check_type:  { type: S.STRING, description: 'submission_check, escalation_check, or pattern_review' },
      },
      required: ['parent_id', 'delay_hours', 'reason', 'check_type'],
    },
  },
  {
    name: 'generate_meal_plan',
    description: 'Generate and save a 7-day personalised meal plan for the parent based on their health profile, conditions, and regional food preferences.',
    parameters: {
      type: S.OBJECT,
      properties: {
        parent_id: { type: S.STRING, description: 'UUID of the parent user' },
      },
      required: ['parent_id'],
    },
  },
]
