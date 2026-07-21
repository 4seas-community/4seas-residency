'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSession, destroySession, requireAdmin, verifyPassword } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendApplicationEmail, logSkippedEmail } from '@/lib/email/send'
import {
  ALL_STATUSES,
  type ActionResult,
  type Application,
  type ApplicationStatus,
  type EmailOverride,
  type EmailType,
  type ReviewNote,
} from '@/lib/types'

const emailOverrideSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(10000),
})

// ponytail: in-memory login throttle — resets on cold start, fine for 1-3 admins.
const loginAttempts = new Map<string, { count: number; windowStart: number }>()
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 10

export async function login(input: { password: string; displayName: string }): Promise<ActionResult> {
  const displayName = input.displayName?.trim()
  if (!displayName || displayName.length > 50) {
    return { ok: false, error: 'validation', message: 'Please enter a display name.' }
  }

  const key = 'global'
  const now = Date.now()
  const entry = loginAttempts.get(key)
  if (entry && now - entry.windowStart < LOGIN_WINDOW_MS && entry.count >= LOGIN_MAX_ATTEMPTS) {
    return { ok: false, error: 'rate_limited', message: 'Too many attempts. Try again later.' }
  }

  if (!verifyPassword(input.password ?? '')) {
    if (!entry || now - entry.windowStart >= LOGIN_WINDOW_MS) {
      loginAttempts.set(key, { count: 1, windowStart: now })
    } else {
      entry.count += 1
    }
    return { ok: false, error: 'bad_password', message: 'Incorrect password.' }
  }

  loginAttempts.delete(key)
  await createSession(displayName)
  return { ok: true }
}

export async function logout(): Promise<void> {
  await destroySession()
  redirect('/admin/login')
}

/** Status → email type is a fixed mapping; movein_guide is cron-only. */
const STATUS_EMAIL: Partial<Record<ApplicationStatus, EmailType>> = {
  interview: 'interview',
  accepted: 'accepted',
  rejected: 'rejected',
}

export async function updateStatus(input: {
  applicationId: string
  status: ApplicationStatus
  sendEmail: boolean
  emailOverride?: EmailOverride
}): Promise<ActionResult<{ application: Application; email?: { outcome: 'sent' | 'failed' | 'skipped'; error?: string } }>> {
  const session = await requireAdmin()

  if (!ALL_STATUSES.includes(input.status)) {
    return { ok: false, error: 'validation', message: 'Unknown status.' }
  }

  let override: EmailOverride | undefined
  if (input.emailOverride) {
    const parsed = emailOverrideSchema.safeParse(input.emailOverride)
    if (!parsed.success) {
      return { ok: false, error: 'validation', message: 'Edited email needs a subject and a body.' }
    }
    override = parsed.data
  }

  // Status change first — email is a separate, non-blocking concern.
  const { data, error } = await db()
    .from('applications')
    .update({
      status: input.status,
      status_changed_at: new Date().toISOString(),
      status_changed_by: session.displayName,
    })
    .eq('id', input.applicationId)
    .select()
    .single()
  if (error || !data) {
    return { ok: false, error: 'server', message: 'Failed to update status.' }
  }
  const application = data as Application

  const emailType = STATUS_EMAIL[input.status]
  if (!emailType) return { ok: true, application }

  if (!input.sendEmail) {
    await logSkippedEmail({ application, type: emailType, triggeredBy: session.displayName, override })
    return { ok: true, application, email: { outcome: 'skipped' } }
  }

  const result = await sendApplicationEmail({
    application,
    type: emailType,
    triggeredBy: session.displayName,
    override,
  })
  return { ok: true, application, email: result }
}

export async function addNote(input: { applicationId: string; note: string }): Promise<ActionResult<{ note: ReviewNote }>> {
  const session = await requireAdmin()
  const note = z.string().trim().min(1).max(5000).safeParse(input.note)
  if (!note.success) return { ok: false, error: 'validation', message: 'Note cannot be empty.' }

  const { data, error } = await db()
    .from('review_notes')
    .insert({
      application_id: input.applicationId,
      author_name: session.displayName,
      note: note.data,
    })
    .select()
    .single()
  if (error || !data) return { ok: false, error: 'server', message: 'Failed to add note.' }
  return { ok: true, note: data as ReviewNote }
}

export async function resendEmail(input: {
  applicationId: string
  emailType: EmailType
}): Promise<ActionResult<{ outcome: 'sent' | 'failed'; error?: string }>> {
  const session = await requireAdmin()

  const { data, error } = await db().from('applications').select('*').eq('id', input.applicationId).single()
  if (error || !data) return { ok: false, error: 'server', message: 'Application not found.' }

  // Retry resends what was last on screen: the most recent log row for this email
  // type carries body_text when the admin edited it; null means template verbatim.
  const { data: lastLog } = await db()
    .from('email_log')
    .select('subject, body_text')
    .eq('application_id', input.applicationId)
    .eq('email_type', input.emailType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const override: EmailOverride | undefined = lastLog?.body_text
    ? { subject: lastLog.subject, text: lastLog.body_text }
    : undefined

  const result = await sendApplicationEmail({
    application: data as Application,
    type: input.emailType,
    triggeredBy: session.displayName,
    override,
  })
  return { ok: true, ...result }
}
