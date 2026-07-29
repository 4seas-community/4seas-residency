'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { TRACKS, TRACK_IDS } from '@/lib/content/tracks'
import { COMMUNITY_LINKS } from '@/lib/content/site'

export function Header() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navLinks = [
    { href: '/', label: 'General' },
    ...TRACK_IDS.map((id) => ({ href: `/${id}`, label: TRACKS[id].name })),
  ]

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
      <div className="w-full px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
        <a href={COMMUNITY_LINKS.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
          <img src="/images/4seas-logo.png" alt="4Seas" className="h-6 md:h-8 w-auto" />
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${pathname === link.href ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block w-[100px]" />

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 -mr-2 text-foreground"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="flex flex-col py-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`px-4 py-3 text-sm transition-colors ${pathname === link.href ? 'text-foreground font-medium bg-muted/50' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
