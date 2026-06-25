import 'dotenv/config'
import express from 'express'
import { runVerificationAgent } from './agents/verificationAgent'
import { runExerciseCoachAgent } from './agents/exerciseCoachAgent'
import { runNudgeAgentForAllFamilies } from './agents/nudgeAgent'
import { runReminderSweep } from './jobs/reminderSweep'

const app  = express()
const PORT = process.env.PORT ?? 3001

app.use(express.json())

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

// ── Enqueue / run a verification job ─────────────────────────────────────────
// Production (UPSTASH_REDIS_URL set): adds to BullMQ queue → worker picks it up.
// Dev / local (no Redis): runs the agent directly in the request, returns when done.
app.post('/jobs/verify', async (req, res) => {
  const { submissionId, storagePath } = req.body as {
    submissionId?: string
    storagePath?: string
  }

  console.log('[server] /jobs/verify hit — submissionId:', submissionId, 'storagePath:', storagePath)

  if (!submissionId || !storagePath) {
    res.status(400).json({ error: 'submissionId and storagePath are required' })
    return
  }

  if (process.env.UPSTASH_REDIS_URL) {
    // ── Production: use BullMQ queue ────────────────────────────────────────
    const { verifyQueue } = await import('./queue')
    const job = await verifyQueue.add(
      'verify',
      { submissionId, storagePath },
      {
        attempts:         3,
        backoff:          { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail:     200,
      }
    )
    res.status(202).json({ jobId: job.id, mode: 'queue' })
  } else {
    // ── Dev: run agent directly (no Redis needed) ────────────────────────────
    console.log(`[server] dev mode — running agent inline for submission ${submissionId}`)
    res.status(202).json({ submissionId, mode: 'direct' })
    // Run after response is sent so the HTTP caller isn't blocked
    runVerificationAgent(submissionId, storagePath).catch((err) => {
      console.error('[server] agent error:', err.message)
    })
  }
})

app.post('/jobs/nudge', async (_req, res) => {
  console.log('[server] nudge job triggered — running for all families')
  res.status(202).json({ mode: 'direct' })

  runNudgeAgentForAllFamilies().catch((err) => {
    console.error('[server] nudge-agent error:', err.message)
  })
})

app.post('/jobs/exercise-coach', async (req, res) => {
  const { taskInstanceId } = req.body as { taskInstanceId?: string }

  if (!taskInstanceId) {
    res.status(400).json({ error: 'taskInstanceId is required' })
    return
  }

  console.log(`[server] exercise-coach — generating routine for instance ${taskInstanceId}`)
  res.status(202).json({ taskInstanceId, mode: 'direct' })

  runExerciseCoachAgent(taskInstanceId).catch((err) => {
    console.error('[server] coach-agent error:', err.message)
  })
})

// ── Manual reminder sweep (for testing) ──────────────────────────────────────
// Lets you trigger a sweep on demand instead of waiting for the 5-min tick.
app.post('/jobs/reminders', async (_req, res) => {
  try {
    const result = await runReminderSweep()
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

const server = app.listen(PORT, () => {
  const mode = process.env.UPSTASH_REDIS_URL ? 'queue (BullMQ)' : 'direct (no Redis)'
  console.log(`[server] listening on http://localhost:${PORT} — mode: ${mode}`)
})

// ── Reminder sweep heartbeat ──────────────────────────────────────────────────
// The worker is long-lived, so it schedules itself — no external cron needed.
// Every 5 min it pushes a reminder for any pending task due around now.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000
setInterval(() => {
  runReminderSweep().catch((err) =>
    console.error('[reminder-sweep] error:', (err as Error).message),
  )
}, SWEEP_INTERVAL_MS)
console.log('[server] reminder sweep scheduled — every 5 min')

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] port ${PORT} is already in use — kill the old process first`)
  } else {
    console.error('[server] fatal error:', err.message)
  }
  process.exit(1)
})
