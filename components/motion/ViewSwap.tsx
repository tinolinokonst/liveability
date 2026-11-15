"use client"

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { announceSettled, DURATION, EASE_OUT } from './tokens'

const SHIFT = 16

interface ViewSwapProps {
  /** Changing this swaps the view */
  viewKey: string
  /**
   * Position in a hierarchy (list 0, detail 1, ...). Going deeper slides in
   * from the right, going back from the left. Ignored when `direction` is set.
   */
  depth?: number
  /** Forces the slide direction for this swap: 1 forward, -1 back */
  direction?: 1 | -1
  className?: string
  children: React.ReactNode
}

/**
 * One panel replacing another within a page: a 200 ms crossfade with a slight
 * horizontal slide. The outgoing view is lifted out of the flow while it fades
 * (popLayout), so the incoming one takes its place at once rather than being
 * pushed down. Reduced motion: crossfade only.
 */
export default function ViewSwap({ viewKey, depth = 0, direction, className, children }: ViewSwapProps) {
  const reduce = useReducedMotion()
  const [prev, setPrev] = useState({ key: viewKey, depth })
  const [dir, setDir] = useState<1 | -1>(1)
  if (prev.key !== viewKey) {
    setPrev({ key: viewKey, depth })
    setDir(direction ?? (depth < prev.depth ? -1 : 1))
  }

  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: SHIFT * d }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: -SHIFT * d }),
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.div
          key={viewKey}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: DURATION.swap, ease: EASE_OUT }}
          onAnimationComplete={def => { if (def === 'center') announceSettled() }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
