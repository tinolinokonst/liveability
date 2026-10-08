"use client"

import { createContext, useContext } from 'react'

// Country of the current visitor, resolved on the server in app/layout.tsx
// from Vercel's x-vercel-ip-country header. null when unknown (local dev, or
// a request Vercel couldn't geolocate).
const VisitorCountryContext = createContext<string | null>(null)

export function VisitorCountryProvider({
  country,
  children,
}: {
  country: string | null
  children: React.ReactNode
}) {
  return <VisitorCountryContext.Provider value={country}>{children}</VisitorCountryContext.Provider>
}

export function useVisitorCountry(): string | null {
  return useContext(VisitorCountryContext)
}
