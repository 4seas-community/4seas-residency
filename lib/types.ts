import type { TrackId } from '@/lib/content/tracks'

export const ALL_STATUSES = ['submitted', 'reviewing', 'interview', 'accepted', 'rejected', 'cancelled'] as const
export type ApplicationStatus = (typeof ALL_STATUSES)[number]

export const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bgColor: string }> = {
  submitted: { label: 'New', color: 'text-[var(--status-submitted-text)]', bgColor: 'bg-[var(--status-submitted-bg)]' },
  reviewing: { label: 'Reviewing', color: 'text-[var(--status-reviewing-text)]', bgColor: 'bg-[var(--status-reviewing-bg)]' },
  interview: { label: 'Interview', color: 'text-[var(--status-interview-text)]', bgColor: 'bg-[var(--status-interview-bg)]' },
  accepted: { label: 'Accepted', color: 'text-[var(--status-accepted-text)]', bgColor: 'bg-[var(--status-accepted-bg)]' },
  rejected: { label: 'Rejected', color: 'text-[var(--status-rejected-text)]', bgColor: 'bg-[var(--status-rejected-bg)]' },
  // Candidate-initiated exit (declined offer / cancelled interview / no-show). No email, terminal.
  cancelled: { label: 'Cancelled', color: 'text-[var(--status-cancelled-text)]', bgColor: 'bg-[var(--status-cancelled-bg)]' },
}

export type ContactMethod = 'telegram' | 'whatsapp'

export type EmailType = 'interview' | 'accepted' | 'rejected' | 'movein_guide'
export type EmailOutcome = 'sent' | 'failed' | 'skipped'

/** Admin-edited replacement for a template email: plain-text body, html derived from it. */
export interface EmailOverride {
  subject: string
  text: string
}

export interface Application {
  id: string
  created_at: string
  track: TrackId
  status: ApplicationStatus
  full_name: string
  email: string
  telegram_or_whatsapp: string
  contact_method: ContactMethod | null
  country: string
  preferred_start_date: string // 'YYYY-MM-DD'
  /** Admin-confirmed move-in date ('YYYY-MM-DD'); preferred_start_date is never overwritten. */
  confirmed_start_date: string | null
  /** Interview time (ISO); interview sub-stages are derived from this vs now, never stored. */
  interview_scheduled_at: string | null
  /** Set only while status is accepted/rejected; null = legacy/direct decision. */
  decided_after_interview: boolean | null
  about: string
  contribution: string
  primary_link: string
  linkedin: string | null
  extra_link: string | null
  content_studio_plans: string | null
  ip_hash: string
  status_changed_at: string | null
  status_changed_by: string | null
}

export interface ReviewNote {
  id: string
  application_id: string
  author_name: string
  note: string
  created_at: string
}

export interface EmailLog {
  id: string
  application_id: string
  email_type: EmailType
  recipient: string
  subject: string
  outcome: EmailOutcome
  /** Non-null only when the admin edited the email — null means the template was sent verbatim. */
  body_text: string | null
  resend_id: string | null
  error: string | null
  triggered_by: string
  created_at: string
}

/** Uniform result contract for every server action — errors never throw across the seam. */
export type ActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; message?: string }
