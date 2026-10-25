"use client"

import { useEffect, useState } from 'react'
import { communityProvidersFor, dailyLifeProvidersFor, environmentProvidersFor } from '@/lib/providers'
import type {
  GeoLocation,
  UsAirQualityResult,
  UsBroadbandResult,
  UsCommunityResult,
  UsFoodAccessResult,
  UsHealthResult,
  UsNoiseResult,
  UsRentResult,
  UsRisksResult,
  UsSafetyResult,
  UsSchoolsResult,
  UsSunlightResult,
  UsTransitResult,
  UsWalkabilityResult,
  UsWeatherResult,
} from '@/lib/types'

export interface UsResults {
  air: UsAirQualityResult
  weather: UsWeatherResult
  noise: UsNoiseResult
  sunlight: UsSunlightResult
  risks: UsRisksResult
  walk: UsWalkabilityResult
  transit: UsTransitResult
  schools: UsSchoolsResult
  food: UsFoodAccessResult
  broadband: UsBroadbandResult
  health: UsHealthResult
  community: UsCommunityResult
  safety: UsSafetyResult
  rent: UsRentResult
}

/**
 * Every US metric for a location, filled in as each source answers (the
 * fetchers never reject: a failed source arrives as an 'error' result). One
 * set of requests feeds all the cards and the Liveability Score.
 */
export function useUsResults(location: GeoLocation): Partial<UsResults> {
  const [data, setData] = useState<Partial<UsResults>>({})
  const { lat, lng } = location

  useEffect(() => {
    const env = environmentProvidersFor('US')
    const daily = dailyLifeProvidersFor('US')
    const community = communityProvidersFor('US')
    if (!env || !daily || !community) return
    let cancelled = false
    setData({})
    const put = <K extends keyof UsResults>(key: K) => (value: UsResults[K]) => {
      if (!cancelled) setData(prev => ({ ...prev, [key]: value }))
    }
    env.airQuality(lat, lng).then(put('air'))
    env.weather(lat, lng).then(put('weather'))
    env.noise(lat, lng).then(put('noise'))
    env.sunlight(lat, lng).then(put('sunlight'))
    env.risks(lat, lng).then(put('risks'))
    daily.walkability(lat, lng).then(put('walk'))
    daily.transit(lat, lng).then(put('transit'))
    daily.schools(lat, lng).then(put('schools'))
    daily.foodAccess(lat, lng).then(put('food'))
    daily.broadband(lat, lng).then(put('broadband'))
    daily.health(lat, lng).then(put('health'))
    community.community(lat, lng).then(put('community'))
    community.safety(lat, lng).then(put('safety'))
    community.rent(lat, lng).then(put('rent'))
    return () => { cancelled = true }
  }, [lat, lng])

  return data
}
