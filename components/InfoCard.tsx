"use client"

import { useState } from 'react'
import { Info, LucideIcon } from 'lucide-react'
import { MetricKey } from '@/lib/metricInfo'
import MetricInfoModal from './MetricInfoModal'

interface InfoCardProps {
  label: string
  value: string
  description?: string
  source?: string
  metricKey?: MetricKey
  detail?: React.ReactNode
  icon?: LucideIcon
}

export default function InfoCard({ label, value, description, source, metricKey, detail, icon: Icon }: InfoCardProps) {
  const [showInfo, setShowInfo] = useState(false)
  const clickable = !!metricKey

  return (
    <>
      <div
        style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
        className={`rounded-xl border p-4 flex flex-col gap-3 ${clickable ? 'cursor-pointer transition-colors hover:border-[#f97316]' : ''}`}
        onClick={clickable ? () => setShowInfo(true) : undefined}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <span style={{ color: '#a0a0a0' }} className="min-w-0 break-words text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
            {Icon && <Icon size={14} className="shrink-0" />}
            {label}
          </span>
        </div>

        <div className="text-2xl font-bold text-white">{value}</div>

        {description && (
          <p style={{ color: '#a0a0a0' }} className="text-xs leading-relaxed">
            {description}
          </p>
        )}

        {/* Cards sit in a two-column grid at 375px, so this line has ~130px:
            the text must be allowed to shrink and wrap beside the icon. */}
        {source && (
          <p style={{ color: '#a0a0a0' }} className="text-xs flex items-start gap-1 -mb-1">
            <Info size={12} className="shrink-0 mt-px" />
            <span className="min-w-0 break-words">Source: {source}</span>
          </p>
        )}
      </div>

      {showInfo && metricKey && (
        <MetricInfoModal
          metricKey={metricKey}
          detail={detail}
          onClose={() => setShowInfo(false)}
        />
      )}
    </>
  )
}
