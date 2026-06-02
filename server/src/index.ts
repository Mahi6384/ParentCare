import 'dotenv/config'
import express from 'express'
import { runVerificationAgent } from './agents/verificationAgent'

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

app.listen(PORT, () => {
  const mode = process.env.UPSTASH_REDIS_URL ? 'queue (BullMQ)' : 'direct (no Redis)'
  console.log(`[server] listening on http://localhost:${PORT} — mode: ${mode}`)
})
