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
  'Radon varies from building to building; only a measurement by a recognised radon measurement service is definitive.'

/** BAG's wording, verbatim. Do not edit. */
export const RADON_CONFIDENCE_TEXT =
  'The confidence index is a measure of the reliability of the estimate for this area based on official measurements in the surroundings.'

export const RADON_NO_ESTIMATE = 'No estimate available for this location'

/** Source of the class bands and guidance */
export const RADON_CLASS_SOURCE =
  'Federal Office of Public Health (FOPH/BAG), Radon map of Switzerland; classes per BAG Wegleitung Radon V2.3 (2023)'
export const RADON_WEGLEITUNG_URL = 'https://www.bag.admin.ch/dam/de/sd-web/eYh7M3dNFDW-/wegleitungradon.pdf'
export const RADON_CHECK_URL = 'https://www.bag.admin.ch/de/radonkarte-der-schweiz'

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

// The radon map classes of the BAG Wegleitung Radon V2.3 (2.2.2023), Figure 1 /
// Table 1: probability of exceeding 300 Bq/m³ of ≤ 1 %, 2–10 %, 11–20 %, > 20 %.
// Anything that isn't a percentage (negative, over 100, not a number) gets no
// class at all, so the card says there is no estimate instead of guessing.
export function radonBand(probability: number): RadonBand | null {
  if (!Number.isFinite(probability) || probability < 0 || probability > 100) return null
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

// Guidance per class from the Wegleitung's Tables 1 and 2. The middle classes'
// priority depends on the building, which we don't know, so none is computed.
const DEPENDS_ON_BUILDING =
  'The priority depends on the building. A measurement becomes more important if the building has rooms in contact with the ground where people spend time, a cellar with a natural floor or other obvious leaks to the ground, was built before 1980, or had its envelope sealed during renovation (especially new windows).'

export const RADON_BAND_INFO: Record<RadonBand, { label: string; color: string; guidance: string; radonCheck: boolean }> = {
  very_low: { label: '≤ 1%', color: '#22c55e', guidance: 'Priority 0: a radon measurement can be considered.', radonCheck: false },
  low: { label: '2–10%', color: '#84cc16', guidance: DEPENDS_ON_BUILDING, radonCheck: true },
  moderate: { label: '11–20%', color: '#f59e0b', guidance: DEPENDS_ON_BUILDING, radonCheck: true },
  high: { label: '> 20%', color: '#ef4444', guidance: 'Priority 5: a radon measurement is strongly recommended.', radonCheck: false },
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
