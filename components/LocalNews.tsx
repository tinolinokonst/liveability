"use client"

import { useEffect, useState } from 'react'
import { fetchLocalNews, relativeTime } from '@/lib/news'
import { NewsItem } from '@/lib/types'

interface LocalNewsProps {
  query: string
}

export default function LocalNews({ query }: LocalNewsProps) {
  const [items, setItems] = useState<NewsItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setItems(null)

    fetchLocalNews(query).then(result => {
      if (!cancelled) setItems(result)
    })

    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
    >
      <p style={{ color: '#a0a0a0' }} className="text-xs font-medium uppercase tracking-wider mb-3">
        Local News
      </p>

      {items === null && (
        <p style={{ color: '#a0a0a0' }} className="text-xs">Loading news...</p>
      )}

      {items !== null && items.length === 0 && (
        <p style={{ color: '#a0a0a0' }} className="text-xs">No recent news found for this area</p>
      )}

      {items !== null && items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map(item => (
            <li key={item.link}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline"
                style={{ color: 'white' }}
              >
                {item.title}
              </a>
              <p style={{ color: '#a0a0a0' }} className="text-xs mt-0.5">
                {item.source}{item.source && item.pubDate ? ' · ' : ''}{item.pubDate ? relativeTime(item.pubDate) : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
