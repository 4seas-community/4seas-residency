'use client'

import { useMemo, useState } from 'react'
import { LogOut, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DetailsSheet } from '@/components/admin/details-sheet'
import { ThemeToggle } from '@/components/admin/theme-toggle'
import { EmailPreviewDialog } from '@/components/admin/email-preview-dialog'
import { logout, updateStatus, addNote, resendEmail } from '@/lib/actions/admin'
import type { DashboardData } from '@/lib/db'
import { TRACKS, TRACK_IDS } from '@/lib/content/tracks'
import { ALL_STATUSES, STATUS_CONFIG } from '@/lib/types'
import type { Application, ApplicationStatus, EmailLog, EmailOverride, ReviewNote } from '@/lib/types'
import {
  filterApplications,
  sortApplications,
  countByStatus,
  type SortType,
  type StatusFilter,
  type TrackFilter,
} from '@/lib/applications/utils'

// Statuses whose transition triggers the email preview dialog
const EMAIL_STATUSES: ApplicationStatus[] = ['interview', 'accepted', 'rejected']

// Statuses waiting on admin action — their summary card gets a dot when count > 0
interface AdminDashboardProps {
  initialData: DashboardData
  adminName: string
}

export function AdminDashboard({ initialData, adminName }: AdminDashboardProps) {
  const [applications, setApplications] = useState<Application[]>(initialData.applications)
  const [notes, setNotes] = useState<ReviewNote[]>(initialData.notes)
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(initialData.emailLogs)

  const [trackFilter, setTrackFilter] = useState<TrackFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('submitted')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortType>('newest')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const visible = useMemo(
    () => sortApplications(filterApplications(applications, { trackFilter, statusFilter, searchQuery }), sortBy),
    [applications, trackFilter, statusFilter, searchQuery, sortBy],
  )

  const selected = applications.find((a) => a.id === selectedId) ?? null

  const mergeApplication = (updated: Application) =>
    setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))

  const refreshLogsFor = (applicationId: string, log: Partial<EmailLog> & { email_type: EmailLog['email_type']; outcome: EmailLog['outcome'] }) => {
    // ponytail: synthesize a local log row instead of refetching — the server row
    // differs only in id/subject; a page refresh shows the authoritative log.
    setEmailLogs((prev) => [
      {
        id: `local-${Date.now()}`,
        application_id: applicationId,
        recipient: applications.find((a) => a.id === applicationId)?.email ?? '',
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
    application: Application,
    status: ApplicationStatus,
    sendEmail: boolean,
    emailOverride?: EmailOverride,
  ) => {
    setIsUpdating(true)
    const result = await updateStatus({ applicationId: application.id, status, sendEmail, emailOverride })
    setIsUpdating(false)
    setPendingStatus(null)

    if (!result.ok) {
      toast.error(result.message ?? 'Failed to update status.')
      return
    }
    mergeApplication(result.application)

    if (!result.email) {
      toast.success(`Status set to ${STATUS_CONFIG[status].label}.`)
      return
    }
    const emailType = status as EmailLog['email_type']
    refreshLogsFor(application.id, {
      email_type: emailType,
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

  const handleStatusSelect = (status: ApplicationStatus) => {
    if (!selected || status === selected.status) return
    if (EMAIL_STATUSES.includes(status)) {
      setPendingStatus(status)
    } else {
      void applyStatus(selected, status, false)
    }
  }

  const handleAddNote = async (text: string): Promise<boolean> => {
    if (!selected) return false
    const result = await addNote({ applicationId: selected.id, note: text })
    if (!result.ok) {
      toast.error(result.message ?? 'Failed to add note.')
      return false
    }
    setNotes((prev) => [...prev, result.note])
    return true
  }

  const handleRetryEmail = async (log: EmailLog, override?: EmailOverride) => {
    if (!selected) return
    const result = await resendEmail({ applicationId: selected.id, emailType: log.email_type, emailOverride: override })
    if (!result.ok) {
      toast.error(result.message ?? 'Failed to send email.')
      return
    }
    refreshLogsFor(selected.id, {
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
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--admin-border)] bg-[var(--admin-ink)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/apple-icon.png"
              alt="4Seas"
              width={36}
              height={36}
              className="size-9 rounded-full border border-[var(--admin-accent)]/30"
            />
            <div>
              <h1 className="text-lg font-semibold leading-tight text-[var(--admin-text)]">Applications</h1>
            </div>
          </div>
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

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        {/* Status queue */}
        <div className="flex overflow-x-auto border-b border-[var(--admin-border)]">
          {ALL_STATUSES.map((status) => {
            const count = countByStatus(applications, status)
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                aria-pressed={statusFilter === status}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${
                  statusFilter === status
                    ? 'border-[var(--admin-accent)] bg-[var(--admin-soft)] font-semibold text-[var(--admin-text)]'
                    : 'border-transparent text-[var(--admin-muted)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-text)]'
                }`}
              >
                {STATUS_CONFIG[status].label} <span className="ml-1 tabular-nums text-[var(--admin-faint)]">{count}</span>
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--admin-faint)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, contact..."
              className="border-[var(--admin-border)] bg-[var(--admin-ink)] pl-9 text-[var(--admin-text)] placeholder:text-[var(--admin-faint)] focus-visible:ring-[var(--admin-accent)]"
            />
          </div>
          <Select value={trackFilter} onValueChange={(v) => setTrackFilter(v as TrackFilter)}>
            <SelectTrigger className="w-full border-[var(--admin-border)] bg-[var(--admin-ink)] text-[var(--admin-text)] sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tracks</SelectItem>
              {TRACK_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {TRACKS[id].shortName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortType)}>
            <SelectTrigger className="w-full border-[var(--admin-border)] bg-[var(--admin-ink)] text-[var(--admin-text)] sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name">By name</SelectItem>
            </SelectContent>
          </Select>
          <p className="whitespace-nowrap text-xs tabular-nums text-[var(--admin-faint)]">{visible.length} shown</p>
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-md border border-[var(--admin-border)] bg-[var(--admin-panel)]">
          {visible.length === 0 ? (
            <p className="p-10 text-center text-sm text-[var(--admin-faint)]">No applications match these filters.</p>
          ) : (
            <Table className="table-fixed sm:table-auto">
              <TableHeader className="bg-[var(--admin-ink)]">
                <TableRow className="border-[var(--admin-border)] hover:bg-transparent">
                  <TableHead>Applicant</TableHead>
                  <TableHead className="hidden sm:table-cell">Track</TableHead>
                  <TableHead className="hidden sm:table-cell">Preferred start</TableHead>
                  <TableHead className="w-28 sm:w-auto">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((app) => (
                  <TableRow
                    key={app.id}
                    onClick={() => setSelectedId(app.id)}
                    className={`cursor-pointer border-[var(--admin-border)] hover:bg-[var(--admin-soft)] ${
                      app.id === selectedId ? 'bg-[var(--admin-soft)]' : ''
                    }`}
                  >
                    <TableCell>
                      <div className="flex min-w-0 flex-col gap-x-2 sm:flex-row sm:items-baseline">
                        <button
                          type="button"
                          onClick={() => setSelectedId(app.id)}
                          className="min-w-0 truncate rounded-sm text-left font-medium text-[var(--admin-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
                        >
                          {app.full_name}
                        </button>
                        <span className="min-w-0 truncate text-xs text-[var(--admin-faint)]">{app.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge className="border border-[var(--admin-border)] bg-transparent text-[var(--admin-muted)]">{TRACKS[app.track].shortName}</Badge>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap tabular-nums text-[var(--admin-muted)] sm:table-cell">{app.preferred_start_date}</TableCell>
                    <TableCell>
                      <Badge className={`border-0 ${STATUS_CONFIG[app.status].bgColor} ${STATUS_CONFIG[app.status].color}`}>
                        {STATUS_CONFIG[app.status].label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      {/* Detail drawer (non-modal: rows stay clickable to switch applicants) */}
      {selected && (
        <DetailsSheet
          application={selected}
          notes={notes.filter((n) => n.application_id === selected.id)}
          emailLogs={emailLogs.filter((l) => l.application_id === selected.id)}
          onClose={() => setSelectedId(null)}
          onStatusSelect={handleStatusSelect}
          onAddNote={handleAddNote}
          onRetryEmail={handleRetryEmail}
        />
      )}

      {/* Email preview before decision statuses */}
      {selected && pendingStatus && (
        <EmailPreviewDialog
          application={selected}
          targetStatus={pendingStatus}
          isPending={isUpdating}
          onConfirm={(sendEmail, override) => void applyStatus(selected, pendingStatus, sendEmail, override)}
          onCancel={() => setPendingStatus(null)}
        />
      )}
    </div>
  )
}
