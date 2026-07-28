'use client'

import { useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Download, ListFilter, LogOut, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DetailsSheet } from '@/components/admin/details-sheet'
import { ThemeToggle } from '@/components/admin/theme-toggle'
import { EmailPreviewDialog } from '@/components/admin/email-preview-dialog'
import { StatusMenuItems } from '@/components/admin/status-menu-items'
import { addNote, logout, resendEmail, updateDates, updateStatus, updateTrack } from '@/lib/actions/admin'
import type { DashboardData } from '@/lib/db'
import { getEmailContent } from '@/lib/email/templates'
import { ADMIN_TRACK_IDS, STATUS_CONFIG } from '@/lib/types'
import type { AdminTrackId, Application, ApplicationStatus, EmailLog, EmailOverride, ReviewNote } from '@/lib/types'
import { applicationsToCsv, gmt7Date } from '@/lib/applications/csv'
import {
  ADMIN_TRACK_LABELS,
  countByFilter,
  defaultDecidedAfterInterview,
  filterApplications,
  formatDateTimeGMT7,
  sortApplications,
  type SortColumn,
  type SortDirection,
  type StatusFilter,
} from '@/lib/applications/utils'

// Statuses whose transition triggers the email preview dialog
const EMAIL_STATUSES: ApplicationStatus[] = ['interview', 'accepted', 'rejected']

// Sub-item counts always sum to the group count. Legacy decision rows with a
// null decided_after_interview value count as a direct decision.
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
      { label: 'Submitted', filter: 'submitted' },
      { label: STATUS_CONFIG.reviewing.label, filter: 'reviewing' },
    ],
  },
  { title: 'Interview', filter: 'interview', subItems: [] },
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

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new_group', label: 'New' },
  { value: 'submitted', label: 'New · Submitted' },
  { value: 'reviewing', label: 'New · Reviewing' },
  { value: 'interview', label: 'Interview' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'accepted_early', label: 'Accepted · Early' },
  { value: 'accepted_after', label: 'Accepted · After interview' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'rejected_before', label: 'Rejected · Before interview' },
  { value: 'rejected_after', label: 'Rejected · After interview' },
  { value: 'cancelled', label: 'Cancelled' },
]

interface SortState {
  column: SortColumn
  direction: SortDirection
}

/**
 * Table geometry. Every column is sized on its `<th>` under `table-fixed`, so a
 * cell and the control inside it are the same box. The control columns are fixed
 * at CONTROL_WIDTH + CELL_CLASS's px-3 pair (136 + 24 = 160px = w-40) — that
 * requirement is absolute, so a percentage would under-serve it below 1230px and
 * let the controls spill into the next column. Applicant carries no width and
 * absorbs whatever is left; its name + email fill it at any viewport.
 */
const COLUMN_WIDTHS = {
  track: 'w-40',
  submitted: 'w-32',
  country: 'w-40',
  confirmed: 'w-40',
  status: 'w-40',
} as const
const CONTROL_WIDTH = 'w-[8.5rem]'
const HEAD_CLASS = 'h-11 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-muted)]'
const CELL_CLASS = 'px-3 py-0'
/** One 28px content box per cell, so no single control dictates the row height. */
const CELL_INNER = 'flex h-7 items-center'
/**
 * One visual language for the three editable in-row controls: 8px radius, no
 * shadow, border transparent at rest and revealed on hover / focus / open.
 */
const ROW_CONTROL_CLASS =
  'h-7 rounded-sm border border-transparent px-1.5 py-0 text-xs outline-none transition-colors hover:border-[var(--admin-border)] focus-visible:border-[var(--admin-accent)] focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]/30'

const ariaSortFor = (column: SortColumn, sort: SortState): 'ascending' | 'descending' | 'none' =>
  sort.column === column ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'

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
      {/* Space is reserved so activating a sort never widens the column. */}
      <span className="flex size-3.5 shrink-0 items-center justify-center">
        {active && <Arrow className="size-3.5" />}
      </span>
    </button>
  )
}

/**
 * 26px hit target (WCAG 2.2 minimum is 24) pulled back to the icon's own 14px
 * footprint by the negative margin, so the padding costs no layout space.
 */
