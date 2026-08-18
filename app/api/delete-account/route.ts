import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { guardRequest } from '@/lib/apiGuard'

export async function POST(request: NextRequest) {
  // Two distinct checks. The guard throttles on the cookie session — this is the
  // only irreversible route, so it should not be callable in a loop. The bearer
  // token below is what actually authorizes the deletion and names the account.
  // The client is same-origin (the settings page), so it sends both.
  const guard = await guardRequest('delete-account', 5, 3600)
  if ('response' in guard) return guard.response

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase env vars for account deletion')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify the token to get the user identity — never trust a user-supplied userId
  const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  // Delete saved addresses first (foreign key)
  const { error: deleteAddressesError } = await adminClient
    .from('saved_addresses')
    .delete()
    .eq('user_id', user.id)

  if (deleteAddressesError) {
    console.error('Failed to delete saved_addresses:', deleteAddressesError)
    return NextResponse.json({ error: 'Failed to delete user data' }, { status: 500 })
  }

  // Delete the auth user
  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteUserError) {
    console.error('Failed to delete auth user:', deleteUserError)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
