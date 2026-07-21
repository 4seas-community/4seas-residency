'use client'

// Site-wide reduced-motion support: users with "reduce motion" enabled get
// content without transform/slide animations (opacity fades remain).
import { MotionConfig } from 'framer-motion'

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
