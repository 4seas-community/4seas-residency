import { STATUS_CONFIG } from '@/lib/types'
import type { Application } from '@/lib/types'
import { ADMIN_TRACK_LABELS, formatDateTimeGMT7 } from '@/lib/applications/utils'

const HEADERS = [
  'Track',
  'Status',
  'Status detail',
  'Submitted at (GMT+7)',
  'Name',
  'Email',
  'Contact method',
  'Contact',
  'Country/Region',
  'Preferred move-in date',
  'Move-in date',
  'About',
  'Contribution - planned',
  'Contribution - past community',
  'Contribution - commitment',
  'Primary link',
  'LinkedIn',
  'Track-specific link / additional information',
  'Content studio plans',
] as const

function statusDetail(application: Application): string {
  if (application.status === 'accepted') {
    return application.decided_after_interview ? 'After interview' : 'Early'
  }
  if (application.status === 'rejected') {
    return application.decided_after_interview ? 'After interview' : 'Before interview'
  }
  return ''
}

/** Escape one CSV cell and neutralize spreadsheet formulas in untrusted values. */
export function serializeCsvCell(value: string | null): string {
  let cell = value ?? ''
  if (/^[\s\u00a0]*[=+\-@]/.test(cell)) cell = `'${cell}`
  if (/[",\r\n]/.test(cell)) cell = `"${cell.replace(/"/g, '""')}"`
  return cell
}

export function applicationsToCsv(applications: Application[]): string {
  const rows = applications.map((application) => [
    ADMIN_TRACK_LABELS[application.track],
    STATUS_CONFIG[application.status].label,
    statusDetail(application),
    formatDateTimeGMT7(application.created_at),
    application.full_name,
    application.email,
    application.contact_method,
    application.telegram_or_whatsapp,
    application.country,
    application.preferred_start_date,
    application.confirmed_start_date,
    application.about,
    application.contribution,
    application.past_contribution,
    application.participation_commitment,
    application.primary_link,
    application.linkedin,
    application.extra_link,
    application.content_studio_plans,
  ])

  return `\uFEFF${[HEADERS, ...rows].map((row) => row.map(serializeCsvCell).join(',')).join('\r\n')}`
}

export function gmt7Date(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}
