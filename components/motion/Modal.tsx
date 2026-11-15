"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { announceSettled, DURATION, panelMotion } from './tokens'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface ModalProps {
  /** Called once the close animation has finished */
  onClose: () => void
  /** Content, or a function given `close` (which plays the exit animation first) */
  children: React.ReactNode | ((close: () => void) => React.ReactNode)
  panelClassName?: string
  panelStyle?: React.CSSProperties
  ariaLabelledBy?: string
  ariaLabel?: string
}

/**
 * Every popup's shell. Backdrop fades in (150 ms); the panel fades, scales up
 * from 0.97 and rises 8px (220 ms, ease-out); closing reverses both. Reduced
 * motion: fades only.
 *
 * Callers render it conditionally ({open && <Modal/>}) and are told to unmount
 * through onClose after the exit animation, so no call site needs its own
 * AnimatePresence. Rendered in a portal, so no transformed ancestor can trap it.
 * Focus moves into the panel, Tab stays inside, Escape and the backdrop close
 * it, and focus returns to whatever opened it.
 */
export default function Modal({ onClose, children, panelClassName, panelStyle, ariaLabelledBy, ariaLabel }: ModalProps) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const close = useCallback(() => setOpen(false), [])

  // Focus in on open, back to the opener on unmount
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.focus({ preventScroll: true })
    return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }) }
  }, [])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { close(); return }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null)
      if (!items.length) { e.preventDefault(); return }
      const first = items[0], last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panelRef.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  const panel = panelMotion(reduce)

  return createPortal(
    <AnimatePresence onExitComplete={() => onCloseRef.current()}>
      {open && (
        <motion.div
          key="modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          // Stays until the panel's own exit has finished
          exit={{ opacity: 1, transition: { duration: DURATION.panel } }}
        >
          <motion.div
            aria-hidden
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.backdrop }}
            onClick={close}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={ariaLabelledBy}
            aria-label={ariaLabel}
            tabIndex={-1}
            className={`relative outline-none ${panelClassName ?? ''}`}
            style={panelStyle}
            {...panel}
            onAnimationComplete={() => { if (open) announceSettled() }}
          >
            {typeof children === 'function' ? children(close) : children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
