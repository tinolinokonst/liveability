// Build lib/data/us-areas.json — the US area pool for AI Match.
//
// Run (needs the server keys from .env.local; takes ~15-30 minutes, mostly
// waiting on OpenStreetMap's Overpass and the AQS fair-use budget):
//   set -a; source .env.local; set +a
//   US_ENABLED=true OVERPASS_TIMEOUT_MS=90000 \
//     node --experimental-strip-types --import ./scripts/lib/register.mjs scripts/build-us-areas.mts [--fill]
//
// --fill: re-run only the areas with gaps in the existing file and keep every
// value already found (a source that fails again never erases one). Use it
// when OpenStreetMap's Overpass was overloaded during the full build.
//
// Why these areas: AI Match needs a fixed pool to compare, like the Swiss
// cities and districts. These are well-known, varied neighbourhoods in the
// largest US metros people relocate to — dense transit cities, car-oriented
// Sun Belt cities, college towns — each anchored on a public building
// (a central library, city hall or museum) so the address geocodes exactly.
//
// Every figure comes from the same lookups the US address view uses
// (lib/us*Sources.ts), at the anchor address. Nothing is estimated by hand:
// a source that fails leaves its field null, and the script reports it.

import { resolveAddress } from '../lib/geocodeServer'
import { getUsAirQuality } from '../lib/usAirSources'
import { getUsNoise } from '../lib/usNoiseSource'
import { getUsSunlight } from '../lib/usSolarSource'
import { getUsRisks } from '../lib/usRiskSources'
import { getUsBroadband, getUsFoodAccess, getUsSchools, getUsTransit, getUsWalkability } from '../lib/usDailyLifeSources'
import { getUsCommunity, getUsRent, getUsSafety } from '../lib/usCommunitySources'
import { censusUnits } from '../lib/usGeography'
import { aqiFromPm25, scoreForAqi } from '../lib/aqiScale'
import { computeUsScore } from '../lib/usScore'
import { compositeScore } from '../lib/composite'
import { readFileSync, writeFileSync } from 'node:fs'

const AREAS: Array<{ name: string; city: string; anchor: string; address: string }> = [
  { name: 'Park Slope', city: 'Brooklyn, New York', anchor: 'Brooklyn Public Library, Central', address: '10 Grand Army Plaza, Brooklyn, NY 11238' },
  { name: 'Upper West Side', city: 'Manhattan, New York', anchor: 'American Museum of Natural History', address: '200 Central Park West, New York, NY 10024' },
  { name: 'Astoria', city: 'Queens, New York', anchor: 'Museum of the Moving Image', address: '36-01 35th Ave, Astoria, NY 11106' },
  { name: 'Lincoln Park', city: 'Chicago', anchor: 'Lincoln Park Zoo', address: '2001 N Clark St, Chicago, IL 60614' },
  { name: 'Logan Square', city: 'Chicago', anchor: 'Logan Square Branch Library', address: '3030 W Fullerton Ave, Chicago, IL 60647' },
  { name: 'Hyde Park', city: 'Chicago', anchor: 'University of Chicago', address: '5801 S Ellis Ave, Chicago, IL 60637' },
  { name: 'Mission District', city: 'San Francisco', anchor: 'Mission Branch Library', address: '300 Bartlett St, San Francisco, CA 94110' },
  { name: 'Civic Center / Hayes Valley', city: 'San Francisco', anchor: 'San Francisco City Hall', address: '1 Dr Carlton B Goodlett Pl, San Francisco, CA 94102' },
  { name: 'Rockridge', city: 'Oakland', anchor: 'Rockridge Branch Library', address: '5366 College Ave, Oakland, CA 94618' },
  { name: 'Silver Lake', city: 'Los Angeles', anchor: 'Silver Lake Branch Library', address: '2411 Glendale Blvd, Los Angeles, CA 90039' },
  { name: 'Downtown Santa Monica', city: 'Santa Monica', anchor: 'Santa Monica Main Library', address: '601 Santa Monica Blvd, Santa Monica, CA 90401' },
  { name: 'Old Pasadena / Civic Center', city: 'Pasadena', anchor: 'Pasadena City Hall', address: '100 N Garfield Ave, Pasadena, CA 91101' },
  { name: 'Capitol Hill', city: 'Seattle', anchor: 'Capitol Hill Branch Library', address: '425 Harvard Ave E, Seattle, WA 98102' },
  { name: 'Ballard', city: 'Seattle', anchor: 'Ballard Branch Library', address: '5614 22nd Ave NW, Seattle, WA 98107' },
  { name: 'Back Bay', city: 'Boston', anchor: 'Boston Public Library, Central', address: '700 Boylston St, Boston, MA 02116' },
  { name: 'Central Square', city: 'Cambridge', anchor: 'Cambridge City Hall', address: '795 Massachusetts Ave, Cambridge, MA 02139' },
  { name: 'Jamaica Plain', city: 'Boston', anchor: 'Jamaica Plain Branch Library', address: '30 South St, Jamaica Plain, MA 02130' },
  { name: 'Capitol Hill', city: 'Washington, DC', anchor: 'Library of Congress', address: '101 Independence Ave SE, Washington, DC 20540' },
  { name: 'Mount Pleasant', city: 'Washington, DC', anchor: 'Mount Pleasant Neighborhood Library', address: '3160 16th St NW, Washington, DC 20010' },
  { name: 'Clarendon / Ballston', city: 'Arlington, VA', anchor: 'Arlington Central Library', address: '1015 N Quincy St, Arlington, VA 22201' },
  { name: 'Downtown', city: 'Austin', anchor: 'Austin Central Library', address: '710 W Cesar Chavez St, Austin, TX 78701' },
  { name: 'Downtown', city: 'Houston', anchor: 'Houston Central Library', address: '500 McKinney St, Houston, TX 77002' },
  { name: 'Civic Center / Capitol Hill', city: 'Denver', anchor: 'Denver Central Library', address: '10 W 14th Ave Pkwy, Denver, CO 80204' },
  { name: 'Logan Square / Center City', city: 'Philadelphia', anchor: 'Free Library of Philadelphia, Parkway Central', address: '1901 Vine St, Philadelphia, PA 19103' },
  { name: 'Midtown', city: 'Atlanta', anchor: 'Woodruff Arts Center', address: '1280 Peachtree St NE, Atlanta, GA 30309' },
  { name: 'Coral Gables', city: 'Miami area', anchor: 'Coral Gables City Hall', address: '405 Biltmore Way, Coral Gables, FL 33134' },
  { name: 'Downtown', city: 'Portland, OR', anchor: 'Multnomah County Central Library', address: '801 SW 10th Ave, Portland, OR 97205' },
  { name: 'Downtown', city: 'Minneapolis', anchor: 'Minneapolis Central Library', address: '300 Nicollet Mall, Minneapolis, MN 55401' },
  { name: 'Downtown', city: 'Phoenix', anchor: 'Phoenix City Hall', address: '200 W Washington St, Phoenix, AZ 85003' },
  { name: 'Downtown', city: 'Nashville', anchor: 'Nashville Public Library, Main', address: '615 Church St, Nashville, TN 37219' },
  { name: 'Downtown', city: 'Salt Lake City', anchor: 'Salt Lake City Public Library, Main', address: '210 E 400 S, Salt Lake City, UT 84111' },
]

