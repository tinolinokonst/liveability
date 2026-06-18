import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.rentcast.io/v1'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

// In-memory cache — survives hot reloads in dev, resets on cold starts in production
const cache = new Map<string, { data: unknown; ts: number }>()
let requestCount = 0

function fromCache(key: string): unknown | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL_MS) { cache.delete(key); return null }
  return entry.data
}

function toCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() })
}

async function rentcastGet(path: string, params: Record<string, string>): Promise<unknown> {
  const apiKey = process.env.RENTCAST_API_KEY
  if (!apiKey) throw new Error('RENTCAST_API_KEY not configured')

  requestCount++
  console.log(`[Rentcast] request #${requestCount} this session: ${path}`, params)

  const url = new URL(`${BASE}${path}`)
  for (const [k, v] of Object.entries(params)) {
    if (v !== '') url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), {
    headers: { 'X-Api-Key': apiKey },
    // No Next.js caching — we handle it ourselves to share across routes
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `Rentcast ${res.status}`)
  }

  return res.json()
}

// ── GET /api/rentcast ────────────────────────────────────────────────────────
// Query params:
//   mode=estimate  → GET /avm/rent/long-term (default)
//   mode=listings  → GET /listings/rental/long-term
//   address=...    → full address string
//   lat=...&lng=...→ coordinate alternative
//   radius=...     → miles radius for listings mode (default 2)

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const mode    = sp.get('mode') ?? 'estimate'
  const address = sp.get('address') ?? ''
  const lat     = sp.get('lat') ?? ''
  const lng     = sp.get('lng') ?? ''
  const radius  = sp.get('radius') ?? '2'

  if (!address && (!lat || !lng)) {
    return NextResponse.json({ error: 'Provide address or lat+lng' }, { status: 400 })
  }

  try {
    if (mode === 'listings') {
      if (!lat || !lng) {
        return NextResponse.json({ error: 'lat+lng required for listings mode' }, { status: 400 })
      }
      const cacheKey = `listings:${lat},${lng}:r${radius}`
      const cached = fromCache(cacheKey)
      if (cached) {
        console.log(`[Rentcast] cache hit: ${cacheKey}`)
        return NextResponse.json(cached)
      }

      const data = await rentcastGet('/listings/rental/long-term', {
        latitude: lat,
        longitude: lng,
        radius,
        status: 'Active',
        limit: '6',
      })
      toCache(cacheKey, data)
      return NextResponse.json(data)
    }

    // Default: rent estimate (also returns comparables we use as nearby listings)
    const cacheKey = address ? `estimate:${address}` : `estimate:${lat},${lng}`
    const cached = fromCache(cacheKey)
    if (cached) {
      console.log(`[Rentcast] cache hit: ${cacheKey}`)
      return NextResponse.json(cached)
    }

    const params: Record<string, string> = address
      ? { address }
      : { latitude: lat, longitude: lng }

    const data = await rentcastGet('/avm/rent/long-term', params)
    toCache(cacheKey, data)
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Rentcast unavailable'
    console.error('[Rentcast] error:', msg)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
