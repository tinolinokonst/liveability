"use client"

import { useEffect, useState } from 'react'
import { MapPin, X } from 'lucide-react'
import { useVisitorCountry } from '@/components/VisitorCountry'
import { useFeatureFlags } from '@/components/FeatureFlags'

// Session storage, not local storage: the privacy and cookie policies promise
// nothing persistent is written to the browser. Dismissing hides the note for
// the rest of this tab.
const LIVE_DISMISS_KEY = 'liveability:us-live-dismissed'

function LiveNote({ className }: { className: string }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    let dismissed = false
    try { dismissed = sessionStorage.getItem(LIVE_DISMISS_KEY) === '1' } catch { /* storage blocked: show it */ }
    setVisible(!dismissed)
  }, [])
  if (!visible) return null
  return (
    <section
      aria-label="Now live in the US"
      className={`relative rounded-2xl p-4 sm:p-5 ${className}`}
      style={{ backgroundColor: '#1a1a1a', border: '1px solid #f9731640' }}
    >
      <button
        onClick={() => {
          try { sessionStorage.setItem(LIVE_DISMISS_KEY, '1') } catch { /* hides until reload */ }
          setVisible(false)
        }}
        aria-label="Dismiss"
        className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors hover:bg-[#2a2a2a]"
        style={{ color: '#a0a0a0' }}
      >
        <X size={15} />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f973161a', color: '#f97316' }}>
          <MapPin size={15} />
        </span>
        <div>
          <p className="text-white font-semibold">Now live in the US</p>
          <p className="text-sm mt-0.5" style={{ color: '#a0a0a0' }}>
            Search any US address for its Liveability Score, monthly budget, transit, schools, safety, flood risk and more.
          </p>
        </div>
      </div>
    </section>
  )
}

/**
 * "Now live in the US" note for visitors in the US while US coverage is on.
 * Renders nothing for anyone else, or when the country is unknown. (It
 * replaced the pre-launch US waitlist, which is closed.)
 */
export default function UsLiveBanner({ className = '' }: { className?: string }) {
  const country = useVisitorCountry()
  const { us } = useFeatureFlags()
  return us && country === 'US' ? <LiveNote className={className} /> : null
}
