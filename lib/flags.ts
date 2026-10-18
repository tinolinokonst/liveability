// Server-side feature flags. Read from env at request time, so flipping one in
// Vercel takes effect on the next deployment without a code change. Client
// components get them through <FeatureFlagsProvider> (app/layout.tsx).

/** FOPH radon map. Off until FOPH has seen the screenshots (lib/radon.ts). */
export function radonEnabled(): boolean {
  return process.env.RADON_ENABLED === 'true'
}
