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
  updated?: string
  metricKey?: MetricKey
  detail?: React.ReactNode
  icon?: LucideIcon
}

export default function InfoCard({ label, value, description, source, updated, metricKey, detail, icon: Icon }: InfoCardProps) {
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
        <div className="flex items-center justify-between">
          <span style={{ color: '#a0a0a0' }} className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
            {Icon && <Icon size={14} />}
            {label}
          </span>
        </div>

        <div className="text-2xl font-bold text-white">{value}</div>

        {description && (
          <p style={{ color: '#a0a0a0' }} className="text-xs leading-relaxed">
            {description}
          </p>
        )}

        {(source || updated) && (
          <p style={{ color: '#a0a0a0' }} className="text-xs flex items-center gap-1 -mb-1">
            <Info size={12} />
            {source && <span>Source: {source}</span>}
            {source && updated && <span>·</span>}
            {updated && <span>{updated}</span>}
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
