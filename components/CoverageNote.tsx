"use client"

import { useFeatureFlags } from './FeatureFlags'

/** "Currently covering …" — claims the US only while US_ENABLED is on */
export default function CoverageNote({ suffix = '' }: { suffix?: string }) {
  const { us } = useFeatureFlags()
  return <>{us ? 'Currently covering Switzerland and the United States' : 'Currently covering Switzerland'}{suffix}</>
}

/** Area rankings stay Swiss-only, so say so once US addresses are searchable */
export function RankingsKind() {
  const { us } = useFeatureFlags()
  return <>{us ? 'Swiss city rankings' : 'city rankings'}</>
}

/** "Swiss address" / "Swiss or US address" for inline copy */
export function AddressKind() {
  const { us } = useFeatureFlags()
  return <>{us ? 'Swiss or US address' : 'Swiss address'}</>
}
