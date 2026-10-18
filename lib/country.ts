// Countries Liveability covers, and the per-country display conventions.
//
// The country of an address comes from the geocoder (Google's country
// component), not from the user. Everything country-specific — data
// providers (lib/providers.ts), currency, distance units — keys off it.
// Switzerland is the default wherever older data has no country recorded,
// so existing saved addresses and Swiss behaviour are unchanged.

import { formatDistance as formatKm } from './format'

export type CountryCode = 'CH' | 'US'

export interface CountryConfig {
  code: CountryCode
  name: string
  currency: 'CHF' | 'USD'
  distanceUnit: 'km' | 'mi'
  /** Number/currency formatting locale */
  locale: string
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  CH: { code: 'CH', name: 'Switzerland', currency: 'CHF', distanceUnit: 'km', locale: 'de-CH' },
  US: { code: 'US', name: 'United States', currency: 'USD', distanceUnit: 'mi', locale: 'en-US' },
}

export function isCountryCode(v: unknown): v is CountryCode {
  return v === 'CH' || v === 'US'
}

// Generous boxes, only for inferring the country of coordinates that came
// without one (e.g. older saved addresses). Never used to validate input.
const BOXES: Record<CountryCode, Array<{ minLat: number; maxLat: number; minLng: number; maxLng: number }>> = {
  CH: [{ minLat: 45.7, maxLat: 47.9, minLng: 5.8, maxLng: 10.6 }],
  US: [
    { minLat: 24.3, maxLat: 49.5, minLng: -125, maxLng: -66.8 }, // contiguous states
    { minLat: 51, maxLat: 71.6, minLng: -180, maxLng: -129.9 }, // Alaska
    { minLat: 18.8, maxLat: 22.4, minLng: -160.5, maxLng: -154.7 }, // Hawaii
  ],
}

export function countryFromCoords(lat: number, lng: number): CountryCode | null {
  for (const code of ['CH', 'US'] as const) {
    if (BOXES[code].some(b => lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng)) return code
  }
  return null
}

/** The country of a location, falling back to Switzerland for older data */
export function countryOf(location: { country?: CountryCode; lat: number; lng: number } | undefined): CountryCode {
  if (!location) return 'CH'
  return location.country ?? countryFromCoords(location.lat, location.lng) ?? 'CH'
}

// ─── units and currency ──────────────────────────────────────────────────────

const KM_PER_MILE = 1.609344
const FEET_PER_MILE = 5280

/**
 * Distance for display in the country's unit. Switzerland uses the existing
 * metric formatter unchanged. US: feet below 0.1 mi (rounded to 50 ft —
 * coordinates are building centroids, so finer is false precision), miles
 * with one decimal above.
 */
export function formatDistanceFor(km: number | null | undefined, country: CountryCode = 'CH'): string {
  if (country === 'CH') return formatKm(km)
  if (km == null || !Number.isFinite(km)) return '—'
  const miles = km / KM_PER_MILE
  if (miles < 0.1) {
    const feet = Math.round((miles * FEET_PER_MILE) / 50) * 50
    return feet < 50 ? '<50 ft' : `${feet} ft`
  }
  return `${Math.round(miles * 10) / 10} mi`
}

/** Whole-unit money in the country's currency: "CHF 2,450" / "$2,450" */
export function formatMoney(amount: number, country: CountryCode = 'CH'): string {
  const { locale, currency } = COUNTRIES[country]
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}
