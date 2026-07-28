import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Application, EmailLog, ReviewNote } from '@/lib/types'

// Lazily created so importing this module never throws at build time.
let client: SupabaseClient | null = null

export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured')
    client = createClient(url, key, { auth: { persistSession: false } })
  }
  return client
}

export interface DashboardData {
  applications: Application[]
  notes: ReviewNote[]
  emailLogs: EmailLog[]
}

export interface ApplicationDetailData {
  application: Application
  notes: ReviewNote[]
  emailLogs: EmailLog[]
}

/** One application with its notes and email log; null for unknown ids. */
export async function getApplicationDetail(id: string): Promise<ApplicationDetailData | null> {
  // Guard malformed ids so they 404 instead of erroring inside Postgres.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null
  const [app, notes, logs] = await Promise.all([
    db().from('applications').select('*').eq('id', id).maybeSingle(),
    db().from('review_notes').select('*').eq('application_id', id).order('created_at', { ascending: false }),
    db().from('email_log').select('*').eq('application_id', id).order('created_at', { ascending: false }),
  ])
  if (app.error) throw app.error
  if (!app.data) return null
  if (notes.error) throw notes.error
  if (logs.error) throw logs.error
  return {
    application: app.data as Application,
    notes: notes.data as ReviewNote[],
    emailLogs: logs.data as EmailLog[],
  }
}

/** Full dataset for the admin dashboard (< 2k rows at this scale). */
export async function getDashboardData(): Promise<DashboardData> {
  const [apps, notes, logs] = await Promise.all([
    db().from('applications').select('*').order('created_at', { ascending: false }),
    db().from('review_notes').select('*').order('created_at', { ascending: false }),
    db().from('email_log').select('*').order('created_at', { ascending: false }),
  ])
  if (apps.error) throw apps.error
  if (notes.error) throw notes.error
  if (logs.error) throw logs.error
  return {
    applications: apps.data as Application[],
    notes: notes.data as ReviewNote[],
    emailLogs: logs.data as EmailLog[],
  }
}
