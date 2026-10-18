// Radon risk from the FOPH/BAG Swiss Radon Map (geo.admin.ch layer
// ch.bag.radonkarte): for each 1×1 km pixel, the probability that a building
// exceeds the reference value of 300 Bq/m³, plus a confidence index.
//
// Used with FOPH's written permission, on two conditions: the exact
// attribution below, and screenshots sent to FOPH before publication — which
// is why the feature is off unless RADON_ENABLED=true (lib/flags.ts).
//
// It is an area statistic. It never says anything about one specific
// building, and the wording everywhere must keep it that way.

/** Required by FOPH, character for character. Do not edit, translate or reformat. */
export const RADON_ATTRIBUTION = 'Source: Federal Office of Public Health, 2025 (Quelle: Bundesamt für Gesundheit, 2025)'

export const RADON_NOTE =
  'Radon levels vary from building to building — only a measurement can determine the radon concentration in a specific home.'

export const RADON_INFO_URL =
  'https://www.bag.admin.ch/bag/de/home/gesund-leben/umwelt-und-gesundheit/strahlung-radioaktivitaet-schall/radon/radongebiete-ch.html'
export const RADON_MEASUREMENT_URL = 'https://www.ch-radon.ch'

export type RadonBand = 'very_low' | 'low' | 'moderate' | 'high'
export type RadonConfidence = 'high' | 'medium' | 'low' | 'very_low'

export interface RadonResult {
  status: 'ok' | 'no_data' | 'error'
  /** Percent, 0–100; null unless status is 'ok' */
  probability: number | null
  band: RadonBand | null
  confidence: RadonConfidence | null
  /** The 1 km pixel outline as [lat, lng] */
  pixel?: [number, number][]
}

// FOPH's own legend classes for the map: ≤1 %, 2–10 %, 11–20 %, >20 %
export function radonBand(probability: number): RadonBand {
  if (probability <= 1) return 'very_low'
  if (probability <= 10) return 'low'
  if (probability <= 20) return 'moderate'
  return 'high'
}

// geo.admin.ch's own labelling of the raw confidence value (lower = more
// reliable), from its popup template for this layer (geoadmin/mf-chsdi3,
// chsdi/templates/htmlpopup/radonkarte.mako): ≤1000 high, ≤5000 medium,
// ≤10000 low, above that very low
export function radonConfidence(raw: number): RadonConfidence {
  if (raw <= 1000) return 'high'
  if (raw <= 5000) return 'medium'
  if (raw <= 10000) return 'low'
  return 'very_low'
}

export const RADON_BAND_INFO: Record<RadonBand, { label: string; color: string; range: string }> = {
  very_low: { label: 'Very low', color: '#22c55e', range: '≤ 1 %' },
  low: { label: 'Low', color: '#84cc16', range: '2–10 %' },
  moderate: { label: 'Moderate', color: '#f59e0b', range: '11–20 %' },
  high: { label: 'High', color: '#ef4444', range: '> 20 %' },
}

export const RADON_CONFIDENCE_LABEL: Record<RadonConfidence, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  very_low: 'Very low',
}

// Penalty only, like the other risks: a high-probability area lowers the
// score a little (radon is common and fixable, and this is an area figure,
// not the home); no data never changes it
const RADON_PENALTY: Record<RadonBand, number> = { very_low: 0, low: 0, moderate: 2, high: 5 }

export function radonPenalty(r: RadonResult | undefined): number {
  return r?.status === 'ok' && r.band ? RADON_PENALTY[r.band] : 0
}

export async function fetchRadon(lat: number, lng: number): Promise<RadonResult | undefined> {
  try {
    const res = await fetch(`/api/radon?lat=${lat}&lng=${lng}`)
    // 404 = feature switched off on the server: behave as if it doesn't exist
    if (res.status === 404) return undefined
    if (!res.ok) return { status: 'error', probability: null, band: null, confidence: null }
    return await res.json()
  } catch {
    return { status: 'error', probability: null, band: null, confidence: null }
  }
}
