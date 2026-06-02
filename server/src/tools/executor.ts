import { createClient } from '@supabase/supabase-js'
import type {
  GetParentHistoryInput,
  GetNutritionTrendInput,
  GetMissedTasksInput,
  GetFamilyContextInput,
  GetHealthProfileInput,
  UpdateTaskResultInput,
  FlagHealthConcernInput,
  AddAgentNoteInput,
  SuggestTaskInput,
  SendKidAlertInput,
  VerifyPhotoInput,
} from './types'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/*
  executeTool is the single dispatch point for every tool Claude calls.
  It receives the tool name + raw input object, runs the implementation,
  and returns a plain object that gets JSON-serialised back to Claude
  as a tool_result block.

  Phase 1: core read/write tools are fully implemented.
  Phase 2 stubs (comms, generation) log the call and return a placeholder.
*/
export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {

    // ── READ TOOLS ─────────────────────────────────────────────────────────

    case 'get_parent_history': {
      const { parent_id, days } = input as GetParentHistoryInput
      const since = new Date(Date.now() - days * 86_400_000).toISOString()

      const { data } = await supabase
        .from('task_instances')
        .select(`
          id, status, due_at,
          tasks ( title, type ),
          submissions ( id, photo_url, submitted_at,
            ai_results ( result, confidence, reasoning )
          )
        `)
        .eq('parent_id', parent_id)
        .gte('due_at', since)
        .order('due_at', { ascending: false })

      return data ?? []
    }

    case 'get_nutrition_trend': {
      const { parent_id, days } = input as GetNutritionTrendInput
      const since = new Date(Date.now() - days * 86_400_000).toISOString()

      const { data } = await supabase
        .from('ai_results')
        .select('nutrition_json, created_at, submissions ( submitted_at )')
        .not('nutrition_json', 'is', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })

      return data ?? []
    }

    case 'get_missed_tasks': {
      const { parent_id, days } = input as GetMissedTasksInput
      const since = new Date(Date.now() - days * 86_400_000).toISOString()

      const { data } = await supabase
        .from('task_instances')
        .select('id, status, due_at, tasks ( title, type )')
        .eq('parent_id', parent_id)
        .in('status', ['failed', 'skipped'])
        .gte('due_at', since)
        .order('due_at', { ascending: false })

      return data ?? []
    }

    case 'get_family_context': {
      const { parent_id } = input as GetFamilyContextInput

      const { data } = await supabase
        .from('families')
        .select('id, kid_id, users!families_kid_id_fkey ( name, email )')
        .eq('parent_id', parent_id)
        .single()

      return data ?? null
    }

    case 'get_health_profile': {
      const { parent_id } = input as GetHealthProfileInput

      const { data } = await supabase
        .from('health_profiles')
        .select('*')
        .eq('parent_id', parent_id)
        .single()

      return data ?? null
    }

    // ── WRITE TOOLS ────────────────────────────────────────────────────────

    case 'update_task_result': {
      const {
        task_instance_id,
        submission_id,
        result,
        confidence,
        reasoning,
        nutrition_json,
        medication_json,
      } = input as UpdateTaskResultInput

      // Insert ai_results row
      const { error: aiErr } = await supabase
        .from('ai_results')
        .insert({
          submission_id,
          result,
          confidence,
          reasoning,
          nutrition_json:  nutrition_json  ?? null,
          medication_json: medication_json ?? null,
        })

      if (aiErr) throw new Error(`ai_results insert failed: ${aiErr.message}`)

      // Update task_instance status
      const { error: instErr } = await supabase
        .from('task_instances')
        .update({ status: result, updated_at: new Date().toISOString() })
        .eq('id', task_instance_id)

      if (instErr) throw new Error(`task_instances update failed: ${instErr.message}`)

      // Increment streak on pass
      if (result === 'passed') {
        const { data: streak } = await supabase
          .from('streaks')
          .select('current_streak, longest_streak')
          .eq('task_instance_id_placeholder', task_instance_id) // join via task_id below
          .single()

        // Get task_id from instance first, then update streak
        const { data: inst } = await supabase
          .from('task_instances')
          .select('task_id, parent_id')
          .eq('id', task_instance_id)
          .single()

        if (inst) {
          const { data: existingStreak } = await supabase
            .from('streaks')
            .select('current_streak, longest_streak')
            .eq('task_id', inst.task_id)
            .eq('parent_id', inst.parent_id)
            .single()

          if (existingStreak) {
            const next    = existingStreak.current_streak + 1
            const longest = Math.max(next, existingStreak.longest_streak)

            await supabase
              .from('streaks')
              .update({ current_streak: next, longest_streak: longest })
              .eq('task_id', inst.task_id)
              .eq('parent_id', inst.parent_id)
          }
        }
      }

      return { ok: true }
    }

    case 'flag_health_concern': {
      const { parent_id, concern_type, description, severity } = input as FlagHealthConcernInput

      const { error } = await supabase
        .from('health_concerns')
        .insert({ parent_id, concern_type, description, severity })

      if (error) throw new Error(`health_concerns insert failed: ${error.message}`)
      return { ok: true }
    }

    case 'add_agent_note': {
      const { parent_id, note, note_type } = input as AddAgentNoteInput

      const { error } = await supabase
        .from('agent_notes')
        .insert({ parent_id, note, note_type })

      if (error) throw new Error(`agent_notes insert failed: ${error.message}`)
      return { ok: true }
    }

    case 'send_kid_alert': {
      const { kid_id, message, alert_type } = input as SendKidAlertInput

      const { error } = await supabase
        .from('notifications')
        .insert({ user_id: kid_id, message, type: alert_type })

      if (error) throw new Error(`notifications insert failed: ${error.message}`)
      return { ok: true }
    }

    case 'suggest_task': {
      const { kid_id, task_type, title, reasoning, frequency } = input as SuggestTaskInput

      const { error } = await supabase
        .from('task_suggestions')
        .insert({ kid_id, task_type, title, reasoning, frequency, status: 'pending' })

      if (error) throw new Error(`task_suggestions insert failed: ${error.message}`)
      return { ok: true }
    }

    case 'verify_photo': {
      // Generate a signed URL from Supabase Storage so the agent can re-examine the photo.
      const { storage_path } = input as VerifyPhotoInput

      const { data, error } = await supabase
        .storage
        .from('photos')
        .createSignedUrl(storage_path, 60 * 5) // 5-minute expiry

      if (error) throw new Error(`createSignedUrl failed: ${error.message}`)
      return { signedUrl: data.signedUrl }
    }

    // ── PHASE 2 STUBS ──────────────────────────────────────────────────────
    // These will be implemented in Phase 2 (Twilio, ElevenLabs, push, etc.)

    case 'send_whatsapp_text':
      console.log('[executor] send_whatsapp_text stub called', input)
      return { ok: true, stub: true }

    case 'send_whatsapp_voice':
      console.log('[executor] send_whatsapp_voice stub called', input)
      return { ok: true, stub: true }

    case 'trigger_fullscreen_alert':
      console.log('[executor] trigger_fullscreen_alert stub called', input)
      return { ok: true, stub: true }

    case 'generate_exercise_routine':
      console.log('[executor] generate_exercise_routine stub called', input)
      return { routine: 'Stub — will be implemented in Phase 2' }

    case 'generate_meal_plan':
      console.log('[executor] generate_meal_plan stub called', input)
      return { plan: 'Stub — will be implemented in Phase 2' }

    case 'read_medication_label':
      console.log('[executor] read_medication_label stub called', input)
      return { label: 'Stub — will be implemented in Phase 2' }

    case 'schedule_followup':
      console.log('[executor] schedule_followup stub called', input)
      return { ok: true, stub: true }

    default:
      console.warn(`[executor] unknown tool: ${name}`)
      return { error: `Unknown tool: ${name}` }
  }
}
