"use client"

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CrimeIncidentLocation, NearestAmenity } from '@/lib/types'

export interface MapSensor {
  lat: number
  lng: number
  color: string
  aqi?: number
}

export interface LegendItem {
  color: string
  label: string
}

interface MetricInfoMapProps {
  center: { lat: number; lng: number }
  centerLabel: string
  centerColor?: string
  markers?: NearestAmenity[]
  incidents?: CrimeIncidentLocation[]
  circleRadiusMeters?: number
  searchRadiusMeters?: number
  sensors?: MapSensor[]
  legend?: LegendItem[]
  height?: number
}

const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const DARK_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

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
  searchRadiusMeters,
  sensors = [],
  legend,
  height = 380,
}: MetricInfoMapProps) {
  const points = markers.filter(m => m.lat !== undefined && m.lng !== undefined)
  const clusters = clusterIncidents(incidents)

  const bounds: [number, number][] = [
    [center.lat, center.lng],
    ...points.map(p => [p.lat as number, p.lng as number] as [number, number]),
    ...clusters.map(c => [c.lat, c.lng] as [number, number]),
    ...sensors.map(s => [s.lat, s.lng] as [number, number]),
  ]

  return (
    <div className="rounded-xl overflow-hidden relative" style={{ height, width: '100%' }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        bounds={bounds.length > 1 ? bounds : undefined}
        boundsOptions={{ padding: [30, 30] }}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer url={DARK_TILE_URL} attribution={DARK_TILE_ATTRIBUTION} />

        {sensors.map((s, i) => (
          <Marker key={`sensor-${i}`} position={[s.lat, s.lng]} icon={dotIcon(s.color, 8)}>
            <Popup>PurpleAir sensor — AQI {s.aqi}</Popup>
          </Marker>
        ))}

        <Marker position={[center.lat, center.lng]} icon={dotIcon(centerColor, 22)}>
          <Popup>{centerLabel}</Popup>
        </Marker>

        {points.map((m, i) => (
          <Marker key={i} position={[m.lat as number, m.lng as number]} icon={dotIcon('#9ca3af', 10)}>
            <Popup>{m.name} — {m.distanceKm}km</Popup>
          </Marker>
        ))}

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
          />
        )}

        {searchRadiusMeters !== undefined && (
          <Circle
            center={[center.lat, center.lng]}
            radius={searchRadiusMeters}
            pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.1, opacity: 0.4 }}
          />
        )}
      </MapContainer>

      {legend && legend.length > 0 && (
        <div
          className="absolute bottom-2 left-2 rounded-lg px-2.5 py-2 flex flex-col gap-1 z-[1000]"
          style={{ backgroundColor: 'rgba(15,15,15,0.85)', border: '1px solid #2a2a2a' }}
        >
          {legend.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span
                className="rounded-full shrink-0"
                style={{ width: 8, height: 8, backgroundColor: item.color }}
              />
              <span style={{ color: '#e5e5e5', fontSize: 10, lineHeight: 1.1 }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
