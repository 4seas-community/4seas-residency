'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ListFilter, LogOut, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DetailsSheet } from '@/components/admin/details-sheet'
import { ThemeToggle } from '@/components/admin/theme-toggle'
import { EmailPreviewDialog } from '@/components/admin/email-preview-dialog'
import { StatusMenuItems } from '@/components/admin/status-menu-items'
import { logout, updateStatus, updateDates, addNote, resendEmail } from '@/lib/actions/admin'
import type { DashboardData } from '@/lib/db'
import { TRACKS, TRACK_IDS, type TrackId } from '@/lib/content/tracks'
import { ALL_STATUSES, STATUS_CONFIG } from '@/lib/types'
import type { Application, ApplicationStatus, EmailLog, EmailOverride, ReviewNote } from '@/lib/types'
import {
  INTERVIEW_STAGE_LABELS,
  countByFilter,
  defaultDecidedAfterInterview,
  filterApplications,
  formatDateTimeGMT7,
  gmt7InputValueToIso,
  isoToGmt7InputValue,
  sortApplications,
  type SortColumn,
  type SortDirection,
  type StatusFilter,
} from '@/lib/applications/utils'

// Statuses whose transition triggers the email preview dialog
const EMAIL_STATUSES: ApplicationStatus[] = ['interview', 'accepted', 'rejected']

// Funnel summary cards: group filter + drill-down sub-filters. Sub-item counts
// always sum to the group count (interview stages partition raw 'interview';
// decided_after_interview null counts as a direct decision).
interface SummaryCardDef {
  title: string
  filter: StatusFilter
  subItems: { label: string; filter: StatusFilter }[]
}

const SUMMARY_CARDS: SummaryCardDef[] = [
  { title: 'All', filter: 'all', subItems: [] },
  {
    title: 'New',
    filter: 'new_group',
    subItems: [
      { label: STATUS_CONFIG.submitted.label, filter: 'submitted' },
      { label: STATUS_CONFIG.reviewing.label, filter: 'reviewing' },
    ],
  },
  {
    title: 'Interview',
    filter: 'interview',
    subItems: [
      { label: INTERVIEW_STAGE_LABELS.awaiting_interview, filter: 'interview_awaiting_interview' },
      { label: INTERVIEW_STAGE_LABELS.awaiting_decision, filter: 'interview_awaiting_decision' },
    ],
  },
  {
    title: 'Accepted',
    filter: 'accepted',
    subItems: [
      { label: 'Early', filter: 'accepted_early' },
      { label: 'After interview', filter: 'accepted_after' },
    ],
  },
  {
    title: 'Rejected',
    filter: 'rejected',
    subItems: [
      { label: 'Before interview', filter: 'rejected_before' },
      { label: 'After interview', filter: 'rejected_after' },
    ],
  },
  { title: 'Cancelled', filter: 'cancelled', subItems: [] },
]

interface SortState {
  column: SortColumn
  direction: SortDirection
}

interface PendingStatusChange {
  applicationId: string
  status: ApplicationStatus
  /** Concrete boolean for accepted/rejected, undefined for interview. */
  decidedAfterInterview?: boolean
}

/** Sortable column header: click toggles asc/desc, arrow marks the active sort. */
function SortableHead({
  label,
  column,
  sort,
  onSort,
}: {
  label: string
  column: SortColumn
  sort: SortState
  onSort: (column: SortColumn) => void
}) {
  const active = sort.column === column
  const Arrow = sort.direction === 'asc' ? ArrowUp : ArrowDown
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`inline-flex items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${
        active ? 'text-[var(--admin-text)]' : 'hover:text-[var(--admin-text)]'
      }`}
    >
      {label}
      {active && <Arrow className="size-3 text-[var(--admin-accent)]" />}
    </button>
  )
}

