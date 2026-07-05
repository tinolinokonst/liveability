import { NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'

// Columbus Division of Police ORI code in the FBI UCR system
const COLUMBUS_ORI = 'OH0250100'
const TIMEOUT_MS = 10000
const UNAVAILABLE = { agencyName: null, violentCrimeRate: null, propertyCrimeRate: null, year: null, available: false, message: 'FBI Crime Data API key not configured' }

export async function GET() {
  const guard = await guardRequest('fbi-crime', 60, 3600)
  if ('response' in guard) return guard.response

  const apiKey = process.env.NEXT_PUBLIC_DATA_GOV_API_KEY
  if (!apiKey) {
    return NextResponse.json(UNAVAILABLE)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const url = `https://api.usa.gov/crime/fbi/cde/summarized/agency/${COLUMBUS_ORI}/violent-crime?from=2018&to=2022&API_KEY=${apiKey}`
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 86400 } })

    if (!res.ok) {
      console.log(`FBI Crime API fetch failed: ${res.status}`)
      return NextResponse.json({ ...UNAVAILABLE, available: false, message: `FBI Crime API error: ${res.status}` })
    }

    const data = await res.json()
    const results: Array<Record<string, unknown>> = data?.results ?? (Array.isArray(data) ? data : [])

    if (results.length === 0) {
      console.log('FBI Crime API returned no results for Columbus PD')
      return NextResponse.json({ ...UNAVAILABLE, available: false, message: 'No FBI crime data found for Columbus' })
    }

    const latest = results[results.length - 1]
    const violentCrimeRate = typeof latest?.rate === 'number' ? latest.rate : null
    const year = typeof latest?.year === 'number' ? latest.year : typeof latest?.data_year === 'number' ? latest.data_year : null

    if (violentCrimeRate === null) {
      return NextResponse.json({ ...UNAVAILABLE, available: false, message: 'FBI violent crime rate not found in response' })
    }

    return NextResponse.json({
      agencyName: 'Columbus Division of Police',
      violentCrimeRate,
      propertyCrimeRate: null,
      year,
      available: true,
    })
  } catch (err) {
    console.log('FBI Crime API error:', err)
    return NextResponse.json({ ...UNAVAILABLE, message: 'FBI Crime Data API request failed' })
  } finally {
    clearTimeout(timeout)
  }
}
