import { Queue, type ConnectionOptions } from 'bullmq'

const redisUrl = process.env.UPSTASH_REDIS_URL!

/*
  Upstash Redis uses TLS — the URL starts with rediss:// (double s).
  We parse the URL into host/port/password so we stay within BullMQ's
  own ioredis types and avoid the dual-ioredis version conflict.
*/
function parseRedisUrl(url: string): ConnectionOptions {
  const u = new URL(url)
  return {
    host:                 u.hostname,
    port:                 parseInt(u.port || '6379', 10),
    password:             u.password || undefined,
    username:             u.username || undefined,
    tls:                  url.startsWith('rediss://') ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck:     false,
  } as ConnectionOptions
}

export const connection = parseRedisUrl(redisUrl)

/*
  The verify queue holds jobs that tell the worker to run the
  Verification Agent for a given submission.

  Job data shape: { submissionId: string, storagePath: string }
*/
export const verifyQueue = new Queue('verify', { connection })