/** Multi-select checkbox filter in a column header; accent icon = filter active. */
function ColumnFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const active = selected.length > 0
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Filter by ${label}`}
          className={`rounded-sm p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${
            active ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-faint)] hover:text-[var(--admin-text)]'
          }`}
        >
          <ListFilter className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-52 border-[var(--admin-border)] bg-[var(--admin-panel)] p-2 text-[var(--admin-text)] shadow-sm"
      >
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-[var(--admin-soft)]"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(e) =>
                  onChange(e.target.checked ? [...selected, option.value] : selected.filter((v) => v !== option.value))
                }
                className="accent-[var(--admin-accent)]"
              />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
            </label>
          ))}
        </div>
        {active && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mt-1 w-full border-t border-[var(--admin-border)] px-1.5 pt-1.5 text-left text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
          >
            Clear filter
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}

const RANGE_INPUT_CLASS =
  'w-full rounded-sm border border-[var(--admin-border)] bg-[var(--admin-ink)] px-2 py-1 text-sm tabular-nums text-[var(--admin-text)] outline-none focus:border-[var(--admin-accent)] [color-scheme:light] dark:[color-scheme:dark]'

/** From/to range on the effective move-in date (confirmed, falling back to preferred). */
function MoveInRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}) {
  const active = !!from || !!to
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filter by move-in date range"
          className={`rounded-sm p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${
            active ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-faint)] hover:text-[var(--admin-text)]'
          }`}
        >
          <ListFilter className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-56 space-y-2 border-[var(--admin-border)] bg-[var(--admin-panel)] p-3 text-[var(--admin-text)] shadow-sm"
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Move-in date</p>
          <p className="mt-0.5 text-xs text-[var(--admin-faint)]">Confirmed date, falling back to preferred.</p>
        </div>
        <label className="block text-xs text-[var(--admin-muted)]">
          From
          <input type="date" value={from} onChange={(e) => onChange(e.target.value, to)} className={`mt-0.5 ${RANGE_INPUT_CLASS}`} />
        </label>
        <label className="block text-xs text-[var(--admin-muted)]">
          To
          <input type="date" value={to} onChange={(e) => onChange(from, e.target.value)} className={`mt-0.5 ${RANGE_INPUT_CLASS}`} />
        </label>
        {active && (
          <button
            type="button"
            onClick={() => onChange('', '')}
            className="w-full border-t border-[var(--admin-border)] pt-1.5 text-left text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
          >
            Clear filter
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}

/**
 * Inline table cell date/datetime input. Uncontrolled and keyed by the
 * canonical value: edits commit on blur (Enter blurs), external updates —
 * optimistic merge, server response, failure revert — remount with the fresh
 * value. Empty commit clears the field.
 */
function InlineDateInput({
  type,
  value,
  ariaLabel,
  widthClass,
  onCommit,
}: {
  type: 'date' | 'datetime-local'
  value: string
  ariaLabel: string
  widthClass: string
  onCommit: (value: string) => void
}) {
  return (
    <input
      key={value}
      type={type}
      defaultValue={value}
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => {
        if (e.target.value !== value) onCommit(e.target.value)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className={`${widthClass} rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-xs tabular-nums text-[var(--admin-muted)] outline-none hover:border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:text-[var(--admin-text)] [color-scheme:light] dark:[color-scheme:dark]`}
    />
  )
}

interface AdminDashboardProps {
  initialData: DashboardData
  adminName: string
}

export function AdminDashboard({ initialData, adminName }: AdminDashboardProps) {
  const [applications, setApplications] = useState<Application[]>(initialData.applications)
  const [notes, setNotes] = useState<ReviewNote[]>(initialData.notes)
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(initialData.emailLogs)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ column: 'submitted', direction: 'desc' })
  const [trackFilter, setTrackFilter] = useState<TrackId[]>([])
  const [countryFilter, setCountryFilter] = useState<string[]>([])
  const [statusColumnFilter, setStatusColumnFilter] = useState<ApplicationStatus[]>([])
  const [moveInFrom, setMoveInFrom] = useState('')
  const [moveInTo, setMoveInTo] = useState('')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingStatusChange | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // One clock per render for all derived interview-stage/decision-default logic.
  const now = new Date()

  const visible = useMemo(
    () =>
      sortApplications(
        filterApplications(
          applications,
          {
            statusFilter,
            searchQuery,
            tracks: trackFilter,
            countries: countryFilter,
            statuses: statusColumnFilter,
            moveInFrom,
            moveInTo,
          },
          new Date(),
        ),
        sort.column,
        sort.direction,
      ),
    [applications, statusFilter, searchQuery, trackFilter, countryFilter, statusColumnFilter, moveInFrom, moveInTo, sort],
  )

  const countryOptions = useMemo(
    () =>
      Array.from(new Set(applications.map((a) => a.country)))
        .sort((a, b) => a.localeCompare(b))
        .map((country) => ({ value: country, label: country })),
    [applications],
  )
  const trackOptions = TRACK_IDS.map((id) => ({ value: id, label: TRACKS[id].shortName }))
  const statusOptions = ALL_STATUSES.map((status) => ({ value: status, label: STATUS_CONFIG[status].label }))

  const hasColumnFilters =
    trackFilter.length > 0 || countryFilter.length > 0 || statusColumnFilter.length > 0 || !!moveInFrom || !!moveInTo

  const clearColumnFilters = () => {
    setTrackFilter([])
    setCountryFilter([])
    setStatusColumnFilter([])
    setMoveInFrom('')
    setMoveInTo('')
  }

  const selected = applications.find((a) => a.id === selectedId) ?? null
  const pendingApp = pending ? (applications.find((a) => a.id === pending.applicationId) ?? null) : null

  const mergeApplication = (updated: Application) =>
    setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))

  const toggleStatusFilter = (filter: StatusFilter) =>
    setStatusFilter((prev) => (prev === filter && filter !== 'all' ? 'all' : filter))

  const handleSort = (column: SortColumn) =>
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: column === 'submitted' ? 'desc' : 'asc' },
    )

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

  const requestStatus = (application: Application, status: ApplicationStatus, decidedAfterInterview?: boolean) => {
    if (status === application.status) return
    if (EMAIL_STATUSES.includes(status)) {
      setPending({
        applicationId: application.id,
        status,
        decidedAfterInterview:
          status === 'interview'
            ? undefined
            : (decidedAfterInterview ?? defaultDecidedAfterInterview(application, new Date())),
      })
    } else {
      void applyStatus(application, status, false)
    }
  }

  const handleUpdateDates = async (
    application: Application,
    patch: { confirmedStartDate?: string | null; interviewScheduledAt?: string | null },
  ): Promise<void> => {
    const previous = applications.find((a) => a.id === application.id)
    if (!previous) return
    // Optimistic: reflect the edit immediately, revert the row on failure.
    mergeApplication({
      ...previous,
      ...(patch.confirmedStartDate !== undefined ? { confirmed_start_date: patch.confirmedStartDate } : {}),
      ...(patch.interviewScheduledAt !== undefined ? { interview_scheduled_at: patch.interviewScheduledAt } : {}),
    })
    const result = await updateDates({ applicationId: application.id, ...patch })
    if (!result.ok) {
      mergeApplication(previous)
      toast.error(result.message ?? 'Failed to update dates.')
      return
    }
    mergeApplication(result.application)
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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
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

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        {/* Funnel summary cards */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {SUMMARY_CARDS.map((card) => {
            const groupActive = statusFilter === card.filter
            const subActive = card.subItems.some((sub) => sub.filter === statusFilter)
            return (
              <div
                key={card.title}
                className={`rounded-md border bg-[var(--admin-panel)] p-1.5 ${
                  groupActive || subActive ? 'border-[var(--admin-accent)]' : 'border-[var(--admin-border)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleStatusFilter(card.filter)}
                  aria-pressed={groupActive}
                  className={`block w-full rounded-sm px-1.5 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${
                    groupActive ? 'bg-[var(--admin-soft)]' : 'hover:bg-[var(--admin-soft)]'
                  }`}
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                    {card.title}
                  </span>
                  <span
                    className={`block text-2xl font-semibold leading-tight tabular-nums ${
                      groupActive ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text)]'
                    }`}
                  >
                    {countByFilter(applications, card.filter, now)}
                  </span>
                </button>
                {card.subItems.length > 0 && (
                  <div className="mt-1 space-y-px border-t border-[var(--admin-border)] pt-1">
                    {card.subItems.map((sub) => {
                      const active = statusFilter === sub.filter
                      return (
                        <button
                          key={sub.filter}
                          type="button"
                          onClick={() => toggleStatusFilter(sub.filter)}
                          aria-pressed={active}
                          className={`flex w-full items-center justify-between gap-2 rounded-sm px-1.5 py-0.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${
                            active
                              ? 'bg-[var(--admin-soft)] font-medium text-[var(--admin-text)]'
                              : 'text-[var(--admin-muted)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-text)]'
                          }`}
                        >
                          <span className="truncate">{sub.label}</span>
                          <span className={`tabular-nums ${active ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-faint)]'}`}>
                            {countByFilter(applications, sub.filter, now)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Search + filter summary */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--admin-faint)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all fields..."
              className="border-[var(--admin-border)] bg-[var(--admin-ink)] pl-9 text-[var(--admin-text)] placeholder:text-[var(--admin-faint)] focus-visible:ring-[var(--admin-accent)]"
            />
          </div>
          {hasColumnFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearColumnFilters}
              className="text-[var(--admin-accent)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-accent-hover)]"
            >
              <X className="size-3.5" />
              Clear filters
            </Button>
          )}
          <p className="whitespace-nowrap text-xs tabular-nums text-[var(--admin-faint)]">{visible.length} shown</p>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-md border border-[var(--admin-border)] bg-[var(--admin-panel)]">
          {visible.length === 0 ? (
            <p className="p-10 text-center text-sm text-[var(--admin-faint)]">No applications match these filters.</p>
          ) : (
            <Table className="min-w-[1000px]">
              <TableHeader className="bg-[var(--admin-ink)]">
                <TableRow className="border-[var(--admin-border)] hover:bg-transparent">
                  <TableHead className="px-3">
                    <SortableHead label="Applicant" column="name" sort={sort} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="px-3">
                    <span className="inline-flex items-center gap-1">
                      Track
                      <ColumnFilter
                        label="track"
                        options={trackOptions}
                        selected={trackFilter}
                        onChange={(next) => setTrackFilter(next as TrackId[])}
                      />
                    </span>
                  </TableHead>
                  <TableHead className="px-3">
                    <SortableHead label="Submitted" column="submitted" sort={sort} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="px-3">
                    <span className="inline-flex items-center gap-1">
                      <SortableHead label="Country" column="country" sort={sort} onSort={handleSort} />
                      <ColumnFilter label="country" options={countryOptions} selected={countryFilter} onChange={setCountryFilter} />
                    </span>
                  </TableHead>
                  <TableHead className="px-3">
                    <span className="inline-flex items-center gap-1">
                      <SortableHead label="Preferred" column="preferred" sort={sort} onSort={handleSort} />
                      <MoveInRangeFilter
                        from={moveInFrom}
                        to={moveInTo}
                        onChange={(from, to) => {
                          setMoveInFrom(from)
                          setMoveInTo(to)
                        }}
                      />
                    </span>
                  </TableHead>
                  <TableHead className="px-3">
                    <SortableHead label="Confirmed" column="confirmed" sort={sort} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="px-3">Interview</TableHead>
                  <TableHead className="px-3">
                    <span className="inline-flex items-center gap-1">
                      Status
                      <ColumnFilter
                        label="status"
                        options={statusOptions}
                        selected={statusColumnFilter}
                        onChange={(next) => setStatusColumnFilter(next as ApplicationStatus[])}
                      />
                    </span>
                  </TableHead>
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
                    <TableCell className="px-3 py-2">
                      <div className="flex min-w-0 max-w-[220px] flex-col">
                        <span className="truncate font-medium text-[var(--admin-text)]">{app.full_name}</span>
                        <span className="truncate text-xs text-[var(--admin-faint)]">{app.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Badge className="border border-[var(--admin-border)] bg-transparent text-[var(--admin-muted)]">
                        {TRACKS[app.track].shortName}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="whitespace-nowrap px-3 py-2 text-xs tabular-nums text-[var(--admin-muted)]"
                      title={`${formatDateTimeGMT7(app.created_at)} GMT+7`}
                    >
                      {formatDateTimeGMT7(app.created_at).slice(0, 10)}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate px-3 py-2 text-xs text-[var(--admin-muted)]">
                      {app.country}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 text-xs tabular-nums text-[var(--admin-muted)]">
                      {app.preferred_start_date}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <InlineDateInput
                        type="date"
                        value={app.confirmed_start_date ?? ''}
                        ariaLabel={`Confirmed start date for ${app.full_name}`}
                        widthClass="w-[8.25rem]"
                        onCommit={(value) => void handleUpdateDates(app, { confirmedStartDate: value || null })}
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <InlineDateInput
                        type="datetime-local"
                        value={isoToGmt7InputValue(app.interview_scheduled_at)}
                        ariaLabel={`Interview time (GMT+7) for ${app.full_name}`}
                        widthClass="w-[11.5rem]"
                        onCommit={(value) => void handleUpdateDates(app, { interviewScheduledAt: gmt7InputValueToIso(value) })}
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      {/* modal={false}: a modal menu locks body pointer-events, and opening the
                          email dialog from a menu item leaves that lock stuck (radix #1241). */}
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${STATUS_CONFIG[app.status].bgColor} ${STATUS_CONFIG[app.status].color}`}
                          >
                            {STATUS_CONFIG[app.status].label}
                            <ChevronDown className="size-3 opacity-70" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <StatusMenuItems
                            application={app}
                            onSelect={(status, decidedAfterInterview) => requestStatus(app, status, decidedAfterInterview)}
                            exclude={[app.status]}
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
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
          onStatusSelect={(status, decidedAfterInterview) => requestStatus(selected, status, decidedAfterInterview)}
          onAddNote={handleAddNote}
          onRetryEmail={handleRetryEmail}
          onUpdateDates={(patch) => handleUpdateDates(selected, patch)}
        />
      )}

      {/* Email preview before decision statuses */}
      {pendingApp && pending && (
        <EmailPreviewDialog
          application={pendingApp}
          targetStatus={pending.status}
          decidedAfterInterview={pending.decidedAfterInterview}
          isPending={isUpdating}
          onConfirm={(sendEmail, override) => void applyStatus(pendingApp, pending.status, sendEmail, override, pending.decidedAfterInterview)}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
