"use client"

import { useEffect, useState } from 'react'
import { track } from '@vercel/analytics'
import { Check, MapPin, X } from 'lucide-react'
import { useVisitorCountry } from '@/components/VisitorCountry'
import {
  EMAIL_PATTERN,
  MAX_CITY_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_NOTES_LENGTH,
  US_STATES,
} from '@/lib/waitlist'

// Session storage, not local storage: the privacy and cookie policies promise
// nothing persistent is written to the browser. Dismissing (or signing up)
// hides the banner for the rest of this tab.
const DISMISS_KEY = 'liveability:us-waitlist-dismissed'

type Status = 'idle' | 'sending' | 'sent' | 'error'

// No width here: callers set it, so a fixed width isn't fighting w-full
const INPUT_CLASS =
  'px-3 py-2.5 rounded-xl text-base sm:text-sm text-white outline-none focus:ring-2 focus:ring-[#f97316] disabled:opacity-50 placeholder:text-[#6b6b6b]'
const INPUT_STYLE = { backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }

/**
 * Waitlist prompt for visitors outside Switzerland, to gauge US demand.
 * Renders nothing for Swiss visitors or when the country is unknown.
 */
export default function UsWaitlistBanner({ className = '' }: { className?: string }) {
  const country = useVisitorCountry()
  const eligible = country !== null && country !== 'CH'

  // Hidden until mounted so a banner dismissed earlier in this tab doesn't
  // flash in during hydration
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!eligible) return
    let dismissed = false
    try { dismissed = sessionStorage.getItem(DISMISS_KEY) === '1' } catch { /* storage blocked: show it */ }
    setVisible(!dismissed)
  }, [eligible])

  function rememberDismissed() {
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* storage blocked: hides until reload */ }
  }

  function dismiss() {
    rememberDismissed()
    setVisible(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    setErrorMessage('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, city, state, notes }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setErrorMessage(
          res.status === 429
            ? 'Too many attempts. Please try again later.'
            : data?.error ?? 'Could not join the waitlist. Please try again.'
        )
        setStatus('error')
        return
      }
      // City and state only — the email never goes to analytics
      track('waitlist_signup', { city: city.trim(), state })
      rememberDismissed()
      setStatus('sent')
    } catch {
      setErrorMessage('Could not join the waitlist. Please try again.')
      setStatus('error')
    }
  }

  if (!eligible || !visible) return null

  const canSubmit =
    EMAIL_PATTERN.test(email.trim()) && city.trim().length > 0 && state !== '' && status !== 'sending'

  return (
    <section
      aria-label="US waitlist"
      className={`relative rounded-2xl p-4 sm:p-5 ${className}`}
      style={{ backgroundColor: '#1a1a1a', border: '1px solid #f9731640' }}
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss US waitlist"
        className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors hover:bg-[#2a2a2a]"
        style={{ color: '#a0a0a0' }}
      >
        <X size={15} />
      </button>

      {status === 'sent' ? (
        <div className="flex items-start gap-3 pr-8">
          <span
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: '#f973161a' }}
          >
            <Check size={15} style={{ color: '#f97316' }} />
          </span>
          <div>
            <p className="text-white font-bold text-sm sm:text-base">You&apos;re on the list.</p>
            <p className="text-sm mt-0.5" style={{ color: '#a0a0a0' }}>
              We&apos;ll email you once when Liveability launches in the US — nothing else.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 pr-8">
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: '#f973161a' }}
            >
              <MapPin size={15} style={{ color: '#f97316' }} />
            </span>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm sm:text-base">Liveability is coming to the US.</p>
              <p className="text-sm mt-0.5" style={{ color: '#a0a0a0' }}>
                Which city are you moving to?
              </p>
            </div>
          </div>

          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="mt-4 w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#f97316' }}
            >
              Join the waitlist
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
              <label className="sr-only" htmlFor="waitlist-email">Email</label>
              <input
                id="waitlist-email"
                type="email"
                autoComplete="email"
                required
                maxLength={MAX_EMAIL_LENGTH}
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={status === 'sending'}
                className={`${INPUT_CLASS} w-full`}
                style={INPUT_STYLE}
              />
              <div className="flex gap-3">
                <label className="sr-only" htmlFor="waitlist-city">City</label>
                <input
                  id="waitlist-city"
                  type="text"
                  autoComplete="address-level2"
                  required
                  maxLength={MAX_CITY_LENGTH}
                  placeholder="City"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  disabled={status === 'sending'}
                  className={`${INPUT_CLASS} min-w-0 flex-1`}
                  style={INPUT_STYLE}
                />
                <label className="sr-only" htmlFor="waitlist-state">State</label>
                <select
                  id="waitlist-state"
                  required
                  value={state}
                  onChange={e => setState(e.target.value)}
                  disabled={status === 'sending'}
                  className={`${INPUT_CLASS} w-28 sm:w-44 shrink-0`}
                  style={{ ...INPUT_STYLE, color: state ? '#ffffff' : '#6b6b6b' }}
                >
                  <option value="" disabled>State</option>
                  {US_STATES.map(s => (
                    <option key={s.code} value={s.code} style={{ color: '#ffffff' }}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="text-xs" style={{ color: '#a0a0a0' }} htmlFor="waitlist-notes">
                What matters most to you? <span style={{ color: '#6b6b6b' }}>(optional)</span>
              </label>
              <textarea
                id="waitlist-notes"
                rows={2}
                maxLength={MAX_NOTES_LENGTH}
                placeholder="Schools, commute, safety, quiet streets…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={status === 'sending'}
                className={`${INPUT_CLASS} w-full -mt-1 resize-none`}
                style={INPUT_STYLE}
              />
              {status === 'error' && (
                <p className="text-xs" style={{ color: '#f87171' }}>{errorMessage}</p>
              )}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs" style={{ color: '#6b6b6b' }}>
                  Used only to tell you about the US launch. Never shared.
                </p>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#f97316' }}
                >
                  {status === 'sending' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Notify me'
                  )}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  )
}
