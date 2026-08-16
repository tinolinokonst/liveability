/**
 * Post-removal smoke test: exercises everything a Zürich address search touches,
 * without needing a logged-in session.
 *
 *   npx tsx scripts/verify-zurich-search.ts
 */
import { wmsPointValue, findCommune } from '../lib/geoAdmin'
import { nearestMatchableArea, areaDisplayName, nearestArea } from '../lib/neighborhoods'
import { CANTON_CRIME_2024, safetyScoreForRate } from '../lib/swissCrime'

// Bahnhofstrasse 1, 8001 Zürich
const LAT = 47.3667
const LNG = 8.5390

async function main() {
  let failures = 0
  const check = (label: string, ok: boolean, detail: string) => {
    if (!ok) failures++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(28)} ${detail}`)
  }

  // ── Air quality (BAFU) ────────────────────────────────────────────────────
  const [pm25, no2] = await Promise.all([
    wmsPointValue('ch.bafu.luftreinhaltung-feinstaub_pm2_5', LAT, LNG),
    wmsPointValue('ch.bafu.luftreinhaltung-stickstoffdioxid', LAT, LNG),
  ])
  check('air quality (BAFU)', pm25.value !== null && no2.value !== null,
    `PM2.5 ${pm25.value} / NO2 ${no2.value} µg/m³`)

  // ── Noise (sonBASE) ───────────────────────────────────────────────────────
  const noise = await wmsPointValue('ch.bafu.laerm-strassenlaerm_tag', LAT, LNG)
  check('noise (sonBASE)', noise.ok, `${noise.value} dB day`)

  // ── Commune (swisstopo) — the /api/census route ───────────────────────────
  const commune = await findCommune(LAT, LNG)
  check('commune (swisstopo)', !!commune?.commune,
    `${commune?.commune} / ${commune?.canton} / BFS ${commune?.bfsNumber}`)

  // ── Safety (FSO canton stats) ─────────────────────────────────────────────
  const canton = commune ? CANTON_CRIME_2024[commune.canton] : undefined
  check('safety (FSO)', !!canton,
    `${canton?.name} ${canton?.ratePer1000}/1000 -> score ${canton ? safetyScoreForRate(canton.ratePer1000) : 'n/a'}`)

  // ── Transit (transport.opendata.ch) ───────────────────────────────────────
  const tr = await (await fetch(`https://transport.opendata.ch/v1/locations?x=${LAT}&y=${LNG}&type=station`)).json()
  const stations = (tr.stations ?? []).filter((s: { id?: string; distance?: number }) => s.id && typeof s.distance === 'number')
  check('transit (opendata.ch)', stations.length > 0,
    `${stations.length} stations, nearest ${stations[0]?.name} @ ${Math.round(stations[0]?.distance)}m`)

  // ── Amenities (Overpass) ──────────────────────────────────────────────────
  const q = `[out:json][timeout:25];(node["shop"~"^(supermarket|convenience)$"](around:800,${LAT},${LNG});node["amenity"~"^(restaurant|cafe)$"](around:800,${LAT},${LNG}););out body;`
  const ov = await fetch('https://overpass.osm.ch/api/interpreter', {
    method: 'POST',
    body: new URLSearchParams({ data: q }).toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'liveability-switzerland/1.0' },
  }).then(r => r.json()).catch(() => null)
  check('amenities (Overpass)', (ov?.elements?.length ?? 0) > 0, `${ov?.elements?.length ?? 0} elements within 800m`)

  // ── Rent estimate — replicates the rewritten /api/rentcast route exactly ──
  const area = nearestMatchableArea(LAT, LNG)
  const rentResponse = {
    rent: area.rent,
    rentRangeLow: Math.round(area.rent * 0.85),
    rentRangeHigh: Math.round(area.rent * 1.15),
    city: areaDisplayName(area),
    estimated: true,
    source: 'Area-level average, estimated',
  }
  // Shape the RentCostCard in AddressResults actually reads
  const shapeOk =
    typeof rentResponse.rent === 'number' &&
    typeof rentResponse.rentRangeLow === 'number' &&
    typeof rentResponse.rentRangeHigh === 'number' &&
    typeof rentResponse.city === 'string' &&
    rentResponse.estimated === true
  check('rent estimate shape', shapeOk,
    `CHF ${rentResponse.rent} (${rentResponse.rentRangeLow}–${rentResponse.rentRangeHigh}) · ${rentResponse.city}`)

  // ── AQI reference city (city-level comparison) ────────────────────────────
  const ref = nearestArea(LAT, LNG)
  check('AQI reference city', !!ref?.name, ref.name)

  console.log(failures === 0
    ? '\nRESULT: Zürich search pipeline fully intact'
    : `\nRESULT: ${failures} CHECK(S) FAILED`)
  if (failures > 0) process.exitCode = 1
}

main()
