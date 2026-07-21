'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface QuestionsProps {
  questions: string[]
}

export function Questions({ questions }: QuestionsProps) {
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
          <h2 className="mb-8 font-sans text-3xl font-semibold text-foreground md:text-4xl">Questions We Explore</h2>

          <div className="grid gap-3 md:grid-cols-2">
            {questions.map((question, index) => (
              <motion.div
                key={question}
                className="flex min-h-24 items-start rounded-xl border border-border bg-card p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                whileHover={{ y: -2 }}
              >
                <p className="text-pretty font-sans text-base leading-relaxed text-muted-foreground">{question}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
