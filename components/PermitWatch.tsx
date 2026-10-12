"use client"

import { useEffect, useState } from 'react'
import { HardHat, ExternalLink } from 'lucide-react'
import { fetchPermitsNear, NearbyPermit, setWatch } from '@/lib/savedAddresses'
import { PERMIT_CANTONS, PERMIT_DISCLAIMER, PERMIT_SOURCES, WATCH_RADIUS_M } from '@/lib/permits'
import type { SavedAddress } from '@/lib/types'

const MUTED = '#a0a0a0'
const SUPPORTED_LIST = PERMIT_SOURCES.map(s => s.canton).join(', ')

function cantonOf(saved: SavedAddress): string | undefined {
  return saved.metrics.censusData?.canton
}

/** "Watch for construction nearby" switch on a saved-address card */
export function WatchToggle({ saved, onChange }: { saved: SavedAddress; onChange: (enabled: boolean) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const enabled = !!saved.watch_enabled
  const canton = cantonOf(saved)
  // Unknown canton (older saves): allow it; the job simply finds nothing outside coverage
  const unsupported = !!canton && !PERMIT_CANTONS.has(canton)

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation() // the card itself opens the address
    if (busy || unsupported) return
    setBusy(true)
    setError(false)
    onChange(!enabled) // optimistic
    try {
      await setWatch(saved.id, !enabled)
    } catch {
      onChange(enabled)
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={busy || unsupported}
        onClick={toggle}
        className="flex items-center gap-2.5 text-xs text-left disabled:cursor-not-allowed w-fit"
        style={{ color: unsupported ? '#6b6b6b' : MUTED }}
      >
        <span
          className="relative inline-block w-8 h-[18px] rounded-full transition-colors shrink-0"
          style={{ backgroundColor: enabled ? '#f97316' : '#3a3a3a', opacity: unsupported ? 0.5 : 1 }}
        >
          <span
            className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all"
            style={{ left: enabled ? 16 : 2 }}
          />
        </span>
        <span>
          Watch for construction nearby
          {unsupported && <span className="block text-[11px]">Not yet available in {canton} (currently {SUPPORTED_LIST})</span>}
          {!unsupported && enabled && <span className="block text-[11px]" style={{ color: '#6b6b6b' }}>Email when a building permit is published within {WATCH_RADIUS_M} m</span>}
        </span>
      </button>
      {error && <p className="text-[11px]" style={{ color: '#f87171' }}>Couldn&apos;t change the watch. Please try again.</p>}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "Recent permits nearby" in the saved-address view */
export function PermitsNearby({ saved }: { saved: SavedAddress }) {
  const [permits, setPermits] = useState<NearbyPermit[] | null>(null)
  const [error, setError] = useState(false)
  const canton = cantonOf(saved)
  const unsupported = !!canton && !PERMIT_CANTONS.has(canton)

  useEffect(() => {
    if (unsupported) return
    let cancelled = false
    fetchPermitsNear(saved.lat, saved.lng)
      .then(p => { if (!cancelled) setPermits(p) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [saved.lat, saved.lng, unsupported])

  return (
    <section className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
      <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: MUTED }}>
        <HardHat size={14} /> Recent permits nearby
      </span>

      {unsupported ? (
        <p className="text-sm" style={{ color: MUTED }}>
          Building permits for {canton} aren&apos;t available yet. Currently covered: {SUPPORTED_LIST}.
        </p>
      ) : error ? (
        <p className="text-sm" style={{ color: MUTED }}>Couldn&apos;t load permits right now.</p>
      ) : permits === null ? (
        <div className="h-10 rounded-lg animate-pulse" style={{ backgroundColor: '#2a2a2a' }} aria-label="Loading permits" />
      ) : permits.length === 0 ? (
        <p className="text-sm" style={{ color: MUTED }}>
          No building permits published within {WATCH_RADIUS_M} m in the last 90 days.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[#2a2a2a]">
          {permits.map(p => (
            <li key={p.id} className="py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white font-semibold">{p.project_type}</p>
                <p className="text-xs" style={{ color: MUTED }}>
                  {p.address} · {p.distanceM} m away · {formatDate(p.published_at)}
                </p>
              </div>
              <a
                href={p.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold shrink-0 flex items-center gap-1 pt-0.5"
                style={{ color: '#f97316' }}
              >
                Notice <ExternalLink size={11} />
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] leading-relaxed" style={{ color: '#6b6b6b' }}>
        Source: cantonal official gazettes via amtsblattportal.ch. {PERMIT_DISCLAIMER} Applicants&apos; names are never stored or shown.
      </p>
    </section>
  )
}