const key = process.env.GOOGLE_MAPS_SERVER_KEY
if (!key || process.env.US_ENABLED !== 'true') {
  console.error('Needs GOOGLE_MAPS_SERVER_KEY (source .env.local) and US_ENABLED=true')
  process.exit(1)
}

const countScore = (n: number, full: number) => Math.min(100, Math.round((n / full) * 100))
const failures: string[] = []

async function build(area: (typeof AREAS)[number]) {
  const geo = await resolveAddress(area.address, key!)
  const hit = geo.results[0]
  const lat = hit?.geometry.location.lat, lng = hit?.geometry.location.lng
  if (geo.status !== 'OK' || hit?.country !== 'US' || typeof lat !== 'number' || typeof lng !== 'number') {
    failures.push(`${area.name}, ${area.city}: address did not geocode`)
    return null
  }
  const [units, walk, transit, schools, food, broadband, air, noise, sunlight, risks, community, safety, rent] = await Promise.all([
    censusUnits(lat, lng), getUsWalkability(lat, lng), getUsTransit(lat, lng), getUsSchools(lat, lng), getUsFoodAccess(lat, lng),
    getUsBroadband(lat, lng), getUsAirQuality(lat, lng), getUsNoise(lat, lng), getUsSunlight(lat, lng), getUsRisks(lat, lng),
    getUsCommunity(lat, lng), getUsSafety(lat, lng), getUsRent(lat, lng),
  ])
  const pm25 = air.annual.pollutants.find((p: { pollutant: string }) => p.pollutant === 'pm25')
  const score = computeUsScore({ air, walk, transit, food, schools, safety, sunlight, noise, risks })
  const penalty = score.penalties.reduce((s, p) => s + p.points, 0)
  const label = `${area.name}, ${area.city}`
  const missing = Object.entries({ walk, transit, schools, safety, noise, sunlight, rent })
    .filter(([, r]) => (r as { status: string }).status !== 'ok').map(([k]) => k)
  if (food.groceryStatus !== 'ok') missing.push('grocery')
  if (!pm25) missing.push('annual air')
  if (missing.length) failures.push(`${label}: no ${missing.join(', ')}`)

  return {
    name: area.name,
    city: area.city,
    state: units.stateAbbr,
    anchor: area.anchor,
    address: hit.formatted_address,
    lat, lng,
    liveabilityScore: score.score,
    penalty,
    scores: {
      walkability: walk.score,
      // Annual PM2.5 at the nearest AQS monitor, as an AQI, on the card's scale
      airQuality: pm25 ? scoreForAqi(aqiFromPm25(pm25.value)) : null,
      transit: transit.score,
      grocery: food.groceryStatus === 'ok' && food.grocery ? countScore(food.grocery.count, 5) : null,
      schools: schools.status === 'ok' && schools.schools ? countScore(schools.schools.count, 3) : null,
      safety: safety.score,
      quietness: noise.score,
      sunlight: sunlight.score,
    },
    facts: {
      annualPm25: pm25 ? Math.round(pm25.value * 10) / 10 : null,
      transitStopsHalfMile: transit.stops?.count ?? null,
      railStations: transit.status === 'ok' ? transit.stationCount : null,
      transitAgencies: transit.feeds.slice(0, 4).map((f: { provider: string; feedName: string | null }) => f.feedName ? `${f.provider} (${f.feedName})` : f.provider),
      groceryStoresOneMile: food.grocery?.count ?? null,
      lowIncomeLowAccessTract: food.usda?.lila1And10 ?? null,
      schoolsOneMile: schools.schools?.count ?? null,
      violentCrimePer100k: safety.rates?.violent ?? null,
      propertyCrimePer100k: safety.rates?.property ?? null,
      policeAgency: safety.agency?.name ?? null,
      crimeYear: safety.year,
      noiseBand: noise.band,
      medianHouseholdIncome: community.tract?.medianHouseholdIncome ?? null,
      medianAge: community.tract?.medianAge ?? null,
      peoplePerSqMi: community.densityPerSqMi,
      upwardMobilityPercentile: community.mobility?.p25 ?? null,
      gigabitHomesShare: broadband.figures ? broadband.figures.wired1000 : null,
      floodZone: risks.flood.status === 'ok' ? risks.flood.zone : null,
      naturalHazardRating: risks.nri.tract?.rating ?? null,
      wildfireRating: risks.wildfire.tract?.rating ?? null,
    },
    rent: rent.status === 'ok' && rent.byBedrooms
      ? { byBedrooms: rent.byBedrooms, level: rent.level, label: rent.level === 'zip' ? `ZIP ${rent.zip}` : rent.areaName, fiscalYear: rent.fiscalYear }
      : null,
  }
}

