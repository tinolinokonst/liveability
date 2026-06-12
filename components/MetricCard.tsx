"use client"

interface MetricCardProps {
  label: string
  value: string
  score: number
  description?: string
  source?: string
  updated?: string
  extra?: React.ReactNode
}

function qualityColor(score: number): string {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function qualityLabel(score: number): string {
  if (score >= 70) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}

export default function MetricCard({ label, value, score, description, source, updated, extra }: MetricCardProps) {
  const color = qualityColor(score)
  const quality = qualityLabel(score)

  return (
    <div
      style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
      className="rounded-xl border p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span style={{ color: '#a0a0a0' }} className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ color, backgroundColor: `${color}1a` }}
        >
          {quality}
        </span>
      </div>

      <div className="text-2xl font-bold text-white">{value}</div>

      {description && (
        <p style={{ color: '#a0a0a0' }} className="text-xs leading-relaxed">
          {description}
        </p>
      )}

      {extra}

      <div style={{ backgroundColor: '#2a2a2a' }} className="rounded-full h-1.5 w-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>

      {(source || updated) && (
        <p style={{ color: '#a0a0a0' }} className="text-xs flex items-center gap-1 -mb-1">
          <span>ⓘ</span>
          {source && <span>Source: {source}</span>}
          {source && updated && <span>·</span>}
          {updated && <span>{updated}</span>}
        </p>
      )}
    </div>
  )
}
