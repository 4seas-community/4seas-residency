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
  type EmailType,
  type ReviewNote,
} from '@/lib/types'

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
}): Promise<ActionResult<{ application: Application; email?: { outcome: 'sent' | 'failed' | 'skipped'; error?: string } }>> {
  const session = await requireAdmin()

  if (!ALL_STATUSES.includes(input.status)) {
    return { ok: false, error: 'validation', message: 'Unknown status.' }
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
    await logSkippedEmail({ application, type: emailType, triggeredBy: session.displayName })
    return { ok: true, application, email: { outcome: 'skipped' } }
  }

  const result = await sendApplicationEmail({
    application,
    type: emailType,
    triggeredBy: session.displayName,
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

  const result = await sendApplicationEmail({
    application: data as Application,
    type: input.emailType,
    triggeredBy: session.displayName,
  })
  return { ok: true, ...result }
}
