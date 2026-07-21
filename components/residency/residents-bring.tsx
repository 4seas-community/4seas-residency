'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Heart, Cpu, Palette, type LucideIcon } from 'lucide-react'
import type { TrackConfig } from '@/lib/content/tracks'

interface ResidentsBringProps {
  items: string[]
  accentColor: string
  longevityExtras?: TrackConfig['longevityExtras']
}

const GROUP_ICONS: LucideIcon[] = [Heart, Cpu, Palette]

export function ResidentsBring({ items, accentColor, longevityExtras }: ResidentsBringProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  // Longevity uses a multi-section layout unique to this track
  if (longevityExtras) {
    return (
      <section ref={ref} className="px-4 md:px-8">
        <div className="max-w-4xl mx-auto space-y-20 py-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-sans font-semibold text-foreground mb-8">
              Who We Are Looking For
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {longevityExtras.groups.map((group, index) => {
                const Icon = GROUP_ICONS[index % GROUP_ICONS.length]
                return (
                  <motion.div
                    key={group.title}
                    className="p-6 rounded-xl border border-border bg-card"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Icon size={18} style={{ color: accentColor }} strokeWidth={1.5} />
                      <h3 className="text-lg font-semibold leading-tight text-foreground">{group.title}</h3>
                    </div>
                    <p className="mb-3 text-sm italic leading-relaxed text-muted-foreground">{group.subtitle}</p>
                    <p className="text-pretty text-base leading-relaxed text-foreground">{group.description}</p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <h2 className="text-3xl md:text-4xl font-sans font-semibold text-foreground mb-3">
              What You Give in Return
            </h2>
            <p className="mb-8 text-pretty text-lg leading-relaxed text-muted-foreground">
              {longevityExtras.giveBackIntro}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {longevityExtras.giveBack.map((item, index) => (
                <motion.div
                  key={item}
                  className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.06 }}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                >
                  <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
                  <p className="text-pretty text-base leading-relaxed text-foreground">{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <section ref={ref} className="py-12 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl font-sans font-semibold text-foreground mb-8">
            What Residents May Bring
          </h2>

          <p className="text-lg text-muted-foreground mb-8 leading-relaxed text-pretty">
            Residents may contribute in different ways:
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            {items.map((item, index) => (
              <motion.span
                key={item}
                className="px-4 py-2 bg-secondary rounded-full text-secondary-foreground text-sm cursor-default"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: index * 0.03 }}
                whileHover={{
                  scale: 1.08,
                  backgroundColor: accentColor,
                  color: '#ffffff',
                  transition: { duration: 0.2 },
                }}
                whileTap={{ scale: 0.95 }}
              >
                {item}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
