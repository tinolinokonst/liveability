import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase email-confirmation / magic-link callback.
 *
 * Supabase sends the user here with a one-time `code`. That code must be
 * exchanged for a session server-side — without this step the link lands on the
 * app with a `?code=` in the URL that nobody consumes, and the user is never
 * signed in.
 *
 * On success the session cookies are written and the user goes to /dashboard.
 * On failure we bounce to /auth with a short reason slug, which the auth page
 * turns into a readable message. We deliberately pass a fixed slug rather than
 * reflecting the upstream error text back into the URL.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const failure = (reason: string) =>
    NextResponse.redirect(new URL(`/auth?error=${reason}`, request.url))

  // Supabase reports rejected links by redirecting here with error params
  // (e.g. an expired confirmation link) rather than with a code.
  const upstreamError = searchParams.get('error')
  const upstreamErrorCode = searchParams.get('error_code')
  if (upstreamError) {
    console.error(
      `[auth/callback] provider error: ${upstreamError}` +
        (upstreamErrorCode ? ` (${upstreamErrorCode})` : '')
    )
    return failure(upstreamErrorCode === 'otp_expired' ? 'link_expired' : 'link_invalid')
  }

  const code = searchParams.get('code')
  if (!code) {
    console.error('[auth/callback] no code present on callback URL')
    return failure('link_invalid')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[auth/callback] Supabase environment variables are not configured')
    return failure('server_error')
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        // Writing here persists the new session cookies onto the redirect response
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
    // A used or expired one-time code is by far the most common cause
    return failure('link_expired')
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
