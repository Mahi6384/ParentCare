import 'dotenv/config'
import express from 'express'
import { verifyQueue } from './queue'

const app  = express()
const PORT = process.env.PORT ?? 3001

app.use(express.json())

// ── Health check ─────────────────────────────────────────────────────────────
// Railway pings this to decide whether the container is alive.
// Also useful for local smoke-testing after npm run dev:server.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

// ── Enqueue a verification job ────────────────────────────────────────────────
// Called by Next.js POST /api/submissions/create after a photo is uploaded.
// Returns immediately with a jobId — the actual AI work happens async in worker.ts.
app.post('/jobs/verify', async (req, res) => {
  const { submissionId, storagePath } = req.body as {
    submissionId?: string
    storagePath?: string
  }

  if (!submissionId || !storagePath) {
    res.status(400).json({ error: 'submissionId and storagePath are required' })
    return
  }

  const job = await verifyQueue.add(
    'verify',
    { submissionId, storagePath },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    }
  )

  res.status(202).json({ jobId: job.id })
})

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
