'use client'

import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Calendar, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TrackState } from '@/lib/content/tracks'

interface ResidencyCycleProps {
  accentColor: string
  applyHref: string
  state: TrackState
}

export function ResidencyCycle({ accentColor, applyHref, state }: ResidencyCycleProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-12 px-4 md:px-8 bg-secondary/30">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-sm"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-xl" style={{ backgroundColor: `${accentColor}20` }}>
              <Calendar className="w-6 h-6" style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-sans font-semibold text-foreground mb-2 flex items-center gap-3">
                Residency Cycle
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
              </h2>
              <p className="text-muted-foreground text-pretty">Flexible start dates designed around your schedule</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <motion.div
              className="p-6 bg-background rounded-xl border border-border"
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Start Dates</p>
              <p className="text-2xl font-semibold text-foreground">1st & 15th</p>
              <p className="text-muted-foreground mt-1">of every month</p>
            </motion.div>
            <motion.div
              className="p-6 bg-background rounded-xl border border-border"
              initial={{ opacity: 0, x: 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Duration</p>
              <p className="text-2xl font-semibold text-foreground">1 Month</p>
              <p className="text-muted-foreground mt-1">Full residency experience</p>
            </motion.div>
          </div>

          {state === 'open' && (
            <Button size="lg" className="w-full md:w-auto rounded-full group text-white" style={{ backgroundColor: accentColor }} asChild>
              <Link href={applyHref}>
                Apply Now
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          )}
        </motion.div>
      </div>
    </section>
  )
}
