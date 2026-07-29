import 'server-only'
import { Resend } from 'resend'
import { db } from '@/lib/db'
import { getEmailContent, renderCustomEmail } from '@/lib/email/templates'
import type { Application, EmailOverride, EmailType } from '@/lib/types'

const NON_PRODUCTION_RECIPIENT = 'delivered+residency-preview@resend.dev'

export interface SendResult {
  outcome: 'sent' | 'failed'
  error?: string
}

/**
 * Deep module: render + send + audit-log in one call.
 * Never throws — a failed send is a normal, logged outcome.
 */
export async function sendApplicationEmail(opts: {
  application: Application
  type: EmailType
  triggeredBy: string
  override?: EmailOverride
}): Promise<SendResult> {
  const { application, type, triggeredBy, override } = opts
  const content = override ? renderCustomEmail(override.subject, override.text) : getEmailContent(type, application)
  // A missing Preview/local override must fail safe, never toward an applicant.
  const recipient =
    process.env.EMAIL_RECIPIENT_OVERRIDE?.trim() ||
    (process.env.VERCEL_ENV === 'production' ? application.email : NON_PRODUCTION_RECIPIENT)

  let outcome: 'sent' | 'failed' = 'sent'
  let resendId: string | null = null
  let errorMessage: string | null = null

  try {
    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.EMAIL_FROM
    if (!apiKey || !from) throw new Error('RESEND_API_KEY / EMAIL_FROM not configured')
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from,
      to: recipient,
      replyTo: process.env.EMAIL_REPLY_TO,
      subject: content.subject,
      html: content.html,
      text: content.text,
    })
    if (error) throw new Error(error.message)
    resendId = data?.id ?? null
  } catch (err) {
    outcome = 'failed'
    errorMessage = err instanceof Error ? err.message : String(err)
  }

  const { error: logError } = await db().from('email_log').insert({
    application_id: application.id,
    email_type: type,
    recipient,
    subject: content.subject,
    outcome,
    body_text: override ? content.text : null,
    resend_id: resendId,
    error: errorMessage,
    triggered_by: triggeredBy,
  })
  if (logError) console.error('email_log insert failed:', logError.message)

  return outcome === 'sent' ? { outcome } : { outcome, error: errorMessage ?? 'unknown error' }
}

/** Audit row for an admin's explicit "update without sending" choice. */
export async function logSkippedEmail(opts: {
  application: Application
  type: EmailType
  triggeredBy: string
  override?: EmailOverride
}): Promise<void> {
  const content = opts.override
    ? renderCustomEmail(opts.override.subject, opts.override.text)
    : getEmailContent(opts.type, opts.application)
  const { error } = await db().from('email_log').insert({
    application_id: opts.application.id,
    email_type: opts.type,
    recipient: opts.application.email,
    subject: content.subject,
    outcome: 'skipped',
    body_text: opts.override ? content.text : null,
    triggered_by: opts.triggeredBy,
  })
  if (error) console.error('email_log insert failed:', error.message)
}
