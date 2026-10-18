// Server-side feature flags. Read from env at request time, so flipping one in
// Vercel takes effect on the next deployment without a code change. Client
// components get them through <FeatureFlagsProvider> (app/layout.tsx).

/**
 * US coverage (Session 1: geocoding + FIPS only, no US metrics yet). Off:
 * Swiss-only autocomplete, geocoding and copy, exactly as before. On: US
 * addresses resolve too, and the copy claims US coverage.
 */
export function usEnabled(): boolean {
  return process.env.US_ENABLED === 'true'
}

/** FOPH radon map. Off until FOPH has seen the screenshots (lib/radon.ts). */
export function radonEnabled(): boolean {
  return process.env.RADON_ENABLED === 'true'
}
