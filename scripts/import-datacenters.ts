// Import US data centers into Supabase (public.data_centers) for the
// "Data centers nearby" card (supabase/migrations/2026-11-14_data_centers.sql).
//
// Run (needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
//   set -a; source .env.local; set +a
//   node --experimental-strip-types --import ./scripts/lib/register.mjs scripts/import-datacenters.ts [--dry-run] [--dump rows.json]
//
// Sources:
//   - PNNL IM3 Open Source Data Center Atlas (ODbL 1.0, derived from
//     OpenStreetMap): existing facilities, all imported as "operating". The
//     MSD-LIVE record (doi.org/10.57931/…) gives the release date and DOI; its
//     files can't be fetched by script, so the points come from the same
//     release in PNNL's atlas repository, github.com/IMMM-SFA/datacenter-atlas,
//     at the pinned commit PNNL_COMMIT. (That repository's LICENSE, BSD
//     2-Clause, covers the atlas web app's code; the data's licence is the
//     ODbL stated on the MSD-LIVE record.)
//   - FracTracker Alliance's U.S. Data Centers Tracker, ONLY when
//     ENABLE_FRACTRACKER=true (lib/flags.ts): operating, approved and proposed
//     projects. No open licence; see the flag's comment.
//
// De-duplication: two records within 300 m that describe the same facility
// (same status, and matching names, or matching operators where one side has
// no name) become one row. The most detailed record supplies the row's
// fields; every contributing record stays listed in `sources`.
//
// Each run replaces the table's contents: all rows are upserted with one
// imported_at, then rows from earlier runs are deleted. A run that finds
// suspiciously few facilities stops before deleting anything.

import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { PNNL_ATLAS, type DataCenterSourceRecord, type DataCenterStatus } from '../lib/dataCenters'
import { haversineKm } from '../lib/usUpstream'

const DRY_RUN = process.argv.includes('--dry-run')
// --dump <file>: also write the de-duplicated rows as JSON, for review
const DUMP = process.argv.includes('--dump') ? process.argv[process.argv.indexOf('--dump') + 1] : null
const FRACTRACKER = process.env.ENABLE_FRACTRACKER === 'true'
const MERGE_METERS = 300
const MIN_FACILITIES = 1000
const USER_AGENT = 'Liveability data import (https://liveability.live)'

const PNNL_RECORD_API = 'https://data.msdlive.org/api/records/65g71-a4731/versions'
const PNNL_REPO = 'IMMM-SFA/datacenter-atlas'
const PNNL_POINTS_PATH = 'static/im3_datacenter_centroids.geojson'
// The commit whose points file is imported: "Update existing data centers to
// v2026.11.02 …". Bump it (and PNNL_ATLAS.version in lib/dataCenters.ts, which
// the card's credit shows) when PNNL publishes a new release.
const PNNL_COMMIT = 'fe4d8420f9fdc7b16b82b8461c5e4c39b93d8f1d'
const FRACTRACKER_LAYER =
  'https://services.arcgis.com/jDGuO8tYggdCCnUJ/arcgis/rest/services/data_centers_v4_agol_all/FeatureServer/0'
const FRACTRACKER_URL = 'https://fractracker.org/data-centers-tracker/'

interface Row {
  id: string
  name: string | null
  operator: string | null
  status: DataCenterStatus
  lat: number
  lng: number
  source: DataCenterSourceRecord['source']
  source_url: string
  source_date: string
  sources: DataCenterSourceRecord[]
  imported_at: string
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  return (await res.json()) as T
}

function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.replace(/\s+/g, ' ').trim()
  return s && !/^(null|none|n\/?a|unknown|tbd|-+)$/i.test(s) ? s.slice(0, 300) : null
}

function isUsCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 17 && lat <= 72 && lng >= -180 && lng <= -64
}

/** Short stable id from a record's identifying fields (PNNL's points carry no id) */
async function hashId(prefix: string, parts: Array<string | number | null>): Promise<string> {
  const data = new TextEncoder().encode(parts.map(p => p ?? '').join('|'))
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', data))
  return `${prefix}-${[...digest.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('')}`
}

