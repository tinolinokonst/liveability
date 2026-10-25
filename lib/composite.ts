// The weighted mean behind both Liveability Scores (lib/metrics.ts for
// Switzerland, lib/usScore.ts for the US). Dependency-free on purpose, so the
// US score and build scripts can use it without the Swiss providers.

/**
 * Weighted mean over whichever metrics resolved, renormalised so a missing
 * source (sunlight outside Solar API coverage, say) redistributes its weight
 * rather than dragging the score toward zero.
 */
export function compositeScore(parts: Array<[number | null | undefined, number]>): number {
  const available = parts.filter((p): p is [number, number] => p[0] != null)
  if (available.length === 0) return 0
  const totalWeight = available.reduce((sum, [, w]) => sum + w, 0)
  return Math.round(available.reduce((sum, [v, w]) => sum + v * w, 0) / totalWeight)
}
