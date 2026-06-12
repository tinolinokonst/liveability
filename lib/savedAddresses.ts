import { createClient } from './supabase'
import { AddressMetrics, SavedAddress } from './types'

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

export async function deleteSavedAddress(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('saved_addresses')
    .delete()
    .eq('id', id)

  if (error) throw error
}
