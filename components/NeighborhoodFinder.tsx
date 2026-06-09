"use client"

import { useState } from 'react'
import { Neighborhood, WeightConfig } from '@/lib/types'

const COLUMBUS_NEIGHBORHOODS: Neighborhood[] = [
  {
    name: 'German Village',
    walkability: 83, air: 78, green: 82, grocery: 70, transit: 58, safety: 78, rent: 1650,
    notes: ['Historic brick streets', 'Beautiful parks', 'High walkability', 'Good air quality'],
  },
  {
    name: 'Clintonville',
    walkability: 68, air: 82, green: 88, grocery: 78, transit: 52, safety: 82, rent: 1350,
    notes: ['Excellent air quality', 'Most green space', 'Family friendly', 'Very affordable'],
  },
  {
    name: 'Grandview Heights',
    walkability: 76, air: 79, green: 70, grocery: 80, transit: 52, safety: 88, rent: 1600,
    notes: ['Very safe', 'Great grocery access', 'Good restaurants', 'Family friendly'],
  },
  {
    name: 'Bexley',
    walkability: 63, air: 86, green: 88, grocery: 72, transit: 42, safety: 90, rent: 1700,
    notes: ['Excellent safety', 'Best air quality', 'Beautiful parks', 'Suburban feel'],
  },
  {
    name: 'Short North',
    walkability: 88, air: 68, green: 60, grocery: 82, transit: 75, safety: 55, rent: 1800,
    notes: ['Most walkable', 'Best transit', 'Vibrant nightlife', 'Higher rent'],
  },
  {
    name: 'Victorian Village',
    walkability: 79, air: 76, green: 80, grocery: 68, transit: 58, safety: 72, rent: 1500,
    notes: ['Historic homes', 'Good green space', 'Near OSU', 'Quiet streets'],
  },
  {
    name: 'Italian Village',
    walkability: 76, air: 63, green: 55, grocery: 70, transit: 70, safety: 60, rent: 1400,
    notes: ['Near downtown', 'Good transit', 'Trendy & growing', 'Limited green space'],
  },
  {
    name: 'Westerville',
    walkability: 48, air: 88, green: 80, grocery: 76, transit: 28, safety: 92, rent: 1550,
    notes: ['Very safe', 'Clean air', 'Suburban', 'Car required'],
  },
  {
    name: 'Dublin',
    walkability: 42, air: 90, green: 84, grocery: 78, transit: 28, safety: 94, rent: 1900,
    notes: ['Cleanest air', 'Safest area', 'Suburban', 'Car required'],
  },
  {
    name: 'Franklinton',
    walkability: 52, air: 52, green: 45, grocery: 50, transit: 68, safety: 42, rent: 950,
    notes: ['Most affordable', 'Arts district', 'Improving rapidly', 'Lower safety scores'],
  },
]

const DEFAULT_WEIGHTS: WeightConfig = {
  walkability: 20,
  air: 20,
  green: 15,
  grocery: 15,
  transit: 15,
  safety: 15,
}

const PRESETS: Array<{ label: string; weights: WeightConfig }> = [
  { label: 'Balanced',  weights: DEFAULT_WEIGHTS },
  { label: 'Clean Air', weights: { walkability: 10, air: 50, green: 15, grocery: 10, transit: 5,  safety: 10 } },
  { label: 'Walkable',  weights: { walkability: 50, air: 10, green: 10, grocery: 15, transit: 15, safety: 0  } },
  { label: 'Safest',    weights: { walkability: 10, air: 10, green: 10, grocery: 10, transit: 10, safety: 50 } },
  { label: 'Budget',    weights: { walkability: 20, air: 10, green: 10, grocery: 20, transit: 20, safety: 20 } },
]

const WEIGHT_LABELS: Array<{ key: keyof WeightConfig; label: string }> = [
  { key: 'walkability', label: 'Walkability' },
  { key: 'air',         label: 'Air Quality' },
  { key: 'green',       label: 'Green Space' },
  { key: 'grocery',     label: 'Grocery'     },
  { key: 'transit',     label: 'Transit'     },
  { key: 'safety',      label: 'Safety'      },
]

function scoreNeighborhood(n: Neighborhood, w: WeightConfig): number {
  const total = Object.values(w).reduce((a, b) => a + b, 0)
  if (total === 0) return 0
  return Math.round(
    (n.walkability * w.walkability +
      n.air * w.air +
      n.green * w.green +
      n.grocery * w.grocery +
      n.transit * w.transit +
      n.safety * w.safety) / total
  )
}

function qualityColor(s: number) {
  if (s >= 70) return '#22c55e'
  if (s >= 40) return '#f59e0b'
  return '#ef4444'
}

function rentLabel(rent: number) {
  if (rent < 1200) return { label: 'Affordable', color: '#22c55e' }
  if (rent < 1600) return { label: 'Moderate',   color: '#f59e0b' }
  return                  { label: 'Pricey',      color: '#ef4444' }
}

export default function NeighborhoodFinder() {
  const [weights, setWeights] = useState<WeightConfig>(DEFAULT_WEIGHTS)
  const [activePreset, setActivePreset] = useState('Balanced')

  const ranked = [...COLUMBUS_NEIGHBORHOODS]
    .map(n => ({ ...n, score: scoreNeighborhood(n, weights) }))
    .sort((a, b) => b.score - a.score)

  function applyPreset(preset: typeof PRESETS[number]) {
    setWeights(preset.weights)
    setActivePreset(preset.label)
  }

  function handleWeight(key: keyof WeightConfig, value: number) {
    setWeights(prev => ({ ...prev, [key]: value }))
    setActivePreset('Custom')
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Presets */}
      <div>
        <p style={{ color: '#a0a0a0' }} className="text-xs font-medium mb-3 uppercase tracking-wider">Quick presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: activePreset === p.label ? '#f97316' : '#2a2a2a',
                color: activePreset === p.label ? 'white' : '#a0a0a0',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Weight sliders */}
      <div
        className="rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-4"
        style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
      >
        {WEIGHT_LABELS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span style={{ color: '#a0a0a0' }} className="text-xs">{label}</span>
              <span className="text-xs font-bold text-white">{weights[key]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={weights[key]}
              onChange={e => handleWeight(key, Number(e.target.value))}
              className="w-full"
            />
          </div>
        ))}
      </div>

      {/* Rankings */}
      <div className="flex flex-col gap-3">
        <p style={{ color: '#a0a0a0' }} className="text-xs font-medium uppercase tracking-wider">
          Columbus neighborhoods ranked
        </p>
        {ranked.map((n, i) => {
          const rent = rentLabel(n.rent)
          const bar = qualityColor(n.score)
          return (
            <div
              key={n.name}
              className="rounded-xl p-4 flex gap-4 items-start"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            >
              <div
                className="text-lg font-bold shrink-0 w-8 text-center"
                style={{ color: i === 0 ? '#f97316' : '#a0a0a0' }}
              >
                #{i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-white text-sm">{n.name}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ color: rent.color, backgroundColor: `${rent.color}1a` }}
                  >
                    ${n.rent.toLocaleString()}/mo · {rent.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {n.notes.map(note => (
                    <span
                      key={note}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#2a2a2a', color: '#a0a0a0' }}
                    >
                      {note}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#2a2a2a' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${n.score}%`, backgroundColor: bar }}
                    />
                  </div>
                  <span className="text-sm font-bold text-white shrink-0">{n.score}/100</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ color: '#a0a0a0' }} className="text-xs text-center">
        Scores based on real characteristics of each Columbus neighborhood. Adjust weights to match your priorities.
      </p>
    </div>
  )
}
