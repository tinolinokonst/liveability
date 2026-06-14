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
      "The Air Quality Index measures pollution levels on a 0-500 scale based on EPA categories: Good (0-50), Moderate (51-100), Unhealthy for Sensitive Groups (101-150), Unhealthy (151-200), Very Unhealthy (201-300), and Hazardous (301+). Lower numbers mean cleaner air and a higher score here.",
    source: 'Open-Meteo Air Quality API',
    sourceUrl: 'https://open-meteo.com/en/docs/air-quality-api',
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
      "Counts bus stops, bus stations, and train/tram stops within 800 meters. The score is scaled so that 10 or more transit access points nearby earns a perfect score, reflecting how easy it is to get around without a car.",
    source: 'OpenStreetMap (Overpass)',
    sourceUrl: 'https://www.openstreetmap.org',
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
      "Represents reported crime incidents within roughly 1km of this address over the trailing 12 months. Fewer incidents mean a higher safety score. Columbus does not currently publish a queryable point-level crime layer, so this metric may fall back to an estimated score until that data becomes available.",
    source: 'City of Columbus GIS',
    sourceUrl: 'https://gis.columbus.gov/arcgis/rest/services/PublicSafety/PoliceIncidents/MapServer/0',
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
}
