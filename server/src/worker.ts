import 'dotenv/config'
import { Worker } from 'bullmq'
import { connection } from './queue'
import { runVerificationAgent } from './agents/verificationAgent'

interface VerifyJobData {
  submissionId: string
  storagePath: string
}

/*
  The worker process runs separately from the Express server.
  It listens on the 'verify' queue and processes one job at a time
  (concurrency: 1 keeps costs predictable during Phase 1).
  Bump concurrency to 5+ once you're confident the agent is stable.
*/
const worker = new Worker<VerifyJobData>(
  'verify',
  async (job) => {
    const { submissionId, storagePath } = job.data
    console.log(`[worker] job ${job.id} started — submission ${submissionId}`)
    await runVerificationAgent(submissionId, storagePath)
  },
  {
    connection,
    concurrency: 1,
  }
)

worker.on('completed', (job) => {
  console.log(`[worker] job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message)
})

worker.on('error', (err) => {
  console.error('[worker] error:', err.message)
})

console.log('[worker] listening for verify jobs…')
