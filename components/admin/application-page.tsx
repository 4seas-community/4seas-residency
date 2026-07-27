'use client'

// Full-page view of one application (/admin/applications/[id]) — the drawer's
// "open as page" target. Same cards and title row as the drawer, page chrome
// around them, and the same server actions glued to single-application state.

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  ApplicationDetails,
  ApplicationMetaLine,
  ApplicationTitleRow,
} from '@/components/admin/details-sheet'
import { ThemeToggle } from '@/components/admin/theme-toggle'
import { EmailPreviewDialog } from '@/components/admin/email-preview-dialog'
import { logout, updateStatus, updateDates, addNote, resendEmail } from '@/lib/actions/admin'
import type { ApplicationDetailData } from '@/lib/db'
import { STATUS_CONFIG } from '@/lib/types'
import type { Application, ApplicationStatus, EmailLog, EmailOverride, ReviewNote } from '@/lib/types'
import { defaultDecidedAfterInterview } from '@/lib/applications/utils'

// Statuses whose transition triggers the email preview dialog
const EMAIL_STATUSES: ApplicationStatus[] = ['interview', 'accepted', 'rejected']

interface PendingStatusChange {
  status: ApplicationStatus
  /** Initial dialog variant: concrete boolean for accepted/rejected, undefined for interview. */
  decidedAfterInterview?: boolean
}

interface ApplicationPageProps {
  initialData: ApplicationDetailData
  adminName: string
}

export function ApplicationPage({ initialData, adminName }: ApplicationPageProps) {
  const [application, setApplication] = useState<Application>(initialData.application)
  const [notes, setNotes] = useState<ReviewNote[]>(initialData.notes)
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(initialData.emailLogs)
  const [pending, setPending] = useState<PendingStatusChange | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const appendLog = (log: Partial<EmailLog> & { email_type: EmailLog['email_type']; outcome: EmailLog['outcome'] }) => {
    // ponytail: synthesize a local log row instead of refetching — the server row
    // differs only in id/subject; a page refresh shows the authoritative log.
    setEmailLogs((prev) => [
      {
        id: `local-${Date.now()}`,
        application_id: application.id,
        recipient: application.email,
        subject: '',
        body_text: null,
        resend_id: null,
        error: log.error ?? null,
        triggered_by: adminName,
        created_at: new Date().toISOString(),
        ...log,
      } as EmailLog,
      ...prev,
    ])
  }

  const applyStatus = async (
    status: ApplicationStatus,
    sendEmail: boolean,
    emailOverride?: EmailOverride,
    decidedAfterInterview?: boolean,
  ) => {
    setIsUpdating(true)
    const result = await updateStatus({
      applicationId: application.id,
      status,
      sendEmail,
      emailOverride,
      decidedAfterInterview,
    })
    setIsUpdating(false)
    setPending(null)

    if (!result.ok) {
      toast.error(result.message ?? 'Failed to update status.')
      return
    }
    setApplication(result.application)

    if (!result.email) {
      toast.success(`Status set to ${STATUS_CONFIG[status].label}.`)
      return
    }
    appendLog({
      email_type: status as EmailLog['email_type'],
      outcome: result.email.outcome,
      error: result.email.error,
      subject: emailOverride?.subject ?? '',
      body_text: emailOverride?.text ?? null,
    })
    if (result.email.outcome === 'sent') {
      toast.success(`Status updated, email sent to ${application.email}.`)
    } else if (result.email.outcome === 'skipped') {
      toast.success('Status updated, email skipped.')
    } else {
      toast.error(`Status updated, but the email failed: ${result.email.error ?? 'unknown error'}. Use Send in email history to retry.`)
    }
  }

  const requestStatus = (status: ApplicationStatus, decidedAfterInterview?: boolean) => {
    if (status === application.status) return
    if (EMAIL_STATUSES.includes(status)) {
      setPending({
        status,
        decidedAfterInterview:
          status === 'interview'
            ? undefined
            : (decidedAfterInterview ?? defaultDecidedAfterInterview(application)),
      })
    } else {
      void applyStatus(status, false)
    }
  }

  const handleUpdateDates = async (patch: { confirmedStartDate: string }): Promise<void> => {
    const previous = application
    // Optimistic: reflect the edit immediately, revert on failure.
    setApplication({ ...previous, confirmed_start_date: patch.confirmedStartDate })
    const result = await updateDates({ applicationId: application.id, ...patch })
    if (!result.ok) {
      setApplication(previous)
      toast.error(result.message ?? 'Failed to update dates.')
      return
    }
    setApplication(result.application)
  }

  const handleAddNote = async (text: string): Promise<boolean> => {
    const result = await addNote({ applicationId: application.id, note: text })
    if (!result.ok) {
      toast.error(result.message ?? 'Failed to add note.')
      return false
    }
    setNotes((prev) => [...prev, result.note])
    return true
  }

  const handleRetryEmail = async (log: EmailLog, override?: EmailOverride) => {
    const result = await resendEmail({ applicationId: application.id, emailType: log.email_type, emailOverride: override })
    if (!result.ok) {
      toast.error(result.message ?? 'Failed to send email.')
      return
    }
    appendLog({
      email_type: log.email_type,
      outcome: result.outcome,
      error: result.error,
      subject: override?.subject ?? log.subject,
      body_text: override?.text ?? log.body_text,
    })
    if (result.outcome === 'sent') toast.success('Email sent.')
    else toast.error(`Email failed: ${result.error ?? 'unknown error'}`)
  }

  return (
    <div className="min-h-screen bg-[var(--admin-ink)] text-[var(--admin-text)] selection:bg-[var(--admin-accent)] selection:text-[var(--admin-ink)]">
      {/* Same top bar as the dashboard, with a back link in place of the logo block */}
      <header className="sticky top-0 z-40 border-b border-[var(--admin-border)] bg-[var(--admin-ink)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--admin-muted)] outline-none hover:text-[var(--admin-text)] focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
          >
            <ArrowLeft className="size-4" /> Applications
          </Link>
          <div className="flex items-center gap-2 text-sm text-[var(--admin-muted)]">
            <ThemeToggle />
            <span className="hidden rounded-full border border-[var(--admin-border)] px-3 py-1.5 text-xs sm:inline">{adminName}</span>
            <Button variant="ghost" size="sm" onClick={() => void logout()} className="text-[var(--admin-muted)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-text)]">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl">
        <div className="space-y-1 px-5 pt-6">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-[var(--admin-text)]">
            <ApplicationTitleRow application={application} onStatusSelect={requestStatus} />
          </h1>
          <p className="text-sm text-[var(--admin-faint)]">
            <ApplicationMetaLine application={application} />
          </p>
        </div>
        <ApplicationDetails
          application={application}
          notes={notes}
          emailLogs={emailLogs}
          onStatusSelect={requestStatus}
          onAddNote={handleAddNote}
          onRetryEmail={handleRetryEmail}
          onUpdateDates={handleUpdateDates}
        />
      </main>

      {/* Email preview before decision statuses */}
      {pending && (
        <EmailPreviewDialog
          application={application}
          targetStatus={pending.status}
          decidedAfterInterview={pending.decidedAfterInterview}
          isPending={isUpdating}
          onConfirm={(sendEmail, override, decidedAfterInterview) =>
            void applyStatus(pending.status, sendEmail, override, decidedAfterInterview ?? pending.decidedAfterInterview)
          }
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
