"use client"

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CrimeIncidentLocation, NearestAmenity } from '@/lib/types'

interface MetricInfoMapProps {
  center: { lat: number; lng: number }
  centerLabel: string
  centerColor?: string
  markers?: NearestAmenity[]
  incidents?: CrimeIncidentLocation[]
  circleRadiusMeters?: number
}

const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const DARK_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

function dotIcon(color: string, size = 14): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid #1a1a1a;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.6)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export default function MetricInfoMap({
  center,
  centerLabel,
  centerColor = '#f97316',
  markers = [],
  incidents = [],
  circleRadiusMeters,
}: MetricInfoMapProps) {
  const points = markers.filter(m => m.lat !== undefined && m.lng !== undefined)

  const bounds: [number, number][] = [
    [center.lat, center.lng],
    ...points.map(p => [p.lat as number, p.lng as number] as [number, number]),
    ...incidents.map(c => [c.lat, c.lng] as [number, number]),
  ]

  return (
    <div className="rounded-xl overflow-hidden" style={{ height: 300, width: '100%' }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        bounds={bounds.length > 1 ? bounds : undefined}
        boundsOptions={{ padding: [30, 30] }}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer url={DARK_TILE_URL} attribution={DARK_TILE_ATTRIBUTION} />

        <Marker position={[center.lat, center.lng]} icon={dotIcon(centerColor, 18)}>
          <Popup>{centerLabel}</Popup>
        </Marker>

        {points.map((m, i) => (
          <Marker key={i} position={[m.lat as number, m.lng as number]} icon={dotIcon('#3b82f6')}>
            <Popup>{m.name} — {m.distanceKm}km</Popup>
          </Marker>
        ))}

        {incidents.map((c, i) => (
          <Marker key={i} position={[c.lat, c.lng]} icon={dotIcon('#ef4444', 8)} />
        ))}

        {circleRadiusMeters !== undefined && (
          <Circle
            center={[center.lat, center.lng]}
            radius={circleRadiusMeters}
            pathOptions={{ color: '#ef4444', fillOpacity: 0.08 }}
          />
        )}
      </MapContainer>
    </div>
  )
}
