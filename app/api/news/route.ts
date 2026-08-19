import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { cleanQueryText, MAX_NEWS_QUERY_LENGTH } from '@/lib/validate'

const TIMEOUT_MS = 10000

// RSS payloads are XML-escaped, so a headline like "Skydio Opens New R&D Office"
// arrives as "R&amp;D". React escapes on render, so anything left encoded here
// reaches the user literally. &amp; is decoded last: doing it first would turn a
// legitimately escaped "&amp;lt;" into "<" on the following pass.
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  if (!match) return ''
  return decodeEntities(
    match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1')
  ).trim()
}

export async function GET(request: NextRequest) {
  const guard = await guardRequest('news', 60, 3600)
  if ('response' in guard) return guard.response

  const searchParams = request.nextUrl.searchParams
  const query = cleanQueryText(searchParams.get('q'), MAX_NEWS_QUERY_LENGTH)

  if (!query.ok) {
    return NextResponse.json({ error: query.error }, { status: 400 })
  }

  // "when:30d" bounds the feed to the last month. Without it Google happily
  // returns whatever ranks best for the query regardless of age — a panel headed
  // "Local News" was surfacing a four-year-old restaurant listicle.
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${query.value} Switzerland when:30d`)}&hl=en-US&gl=US&ceid=US:en`

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
