import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendApplicationEmail } from '@/lib/email/send'
import type { Application } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Daily scan (09:00 GMT+7 via vercel.json): send the move-in guide to accepted
// applications starting within 3 days that don't have a successful guide yet.
// Idempotency comes from email_log; a failed day self-heals on the next run.
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // "Today" in Chiang Mai, as YYYY-MM-DD
  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10)
  const upper = new Date(Date.now() + 7 * 3600 * 1000 + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10)

  const { data: candidates, error } = await db()
    .from('applications')
    .select('*')
    .eq('status', 'accepted')
    .gte('preferred_start_date', today)
    .lte('preferred_start_date', upper)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const apps = (candidates ?? []) as Application[]
  let sent = 0
  let failed = 0

  for (const application of apps) {
    const { count } = await db()
      .from('email_log')
      .select('id', { count: 'exact', head: true })
      .eq('application_id', application.id)
      .eq('email_type', 'movein_guide')
      .eq('outcome', 'sent')
    if ((count ?? 0) > 0) continue

    const result = await sendApplicationEmail({ application, type: 'movein_guide', triggeredBy: 'cron' })
    if (result.outcome === 'sent') sent += 1
    else failed += 1
  }

  return NextResponse.json({ scanned: apps.length, sent, failed })
}
