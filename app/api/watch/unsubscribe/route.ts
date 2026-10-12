import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, guardAnonymousRequest } from '@/lib/apiGuard'

const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Turns off construction watch for the one saved address the token belongs
// to. POST only: mail clients send RFC 8058 one-click requests as POST, and
// the /watch/unsubscribe page posts here from its button. A GET (link
// scanners, prefetching) never changes anything. No sign-in needed — the
// unguessable per-address token is the authorisation.
export async function POST(request: NextRequest) {
  const limited = await guardAnonymousRequest('watch-unsubscribe', 20, 3600)
  if (limited) return limited

  const token = request.nextUrl.searchParams.get('token') ?? ''
  if (!TOKEN.test(token)) return NextResponse.json({ error: 'Invalid link' }, { status: 400 })

  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const { data, error } = await admin
    .from('saved_addresses')
    .update({ watch_enabled: false })
    .eq('unsubscribe_token', token)
    .select('address')
  if (error) return NextResponse.json({ error: 'Could not update your settings' }, { status: 500 })
  // Unknown token (address since deleted, say): nothing to stop — report success either way
  return NextResponse.json({ success: true, address: data?.[0]?.address ?? null })
}
