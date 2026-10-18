import { AmenityPlaces } from './types'
import { RADON_ATTRIBUTION, RADON_INFO_URL } from './radon'

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
  | 'census'
  | 'budget'
  | 'hazards'
  | 'contamination'
  | 'radon'
  | 'usAqi'
  | 'weather'
  | 'usNoise'
  | 'usSunlight'
  | 'flood'
  | 'nri'
  | 'wildfire'
  | 'epaSites'

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
  /** Several sources, listed in the modal footer instead of source/sourceUrl */
  sources?: Array<{ label: string; url?: string }>
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
  census: {
    label: 'Community Snapshot',
    description:
      "The Swiss commune (Gemeinde) this address falls within — name, canton, and BFS commune number — resolved from the swissBOUNDARIES3D dataset. Commune-level statistics (population, median age, income) from the Swiss Federal Statistical Office are coming soon. Source: Federal Office of Topography swisstopo. This is informational context only — it is not scored or factored into the overall liveability score.",
    source: 'Federal Office of Topography swisstopo',
    sourceUrl: 'https://www.swisstopo.admin.ch/en/landscape-model-swissboundaries3d',
  },
  hazards: {
    label: 'Natural Hazards',
    description:
      "Whether this address lies in a hazard zone on the canton's official hazard map (Gefahrenkarte) for floods, landslides, rockfall and avalanches. Zones follow the Swiss scheme: red (high), blue (medium), yellow (low) and yellow-white hatched (residual hazard from rare extreme events). Hazard maps cover settled areas; outside the area a canton has assessed, there is no statement either way. A hazard zone lowers the overall score (high −15, medium −8, low −3); no data never changes it.",
    source: 'Cantonal hazard maps via geodienste.ch',
    sourceUrl: 'https://geodienste.ch/services/gefahrenkarten',
  },
  contamination: {
    label: 'Contaminated Sites',
    description:
      "Whether this address, or any site within 100 m, is registered in the cadastre of contaminated sites (Kataster der belasteten Standorte): former landfills, industrial sites, accident sites and shooting ranges with polluted ground. Includes the canton's cadastre and the federal cadastres for railway, airfield and military land. A registered site at the address lowers the overall score (up to −10 if it requires remediation), and one within 100 m that requires action lowers it slightly; no data never changes it.",
    source: 'Cantonal cadastres via geodienste.ch',
    sourceUrl: 'https://geodienste.ch/services/kataster_belasteter_standorte',
  },
  radon: {
    label: 'Radon',
    description:
      "The probability that homes in this 1 km area exceed the radon reference level of 300 Bq/m³, with a confidence index, from the Federal Office of Public Health's Swiss Radon Map. It describes the area, not a specific building: radon levels vary from building to building, and only a measurement can determine the concentration in a specific home.",
    source: RADON_ATTRIBUTION,
    sourceUrl: RADON_INFO_URL,
  },
  budget: {
    label: 'Monthly Budget',
    description:
      "What an employed household has left each month after the employee share of social contributions (AHV/IV/EO and ALV), income tax (federal, cantonal and communal), mandatory basic health insurance and an area-level rent estimate. Tax comes from the Federal Tax Administration's calculator for this commune; health insurance is the regional average premium. Pension contributions, individual deductions and your actual insurer are not included.",
    source: 'Swiss Federal Tax Administration (ESTV)',
    sourceUrl: 'https://swisstaxcalculator.estv.admin.ch/',
    sources: [
      { label: 'Income tax: Swiss Federal Tax Administration (ESTV) tax calculator', url: 'https://swisstaxcalculator.estv.admin.ch/' },
      { label: 'Health insurance: Federal Office of Public Health (FOPH) premium data', url: 'https://opendata.swiss/de/dataset/health-insurance-premiums' },
      { label: 'Social contribution rates: Informationsstelle AHV/IV', url: 'https://www.ahv-iv.ch/de/Merkbl%C3%A4tter/Beitr%C3%A4ge-AHV-IV-EO-ALV' },
      { label: 'Commune: Federal Office of Topography swisstopo', url: 'https://www.swisstopo.admin.ch/en/landscape-model-swissboundaries3d' },
      { label: 'Rent: Liveability area-level estimate (typical 1–2 bedroom rent)' },
    ],
  },
  // ─── United States ────────────────────────────────────────────────────────
  usAqi: {
    label: 'Air Quality (AQI)',
    description:
      "The current US EPA Air Quality Index from AirNow: the NowCast AQI at the closest monitor for each pollutant, and the highest of them (that is how the AQI is defined). AirNow data are preliminary and unvalidated. For context, the validated annual statistics from the nearest EPA AQS monitors are compared with the national air quality standards.",
    source: 'AirNow (US EPA and partners) · EPA Air Quality System',
    sourceUrl: 'https://www.airnow.gov/',
    sources: [
      { label: 'AirNow — current observations (US EPA and state, local and tribal agencies)', url: 'https://www.airnow.gov/' },
      { label: 'EPA Air Quality System (AQS) — annual summary data', url: 'https://www.epa.gov/aqs' },
    ],
  },
  weather: {
    label: 'Weather Alerts & Heat',
    description:
      "Active watches, warnings and advisories from the National Weather Service for this exact location, and NWS HeatRisk: a 0–4 scale of how dangerous forecast heat is for health over the next seven days, based on how unusual the heat is for this place and time of year.",
    source: 'National Weather Service',
    sourceUrl: 'https://www.weather.gov/',
    sources: [
      { label: 'National Weather Service API — active alerts and forecast grid', url: 'https://www.weather.gov/documentation/services-web-api' },
      { label: 'NWS HeatRisk', url: 'https://www.wpc.ncep.noaa.gov/heatrisk/' },
    ],
  },
  usNoise: {
    label: 'Transportation Noise',
    description:
      "Modeled noise from road, rail and aviation for an average day in 2020 (24-hour LAeq), from the BTS National Transportation Noise Map, in the map's 5–10 dB bands. Levels under 45 dBA aren't mapped. BTS notes the map shows potential exposure for tracking trends, not measured noise at a specific building.",
    source: 'US DOT Bureau of Transportation Statistics',
    sourceUrl: 'https://www.bts.gov/geospatial/national-transportation-noise-map',
  },
  usSunlight: {
    label: 'Sunlight',
    description:
      "Long-term average solar irradiance for the ~4 km area around this address from the National Solar Radiation Database, in kWh/m² per day — the same number as daily 'peak sun hours'. It describes the area's climate, not this building's shading. The score spans the US range, from about 3.4 in Seattle to 5.8 in the desert Southwest.",
    source: 'National Laboratory of the Rockies (NLR, formerly NREL)',
    sourceUrl: 'https://developer.nlr.gov/docs/solar/solar-resource-v1/',
  },
  flood: {
    label: 'Flood Zone',
    description:
      "The FEMA flood zone at this point on the effective Flood Insurance Rate Map, from the National Flood Hazard Layer.",
    source: 'FEMA National Flood Hazard Layer',
    sourceUrl: 'https://www.fema.gov/flood-maps/national-flood-hazard-layer',
    sources: [
      { label: 'FEMA National Flood Hazard Layer', url: 'https://www.fema.gov/flood-maps/national-flood-hazard-layer' },
      { label: 'FEMA Flood Map Service Center (official maps)', url: 'https://msc.fema.gov/portal/home' },
    ],
  },
  nri: {
    label: 'National Risk Index',
    description:
      "FEMA's National Risk Index rates communities for 18 natural hazards, combining expected annual losses with social vulnerability and community resilience. Ratings are relative to all US census tracts (or counties).",
    source: 'FEMA National Risk Index',
    sourceUrl: 'https://hazards.fema.gov/nri/',
  },
  wildfire: {
    label: 'Wildfire',
    description:
      "Wildfire likelihood: the modeled annual probability that a wildfire burns this ~30 m location, from the USDA Forest Service's Wildfire Risk to Communities. FEMA's National Risk Index wildfire rating for the census tract is shown for context.",
    source: 'USDA Forest Service, Wildfire Risk to Communities',
    sourceUrl: 'https://wildfirerisk.org/',
    sources: [
      { label: 'USDA Forest Service — Wildfire Risk to Communities', url: 'https://wildfirerisk.org/' },
      { label: 'FEMA National Risk Index — wildfire', url: 'https://hazards.fema.gov/nri/wildfire' },
    ],
  },
  epaSites: {
    label: 'EPA-Listed Sites',
    description:
      "Superfund sites, brownfield properties and Toxics Release Inventory facilities registered within 1 mile, from EPA's Facility Registry Service (Envirofacts) — the US counterpart of a contaminated-site register.",
    source: 'US EPA Facility Registry Service (Envirofacts)',
    sourceUrl: 'https://www.epa.gov/frs',
    sources: [
      { label: 'US EPA Facility Registry Service (Envirofacts)', url: 'https://www.epa.gov/frs' },
      { label: 'EPA Superfund: National Priorities List', url: 'https://www.epa.gov/superfund/superfund-national-priorities-list-npl' },
      { label: 'EPA Toxics Release Inventory', url: 'https://www.epa.gov/toxics-release-inventory-tri-program' },
      { label: 'EPA Brownfields (ACRES)', url: 'https://www.epa.gov/brownfields' },
    ],
  },
}
