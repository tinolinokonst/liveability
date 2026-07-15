import { AmenityPlaces } from './types'

export type MetricKey =
  | 'aqi'
  | 'walkability'
  | 'grocery'
  | 'transit'
  | 'green'
  | 'safety'
  | 'healthcare'
  | 'school'
  | 'dining'
  | 'library'
  | 'bank'
  | 'worship'
  | 'parking'
  | 'sunlight'
  | 'noise'
  | 'demographics'
  | 'census'

// AQI category colors (US EPA category names)
export function aqiColor(category: string): string {
  switch (category) {
    case 'Good': return '#22c55e'
    case 'Moderate': return '#eab308'
    case 'Unhealthy for Sensitive Groups': return '#f97316'
    case 'Unhealthy': return '#ef4444'
    case 'Very Unhealthy': return '#a855f7'
    case 'Hazardous': return '#7f1d1d'
    default: return '#a0a0a0'
  }
}

export interface MetricInfo {
  label: string
  description: string
  source: string
  sourceUrl: string
  placesKey?: keyof AmenityPlaces
}

export const METRIC_INFO: Record<MetricKey, MetricInfo> = {
  aqi: {
    label: 'Air Quality (AQI)',
    description:
      "An air quality index computed from the Swiss Federal Office for the Environment's (BAFU) annual air pollution modeling, sampled at the exact coordinate: PM2.5, PM10, NO₂, and ozone concentrations are compared against the Swiss Ordinance on Air Pollution Control limit values. An index of 50 corresponds to pollution at the Swiss legal limits; lower numbers mean cleaner air and a higher score. Falls back to Open-Meteo real-time data when the BAFU layers are unavailable.",
    source: 'Swiss Federal Office for the Environment (BAFU)',
    sourceUrl: 'https://www.bafu.admin.ch/bafu/en/home/topics/air.html',
  },
  walkability: {
    label: 'Walkability',
    description:
      "This score is an average of the grocery, transit, and green-space scores, which together reflect how many daily errands and destinations are reachable on foot. A higher score means more amenities are clustered within walking distance of this address.",
    source: 'OpenStreetMap (Overpass)',
    sourceUrl: 'https://www.openstreetmap.org',
  },
  grocery: {
    label: 'Grocery Access',
    description:
      "Counts supermarkets, grocery stores, convenience stores, and food shops within the selected radius. The score is scaled so that 5 or more such stores nearby earns a perfect score, reflecting easy access to food shopping.",
    source: 'OpenStreetMap (Overpass)',
    sourceUrl: 'https://www.openstreetmap.org',
    placesKey: 'grocery',
  },
  transit: {
    label: 'Transit Access',
    description:
      "Live Swiss public transport data: the nearest stations, their distance, and real upcoming departures. The score combines distance to the nearest station (a station within ~100m scores the full 60 distance points, fading to 0 at 1km) with departure frequency (12+ departures in the next hour earns the full 40 frequency points). Switzerland's dense network justifies this more generous scale than a stop-count approach.",
    source: 'transport.opendata.ch / Swiss public transport',
    sourceUrl: 'https://transport.opendata.ch/',
    placesKey: 'transit',
  },
  green: {
    label: 'Green Space',
    description:
      "Counts parks and other green spaces tagged as 'leisure=park' within the selected radius. Proximity to green space is linked to better physical and mental health, so the score rewards having multiple parks nearby - 3 or more earns a perfect score.",
    source: 'OpenStreetMap (Overpass)',
    sourceUrl: 'https://www.openstreetmap.org',
    placesKey: 'park',
  },
  safety: {
    label: 'Safety / Crime',
    description:
      "A canton-level safety indicator derived from the Swiss Federal Statistical Office's Police Crime Statistics (offences under the Swiss Criminal Code per 1,000 residents, 2024). Cantons with fewer offences per resident score higher. This is canton-level data — Switzerland does not publish address-level crime incidents, so no street-level precision is implied.",
    source: 'Swiss Federal Statistical Office (Police Crime Statistics)',
    sourceUrl: 'https://www.bfs.admin.ch/bfs/en/home/statistics/crime-criminal-justice/police.html',
  },
  healthcare: {
    label: 'Healthcare Access',
    description:
      "Counts hospitals, clinics, and pharmacies within the selected radius. The score is scaled so that 5 or more healthcare facilities nearby earns a perfect score, reflecting ease of access to medical care.",
    source: 'OpenStreetMap (Overpass)',
    sourceUrl: 'https://www.openstreetmap.org',
    placesKey: 'healthcare',
  },
  school: {
    label: 'Schools Nearby',
    description:
      "Counts schools within the selected radius. The score is scaled so that 3 or more schools nearby earns a perfect score, which is useful for families evaluating a location.",
    source: 'OpenStreetMap (Overpass)',
    sourceUrl: 'https://www.openstreetmap.org',
    placesKey: 'school',
  },
  dining: {
    label: 'Dining & Cafes',
    description:
      "Counts restaurants and cafes within the selected radius. The score is scaled so that 8 or more dining options nearby earns a perfect score, reflecting the variety of food options close to home.",
    source: 'OpenStreetMap (Overpass)',
    sourceUrl: 'https://www.openstreetmap.org',
    placesKey: 'dining',
  },
  library: {
    label: 'Libraries',
    description:
      "Counts public libraries within 1.6km. The score is scaled so that 2 or more libraries nearby earns a perfect score, reflecting access to free community and educational resources.",
    source: 'OpenStreetMap (Overpass)',
    sourceUrl: 'https://www.openstreetmap.org',
    placesKey: 'library',
  },
  bank: {
    label: 'Banks / ATMs',
    description:
      "Counts banks and ATMs within 800m. The score is scaled so that 5 or more nearby earns a perfect score, reflecting convenient access to everyday banking.",
    source: 'OpenStreetMap (Overpass)',
    sourceUrl: 'https://www.openstreetmap.org',
    placesKey: 'bank',
  },
  worship: {
    label: 'Places of Worship',
    description:
      "Counts places of worship of any faith within 1.6km. The score is scaled so that 3 or more nearby earns a perfect score, reflecting access to religious and community institutions.",
    source: 'OpenStreetMap (Overpass)',
    sourceUrl: 'https://www.openstreetmap.org',
    placesKey: 'worship',
  },
  parking: {
    label: 'Parking',
    description:
      "Counts parking lots and structures within 400m. The score is scaled so that 3 or more nearby earns a perfect score, reflecting how easy it is to find parking close to this address.",
    source: 'OpenStreetMap (Overpass)',
    sourceUrl: 'https://www.openstreetmap.org',
    placesKey: 'parking',
  },
  sunlight: {
    label: 'Sunlight',
    description:
      "Estimates how much direct sunlight this building's roof receives over a year, based on Google's Solar API rooftop exposure modeling (which accounts for nearby buildings, trees, and roof geometry). A higher score reflects more annual sunshine hours, scaled against a typical range of roughly 1,000-2,200 hours per year.",
    source: 'Google Solar API',
    sourceUrl: 'https://developers.google.com/maps/documentation/solar/overview',
  },
  noise: {
    label: 'Noise',
    description:
      "Noise levels from sonBASE, the Swiss Federal Office for the Environment's countrywide noise model covering road, rail, and air traffic, day and night. The score maps the modeled decibel value at this exact location: around 45 dB (day) scores near 100, 75 dB or more scores 0. If the federal layer can't be queried, an OpenStreetMap road-proximity fallback is used instead and labeled \"(estimated)\".",
    source: 'Swiss Federal Office for the Environment (sonBASE)',
    sourceUrl: 'https://www.bafu.admin.ch/bafu/en/home/topics/noise.html',
  },
  demographics: {
    label: 'Commune Snapshot',
    description:
      "The Swiss commune (Gemeinde) this address falls within, resolved from the swissBOUNDARIES3D dataset. Commune-level statistics from the Swiss Federal Statistical Office are coming soon. Source: Federal Office of Topography swisstopo. This is informational context only and is not factored into the overall liveability score.",
    source: 'Federal Office of Topography swisstopo',
    sourceUrl: 'https://www.swisstopo.admin.ch/en/landscape-model-swissboundaries3d',
  },
  census: {
    label: 'Community Snapshot',
    description:
      "The Swiss commune (Gemeinde) this address falls within — name, canton, and BFS commune number — resolved from the swissBOUNDARIES3D dataset. Commune-level statistics (population, median age, income) from the Swiss Federal Statistical Office are coming soon. Source: Federal Office of Topography swisstopo. This is informational context only — it is not scored or factored into the overall liveability score.",
    source: 'Federal Office of Topography swisstopo',
    sourceUrl: 'https://www.swisstopo.admin.ch/en/landscape-model-swissboundaries3d',
  },
}