type Built = NonNullable<Awaited<ReturnType<typeof build>>>
const OUT = new URL('../lib/data/us-areas.json', import.meta.url)
const FILL = process.argv.includes('--fill')
const existing = new Map<string, Built>()
if (FILL) {
  for (const a of (JSON.parse(readFileSync(OUT, 'utf8')) as { areas: Built[] }).areas) existing.set(`${a.name}|${a.city}`, a)
}
const hasGaps = (a: Built | undefined) =>
  !a || a.rent === null || Object.values(a.scores).some(v => v === null) || a.facts.transitStopsHalfMile === null

// The US score's weights by pool field (lib/usScore.ts), to re-score merged areas
const WEIGHT: Record<string, number> = { airQuality: 0.18, walkability: 0.18, grocery: 0.08, transit: 0.08, schools: 0.05, safety: 0.10, sunlight: 0.05, quietness: 0.04 }

/** Fresh values win; a field that came back empty keeps the value found before */
function merge(old: Built | undefined, fresh: Built): Built {
  if (!old) return fresh
  const pick = <T extends Record<string, unknown>>(o: T, n: T) =>
    Object.fromEntries(Object.keys({ ...o, ...n }).map(k => [k, n[k] ?? o[k] ?? null])) as T
  const scores = pick(old.scores, fresh.scores)
  const parts = Object.entries(WEIGHT).map(([k, w]) => [scores[k as keyof typeof scores] as number | null, w] as [number | null, number])
  const enough = parts.filter(([v]) => v !== null).reduce((s, [, w]) => s + w, 0) >= 0.38
  return {
    ...fresh,
    scores,
    facts: pick(old.facts, fresh.facts),
    rent: fresh.rent ?? old.rent,
    liveabilityScore: enough ? Math.max(0, compositeScore(parts) - fresh.penalty) : fresh.liveabilityScore ?? old.liveabilityScore,
  }
}

const todo = FILL ? AREAS.filter(a => hasGaps(existing.get(`${a.name}|${a.city}`))) : AREAS
if (FILL) console.log(`--fill: ${todo.length} of ${AREAS.length} areas have gaps`)
const results = new Map<string, Built>()
for (let i = 0; i < todo.length; i += 3) {
  // One area failing (an upstream quirk) is reported, never fatal to the rest
  const batch = await Promise.all(todo.slice(i, i + 3).map(a => build(a).catch(err => {
    failures.push(`${a.name}, ${a.city}: failed (${err instanceof Error ? err.message : err})`)
    return null
  })))
  for (const a of batch) if (a) results.set(`${a.name}|${a.city}`, a)
  console.log(`${Math.min(i + 3, todo.length)}/${todo.length}`)
}

const out = AREAS.flatMap(a => {
  const key = `${a.name}|${a.city}`
  const fresh = results.get(key)
  const old = existing.get(key)
  return fresh ? [merge(old, fresh)] : old ? [old] : []
})

writeFileSync(OUT, JSON.stringify({
  generated: new Date().toISOString().slice(0, 10),
  method: 'Each figure from Liveability\'s own US lookups at the anchor address (see scripts/build-us-areas.mts)',
  areas: out,
}, null, 1) + '\n')
console.log(`wrote ${out.length} areas`)
if (failures.length) console.log(`\nGaps (left null, never estimated):\n- ${failures.join('\n- ')}`)
