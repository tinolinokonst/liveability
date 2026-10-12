import { createClient } from './supabase'
import { AddressMetrics, SavedAddress } from './types'
import { boundingBox, distanceM, Permit, WATCH_RADIUS_M } from './permits'

export async function fetchSavedAddresses(): Promise<SavedAddress[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('saved_addresses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as SavedAddress[]
}

export async function saveAddress(userId: string, metrics: AddressMetrics): Promise<SavedAddress> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('saved_addresses')
    .insert({
      user_id: userId,
      address: metrics.address,
      lat: metrics.location.lat,
      lng: metrics.location.lng,
      metrics,
    })
    .select()
    .single()

  if (error) throw error
  return data as SavedAddress
}

export async function updateSavedAddressMetrics(id: string, metrics: AddressMetrics): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('saved_addresses')
    .update({ metrics })
    .eq('id', id)

  if (error) throw error
}

export async function setWatch(id: string, enabled: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('saved_addresses')
    .update({ watch_enabled: enabled })
    .eq('id', id)

  if (error) throw error
}

export interface NearbyPermit extends Permit {
  distanceM: number
}

/** Permits published in the last `days` within WATCH_RADIUS_M of a point, newest first */
export async function fetchPermitsNear(lat: number, lng: number, days = 90): Promise<NearbyPermit[]> {
  const supabase = createClient()
  const box = boundingBox(lat, lng, WATCH_RADIUS_M)
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('permits')
    .select('id, canton, address, lat, lng, project_type, published_at, source_url')
    .gte('lat', box.minLat).lte('lat', box.maxLat)
    .gte('lng', box.minLng).lte('lng', box.maxLng)
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return (data as Permit[])
    .map(p => ({ ...p, distanceM: Math.round(distanceM(lat, lng, p.lat!, p.lng!)) }))
    .filter(p => p.distanceM <= WATCH_RADIUS_M)
}

export async function deleteSavedAddress(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('saved_addresses')
    .delete()
    .eq('id', id)

  if (error) throw error
}
