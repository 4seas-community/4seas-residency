// Pure list helpers for the admin dashboard (ported from the reference repo,
// trimmed to the v2 field set — no legacy status mapping).

import type { Application, ApplicationStatus } from '@/lib/types'
import type { TrackId } from '@/lib/content/tracks'

/**
 * Status filter selected via the summary cards: 'all', a raw status (raw
 * 'interview' doubles as the INTERVIEW group), the NEW group (submitted +
 * reviewing), or a derived sub-stage of interview/accepted/rejected.
 */
export type StatusFilter =
  | 'all'
  | ApplicationStatus
  | 'new_group'
  | 'accepted_early'
  | 'accepted_after'
  | 'rejected_before'
  | 'rejected_after'

export type SortColumn = 'name' | 'submitted' | 'confirmed' | 'country'
export type SortDirection = 'asc' | 'desc'

/** Prefix a bare URL with https:// so it is safe to use in an anchor href. */
export function normalizeUrl(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`
}

/**
 * Default Accept/Reject variant: "after interview" iff the row is currently in
 * interview status. Interview times are coordinated off-platform, so status is
 * the only signal.
 */
export function defaultDecidedAfterInterview(app: Application): boolean {
  return app.status === 'interview'
}

/** Sub-label for a terminal decision; null decided_after_interview (legacy rows) = direct. */
export function decisionVariantLabel(status: 'accepted' | 'rejected', decidedAfterInterview: boolean | null): string {
  if (decidedAfterInterview) return 'after interview'
  return status === 'accepted' ? 'early' : 'before interview'
}

/** Format an ISO datetime string in the GMT+7 (Asia/Bangkok) timezone. */
export function formatDateTimeGMT7(dateStr: string): string {
  // sv-SE renders `YYYY-MM-DD HH:mm`, matching preferred_start_date's format
  return new Date(dateStr).toLocaleString('sv-SE', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Normalize searchable text so partial matching is resilient to casing,
 * accents, whitespace, and punctuation.
 */
function normalizeSearchText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

/** True when the app falls under the given card/sub-item filter. */
export function matchesStatusFilter(app: Application, filter: StatusFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'new_group':
      return app.status === 'submitted' || app.status === 'reviewing'
    // Legacy rows (decided_after_interview null) count as direct decisions.
    case 'accepted_early':
      return app.status === 'accepted' && !app.decided_after_interview
    case 'accepted_after':
      return app.status === 'accepted' && app.decided_after_interview === true
    case 'rejected_before':
      return app.status === 'rejected' && !app.decided_after_interview
    case 'rejected_after':
      return app.status === 'rejected' && app.decided_after_interview === true
    default:
      return app.status === filter
  }
}

export function countByFilter(applications: Application[], filter: StatusFilter): number {
  return applications.filter((app) => matchesStatusFilter(app, filter)).length
}

export interface ApplicationFilters {
  statusFilter: StatusFilter
  searchQuery: string
  /** Column multi-selects; empty array = no filter. */
  tracks: TrackId[]
  countries: string[]
  statuses: ApplicationStatus[]
  /** Inclusive 'YYYY-MM-DD' bounds on confirmed_start_date; '' = unbounded. */
  moveInFrom: string
  moveInTo: string
}

export function filterApplications(
  applications: Application[],
  { statusFilter, searchQuery, tracks, countries, statuses, moveInFrom, moveInTo }: ApplicationFilters,
): Application[] {
  const searchTerms = searchQuery.trim().split(/\s+/).map(normalizeSearchText).filter(Boolean)
  return applications.filter((app) => {
    if (!matchesStatusFilter(app, statusFilter)) return false
    if (tracks.length > 0 && !tracks.includes(app.track)) return false
    if (countries.length > 0 && !countries.includes(app.country)) return false
    if (statuses.length > 0 && !statuses.includes(app.status)) return false

    // 'YYYY-MM-DD' compares correctly as a string
    if (moveInFrom && app.confirmed_start_date < moveInFrom) return false
    if (moveInTo && app.confirmed_start_date > moveInTo) return false

    if (searchTerms.length > 0) {
      const searchableText = [
        app.full_name,
        app.email,
        app.telegram_or_whatsapp,
        app.country,
        app.primary_link,
        app.linkedin,
        app.extra_link,
        app.about,
        app.contribution,
      ]
        .map(normalizeSearchText)
        .join('|')
      return searchTerms.every((term) => searchableText.includes(term))
    }
    return true
  })
}

function compareBy(a: Application, b: Application, column: SortColumn): number {
  switch (column) {
    case 'name':
      return a.full_name.localeCompare(b.full_name)
    case 'submitted':
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    case 'confirmed':
      return a.confirmed_start_date.localeCompare(b.confirmed_start_date)
    case 'country':
      return a.country.localeCompare(b.country)
  }
}

export function sortApplications(
  applications: Application[],
  column: SortColumn,
  direction: SortDirection,
): Application[] {
  const dir = direction === 'asc' ? 1 : -1
  return [...applications].sort((a, b) => dir * compareBy(a, b, column))
}
