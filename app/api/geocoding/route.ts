import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 })
  }

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured' }, { status: 500 })
  }

  const query = address.toLowerCase().includes('columbus') ? address : `${address}, Columbus, OH`
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`

  const res = await fetch(url)
  const data = await res.json()

  return NextResponse.json(data)
}
