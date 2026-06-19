import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

/*
  Manual photo submission test script.

  Usage:
    npx ts-node scripts/testVerify.ts <image-path> <task-instance-uuid>

  What it does:
  1. Reads your local image file
  2. Uploads it to Supabase Storage under test/<instanceId>.jpg
  3. Inserts a submissions row linked to the given instanceId
  4. POSTs to localhost:3001/jobs/verify
  5. Polls ai_results every 3s for up to 90s and prints the verdict

  Requirements:
  - server/.env must have SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
  - The Express server must be running: cd server && npm run dev
  - instanceId must be a real task_instances row with status pending/in_progress
*/

const [,, imagePath, instanceId] = process.argv

if (!imagePath || !instanceId) {
  console.error('Usage: npx ts-node scripts/testVerify.ts <image-path> <task-instance-uuid>')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  // ── 1. Read image ─────────────────────────────────────────────────────────
  const absPath = path.resolve(imagePath)
  if (!fs.existsSync(absPath)) {
    console.error(`Image not found: ${absPath}`)
    process.exit(1)
  }
  const imageBuffer = fs.readFileSync(absPath)
  console.log(`[test] image loaded — ${imageBuffer.byteLength} bytes from ${absPath}`)

  // ── 2. Upload to Supabase Storage ─────────────────────────────────────────
  const storagePath = `test/${instanceId}.jpg`
  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(storagePath, imageBuffer, { contentType: 'image/jpeg', upsert: true })

  if (uploadError) {
    console.error('[test] storage upload failed:', uploadError.message)
    process.exit(1)
  }
  console.log('[test] uploaded to storage:', storagePath)

  // ── 3. Insert submission row ──────────────────────────────────────────────
  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .insert({ task_instance_id: instanceId, photo_url: storagePath })
    .select('id')
    .single()

  if (subError) {
    console.error('[test] submissions insert failed:', subError.message)
    process.exit(1)
  }
  console.log('[test] submission row created:', submission.id)

  // ── 4. Update task_instance status → submitted ────────────────────────────
  await supabase
    .from('task_instances')
    .update({ status: 'submitted', updated_at: new Date().toISOString() })
    .eq('id', instanceId)
  console.log('[test] task_instance → submitted')

  // ── 5. Trigger local server ───────────────────────────────────────────────
  const workerUrl = 'http://localhost:3001'
  console.log(`[test] POSTing to ${workerUrl}/jobs/verify ...`)
  let triggerRes: Response
  try {
    triggerRes = await fetch(`${workerUrl}/jobs/verify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ submissionId: submission.id, storagePath }),
    })
  } catch {
    console.error('[test] could not reach server at localhost:3001 — is it running?')
    process.exit(1)
  }
  console.log('[test] server responded:', triggerRes.status, await triggerRes.text())

  // ── 6. Poll ai_results for verdict ───────────────────────────────────────
  console.log('[test] polling ai_results (up to 90s)...')
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000))

    const { data: result } = await supabase
      .from('ai_results')
      .select('verdict, score, reasoning, created_at')
      .eq('submission_id', submission.id)
      .single()

    if (result) {
      console.log('\n[test] ✓ result received:')
      console.log('  verdict  :', result.verdict)
      console.log('  score    :', result.score)
      console.log('  reasoning:', result.reasoning)
      process.exit(0)
    }

    process.stdout.write('.')
  }

  console.log('\n[test] timed out — no result in 90s. Check server logs above.')
  process.exit(1)
}

main().catch((err) => {
  console.error('[test] unexpected error:', err.message)
  process.exit(1)
})