const GENERIC_WORDS = /\b(data ?cent(er|re)s?|datacenters?|campus|facility|site|the|inc|llc|corp(oration)?|co|ltd|lp|company)\b/g

function normalize(s: string | null): string {
  if (!s) return ''
  return s.toLowerCase().replace(/&/g, ' and ').replace(GENERIC_WORDS, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
}

function overlaps(a: string, b: string): boolean {
  return !!a && !!b && (a === b || a.includes(b) || b.includes(a))
}

/** Unit codes in a name ("SJC01", "DFW28", "II"); a trailing building letter is dropped (POR01A → por01) */
function unitCodes(normalized: string): Set<string> {
  return new Set(
    normalized.split(' ')
      .filter(t => /^(?=.*\d)[a-z]{0,5}\d{1,4}[a-z]?$/.test(t) || /^(ii|iii|iv|vi|vii|viii|ix)$/.test(t))
      .map(t => t.replace(/(\d)[a-z]$/, '$1'))
  )
}

/** Names that can't be the same facility: both named, and neither contains the other or their unit codes differ */
function namesConflict(a: string, b: string): boolean {
  if (!a || !b) return false
  if (!overlaps(a, b)) return true
  const ua = unitCodes(a), ub = unitCodes(b)
  return ua.size > 0 && ub.size > 0 && (ua.size !== ub.size || [...ua].some(u => !ub.has(u)))
}

/** Detail score: the record with more known fields wins a merge */
function detail(r: DataCenterSourceRecord): number {
  return (r.name ? 2 : 0) + (r.operator ? 2 : 0) + (r.source === 'fractracker' ? 1 : 0)
}

function sameFacility(a: DataCenterSourceRecord, b: DataCenterSourceRecord): boolean {
  if (a.status !== b.status) return false // a proposed project next to an existing campus is a new project
  if (haversineKm(a.lat, a.lng, b.lat, b.lng) * 1000 > MERGE_METERS) return false
  const [na, nb, oa, ob] = [normalize(a.name), normalize(b.name), normalize(a.operator), normalize(b.operator)]
  if (namesConflict(na, nb)) return false
  if (na && nb) return true // overlapping names with matching unit codes
  // "Equinix DC1" and "Equinix DC2" stay separate; an unnamed building of the
  // same operator next to a named one merges
  if (overlaps(oa, ob) && (!na || !nb)) return true
  // A name that is just the other record's operator ("Verizon" vs operator Verizon)
  if ((!oa && overlaps(na, ob) && !nb) || (!ob && overlaps(nb, oa) && !na)) return true
  return false
}

// ─── sources ─────────────────────────────────────────────────────────────────

interface MsdRecord { metadata: { version: string; publication_date: string }; pids: { doi: { identifier: string } } }
interface GeoJson { features: Array<{ properties: Record<string, unknown>; geometry: { type: string; coordinates: [number, number] } }> }
interface GhCommit { sha: string; commit: { message: string; committer: { date: string } } }

async function loadPnnl(): Promise<DataCenterSourceRecord[]> {
  const version = PNNL_ATLAS.version

  // The pinned commit must publish the release the card's credit names
  const commit = await getJson<GhCommit>(`https://api.github.com/repos/${PNNL_REPO}/commits/${PNNL_COMMIT}`)
  if (!commit.commit.message.includes(version)) {
    throw new Error(`PNNL commit ${PNNL_COMMIT.slice(0, 7)} doesn't name ${version} ("${commit.commit.message}") — check PNNL_COMMIT and PNNL_ATLAS.version`)
  }

  // That release's MSD-LIVE record supplies the date and DOI
  const versions = await getJson<{ hits: { hits: MsdRecord[] } }>(`${PNNL_RECORD_API}?size=50`)
  const record = versions.hits.hits.find(r => r.metadata.version === version)
  if (!record) throw new Error(`MSD-LIVE has no ${version} of the atlas`)
  const latest = versions.hits.hits.map(r => r.metadata.version).sort().at(-1)
  const doiUrl = `https://doi.org/${record.pids.doi.identifier}`
  const sourceDate = record.metadata.publication_date
  const [newest] = await getJson<GhCommit[]>(`https://api.github.com/repos/${PNNL_REPO}/commits?path=${PNNL_POINTS_PATH}&per_page=1`)
  console.log(`PNNL: ${version} (${sourceDate}, ${doiUrl}) from ${PNNL_REPO}@${PNNL_COMMIT.slice(0, 7)}`)
  if (latest !== version || newest.sha !== PNNL_COMMIT) {
    console.warn(`PNNL: a newer release may exist (MSD-LIVE latest ${latest}, newest commit ${newest.sha.slice(0, 7)}) — consider bumping PNNL_COMMIT`)
  }

  const geo = await getJson<GeoJson>(`https://raw.githubusercontent.com/${PNNL_REPO}/${PNNL_COMMIT}/${PNNL_POINTS_PATH}`)
  const out: DataCenterSourceRecord[] = []
  const seen = new Set<string>()
  for (const f of geo.features) {
    if (f.geometry?.type !== 'Point') continue
    const [lng, lat] = f.geometry.coordinates
    if (!isUsCoord(lat, lng)) continue
    const p = f.properties
    const name = clean(p.name), operator = clean(p.operator)
    const id = await hashId('pnnl', [String(p.type ?? ''), name, operator, lat.toFixed(6), lng.toFixed(6)])
    if (seen.has(id)) continue // the same footprint listed once per county it straddles
    seen.add(id)
    out.push({ source: 'pnnl', record_id: id, name, operator, status: 'operating', lat, lng, source_url: doiUrl, source_date: sourceDate })
  }
  return out
}

const FT_STATUS: Record<string, DataCenterStatus | null> = {
  'operating': 'operating',
  'expanding': 'operating',
  'approved/permitted/under construction': 'approved',
  'proposed': 'proposed',
  'pre-proposal': 'proposed',
  // Not shown: neither existing nor going ahead
  'cancelled': null,
  'suspended': null,
}

interface ArcgisPage { features: Array<{ attributes: Record<string, unknown> }>; exceededTransferLimit?: boolean; error?: unknown }

async function loadFracTracker(): Promise<DataCenterSourceRecord[]> {
  const fields = 'OBJECTID,facility_id,facility_name,operator_name,status,lat,long,location_confidence,delete_dup,date_updated,date_created'
  const rows: Array<Record<string, unknown>> = []
  for (let offset = 0; ; offset += 1000) {
    const page = await getJson<ArcgisPage>(
      `${FRACTRACKER_LAYER}/query?where=1%3D1&outFields=${fields}&returnGeometry=false&orderByFields=OBJECTID&resultOffset=${offset}&resultRecordCount=1000&f=json`
    )
    if (page.error) throw new Error(`FracTracker query failed: ${JSON.stringify(page.error)}`)
    rows.push(...page.features.map(f => f.attributes))
    if (!page.exceededTransferLimit || page.features.length === 0) break
  }

  const out: DataCenterSourceRecord[] = []
  const skipped: Record<string, number> = {}
  const skip = (why: string) => { skipped[why] = (skipped[why] ?? 0) + 1 }
  for (const a of rows) {
    const statusRaw = String(a.status ?? '').trim().toLowerCase()
    const status = FT_STATUS[statusRaw]
    const lat = Number(a.lat), lng = Number(a.long)
    if (status === undefined) { skip(`unknown status "${a.status}"`); continue }
    if (status === null) { skip(`status ${statusRaw}`); continue }
    if (clean(a.delete_dup)) { skip('marked duplicate'); continue }
    // Low confidence means the point may be far from the real site
    if (String(a.location_confidence ?? '').toLowerCase() === 'low') { skip('low location confidence'); continue }
    if (!isUsCoord(lat, lng)) { skip('no US coordinates'); continue }
    const updated = Number(a.date_updated ?? a.date_created)
    out.push({
      source: 'fractracker',
      record_id: `ft-${clean(a.facility_id) ?? a.OBJECTID}`,
      name: clean(a.facility_name),
      operator: clean(a.operator_name),
      status,
      lat,
      lng,
      source_url: FRACTRACKER_URL,
      source_date: Number.isFinite(updated) && updated > 0 ? new Date(updated).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    })
  }
  console.log(`FracTracker: ${rows.length} records, ${out.length} kept; skipped ${JSON.stringify(skipped)}`)
  return out
}

// ─── de-duplication ──────────────────────────────────────────────────────────

function dedupe(records: DataCenterSourceRecord[], importedAt: string): Row[] {
  const parent = records.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const members = new Map<number, number[]>(records.map((_, i) => [i, [i]]))
  // Two groups join only if no pair across them conflicts, so "Colovore"
  // can't chain "Colovore SJC01" and "Colovore SJC02" into one facility
  const join = (i: number, j: number) => {
    const [ri, rj] = [find(i), find(j)]
    const [mi, mj] = [members.get(ri)!, members.get(rj)!]
    const conflict = mi.some(x => mj.some(y => namesConflict(normalize(records[x].name), normalize(records[y].name))))
    if (conflict) return
    parent[rj] = ri
    members.set(ri, [...mi, ...mj])
    members.delete(rj)
  }

  // ~330 m grid cells; longitude neighbours reach two cells out, since a cell
  // narrows towards the poles
  const CELL = 0.003
  const grid = new Map<string, number[]>()
  records.forEach((r, i) => {
    const key = `${Math.floor(r.lat / CELL)}:${Math.floor(r.lng / CELL)}`
    grid.set(key, [...(grid.get(key) ?? []), i])
  })
  records.forEach((r, i) => {
    const cy = Math.floor(r.lat / CELL), cx = Math.floor(r.lng / CELL)
    for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) {
      for (const j of grid.get(`${cy + dy}:${cx + dx}`) ?? []) {
        if (j > i && find(i) !== find(j) && sameFacility(r, records[j])) join(i, j)
      }
    }
  })

  const groups = new Map<number, DataCenterSourceRecord[]>()
  records.forEach((r, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), r]))

  return [...groups.values()].map(members => {
    const sorted = [...members].sort((a, b) => detail(b) - detail(a) || a.record_id.localeCompare(b.record_id))
    const best = sorted[0]
    return {
      id: best.record_id,
      name: best.name ?? sorted.find(m => m.name)?.name ?? null,
      operator: best.operator ?? sorted.find(m => m.operator)?.operator ?? null,
      status: best.status,
      lat: best.lat,
      lng: best.lng,
      source: best.source,
      source_url: best.source_url,
      source_date: best.source_date,
      sources: sorted,
      imported_at: importedAt,
    }
  })
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!DRY_RUN && (!url || !key)) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or pass --dry-run)')

  console.log(`ENABLE_FRACTRACKER=${FRACTRACKER ? 'true: importing PNNL + FracTracker' : 'off: importing PNNL only'}`)
  const pnnl = await loadPnnl()
  console.log(`PNNL: ${pnnl.length} facilities`)
  const ft = FRACTRACKER ? await loadFracTracker() : []

  const importedAt = new Date().toISOString()
  const rows = dedupe([...pnnl, ...ft], importedAt)
  const merged = rows.filter(r => r.sources.length > 1)
  const crossSource = merged.filter(r => new Set(r.sources.map(s => s.source)).size > 1)
  const byStatus = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {})
  console.log(`After de-duplication: ${rows.length} facilities ${JSON.stringify(byStatus)}; ${merged.length} merged from several records (${crossSource.length} listed by both trackers)`)

  if (DUMP) writeFileSync(DUMP, JSON.stringify(rows, null, 1))
  if (rows.length < MIN_FACILITIES) throw new Error(`Only ${rows.length} facilities — refusing to replace the table (expected at least ${MIN_FACILITIES})`)
  if (DRY_RUN) { console.log('Dry run: nothing written.'); return }

  const db = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from('data_centers').upsert(rows.slice(i, i + 500), { onConflict: 'id' })
    if (error) throw new Error(`Upsert failed at row ${i}: ${error.message}`)
  }
  const { error: delError, count } = await db.from('data_centers').delete({ count: 'exact' }).lt('imported_at', importedAt)
  if (delError) throw new Error(`Removing old rows failed: ${delError.message}`)
  console.log(`Wrote ${rows.length} rows; removed ${count ?? 0} rows from earlier imports.`)
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
