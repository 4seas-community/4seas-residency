import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Hero } from '@/components/residency/hero'
import { WhatItIs } from '@/components/residency/what-it-is'
import { ResidencyCycle } from '@/components/residency/residency-cycle'
import { Themes } from '@/components/residency/themes'
import { Questions } from '@/components/residency/questions'
import { ResidentsBring } from '@/components/residency/residents-bring'
import { Footer } from '@/components/shared/footer'
import { getTrack, TRACK_IDS } from '@/lib/content/tracks'

export function generateStaticParams() {
  return TRACK_IDS.map((track) => ({ track }))
}

export async function generateMetadata({ params }: { params: Promise<{ track: string }> }): Promise<Metadata> {
  const track = getTrack((await params).track)
  if (!track) return {}
  return {
    title: `${track.hero.title} | Chiang Mai`,
    description: track.hero.description,
  }
}

export default async function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const track = getTrack((await params).track)
  if (!track) notFound()

  const applyHref = `/residency/${track.id}/apply`

  return (
    <main className="min-h-screen">
      <Hero
        title={track.hero.title}
        tagline={track.hero.tagline}
        description={track.hero.description}
        image={track.image}
        accentColor={track.accentColor}
        applyHref={applyHref}
        state={track.state}
      />
      <WhatItIs {...track.whatItIs} />
      <ResidencyCycle accentColor={track.accentColor} applyHref={applyHref} state={track.state} />
      <Themes themes={track.themes} accentColor={track.accentColor} />
      <Questions questions={track.questions} />
      <ResidentsBring
        items={track.residentsBring}
        accentColor={track.accentColor}
        longevityExtras={track.longevityExtras}
      />
      <Footer />
    </main>
  )
}
