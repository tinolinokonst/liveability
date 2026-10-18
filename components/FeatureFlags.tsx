"use client"

import { createContext, useContext } from 'react'

// Server-side flags (lib/flags.ts), resolved in app/layout.tsx and handed to
// client components. Defaults are all off.
export interface FeatureFlags {
  radon: boolean
  /** US coverage (US_ENABLED) */
  us: boolean
}

const FeatureFlagsContext = createContext<FeatureFlags>({ radon: false, us: false })

export function FeatureFlagsProvider({ flags, children }: { flags: FeatureFlags; children: React.ReactNode }) {
  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>
}

export function useFeatureFlags(): FeatureFlags {
  return useContext(FeatureFlagsContext)
}
