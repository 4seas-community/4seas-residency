'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface ThemesProps {
  themes: string[]
  accentColor: string
}

export function Themes({ themes, accentColor }: ThemesProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-12 px-4 md:px-8 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl font-sans font-semibold text-foreground mb-8">Themes We Care About</h2>

          <div className="flex flex-wrap gap-3 mb-8">
            {themes.map((theme, index) => (
              <motion.span
                key={theme}
                className="px-5 py-2.5 bg-card border border-border rounded-full text-foreground text-sm font-medium cursor-default"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: index * 0.04 }}
                whileHover={{
                  scale: 1.05,
                  backgroundColor: accentColor,
                  color: '#ffffff',
                  borderColor: accentColor,
                  transition: { duration: 0.2 },
                }}
                whileTap={{ scale: 0.95 }}
              >
                {theme}
              </motion.span>
            ))}
          </div>

          <motion.p
            className="text-lg text-muted-foreground italic"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            These are not fixed categories. They are invitations.
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
