// The US AI Match areas as the client needs them: names to match the answer's
// headings, and an address to open in the US address view. The scores stay
// server-side (lib/usAiMatch.ts).
import areasFile from './data/us-areas.json'

export interface UsAreaRef { name: string; address: string; lat: number; lng: number }

export const US_AREA_REFS: UsAreaRef[] = (areasFile as unknown as { areas: Array<{ name: string; city: string; address: string; lat: number; lng: number }> }).areas
  .map(a => ({ name: `${a.name}, ${a.city}`, address: a.address, lat: a.lat, lng: a.lng }))

export function findUsArea(heading: string): UsAreaRef | null {
  const h = heading.toLowerCase().trim()
  const exact = US_AREA_REFS.find(a => a.name.toLowerCase() === h)
  if (exact) return exact
  // The model sometimes trims the city: prefer the longest name it contains
  const partial = US_AREA_REFS.filter(a => h.includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(h))
  return partial.length ? partial.reduce((x, y) => (y.name.length > x.name.length ? y : x)) : null
}
