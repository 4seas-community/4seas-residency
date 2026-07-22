import { ExternalLink } from 'lucide-react'
import { normalizeUrl } from '@/lib/applications/utils'
import { getSocialLinkLabel, SocialPlatformIcon } from '@/components/shared/social-platform-icon'

export function ApplicationLink({ url }: { url: string }) {
  let href: string | null = null
  try {
    const parsed = new URL(normalizeUrl(url))
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') href = parsed.toString()
  } catch {
    // Some track fields allow a brief note instead of a URL. Show that text as-is.
  }

  if (!href) return <span className="whitespace-pre-wrap break-words text-foreground">{url}</span>

  const label = getSocialLinkLabel(url)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      aria-label={`Open ${label}: ${url}`}
      className="inline-flex max-w-full items-center gap-1.5 text-primary hover:underline"
    >
      <SocialPlatformIcon url={url} className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
    </a>
  )
}
