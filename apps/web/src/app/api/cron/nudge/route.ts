import { NextRequest, NextResponse } from 'next/server'

/*
  GET /api/cron/nudge

  Runs every morning at 8 AM IST (02:30 UTC) via Vercel Cron.
  Forwards the job to the Railway Express server, which runs the
  Nudge Agent (Loop 3) for every active family.

  Why forward to Railway instead of running inline?
  The nudge agent calls Gemini in a tool-use loop — that can take 20–40s
  per family. With N families, this far exceeds Vercel's 10s serverless
  timeout. Railway runs long-lived processes with no timeout.

  Security: same Bearer CRON_SECRET pattern as create-instances.
*/

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workerUrl = process.env.RAILWAY_WORKER_URL
  if (!workerUrl) {
    return NextResponse.json({ error: 'RAILWAY_WORKER_URL not set' }, { status: 500 })
  }

  const res = await fetch(`${workerUrl}/jobs/nudge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[cron/nudge] worker error:', text)
    return NextResponse.json({ error: text }, { status: 502 })
  }

  console.log('[cron/nudge] nudge job dispatched to Railway')
  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
