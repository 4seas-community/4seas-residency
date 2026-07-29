import { COMMUNITY_LINKS } from '@/lib/content/site'
import { formatSocialLink, SocialPlatformIcon } from '@/components/shared/social-platform-icon'

export function Footer() {
  return (
    <footer className="py-12 px-4 md:px-8 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 md:gap-4 flex-wrap justify-center">
            <a href={COMMUNITY_LINKS.website} target="_blank" rel="noopener noreferrer">
              <img src="/images/4seas-logo.png" alt="4Seas" className="h-7 w-auto" />
            </a>
            <span className="text-muted-foreground/50">|</span>
            <a href={COMMUNITY_LINKS.website} target="_blank" rel="noopener noreferrer">
              <img src="/images/zuzalu-library-logo.png" alt="Zuzalu Library" className="h-7 w-auto" />
            </a>
            <span className="text-muted-foreground/50">|</span>
            <a href={COMMUNITY_LINKS.ethchiangmai} target="_blank" rel="noopener noreferrer">
              <img src="/images/ethchiangmai-logo.png" alt="ETHChiangmai" className="h-5 w-auto" />
            </a>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-sm text-muted-foreground">
            <a
              href={COMMUNITY_LINKS.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <SocialPlatformIcon url={COMMUNITY_LINKS.telegram} />
              {formatSocialLink(COMMUNITY_LINKS.telegram)}
            </a>
            <a
              href={COMMUNITY_LINKS.x}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <SocialPlatformIcon url={COMMUNITY_LINKS.x} />
              {formatSocialLink(COMMUNITY_LINKS.x)}
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} 4Seas. Chiang Mai, Thailand.</p>
        </div>
      </div>
    </footer>
  )
}
