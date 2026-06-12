import { NewsItem } from './types'

export async function fetchLocalNews(query: string): Promise<NewsItem[]> {
  const res = await fetch(`/api/news?q=${encodeURIComponent(query)}`)
  if (!res.ok) return []

  const data = await res.json()
  return data.items || []
}

export function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60000)
  const diffHours = Math.round(diffMin / 60)
  const diffDays = Math.round(diffHours / 24)

  if (diffMin < 60) return diffMin <= 1 ? 'just now' : `${diffMin} minutes ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  const diffMonths = Math.round(diffDays / 30)
  return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`
}
