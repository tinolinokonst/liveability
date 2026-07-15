import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'
import { areaDisplayName, nearestMatchableArea } from '@/lib/neighborhoods'

// Rentcast only covers the US. For the Swiss deployment the integration is gated
// off and rent estimates come from the Phase 1 city-level cost tiers instead
// (clearly labeled as estimates). The Rentcast client below is kept intact for a
// future non-Swiss deployment; flip the region env var to re-enable it.
const IS_SWISS_DEPLOYMENT = process.env.NEXT_PUBLIC_DEPLOY_REGION !== 'us'

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
//   mode=estimate  → rent estimate (Swiss: city-tier estimate; US: Rentcast AVM)
//   mode=listings  → active rental listings (Swiss: none; US: Rentcast)
//   address=...    → full address string
//   lat=...&lng=...→ coordinate alternative (required for Swiss estimates)
//   radius=...     → miles radius for listings mode (default 2)

export async function GET(request: NextRequest) {
  const guard = await guardRequest('rentcast', 30, 3600)
  if ('response' in guard) return guard.response

  const sp = request.nextUrl.searchParams
  const mode    = sp.get('mode') ?? 'estimate'
  const address = sp.get('address') ?? ''
  const latRaw  = sp.get('lat')
  const lngRaw  = sp.get('lng')
  const radius  = sp.get('radius') ?? '2'

  if (!address && (!latRaw || !lngRaw)) {
    return NextResponse.json({ error: 'Provide address or lat+lng' }, { status: 400 })
  }

  // ── Swiss deployment: no Rentcast coverage ─────────────────────────────────
  if (IS_SWISS_DEPLOYMENT) {
    if (mode === 'listings') {
      // No live rental listings source for Switzerland yet
      return NextResponse.json([])
    }

    const coords = parseCoords(latRaw, lngRaw)
    if (!coords) {
      return NextResponse.json(
        { error: 'Valid Switzerland lat and lng are required for rent estimates' },
        { status: 400 }
      )
    }

    // District-level tier where the address falls in a covered city district
    const area = nearestMatchableArea(coords.lat, coords.lng)
    return NextResponse.json({
      rent: area.rent,
      rentRangeLow: Math.round(area.rent * 0.85),
      rentRangeHigh: Math.round(area.rent * 1.15),
      city: areaDisplayName(area),
      estimated: true,
      source: 'Area-level average, estimated',
    })
  }

  // ── US deployment: Rentcast ────────────────────────────────────────────────
  try {
    if (mode === 'listings') {
      const coords = parseCoords(latRaw, lngRaw)
      if (!coords) {
        return NextResponse.json({ error: 'Valid lat and lng are required' }, { status: 400 })
      }

      const cacheKey = `listings:${coords.lat},${coords.lng}:r${radius}`
      const cached = fromCache(cacheKey)
      if (cached) {
        console.log(`[Rentcast] cache hit: ${cacheKey}`)
        return NextResponse.json(cached)
      }

      const data = await rentcastGet('/listings/rental/long-term', {
        latitude: String(coords.lat),
        longitude: String(coords.lng),
        radius,
        status: 'Active',
        limit: '6',
      })
      toCache(cacheKey, data)
      return NextResponse.json(data)
    }

    // Default: rent estimate (also returns comparables we use as nearby listings)
    let coords: { lat: number; lng: number } | null = null
    if (!address) {
      coords = parseCoords(latRaw, lngRaw)
      if (!coords) {
        return NextResponse.json({ error: 'Valid lat and lng are required' }, { status: 400 })
      }
    }

    const cacheKey = address ? `estimate:${address}` : `estimate:${coords!.lat},${coords!.lng}`
    const cached = fromCache(cacheKey)
    if (cached) {
      console.log(`[Rentcast] cache hit: ${cacheKey}`)
      return NextResponse.json(cached)
    }

    const params: Record<string, string> = address
      ? { address }
      : { latitude: String(coords!.lat), longitude: String(coords!.lng) }

    const data = await rentcastGet('/avm/rent/long-term', params)
    toCache(cacheKey, data)
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Rentcast unavailable'
    console.error('[Rentcast] error:', msg)
    return NextResponse.json({ error: 'Listings data temporarily unavailable' }, { status: 503 })
  }
}
