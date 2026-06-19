"use client"

import { ReactNode, useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Maximize2, Minimize2 } from 'lucide-react'
import { CrimeIncidentLocation, NearestAmenity } from '@/lib/types'

export interface LegendItem {
  color: string
  label: string
  active?: boolean
  shape?: 'circle' | 'square'
}

export interface ContextCircle {
  radiusMeters: number
  label: string
  color?: string
}

interface NearestOutside {
  lat: number
  lng: number
  name: string | null
  distanceKm: number
}

interface MetricInfoMapProps {
  center: { lat: number; lng: number }
  centerLabel: ReactNode
  centerColor?: string
  markers?: NearestAmenity[]
  incidents?: CrimeIncidentLocation[]
  circleRadiusMeters?: number
  circleLabel?: ReactNode
  searchRadiusMeters?: number
  contextCircle?: ContextCircle
  nearestOutside?: NearestOutside
  legend?: LegendItem[]
  height?: number
}

const POLYGON_STYLE: Record<string, { fillOpacity: number; opacity: number }> = {
  '#22c55e': { fillOpacity: 0.25, opacity: 0.7 },
  '#f97316': { fillOpacity: 0.20, opacity: 0.6 },
  '#ef4444': { fillOpacity: 0.20, opacity: 0.6 },
  '#3b82f6': { fillOpacity: 0.20, opacity: 0.6 },
  '#8b5cf6': { fillOpacity: 0.20, opacity: 0.6 },
}

const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const DARK_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

function MapScrollController({ enabled }: { enabled: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (enabled) map.scrollWheelZoom.enable()
    else map.scrollWheelZoom.disable()
  }, [map, enabled])
  return null
}

function MapResizer({ trigger }: { trigger: boolean }) {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 300)
    return () => clearTimeout(t)
  }, [map, trigger])
  return null
}

const CLUSTER_DEGREES = 0.0007 // roughly ~70m grid cells for incident clustering

function dotIcon(color: string, size = 14): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid #1a1a1a;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.6)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function clusterCountIcon(color: string, count: number): L.DivIcon {
  const size = count > 1 ? Math.min(34, 14 + count * 2) : 8
  const fontSize = Math.max(9, Math.min(13, size / 2.6))
  const label = count > 1 ? `<span style="color:#fff;font-size:${fontSize}px;font-weight:700">${count}</span>` : ''
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid #1a1a1a;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function clusterIncidents(incidents: CrimeIncidentLocation[]): Array<{ lat: number; lng: number; count: number }> {
  const cells = new Map<string, { lat: number; lng: number; count: number }>()
  for (const inc of incidents) {
    const key = `${Math.round(inc.lat / CLUSTER_DEGREES)}:${Math.round(inc.lng / CLUSTER_DEGREES)}`
    const existing = cells.get(key)
    if (existing) {
      existing.count += 1
    } else {
      cells.set(key, { lat: inc.lat, lng: inc.lng, count: 1 })
    }
  }
  return [...cells.values()]
}

