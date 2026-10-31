"use client"

import { useFeatureFlags } from './FeatureFlags'

/** "Currently covering …" — claims the US only while US_ENABLED is on */
export default function CoverageNote({ suffix = '' }: { suffix?: string }) {
  const { us } = useFeatureFlags()
  return <>{us ? 'Currently covering Switzerland and the United States' : 'Currently covering Switzerland'}{suffix}</>
}

/**
 * What can be searched and browsed. Area rankings stay Swiss-only; in the US,
 * AI Match suggests neighborhoods from its own pool instead.
 */
export function BrowseKind() {
  const { us } = useFeatureFlags()
  return (
    <>
      {us
        ? 'Search any Swiss or US address, browse Swiss area rankings, or let AI Match suggest neighborhoods in either country'
        : 'Search any Swiss address or browse city rankings'}
    </>
  )
}

/** "Swiss address" / "Swiss or US address" for inline copy */
export function AddressKind() {
  const { us } = useFeatureFlags()
  return <>{us ? 'Swiss or US address' : 'Swiss address'}</>
}
