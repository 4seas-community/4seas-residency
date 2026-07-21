'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/shared/header'
import type { TrackState } from '@/lib/content/tracks'
import { TRACK_STATE_NOTICES } from '@/lib/content/site'

interface HeroProps {
  title: string
  tagline: string
  description: string
  image: string
  accentColor: string
  applyHref: string
  state: TrackState
}

export function Hero({ title, tagline, description, image, accentColor, applyHref, state }: HeroProps) {
  return (
    <section className="relative min-h-[50vh] md:min-h-[60vh] flex items-center justify-center overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-20">
        <Header />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          <img src={image} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80" />
        </motion.div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center px-4 py-12 md:py-20">
        <motion.h1
          className="text-4xl md:text-6xl lg:text-7xl font-sans font-semibold tracking-tight text-foreground mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <span className="text-balance">{title}</span>
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl text-muted-foreground font-light mb-8 text-pretty"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {tagline}
        </motion.p>

        <motion.p
          className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {description}
        </motion.p>

        <motion.div
          className="mt-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {state === 'open' ? (
            <Button
              size="lg"
              className="text-lg px-8 py-3 h-auto rounded-full group hover:scale-105 transition-transform text-white"
              style={{ backgroundColor: accentColor }}
              asChild
            >
              <Link href={applyHref} className="flex items-center">
                Apply Now
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          ) : (
            <span
              className="inline-block px-6 py-2.5 rounded-full text-base font-medium border"
              style={{ color: accentColor, borderColor: accentColor }}
            >
              {TRACK_STATE_NOTICES[state].badge}
            </span>
          )}
        </motion.div>
      </div>
    </section>
  )
}