const FILTER_TRIGGER_CLASS =
  '-m-1.5 rounded-sm p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]'

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
          className={`${FILTER_TRIGGER_CLASS} ${
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
        {/* Always rendered: unmounting it on the click that clears the filter
            would drop keyboard focus to <body> with the popover still open. */}
        <button
          type="button"
          onClick={() => onChange([])}
          className={`mt-1 w-full rounded-sm border-t border-[var(--admin-border)] px-1.5 pt-1.5 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${
            active ? 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]' : 'text-[var(--admin-faint)]'
          }`}
        >
          Clear filter
        </button>
      </PopoverContent>
    </Popover>
  )
}

/** Single-select column filter shared with the matching top-level control. */
function SingleSelectFilter<T extends string>({
  label,
  options,
  selected,
  allValue,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  selected: T
  allValue: T
  onChange: (next: T) => void
}) {
  const active = selected !== allValue
  // Single-select closes on commit, like every Radix Select in the app.
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Filter by ${label}`}
          className={`${FILTER_TRIGGER_CLASS} ${
            active ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-faint)] hover:text-[var(--admin-text)]'
          }`}
        >
          <ListFilter className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-60 border-[var(--admin-border)] bg-[var(--admin-panel)] p-2 text-[var(--admin-text)] shadow-sm"
      >
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected === option.value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className={`block w-full rounded-sm px-1.5 py-1 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${
                selected === option.value
                  ? 'bg-[var(--admin-soft)] font-medium text-[var(--admin-text)]'
                  : 'text-[var(--admin-muted)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-text)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Windowed page list: first, last, current ±1, ellipsis over the gaps. */
function pageItems(current: number, count: number): (number | 'ellipsis')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i)
  const pages = [...new Set([0, current - 1, current, current + 1, count - 1])]
    .filter((p) => p >= 0 && p < count)
    .sort((a, b) => a - b)
  const out: (number | 'ellipsis')[] = []
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push('ellipsis')
    out.push(p)
  })
  return out
}

const PAGER_NAV_CLASS =
  'h-7 rounded-sm px-2 text-xs text-[var(--admin-muted)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-text)] focus-visible:ring-[var(--admin-accent)]'

const RANGE_INPUT_CLASS = `h-7 ${CONTROL_WIDTH} max-w-full rounded-sm border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2 text-xs tabular-nums text-[var(--admin-text)] outline-none transition-colors hover:border-[var(--admin-faint)] focus:border-[var(--admin-accent)] [color-scheme:light] dark:[color-scheme:dark]`

/**
 * Inline table cell date input. Uncontrolled and keyed by the canonical value, so
 * external updates — optimistic merge, server response, failure revert — remount
 * with the fresh value. Edits commit on change rather than on blur: a row that
 * unmounts while focused (pagination, a filter change) fires no blur, and the
 * edit would be lost silently. `type="date"` only reports complete dates, so
 * every non-empty change is a real edit. The date is never null — an emptied
 * input reverts instead of clearing.
 */
function InlineDateInput({
  value,
  ariaLabel,
  onCommit,
}: {
  value: string
  ariaLabel: string
  onCommit: (value: string) => void
}) {
  return (
    <input
      key={value}
      type="date"
      defaultValue={value}
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        if (e.target.value && e.target.value !== value) onCommit(e.target.value)
      }}
      onBlur={(e) => {
        if (!e.target.value) e.target.value = value
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className={`${ROW_CONTROL_CLASS} ${CONTROL_WIDTH} bg-transparent tabular-nums text-[var(--admin-muted)] focus-visible:text-[var(--admin-text)] [color-scheme:light] dark:[color-scheme:dark]`}
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
  const [trackFilter, setTrackFilter] = useState<AdminTrackId | 'all'>('all')
  const [countryFilter, setCountryFilter] = useState<string[]>([])
  // Move-in scope runs from the start of the v1 record (the oldest migrated
  // application moves in 2025-06-15) through the end of the current year, so
  // imported history is in scope by default instead of silently filtered out.
  const thisYear = new Date().getFullYear()
  const [moveInFrom, setMoveInFrom] = useState('2025-01-01')
  const [moveInTo, setMoveInTo] = useState(`${thisYear}-12-31`)

  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(0)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const lastOpenedRowRef = useRef<HTMLTableRowElement | null>(null)
  const [updatingTrackId, setUpdatingTrackId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingStatusChange | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const dateScopedApplications = useMemo(
    () =>
      filterApplications(applications, {
        statusFilter: 'all',
        searchQuery: '',
        tracks: [],
        countries: [],
        moveInFrom,
        moveInTo,
      }),
    [applications, moveInFrom, moveInTo],
  )

  const scopedApplications = useMemo(
    () => (trackFilter === 'all' ? dateScopedApplications : dateScopedApplications.filter((app) => app.track === trackFilter)),
    [dateScopedApplications, trackFilter],
  )

  const visible = useMemo(
    () =>
      sortApplications(
        filterApplications(applications, {
          statusFilter,
          searchQuery,
          tracks: trackFilter === 'all' ? [] : [trackFilter],
          countries: countryFilter,
          moveInFrom,
          moveInTo,
        }),
        sort.column,
        sort.direction,
      ),
    [applications, statusFilter, searchQuery, trackFilter, countryFilter, moveInFrom, moveInTo, sort],
  )

  // Client-side pagination; clamping keeps the page valid when filters shrink the list.
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const paged = visible.slice(safePage * pageSize, (safePage + 1) * pageSize)

  const countryOptions = useMemo(
    () =>
      Array.from(new Set(applications.map((a) => a.country)))
        .sort((a, b) => a.localeCompare(b))
        .map((country) => ({ value: country, label: country })),
    [applications],
  )
  const trackOptions: { value: AdminTrackId | 'all'; label: string; count: number }[] = [
    { value: 'all' as const, label: 'All', count: dateScopedApplications.length },
    ...ADMIN_TRACK_IDS.map((id) => ({
      value: id,
      label: ADMIN_TRACK_LABELS[id],
      count: dateScopedApplications.filter((app) => app.track === id).length,
    })),
  ]
  // Track + move-in range are page scope, not filters — Clear leaves them alone.
  const hasFilters = statusFilter !== 'all' || countryFilter.length > 0

  const clearFilters = () => {
    setStatusFilter('all')
    setCountryFilter([])
  }

  /** Chip label for the active status card/sub-item filter, e.g. "Interview · Awaiting decision". */
  const statusFilterLabel = (filter: StatusFilter): string => {
    for (const card of SUMMARY_CARDS) {
      if (card.filter === filter) return card.title
      const sub = card.subItems.find((s) => s.filter === filter)
      if (sub) return `${card.title} · ${sub.label}`
    }
    return filter
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
    let result
    try {
      result = await updateStatus({
        applicationId: application.id,
        status,
        sendEmail,
        emailOverride,
        decidedAfterInterview,
      })
    } catch {
      // Without this the dialog's Send button spins forever with no explanation.
      setIsUpdating(false)
      toast.error('Failed to update status.')
      return
    }
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
      subject: emailOverride?.subject ?? getEmailContent(emailType, result.application).subject,
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
            : (decidedAfterInterview ?? defaultDecidedAfterInterview(application)),
      })
    } else {
      void applyStatus(application, status, false)
    }
  }

  const handleUpdateDates = async (
    application: Application,
    patch: { confirmedStartDate: string },
  ): Promise<void> => {
    const previous = applications.find((a) => a.id === application.id)
    if (!previous) return
    // Optimistic: reflect the edit immediately, revert the row on failure. A thrown
    // action must revert too, or the screen keeps a date the database never got.
    mergeApplication({ ...previous, confirmed_start_date: patch.confirmedStartDate })
    try {
      const result = await updateDates({ applicationId: application.id, ...patch })
      if (!result.ok) {
        mergeApplication(previous)
        toast.error(result.message ?? 'Failed to update dates.')
        return
      }
      mergeApplication(result.application)
    } catch {
      mergeApplication(previous)
      toast.error('Failed to update dates.')
    }
  }

  const handleUpdateTrack = async (application: Application, track: AdminTrackId): Promise<void> => {
    if (application.track === track) return
    setUpdatingTrackId(application.id)
    try {
      const result = await updateTrack({ applicationId: application.id, track })
      if (!result.ok) {
        toast.error(result.message ?? 'Failed to update Track.')
        return
      }
      mergeApplication(result.application)
      toast.success(`Track changed to ${ADMIN_TRACK_LABELS[track]}.`)
    } catch {
      toast.error('Failed to update Track.')
    } finally {
      setUpdatingTrackId(null)
    }
  }

  const handleAddNote = async (input: { authorName: string; note: string }): Promise<boolean> => {
    if (!selected) return false
    try {
      const result = await addNote({ applicationId: selected.id, ...input })
      if (!result.ok) {
        toast.error(result.message ?? 'Failed to add note.')
        return false
      }
      setNotes((prev) => [result.note, ...prev])
      return true
    } catch {
      // A thrown action (offline, 500) must still surface — the composer keeps the draft.
      toast.error('Failed to add note.')
      return false
    }
  }

  const handleExportCsv = () => {
    let objectUrl: string | null = null
    try {
      const blob = new Blob([applicationsToCsv(visible)], { type: 'text/csv;charset=utf-8' })
      objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `4seas-applications-${gmt7Date()}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      toast.error('Failed to export CSV.')
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }

  const handleRetryEmail = async (log: EmailLog, override?: EmailOverride) => {
    if (!selected) return
    const result = await resendEmail({
      applicationId: selected.id,
      emailType: log.email_type,
      // Synthetic optimistic rows have no server row to resend from.
      logId: log.id.startsWith('local-') ? undefined : log.id,
      emailOverride: override,
    })
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
              src="/residency/apple-icon.png"
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
        {/* Page scope: track tabs + move-in range apply to summary cards AND table. */}
        {/* The tab rail is a drawn line and so is the card border, so the gap that
            matters is rail → card, not text → card. This mb overrides the parent's
            space-y-4 (which sets margin-bottom here) — 24px, or the two lines collide. */}
        <section className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-[var(--admin-border)]">
          {/* -ml-3 cancels the first tab's padding so the rail starts at x=0. */}
          <div role="group" aria-label="Track" className="-ml-3 flex">
            {trackOptions.map((option) => {
              const active = trackFilter === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTrackFilter(option.value)}
                  aria-pressed={active}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent)] ${
                    active
                      ? 'border-[var(--admin-accent)] font-medium text-[var(--admin-text)]'
                      : 'border-transparent text-[var(--admin-muted)] hover:border-[var(--admin-border)] hover:text-[var(--admin-text)]'
                  }`}
                >
                  {option.label}{' '}
                  <span className={`tabular-nums ${active ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-faint)]'}`}>
                    {option.count}
                  </span>
                </button>
              )
            })}
          </div>
          <div role="group" aria-label="Move-in range" className="flex flex-wrap items-center gap-2 pb-2">
            <span className="text-xs font-medium text-[var(--admin-muted)]">Move-in</span>
            <input
              type="date"
              value={moveInFrom}
              onChange={(e) => setMoveInFrom(e.target.value)}
              aria-label="Move-in from"
              className={RANGE_INPUT_CLASS}
            />
            <span className="text-xs text-[var(--admin-faint)]">–</span>
            <input
              type="date"
              value={moveInTo}
              onChange={(e) => setMoveInTo(e.target.value)}
              aria-label="Move-in to"
              className={RANGE_INPUT_CLASS}
            />
          </div>
        </section>

        {/* Status overview: grouped children remain visible and independently selectable. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {SUMMARY_CARDS.map((card) => {
            const active = statusFilter === card.filter || card.subItems.some((sub) => sub.filter === statusFilter)
            const selfActive = statusFilter === card.filter
            return (
              // The accent border marks the selected family; selection inside a
              // region is carried by its own accent count, so hovering always
              // moves the surface toward --admin-soft in both regions.
              <div
                key={card.title}
                className={`overflow-hidden rounded-md border bg-[var(--admin-panel)] ${
                  active ? 'border-[var(--admin-accent)]' : 'border-[var(--admin-border)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleStatusFilter(card.filter)}
                  aria-pressed={selfActive}
                  className="block w-full px-3 py-2 text-left outline-none hover:bg-[var(--admin-soft)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent)]"
                >
                  <span className="block truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                    {card.title}
                  </span>
                  <span
                    className={`block text-2xl font-semibold leading-tight tabular-nums ${
                      selfActive ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text)]'
                    }`}
                  >
                    {countByFilter(scopedApplications, card.filter)}
                  </span>
                </button>
                {card.subItems.length > 0 && (
                  <div className="border-t border-[var(--admin-border)] py-1">
                    {card.subItems.map((sub) => {
                      const childActive = statusFilter === sub.filter
                      return (
                        <button
                          key={sub.filter}
                          type="button"
                          onClick={() => setStatusFilter(childActive ? card.filter : sub.filter)}
                          aria-pressed={childActive}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-1 text-left text-xs outline-none hover:bg-[var(--admin-soft)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent)] ${
                            childActive ? 'font-medium text-[var(--admin-text)]' : 'text-[var(--admin-muted)]'
                          }`}
                        >
                          <span>{sub.label}</span>
                          <span className={`tabular-nums ${childActive ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-faint)]'}`}>
                            {countByFilter(scopedApplications, sub.filter)}
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
              className="h-8 border-[var(--admin-border)] bg-[var(--admin-ink)] pl-9 text-[var(--admin-text)] placeholder:text-[var(--admin-faint)] focus-visible:ring-[var(--admin-accent)]"
            />
          </div>
          {statusFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--admin-accent)]/40 bg-[var(--admin-soft)] px-2.5 text-xs font-medium text-[var(--admin-text)] outline-none hover:border-[var(--admin-accent)] focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
            >
              {statusFilterLabel(statusFilter)}
              <X className="size-3 text-[var(--admin-muted)]" />
            </button>
          )}
          {countryFilter.map((country) => (
            <button
              key={country}
              type="button"
              onClick={() => setCountryFilter((prev) => prev.filter((c) => c !== country))}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--admin-accent)]/40 bg-[var(--admin-soft)] px-2.5 text-xs font-medium text-[var(--admin-text)] outline-none hover:border-[var(--admin-accent)] focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
            >
              {country}
              <X className="size-3 text-[var(--admin-muted)]" />
            </button>
          ))}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-[var(--admin-accent)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-accent-hover)]"
            >
              Clear
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={visible.length === 0}
            onClick={handleExportCsv}
            className="border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-text)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-text)]"
          >
            <Download className="size-4" />
            Export filtered CSV
          </Button>
          <p className="flex h-8 items-center whitespace-nowrap text-xs tabular-nums text-[var(--admin-faint)]">
            Showing {visible.length} of {scopedApplications.length} applications
          </p>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-md border border-[var(--admin-border)] bg-[var(--admin-panel)]">
          <Table className="min-w-[960px] table-fixed">
            <TableHeader className="bg-[var(--admin-soft)] [&_tr]:border-b-2 [&_tr]:border-[var(--admin-border)]">
              <TableRow>
                <TableHead className={HEAD_CLASS} aria-sort={ariaSortFor('name', sort)}>
                  <SortableHead label="Applicant" column="name" sort={sort} onSort={handleSort} />
                </TableHead>
                <TableHead className={`${HEAD_CLASS} ${COLUMN_WIDTHS.track}`} aria-sort={ariaSortFor('track', sort)}>
                  <span className="inline-flex items-center gap-2">
                    <SortableHead label="Track" column="track" sort={sort} onSort={handleSort} />
                    <SingleSelectFilter
                      label="Track"
                      options={trackOptions.map(({ value, label }) => ({ value, label }))}
                      selected={trackFilter}
                      allValue="all"
                      onChange={setTrackFilter}
                    />
                  </span>
                </TableHead>
                <TableHead className={`${HEAD_CLASS} ${COLUMN_WIDTHS.submitted}`} aria-sort={ariaSortFor('submitted', sort)}>
                  <SortableHead label="Submitted" column="submitted" sort={sort} onSort={handleSort} />
                </TableHead>
                <TableHead className={`${HEAD_CLASS} ${COLUMN_WIDTHS.country}`} aria-sort={ariaSortFor('country', sort)}>
                  <span className="inline-flex items-center gap-2">
                    <SortableHead label="Country/Region" column="country" sort={sort} onSort={handleSort} />
                    <ColumnFilter label="Country/Region" options={countryOptions} selected={countryFilter} onChange={setCountryFilter} />
                  </span>
                </TableHead>
                <TableHead className={`${HEAD_CLASS} ${COLUMN_WIDTHS.confirmed}`} aria-sort={ariaSortFor('confirmed', sort)}>
                  <SortableHead label="Move-in date" column="confirmed" sort={sort} onSort={handleSort} />
                </TableHead>
                <TableHead className={`${HEAD_CLASS} ${COLUMN_WIDTHS.status}`} aria-sort={ariaSortFor('status', sort)}>
                  <span className="inline-flex items-center gap-2">
                    <SortableHead label="Status" column="status" sort={sort} onSort={handleSort} />
                    <SingleSelectFilter
                      label="Status"
                      options={STATUS_FILTER_OPTIONS}
                      selected={statusFilter}
                      allValue="all"
                      onChange={setStatusFilter}
                    />
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* The header — and with it the filter controls that produced the
                  empty result — stays mounted; only the body reports the miss. */}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 px-3 text-center">
                    <p className="text-sm text-[var(--admin-faint)]">No applications match these filters.</p>
                    {(hasFilters || searchQuery !== '') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          clearFilters()
                          setSearchQuery('')
                        }}
                        className="mt-2 text-[var(--admin-accent)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-accent-hover)]"
                      >
                        Clear filters and search
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
              {paged.map((app) => (
                <TableRow
                  key={app.id}
                  tabIndex={0}
                  aria-label={`Open application from ${app.full_name}`}
                  onClick={(event) => {
                    lastOpenedRowRef.current = event.currentTarget
                    event.currentTarget.focus()
                    setSelectedId(app.id)
                  }}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
                    event.preventDefault()
                    lastOpenedRowRef.current = event.currentTarget
                    setSelectedId(app.id)
                  }}
                  className={`h-11 cursor-pointer border-[var(--admin-border)] hover:bg-[var(--admin-soft)] focus-visible:bg-[var(--admin-accent)]/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--admin-accent)] ${
                    app.id === selectedId ? 'bg-[var(--admin-soft)]' : ''
                  }`}
                >
                  <TableCell className={CELL_CLASS}>
                    {/* Name and email share one line: the email disambiguates
                        same-named applicants without costing a second row. */}
                    <div className={`${CELL_INNER} gap-2`}>
                      <span className="shrink-0 truncate font-medium text-[var(--admin-text)]">{app.full_name}</span>
                      <span className="truncate text-xs text-[var(--admin-faint)]" title={app.email}>
                        {app.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    <Select
                      value={app.track}
                      disabled={updatingTrackId === app.id}
                      onValueChange={(value) => void handleUpdateTrack(app, value as AdminTrackId)}
                    >
                      {/* Ghost control: plain text at rest, affordance on hover/focus/open.
                          data-[size=sm]:h-7 beats the trigger's own data-attribute height. */}
                      <SelectTrigger
                        size="sm"
                        aria-label={`Track for ${app.full_name}`}
                        onClick={(event) => event.stopPropagation()}
                        className={`${ROW_CONTROL_CLASS} ${CONTROL_WIDTH} data-[size=sm]:h-7 text-[var(--admin-muted)] shadow-none dark:bg-transparent dark:hover:bg-transparent data-[state=open]:border-[var(--admin-accent)] data-[state=open]:text-[var(--admin-text)] [&>svg]:opacity-0 hover:[&>svg]:opacity-60 focus-visible:[&>svg]:opacity-60 data-[state=open]:[&>svg]:opacity-60`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        onClick={(event) => event.stopPropagation()}
                        className="border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-text)]"
                      >
                        {ADMIN_TRACK_IDS.map((trackId) => (
                          <SelectItem key={trackId} value={trackId}>
                            {ADMIN_TRACK_LABELS[trackId]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell
                    className={`${CELL_CLASS} whitespace-nowrap text-xs tabular-nums text-[var(--admin-muted)]`}
                    title={`${formatDateTimeGMT7(app.created_at)} GMT+7`}
                  >
                    <span className={CELL_INNER}>{formatDateTimeGMT7(app.created_at).slice(0, 10)}</span>
                  </TableCell>
                  <TableCell className={`${CELL_CLASS} text-xs text-[var(--admin-muted)]`}>
                    <span className={CELL_INNER}>
                      <span className="truncate" title={app.country}>
                        {app.country}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    <InlineDateInput
                      value={app.confirmed_start_date}
                      ariaLabel={`Confirmed move-in date for ${app.full_name}`}
                      onCommit={(value) => void handleUpdateDates(app, { confirmedStartDate: value })}
                    />
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    {/* modal={false}: a modal menu locks body pointer-events, and opening the
                        email dialog from a menu item leaves that lock stuck (radix #1241). */}
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Change status for ${app.full_name}. Current status: ${STATUS_CONFIG[app.status].label}`}
                          className={`${ROW_CONTROL_CLASS} ${CONTROL_WIDTH} inline-flex items-center justify-between gap-2 font-medium ${STATUS_CONFIG[app.status].bgColor} ${STATUS_CONFIG[app.status].color}`}
                        >
                          {STATUS_CONFIG[app.status].label}
                          <ChevronDown className="size-3.5 shrink-0 opacity-70" />
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
          {visible.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-border)] px-3 py-2">
              <label className="flex items-center gap-2 text-xs text-[var(--admin-muted)]">
                Rows per page
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value))
                    setPage(0)
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    // Height must be written as data-[size=sm] — a bare h-7 loses to shadcn's own data-attribute rule.
                    className="data-[size=sm]:h-7 gap-1 rounded-sm border-[var(--admin-border)] bg-[var(--admin-panel)] px-2 text-xs text-[var(--admin-text)] shadow-none focus-visible:border-[var(--admin-accent)] focus-visible:ring-[var(--admin-accent)]/40"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[4rem] border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-text)]">
                    {[20, 50, 100].map((n) => (
                      <SelectItem
                        key={n}
                        value={String(n)}
                        className="text-xs focus:bg-[var(--admin-soft)] focus:text-[var(--admin-text)]"
                      >
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs tabular-nums text-[var(--admin-faint)]">
                  {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, visible.length)} of {visible.length}
                </span>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent className="gap-0.5">
                    <PaginationItem>
                      <PaginationPrevious
                        disabled={safePage === 0}
                        onClick={() => setPage(safePage - 1)}
                        className={PAGER_NAV_CLASS}
                      />
                    </PaginationItem>
                    {pageItems(safePage, pageCount).map((item, i) =>
                      item === 'ellipsis' ? (
                        <PaginationItem key={`ellipsis-${i}`}>
                          <PaginationEllipsis className="size-7 text-[var(--admin-faint)]" />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={item}>
                          <PaginationLink
                            isActive={item === safePage}
                            onClick={() => setPage(item)}
                            className={`size-7 rounded-sm text-xs shadow-none focus-visible:ring-[var(--admin-accent)] ${
                              item === safePage
                                ? 'border-[var(--admin-border)] bg-[var(--admin-soft)] text-[var(--admin-text)]'
                                : 'text-[var(--admin-muted)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-text)]'
                            }`}
                          >
                            {item + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}
                    <PaginationItem>
                      <PaginationNext
                        disabled={safePage >= pageCount - 1}
                        onClick={() => setPage(safePage + 1)}
                        className={PAGER_NAV_CLASS}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal detail Sheet; the focused invoking row receives focus again on close. */}
      {selected && (
        <DetailsSheet
          application={selected}
          notes={notes.filter((n) => n.application_id === selected.id)}
          emailLogs={emailLogs.filter((l) => l.application_id === selected.id)}
          onClose={() => setSelectedId(null)}
          onReturnFocus={() => lastOpenedRowRef.current?.focus()}
          onStatusSelect={(status, decidedAfterInterview) => requestStatus(selected, status, decidedAfterInterview)}
          onAddNote={handleAddNote}
          onUpdateTrack={(track) => handleUpdateTrack(selected, track)}
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
          onConfirm={(sendEmail, override, decidedAfterInterview) =>
            void applyStatus(pendingApp, pending.status, sendEmail, override, decidedAfterInterview ?? pending.decidedAfterInterview)
          }
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
