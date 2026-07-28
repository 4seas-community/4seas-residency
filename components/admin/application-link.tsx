import { normalizeUrl } from '@/lib/applications/utils'
import { getSocialLinkLabel, SocialPlatformIcon } from '@/components/shared/social-platform-icon'

export function isApplicationUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false

  try {
    const parsed = new URL(normalizeUrl(value.trim()))
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function ApplicationLink({ url }: { url: string | null | undefined }) {
  const value = url?.trim() ?? ''
  if (!value) return <span className="text-[var(--admin-faint)]">—</span>

  let href: string | null = null
  try {
    const parsed = new URL(normalizeUrl(value))
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') href = parsed.toString()
  } catch {
    // Some track fields allow a brief note instead of a URL. Show that text as-is.
  }

  if (!href) {
    return (
      <span className="whitespace-pre-wrap break-words leading-relaxed text-[var(--admin-text)]">{value}</span>
    )
  }

  const label = getSocialLinkLabel(value)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={value}
      aria-label={`Open ${label}: ${value}`}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md text-[var(--admin-accent)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
    >
      <SocialPlatformIcon url={value} className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  )
}