export default function MetricInfoMap({
  center,
  centerLabel,
  centerColor = '#f97316',
  markers = [],
  incidents = [],
  circleRadiusMeters,
  circleLabel,
  searchRadiusMeters,
  contextCircle,
  nearestOutside,
  legend,
  height = 380,
}: MetricInfoMapProps) {
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    if (!fullscreen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        setFullscreen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [fullscreen])

  const points = markers.filter(m => m.lat !== undefined && m.lng !== undefined)
  const clusters = clusterIncidents(incidents)

  const bounds: [number, number][] = [
    [center.lat, center.lng],
    ...points.map(p => [p.lat as number, p.lng as number] as [number, number]),
    ...clusters.map(c => [c.lat, c.lng] as [number, number]),
    ...(nearestOutside ? [[nearestOutside.lat, nearestOutside.lng] as [number, number]] : []),
  ]

  const mapChildren = (
    <>
      <TileLayer
        url={DARK_TILE_URL}
        attribution={DARK_TILE_ATTRIBUTION}
        keepBuffer={4}
        updateWhenIdle={true}
        updateWhenZooming={false}
      />

      {contextCircle && (
        <Circle
          center={[center.lat, center.lng]}
          radius={contextCircle.radiusMeters}
          pathOptions={{
            color: contextCircle.color ?? centerColor,
            fillColor: contextCircle.color ?? centerColor,
            fillOpacity: 0.04,
            opacity: 0.25,
            weight: 1,
          }}
        >
          <Popup>{contextCircle.label}</Popup>
        </Circle>
      )}

      <Marker position={[center.lat, center.lng]} icon={dotIcon(centerColor, 22)}>
        <Popup>{centerLabel}</Popup>
      </Marker>

      {points.map((m, i) => {
        const popup = (
          <Popup>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-white text-xs">{m.name}</span>
              <span className="text-xs" style={{ color: '#a0a0a0' }}>
                {m.category ? `${m.category} · ` : ''}{m.distanceKm}km away
              </span>
            </div>
          </Popup>
        )
        if (m.polygon && m.polygonColor) {
          const ps = POLYGON_STYLE[m.polygonColor] ?? { fillOpacity: 0.2, opacity: 0.6 }
          return (
            <Polygon
              key={i}
              positions={m.polygon}
              pathOptions={{
                color: m.polygonColor,
                fillColor: m.polygonColor,
                fillOpacity: ps.fillOpacity,
                opacity: ps.opacity,
                weight: 2,
              }}
            >
              {popup}
            </Polygon>
          )
        }
        return (
          <Marker key={i} position={[m.lat as number, m.lng as number]} icon={dotIcon('#9ca3af', 10)}>
            {popup}
          </Marker>
        )
      })}

      {nearestOutside && (
        <Marker
          position={[nearestOutside.lat, nearestOutside.lng]}
          icon={dotIcon('#ef4444', 16)}
        >
          <Popup>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-white text-xs">
                {nearestOutside.name ?? 'Nearest'}
              </span>
              <span className="text-xs" style={{ color: '#a0a0a0' }}>
                {nearestOutside.distanceKm}km away (outside radius)
              </span>
            </div>
          </Popup>
        </Marker>
      )}

      {clusters.map((c, i) => (
        <Marker key={`incident-${i}`} position={[c.lat, c.lng]} icon={clusterCountIcon('#ef4444', c.count)}>
          <Popup>{c.count} reported incident{c.count > 1 ? 's' : ''}</Popup>
        </Marker>
      ))}

      {circleRadiusMeters !== undefined && (
        <Circle
          center={[center.lat, center.lng]}
          radius={circleRadiusMeters}
          pathOptions={{ color: '#ef4444', fillOpacity: 0.08 }}
        >
          {circleLabel && <Popup>{circleLabel}</Popup>}
        </Circle>
      )}

      {searchRadiusMeters !== undefined && (
        <Circle
          center={[center.lat, center.lng]}
          radius={searchRadiusMeters}
          pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.1, opacity: 0.4 }}
        />
      )}
    </>
  )

  const legendEl = legend && legend.length > 0 && (
    <div
      className="absolute bottom-2 left-2 rounded-lg px-2.5 py-2 flex flex-col gap-1 z-[1000]"
      style={{ backgroundColor: 'rgba(15,15,15,0.85)', border: '1px solid #2a2a2a' }}
    >
      {legend.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span
            className="shrink-0"
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              backgroundColor: item.color,
              borderRadius: item.shape === 'square' ? '1px' : '50%',
              boxShadow: item.active ? `0 0 0 2px ${item.color}55` : undefined,
            }}
          />
          <span
            style={{ color: item.active ? '#ffffff' : '#e5e5e5', fontSize: 10, lineHeight: 1.1, fontWeight: item.active ? 700 : 400 }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )

  const outerStyle = fullscreen
    ? { position: 'fixed' as const, inset: 0, zIndex: 99999 }
    : { position: 'relative' as const, height, width: '100%', borderRadius: '0.75rem', overflow: 'hidden' as const }

  return (
    <div style={outerStyle}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={14}
          bounds={bounds.length > 1 ? bounds : undefined}
          boundsOptions={{ padding: [30, 30] }}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          minZoom={10}
          maxZoom={19}
        >
          <MapScrollController enabled={fullscreen} />
          <MapResizer trigger={fullscreen} />
          {mapChildren}
        </MapContainer>

        <button
          onClick={() => setFullscreen(fs => !fs)}
          aria-label={fullscreen ? 'Exit fullscreen' : 'Expand map'}
          className="absolute z-[1000] rounded-lg p-1.5 transition-colors"
          style={{
            top: fullscreen ? 12 : 8,
            right: fullscreen ? 12 : 8,
            backgroundColor: 'rgba(15,15,15,0.85)',
            border: '1px solid #2a2a2a',
            color: '#e5e5e5',
          }}
        >
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={14} />}
        </button>

        {legendEl}
      </div>
    </div>
  )
}
