import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const redisUrl = process.env.UPSTASH_REDIS_URL!

/*
  Upstash Redis uses TLS — the URL starts with rediss:// (double s).
  ioredis needs maxRetriesPerRequest: null for BullMQ — without this,
  BullMQ's blocking commands will throw after the default retry limit.
*/
export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

/*
  The verify queue holds jobs that tell the worker to run the
  Verification Agent for a given submission.

  Job data shape: { submissionId: string, storagePath: string }
*/
export const verifyQueue = new Queue('verify', { connection })
