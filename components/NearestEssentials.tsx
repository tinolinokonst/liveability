"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Train, Bus, ShoppingCart, Hospital, Pill, GraduationCap, BookOpen, TreePine, Landmark, MapPin, LucideIcon } from 'lucide-react'
import { AddressMetrics, AmenityPlaces, NearestAmenity, NearestEssentials as NearestEssentialsType } from '@/lib/types'
import { formatDistance } from '@/lib/format'
import { MetricKey } from '@/lib/metricInfo'

const MetricInfoModal = dynamic(() => import('./MetricInfoModal'), { ssr: false })

const EMPTY_PLACES: AmenityPlaces = {
  grocery: [], transit: [], park: [], school: [], healthcare: [],
  dining: [], library: [], bank: [], worship: [], parking: [],
}

interface Category {
  key: keyof Omit<NearestEssentialsType, 'searchRadiusKm'>
  label: string
  icon: LucideIcon
  metricKey: MetricKey
  placesKey: keyof AmenityPlaces
}

const CATEGORIES: Category[] = [
  { key: 'trainStation', label: 'Train Station', icon: Train,       metricKey: 'transit',     placesKey: 'transit' },
  { key: 'busStop',      label: 'Bus Stop',      icon: Bus,         metricKey: 'transit',     placesKey: 'transit' },
  { key: 'grocery',      label: 'Grocery',       icon: ShoppingCart, metricKey: 'grocery',    placesKey: 'grocery' },
  { key: 'hospital',     label: 'Hospital',      icon: Hospital,    metricKey: 'healthcare',  placesKey: 'healthcare' },
  { key: 'pharmacy',     label: 'Pharmacy',      icon: Pill,        metricKey: 'healthcare',  placesKey: 'healthcare' },
  { key: 'school',       label: 'School',        icon: GraduationCap, metricKey: 'school',   placesKey: 'school' },
  { key: 'library',      label: 'Library',       icon: BookOpen,    metricKey: 'library',     placesKey: 'library' },
  { key: 'park',         label: 'Park',          icon: TreePine,    metricKey: 'green',       placesKey: 'park' },
  { key: 'bank',         label: 'Bank / ATM',    icon: Landmark,    metricKey: 'bank',        placesKey: 'bank' },
]

interface Props {
  data: NearestEssentialsType
  metrics: AddressMetrics
  center: { lat: number; lng: number }
}

export default function NearestEssentials({ data, metrics, center }: Props) {
  const [openModal, setOpenModal] = useState<MetricKey | null>(null)
  const [openPlacesKey, setOpenPlacesKey] = useState<keyof AmenityPlaces | null>(null)

  const places = metrics.places ?? EMPTY_PLACES

  function openMap(metricKey: MetricKey, placesKey: keyof AmenityPlaces) {
    setOpenModal(metricKey)
    setOpenPlacesKey(placesKey)
  }

  const modalPlaces: NearestAmenity[] = openPlacesKey ? (places[openPlacesKey] ?? []) : []

  return (
    <>
      <div
        className="rounded-2xl border p-5"
        style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={14} style={{ color: '#f97316' }} />
          <h3 className="text-white font-bold text-sm">Nearest Essentials</h3>
        </div>
        <p className="text-xs mb-4" style={{ color: '#a0a0a0' }}>
          Closest to this address regardless of search radius (up to {data.searchRadiusKm}km)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          {CATEGORIES.map(cat => {
            const item = data[cat.key]
            const Icon = cat.icon
            return (
              <div
                key={cat.key}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: '#0f0f0f' }}
              >
                <Icon size={14} className="shrink-0" style={{ color: '#f97316' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium" style={{ color: '#a0a0a0' }}>{cat.label}</div>
                  <div className="text-white text-sm font-medium truncate leading-tight mt-0.5">
                    {item
                      ? (item.name ?? cat.label)
                      : <span style={{ color: '#a0a0a0' }}>Not found within {data.searchRadiusKm}km</span>
                    }
                  </div>
                </div>
                {item && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold tabular-nums" style={{ color: '#f97316' }}>
                      {formatDistance(item.distanceKm)}
                    </span>
                    <button
                      onClick={() => openMap(cat.metricKey, cat.placesKey)}
                      className="text-xs px-2 py-0.5 rounded-md font-medium transition-colors hover:text-white"
                      style={{ backgroundColor: '#2a2a2a', color: '#a0a0a0', border: '1px solid #3a3a3a' }}
                    >
                      Map
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {openModal && (
        <MetricInfoModal
          metricKey={openModal}
          places={modalPlaces}
          center={center}
          searchRadius={metrics.radius ?? 800}
          crimeIncidents={openModal === 'safety' ? metrics.crimeIncidents : undefined}
          onClose={() => { setOpenModal(null); setOpenPlacesKey(null) }}
        />
      )}
    </>
  )
}
