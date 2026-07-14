import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'

const TIMEOUT_MS = 10000

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  if (!match) return ''
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1')
    .trim()
}

export async function GET(request: NextRequest) {
  const guard = await guardRequest('news', 60, 3600)
  if ('response' in guard) return guard.response

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'q is required' }, { status: 400 })
  }

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} Switzerland`)}&hl=en-US&gl=US&ceid=US:en`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal })

    if (!res.ok) {
      console.log(`Google News RSS fetch failed: status ${res.status}`)
      return NextResponse.json({ items: [] })
    }

    const xml = await res.text()
    const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || []

    const items = itemBlocks.slice(0, 5).map(block => ({
      title: extractTag(block, 'title'),
      link: extractTag(block, 'link'),
      pubDate: extractTag(block, 'pubDate'),
      source: extractTag(block, 'source'),
    }))

    return NextResponse.json({ items })
  } catch (err) {
    console.log('Google News RSS fetch error:', err)
    return NextResponse.json({ items: [] })
  } finally {
    clearTimeout(timeout)
  }
}
