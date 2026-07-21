import type { TrackId } from '@/lib/content/tracks'

export const ALL_STATUSES = ['submitted', 'reviewing', 'interview', 'accepted', 'rejected', 'cancelled'] as const
export type ApplicationStatus = (typeof ALL_STATUSES)[number]

export const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bgColor: string }> = {
  submitted: { label: 'Submitted', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  reviewing: { label: 'Reviewing', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  interview: { label: 'Interview', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  accepted: { label: 'Accepted', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
  // Candidate-initiated exit (declined offer / cancelled interview / no-show). No email, terminal.
  cancelled: { label: 'Cancelled', color: 'text-slate-600', bgColor: 'bg-slate-100' },
}

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
  country: string
  preferred_start_date: string // 'YYYY-MM-DD'
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
