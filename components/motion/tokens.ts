// One set of timings and curves for every transition in the app. Change them
// here, not per screen.

export const EASE_OUT = [0.22, 1, 0.36, 1] as const

export const DURATION = {
  backdrop: 0.15,
  panel: 0.22,
  swap: 0.2,
  expand: 0.22,
  stagger: 0.04,
  /** The last staggered card starts by this, so a full grid is in within ~400 ms */
  staggerCap: 0.18,
  fade: 0.22,
} as const

/** Panel motion for modals and popovers: fade + scale from 0.97, rising 8px */
export function panelMotion(reduce: boolean | null) {
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }
  return {
    initial: hidden,
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: hidden,
    transition: { duration: DURATION.panel, ease: EASE_OUT },
  }
}

// Leaflet measures its container when it mounts; a map inside a panel that is
// still animating must re-measure once the animation ends, or tiles stay grey.
// Every primitive announces the end of an enter animation; MetricInfoMap
// listens and calls invalidateSize().
export const MOTION_SETTLED_EVENT = 'lv:motion-settled'

export function announceSettled(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(MOTION_SETTLED_EVENT))
}
