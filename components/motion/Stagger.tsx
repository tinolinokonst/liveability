"use client"

import { Children, createContext, isValidElement, useContext, useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { DURATION, EASE_OUT } from './tokens'

// Cards arriving within this long of the results first rendering join the
// stagger; anything later (a slow source answering) just fades in
const STAGGER_WINDOW_MS = 600

interface Scope { claim: () => number | null }
const StaggerContext = createContext<Scope | null>(null)

/**
 * Wrap a results view: every StaggerItem / StaggerGrid card inside fades and
 * rises in 40 ms after the one before, in document order, capped so the whole
 * set is in within ~400 ms.
 */
export function StaggerScope({ children }: { children: React.ReactNode }) {
  const state = useRef<{ start: number | null; next: number }>({ start: null, next: 0 })
  const [scope] = useState<Scope>(() => ({
    claim: () => {
      const s = state.current
      const now = performance.now()
      if (s.start === null) s.start = now
      if (now - s.start > STAGGER_WINDOW_MS) return null
      return s.next++
    },
  }))
  return <StaggerContext.Provider value={scope}>{children}</StaggerContext.Provider>
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  const scope = useContext(StaggerContext)
  const [delay, setDelay] = useState<number | null>(null)

  // Layout effects run in document order, so claiming here numbers the cards
  // top to bottom, and before the first paint, so nothing flashes
  useLayoutEffect(() => {
    const i = scope?.claim() ?? null
    setDelay(i === null ? 0 : Math.min(i * DURATION.stagger, DURATION.staggerCap))
  }, [scope])

  const hidden = reduce ? { opacity: 0 } : { opacity: 0, y: 6 }
  return (
    <motion.div
      className={className}
      initial={hidden}
      animate={delay === null ? hidden : { opacity: 1, y: 0 }}
      transition={{ duration: DURATION.fade, ease: EASE_OUT, delay: delay ?? 0 }}
    >
      {children}
    </motion.div>
  )
}

/** A grid whose cards stagger in; each card still fills its grid cell */
export function StaggerGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {Children.toArray(children).map((child, i) => (
        <StaggerItem key={isValidElement(child) && child.key != null ? child.key : i} className="min-w-0 [&>*]:h-full">
          {child}
        </StaggerItem>
      ))}
    </div>
  )
}
