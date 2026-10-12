// Server-side: fetch building-permit notices from the amtsblattportal.ch open
// API and turn them into Permit rows.
//
// Privacy by construction: from each notice only two elements are ever read —
// <projectLocation> (the address of the works) and <projectDescription> (used
// once to pick a category, then discarded). <buildingContractor>,
// <projectFramer> and <delegation>, which carry names and home addresses, are
// never extracted, so they can't leak into the database, logs or emails.

import { classifyProject, noticeUrl, Permit, PermitSource } from './permits'

const API = 'https://amtsblattportal.ch/api/v1/publications'
const SEARCH = 'https://api3.geo.admin.ch/rest/services/api/SearchServer'
const TIMEOUT_MS = 15000
const PAGE_SIZE = 100

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/xml, application/json' } })
    if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`)
    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
}

/** Text of the first <tag> inside xml, decoded and trimmed; '' if absent */
function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))
  return m ? decodeXml(m[1]).replace(/\s+/g, ' ').trim() : ''
}

export interface FeedEntry {
  id: string
  source: PermitSource
  publishedAt: string
  ref: string
}

/** Notices published in [start, end] for one canton (list only — no content) */
export async function listNotices(source: PermitSource, start: string, end: string): Promise<FeedEntry[]> {
  const entries: FeedEntry[] = []
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({
      publicationStates: 'PUBLISHED',
      subRubrics: source.subRubric,
      'publicationDate.start': start,
      'publicationDate.end': end,
      'pageRequest.size': String(PAGE_SIZE),
      'pageRequest.page': String(page),
    })
    const xml = await fetchText(`${API}/xml?${params}`)
    const blocks = xml.split('<publication ref="').slice(1)
    for (const block of blocks) {
      const ref = block.slice(0, block.indexOf('"'))
      const id = tag(block, 'id')
      const publishedAt = tag(block, 'publicationDate')
      if (/^[0-9a-f-]{36}$/.test(id) && /^\d{4}-\d{2}-\d{2}$/.test(publishedAt) && ref.startsWith(`${API}/`)) {
        entries.push({ id, source, publishedAt, ref })
      }
    }
    if (blocks.length < PAGE_SIZE) break
  }
  return entries
}

export interface ParsedNotice {
  /** Street + number, postcode and town of the works, as published */
  address: string
  street: string
  zip: string
  town: string
  projectType: string
}

/** Reads ONLY <projectLocation> and <projectDescription> (see header) */
export function parseNotice(xml: string): ParsedNotice | null {
  const content = xml.slice(xml.indexOf('<content>'))
  const location = content.match(/<projectLocation>([\s\S]*?)<\/projectLocation>/)?.[1]
  if (!location) return null
  // ZH puts the parcel number after a comma ("Neugutstrasse 5, Kat.-Nr. 5618")
  const rawStreet = tag(location, 'street').split(/,\s*(?:Kat|Grundst|Parz|Vers|Ass|GB|Kataster|parcelle|mappale)/i)[0].trim()
  const houseNumber = tag(location, 'houseNumber')
  const street = [rawStreet, houseNumber].filter(Boolean).join(' ').slice(0, 150)
  const zip = tag(location, 'swissZipCode').slice(0, 4)
  const town = tag(location, 'town').slice(0, 80)
  if (!town && !street) return null
  const description = tag(content, 'projectDescription')
  return {
    address: [street, [zip, town].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    street,
    zip,
    town,
    projectType: classifyProject(description),
  }
}

/**
 * Official building address → coordinates via swisstopo's address search
 * (geo.admin.ch; free, and results may be stored, unlike commercial geocoders).
 * Requires a street and a postcode match, so a vague location never lands on a
 * town centre and triggers false "within 300 m" alerts.
 */
export async function geocodeNotice(n: ParsedNotice): Promise<{ lat: number; lng: number } | null> {
  if (!n.street || !/\d/.test(n.street)) return null
  const params = new URLSearchParams({
    type: 'locations',
    origins: 'address',
    limit: '1',
    searchText: `${n.street} ${n.zip} ${n.town}`.trim(),
  })
  const data = JSON.parse(await fetchText(`${SEARCH}?${params}`)) as {
    results?: Array<{ attrs: { label: string; lat: number; lon: number } }>
  }
  const hit = data.results?.[0]?.attrs
  if (!hit) return null
  if (n.zip && !hit.label.includes(n.zip)) return null
  return { lat: hit.lat, lng: hit.lon }
}

/** Fetch, parse and geocode one notice. Returns null when it has no usable location. */
export async function buildPermit(entry: FeedEntry): Promise<Permit | null> {
  const parsed = parseNotice(await fetchText(entry.ref))
  if (!parsed) return null
  const coords = await geocodeNotice(parsed)
  return {
    id: entry.id,
    canton: entry.source.canton,
    address: parsed.address,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    project_type: parsed.projectType,
    published_at: entry.publishedAt,
    source_url: noticeUrl(entry.source, entry.id),
  }
}
