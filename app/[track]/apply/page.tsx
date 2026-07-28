import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ApplicationForm from '@/components/residency/application-form'
import { ApplicationProcess } from '@/components/residency/application-process'
import { Header } from '@/components/shared/header'
import { Footer } from '@/components/shared/footer'
import { Button } from '@/components/ui/button'
import { getTrack } from '@/lib/content/tracks'
import { getStartDateOptions } from '@/lib/content/start-dates'
import { TRACK_STATE_NOTICES, COMMUNITY_LINKS } from '@/lib/content/site'

// Start-date options depend on "today" — render per request, not at build time.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ track: string }> }): Promise<Metadata> {
  const track = getTrack((await params).track)
  if (!track) return {}
  return { title: `${track.apply.title} | 4Seas Residency` }
}

export default async function ApplyPage({ params }: { params: Promise<{ track: string }> }) {
  const track = getTrack((await params).track)
  if (!track) notFound()

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-10 md:py-12">
          <h1 className="text-3xl md:text-4xl font-sans font-semibold text-foreground mb-2">{track.apply.title}</h1>
          <p className="text-muted-foreground">{track.apply.subtitle}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {track.state === 'open' ? (
          <>
            <ApplicationProcess />
            <ApplicationForm
              track={{ id: track.id, name: track.name, accentColor: track.accentColor, apply: track.apply }}
              startDateOptions={getStartDateOptions()}
            />
          </>
        ) : (
          <div className="max-w-xl mx-auto text-center py-12">
            <span
              className="inline-block px-4 py-1.5 rounded-full text-sm font-medium border mb-6"
              style={{ color: track.accentColor, borderColor: track.accentColor }}
            >
              {TRACK_STATE_NOTICES[track.state].badge}
            </span>
            <h2 className="text-2xl font-semibold text-foreground mb-3">{TRACK_STATE_NOTICES[track.state].title}</h2>
            <p className="text-muted-foreground mb-8">{TRACK_STATE_NOTICES[track.state].description}</p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" asChild>
                <a href={COMMUNITY_LINKS.telegram} target="_blank" rel="noopener noreferrer">
                  Join Telegram
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/${track.id}`}>Back to {track.name}</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
