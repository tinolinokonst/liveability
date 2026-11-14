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

/**
 * FracTracker Alliance's U.S. Data Centers Tracker (approved and proposed
 * projects). Off until FracTracker confirms our use fits its Terms of Service:
 * the data has no open licence, the tracker pages say non-commercial use only,
 * and the ToS grants a revocable licence conditioned on supporting its mission.
 * Off: the import skips FracTracker, the API serves PNNL (OpenStreetMap)
 * operating facilities only, and the card reads "Operating data centers
 * nearby". On: operating, approved and proposed projects from both trackers.
 */
export function fracTrackerEnabled(): boolean {
  return process.env.ENABLE_FRACTRACKER === 'true'
}
