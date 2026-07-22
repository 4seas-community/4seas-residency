import {
  Facebook,
  Github,
  Globe2,
  Instagram,
  Link2,
  Linkedin,
  MessageCircle,
  Send,
  Youtube,
} from 'lucide-react'

interface SocialPlatformIconProps {
  url: string
  className?: string
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  )
}

export function SocialPlatformIcon({ url, className = 'size-4' }: SocialPlatformIconProps) {
  let hostname = ''
  try {
    hostname = new URL(url.includes('://') ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    // Invalid or non-URL values use the generic link icon below.
  }

  const isDomain = (domain: string) => hostname === domain || hostname.endsWith(`.${domain}`)

  if (isDomain('linkedin.com')) return <Linkedin className={className} aria-hidden="true" />
  if (isDomain('github.com')) return <Github className={className} aria-hidden="true" />
  if (isDomain('instagram.com')) return <Instagram className={className} aria-hidden="true" />
  if (isDomain('youtube.com') || isDomain('youtu.be')) {
    return <Youtube className={className} aria-hidden="true" />
  }
  if (isDomain('facebook.com') || isDomain('fb.com')) {
    return <Facebook className={className} aria-hidden="true" />
  }
  if (isDomain('x.com') || isDomain('twitter.com')) return <XIcon className={className} />
  if (isDomain('t.me') || isDomain('telegram.me') || isDomain('telegram.org')) {
    return <Send className={className} aria-hidden="true" />
  }
  if (isDomain('whatsapp.com') || isDomain('wa.me')) {
    return <MessageCircle className={className} aria-hidden="true" />
  }
  if (hostname) {
    return <Globe2 className={className} aria-hidden="true" />
  }
  return <Link2 className={className} aria-hidden="true" />
}

export function formatSocialLink(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
}
