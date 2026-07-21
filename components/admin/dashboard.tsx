'use client'

import { useMemo, useState } from 'react'
import { LogOut, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DetailsSheet } from '@/components/admin/details-sheet'
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
  formatDateTimeGMT7,
  type SortType,
  type StatusFilter,
  type TrackFilter,
} from '@/lib/applications/utils'

// Statuses whose transition triggers the email preview dialog
const EMAIL_STATUSES: ApplicationStatus[] = ['interview', 'accepted', 'rejected']

interface AdminDashboardProps {
  initialData: DashboardData
  adminName: string
}

export function AdminDashboard({ initialData, adminName }: AdminDashboardProps) {
  const [applications, setApplications] = useState<Application[]>(initialData.applications)
  const [notes, setNotes] = useState<ReviewNote[]>(initialData.notes)
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(initialData.emailLogs)

  const [trackFilter, setTrackFilter] = useState<TrackFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
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
    refreshLogsFor(application.id, { email_type: emailType, outcome: result.email.outcome, error: result.email.error })
    if (result.email.outcome === 'sent') {
      toast.success(`Status updated — email sent to ${application.email}.`)
    } else if (result.email.outcome === 'skipped') {
      toast.success(`Status updated — email skipped.`)
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

  const handleRetryEmail = async (log: EmailLog) => {
    if (!selected) return
    const result = await resendEmail({ applicationId: selected.id, emailType: log.email_type })
    if (!result.ok) {
      toast.error(result.message ?? 'Failed to send email.')
      return
    }
    refreshLogsFor(selected.id, { email_type: log.email_type, outcome: result.outcome, error: result.error })
    if (result.outcome === 'sent') toast.success('Email sent.')
    else toast.error(`Email failed: ${result.error ?? 'unknown error'}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/images/4seas-logo.png" alt="4Seas" className="h-6 w-auto" />
            <h1 className="text-base md:text-lg font-semibold text-foreground">Applications</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{adminName}</span>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Status summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ALL_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                statusFilter === status ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/40'
              }`}
            >
              <p className="text-xs text-muted-foreground">{STATUS_CONFIG[status].label}</p>
              <p className="text-2xl font-semibold text-foreground">{countByStatus(applications, status)}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, contact..."
              className="pl-9"
            />
          </div>
          <Select value={trackFilter} onValueChange={(v) => setTrackFilter(v as TrackFilter)}>
            <SelectTrigger className="w-full sm:w-44">
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
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name">By name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="rounded-xl border border-border overflow-hidden">
          {visible.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No applications match.</p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((app) => {
                const track = TRACKS[app.track]
                return (
                  <li key={app.id}>
                    <button
                      onClick={() => setSelectedId(app.id)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex items-center gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">{app.full_name}</span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                            style={{ backgroundColor: track.accentColor }}
                          >
                            {track.shortName}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {app.email} · starts {app.preferred_start_date} · applied {formatDateTimeGMT7(app.created_at)}
                        </p>
                      </div>
                      <Badge
                        className={`${STATUS_CONFIG[app.status].bgColor} ${STATUS_CONFIG[app.status].color} border-0 shrink-0`}
                      >
                        {STATUS_CONFIG[app.status].label}
                      </Badge>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>

      {/* Detail sheet */}
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
