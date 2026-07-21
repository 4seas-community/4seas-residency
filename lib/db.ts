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

/** Full dataset for the admin dashboard (< 2k rows at this scale). */
export async function getDashboardData(): Promise<DashboardData> {
  const [apps, notes, logs] = await Promise.all([
    db().from('applications').select('*').order('created_at', { ascending: false }),
    db().from('review_notes').select('*').order('created_at', { ascending: true }),
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
