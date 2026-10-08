import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, guardAnonymousRequest } from '@/lib/apiGuard'
import { readJsonBody } from '@/lib/validate'
import {
  EMAIL_PATTERN,
  MAX_CITY_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_NOTES_LENGTH,
  US_STATE_CODES,
} from '@/lib/waitlist'

/** Strip control characters and trim; non-strings become ''. */
function clean(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/[\x00-\x1F\x7F]/g, '').trim() : ''
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

export async function POST(request: NextRequest) {
  // Public route (most waitlist visitors have no account), so it is throttled
  // per IP rather than per user
  const limited = await guardAnonymousRequest('waitlist', 5, 3600)
  if (limited) return limited

  const body = await readJsonBody(request, 4 * 1024)
  if (!body.ok) return bad(body.error)
  if (typeof body.value !== 'object' || body.value === null) return bad('Invalid request body')
  const input = body.value as Record<string, unknown>

  const email = clean(input.email).toLowerCase()
  const city = clean(input.city)
  const state = clean(input.state).toUpperCase()
  const notes = clean(input.notes)

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return bad('Please enter a valid email address')
  }
  if (!city || city.length > MAX_CITY_LENGTH) {
    return bad(`City must be 1–${MAX_CITY_LENGTH} characters`)
  }
  if (!US_STATE_CODES.has(state)) return bad('Please choose a state')
  if (notes.length > MAX_NOTES_LENGTH) {
    return bad(`Notes must be ${MAX_NOTES_LENGTH} characters or fewer`)
  }

  // Taken from Vercel's edge header, never from the request body
  const country = request.headers.get('x-vercel-ip-country')?.toUpperCase() ?? null
  const countryCode = country && /^[A-Z]{2}$/.test(country) ? country : null

  const admin = getAdminClient()
  if (!admin) {
    console.error('[waitlist] Supabase admin client unavailable')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // ON CONFLICT (email) DO NOTHING: a repeat signup is answered exactly like a
  // new one, so the endpoint can't be used to test whether an email is listed.
  // The first submission's city/state are kept.
  const { error } = await admin
    .from('us_waitlist')
    .upsert(
      { email, city, state, notes: notes || null, country_code: countryCode },
      { onConflict: 'email', ignoreDuplicates: true }
    )

  if (error) {
    // Log the failure, never the email
    console.error('[waitlist] insert failed:', error.code, error.message)
    return NextResponse.json({ error: 'Could not join the waitlist. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
