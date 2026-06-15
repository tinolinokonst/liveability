import { NextRequest, NextResponse } from 'next/server'
import { pm25ToAqi, aqiToCategory } from '@/lib/aqi'
import { aqiColor } from '@/lib/metricInfo'

const RADIUS_KM = 15

export interface PurpleAirSensor {
  lat: number
  lng: number
  aqi: number
  category: string
  color: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_PURPLEAIR_API_KEY
  if (!apiKey) {
    return NextResponse.json({ sensors: [] })
  }

  const latDelta = RADIUS_KM / 111
  const lngDelta = RADIUS_KM / (111 * Math.cos((lat * Math.PI) / 180))

  const params = new URLSearchParams({
    fields: 'latitude,longitude,pm2.5_atm,pm2.5',
    nwlat: String(lat + latDelta),
    nwlng: String(lng - lngDelta),
    selat: String(lat - latDelta),
    selng: String(lng + lngDelta),
  })

  try {
    const res = await fetch(`https://api.purpleair.com/v1/sensors?${params.toString()}`, {
      headers: { 'X-API-Key': apiKey },
      next: { revalidate: 600 },
    })

    if (!res.ok) {
      return NextResponse.json({ sensors: [] })
    }

    const data = await res.json()
    const fields: string[] = data.fields ?? []
    const latIdx = fields.indexOf('latitude')
    const lngIdx = fields.indexOf('longitude')
    const pmIdx = fields.indexOf('pm2.5')
    const pmAtmIdx = fields.indexOf('pm2.5_atm')

    const rows: unknown[][] = data.data ?? []
    const sensors: PurpleAirSensor[] = rows
      .map(row => {
        const sLat = row[latIdx] as number | undefined
        const sLng = row[lngIdx] as number | undefined
        const pm = (pmIdx >= 0 ? row[pmIdx] : row[pmAtmIdx]) as number | null | undefined
        if (sLat == null || sLng == null || pm == null) return null
        const aqi = pm25ToAqi(pm)
        const category = aqiToCategory(aqi)
        return { lat: sLat, lng: sLng, aqi, category, color: aqiColor(category) }
      })
      .filter((s): s is PurpleAirSensor => s !== null)

    return NextResponse.json({ sensors })
  } catch (err) {
    console.log('PurpleAir fetch error:', err)
    return NextResponse.json({ sensors: [] })
  }
}
