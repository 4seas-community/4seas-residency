'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface WhatItIsProps {
  description1: string
  description2: string
  highlight: string
}

export function WhatItIs({ description1, description2, highlight }: WhatItIsProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-12 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <motion.h2
            className="text-3xl md:text-4xl font-sans font-semibold text-foreground mb-8"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            What It Is
          </motion.h2>

          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <motion.p
              className="text-pretty"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {description1}
            </motion.p>

            <motion.p
              className="text-pretty"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {description2}
            </motion.p>

            <motion.div
              className="pt-4 border-t border-border"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <p className="text-foreground font-medium text-pretty">{highlight}</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
