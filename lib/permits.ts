// Construction watch — shared between the cron job, the UI and emails.
//
// Source: building-permit notices in the cantonal official gazettes, read
// through the amtsblattportal.ch open API (operated by SECO). Its terms
// (AGB 07.06.2024, §3.1–3.3) allow personal and commercial use, provided we
// follow Swiss data-protection law, credit the source, and make clear this is
// not an official publication — hence PERMIT_DISCLAIMER wherever permits show.
//
// Privacy: notices name the applicants. Nothing here ever reads, stores or
// shows them — only a category derived from the project description (the
// description itself is discarded: free text can contain names), the project
// address, the publication date and a link to the official notice.

export const WATCH_RADIUS_M = 300

export interface PermitSource {
  canton: string
  /** Gazette sub-rubric for municipal building permits */
  subRubric: string
  /** The canton's gazette, where each notice's page lives */
  gazette: string
  gazetteName: string
}

// Cantons whose permit notices use the structured form (separate street,
// house number, postcode and town). Others publish on the same portal but put
// the location in free text, or run their own gazette without an API.
export const PERMIT_SOURCES: PermitSource[] = [
  { canton: 'ZH', subRubric: 'BP-ZH01', gazette: 'https://amtsblatt.zh.ch', gazetteName: 'Amtsblatt des Kantons Zürich' },
  { canton: 'BE', subRubric: 'BP-BE10', gazette: 'https://amtsblatt.be.ch', gazetteName: 'Amtsblatt des Kantons Bern' },
  { canton: 'BS', subRubric: 'BP-BS10', gazette: 'https://kantonsblatt.ch', gazetteName: 'Kantonsblatt Basel-Stadt' },
  { canton: 'ZG', subRubric: 'BP-ZG10', gazette: 'https://amtsblatt.zg.ch', gazetteName: 'Amtsblatt des Kantons Zug' },
  { canton: 'AR', subRubric: 'BP-AR10', gazette: 'https://amtsblatt.ar.ch', gazetteName: 'Amtsblatt Appenzell Ausserrhoden' },
  { canton: 'TI', subRubric: 'BP-TI10', gazette: 'https://foglioufficiale.ti.ch', gazetteName: 'Foglio ufficiale del Cantone Ticino' },
]

export const PERMIT_CANTONS = new Set(PERMIT_SOURCES.map(s => s.canton))

export const PERMIT_DISCLAIMER =
  'Not an official publication. The notice signed by SECO on the Official Gazettes Portal (amtsblattportal.ch) is authoritative.'

export function noticeUrl(source: PermitSource, publicationId: string): string {
  return `${source.gazette}/#!/search/publications/detail/${publicationId}`
}

export interface Permit {
  id: string
  canton: string
  address: string
  lat: number | null
  lng: number | null
  project_type: string
  published_at: string
  source_url: string
}

// ─── project type ────────────────────────────────────────────────────────────
// Coarse categories from keywords in the description (de / fr / it). Order
// matters: the first match wins, most specific first — "Neubau Carport" is a
// carport, "Abbruch und Neubau Einfamilienhaus" is a replacement building.

const PROJECT_TYPES: Array<[RegExp, string]> = [
  [/abbruch|rückbau|ersatzneubau|démoli|demoliz/i, 'Demolition or replacement building'],
  [/photovolta|\bpv\b|pv-|solar|fotovolta/i, 'Solar panels'],
  [/pool|schwimmbad|piscine|piscina/i, 'Swimming pool'],
  [/wärmepumpe|heizung|klima|pompe à chaleur|chauffage|climatisation|termopompa|riscaldamento|climatizza/i, 'Heating or cooling system'],
  // Not bare "werbe": it would match "Gewerbe" (commercial space)
  [/reklame|werbeanlage|werbetafel|beschriftung|schautafel|enseigne|publicit|insegna/i, 'Signage'],
  [/mobilfunk|antenne|antenna|\b5g\b/i, 'Mobile phone antenna'],
  [/carport|autounterstand|velounterstand/i, 'Parking or carport'],
  [/neubau|nouvelle construction|construction d|nuova costruzione|costruzione di/i, 'New building'],
  [/anbau|aufstockung|aufbau|ausbau|erweiterung|vergrösserung|vergrößerung|lukarne|agrandissement|surélévation|ampliamento|sopraelevazione/i, 'Extension'],
  [/liegeboxen|\bstall|ökonomiegebäude|remise|rural|agricol/i, 'Agricultural building'],
  [/umbau|sanierung|renovation|nutzung|ersatz|erneuerung|fenster|fassade|einbau|änderung|transformation|rénovation|affectation|ristruttura|trasforma|risanamento/i, 'Renovation or conversion'],
  [/sichtschutz|zaun|mauer|pergola|überdachung|sitzplatz|clôture|couvert|muro|recinzione|tettoia/i, 'Fence, wall or outdoor structure'],
  [/leitung|kanalisation|reservoir|conduite|canalisation|condotta|canalizzazione/i, 'Utility works'],
  // After new building: "Neubau MFH mit Tiefgarage" is a new building
  [/garage|parkpl|parking|autorimessa|posteggi/i, 'Parking or carport'],
  [/umgebung|garten|terrasse|aménagement ext|sistemazione esterna/i, 'Landscaping'],
  [/befristet|temporär|provisorisch|temporaire|provisoire|temporane/i, 'Temporary use'],
]

export function classifyProject(description: string): string {
  for (const [pattern, label] of PROJECT_TYPES) if (pattern.test(description)) return label
  return 'Other building project'
}

// ─── distance ────────────────────────────────────────────────────────────────

export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Lat/lng box that contains every point within radiusM — a cheap prefilter before distanceM */
export function boundingBox(lat: number, lng: number, radiusM: number) {
  const dLat = radiusM / 111320
  const dLng = radiusM / (111320 * Math.cos((lat * Math.PI) / 180))
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng }
}
