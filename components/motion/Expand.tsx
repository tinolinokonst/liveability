"use client"

import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { announceSettled, DURATION, EASE_OUT } from './tokens'

/**
 * Animates its own height to follow its content, so a box that grows or
 * shrinks (a form switching views, a section opening) eases to its new size
 * instead of jumping. Clips only while animating, so focus rings and popovers
 * aren't cut off at rest. Reduced motion: the size changes at once.
 */
export default function Expand({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  const innerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')
  const [animating, setAnimating] = useState(false)

  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <motion.div
      className={className}
      initial={false}
      animate={{ height }}
      transition={reduce ? { duration: 0 } : { duration: DURATION.expand, ease: EASE_OUT }}
      style={{ overflow: animating ? 'hidden' : 'visible' }}
      onAnimationStart={() => setAnimating(true)}
      onAnimationComplete={() => { setAnimating(false); announceSettled() }}
    >
      {/* flow-root: child margins stay inside, so the measured height is the real one */}
      <div ref={innerRef} className="flow-root">{children}</div>
    </motion.div>
  )
}
