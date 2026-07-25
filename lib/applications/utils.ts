// Pure list helpers for the admin dashboard (ported from the reference repo,
// trimmed to the v2 field set — no legacy status mapping).

import type { Application, ApplicationStatus } from '@/lib/types'
import type { TrackId } from '@/lib/content/tracks'

export type TrackFilter = 'all' | TrackId
export type StatusFilter = 'all' | ApplicationStatus
export type SortType = 'newest' | 'oldest' | 'name'

/** Prefix a bare URL with https:// so it is safe to use in an anchor href. */
export function normalizeUrl(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`
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

export interface ApplicationFilters {
  trackFilter: TrackFilter
  statusFilter: StatusFilter
  searchQuery: string
}

export function filterApplications(
  applications: Application[],
  { trackFilter, statusFilter, searchQuery }: ApplicationFilters,
): Application[] {
  return applications.filter((app) => {
    if (trackFilter !== 'all' && app.track !== trackFilter) return false
    if (statusFilter !== 'all' && app.status !== statusFilter) return false

    const searchTerms = searchQuery.trim().split(/\s+/).map(normalizeSearchText).filter(Boolean)
    if (searchTerms.length > 0) {
      const searchableText = [
        app.full_name,
        app.email,
        app.telegram_or_whatsapp,
        app.country,
        app.primary_link,
        app.linkedin,
        app.extra_link,
      ]
        .map(normalizeSearchText)
        .join('|')
      return searchTerms.every((term) => searchableText.includes(term))
    }
    return true
  })
}

export function sortApplications(applications: Application[], sortBy: SortType): Application[] {
  return [...applications].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'name':
        return a.full_name.localeCompare(b.full_name)
    }
  })
}

export function countByStatus(applications: Application[], status: ApplicationStatus): number {
  return applications.filter((a) => a.status === status).length
}
