import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { buildCsp } from '@/lib/csp'

const PROTECTED_PREFIXES = ['/dashboard', '/settings']

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Fallback for confirmation emails sent before /auth/callback existed: those
  // links point at the site root with ?code=... Forward them (params intact) so
  // the code still gets exchanged instead of being silently dropped.
  if (pathname === '/' && searchParams.has('code')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  // A fresh nonce per request. Next.js reads it from the request's CSP header
  // while rendering and stamps it on its own scripts (see lib/csp.ts).
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce, { allowEval: process.env.NODE_ENV === 'development' })

  // Rebuilt from request.headers on each call so cookies refreshed by Supabase
  // below are carried along with the nonce
  function next(): NextResponse {
    const headers = new Headers(request.headers)
    headers.set('x-nonce', nonce)
    headers.set('Content-Security-Policy', csp)
    const response = NextResponse.next({ request: { headers } })
    response.headers.set('Content-Security-Policy', csp)
    return response
  }

  // Only the authenticated areas need a session lookup — skipping it elsewhere
  // keeps the public pages off the Supabase round-trip.
  if (!PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return next()
  }

  let supabaseResponse = next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = next()
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  // Every page needs the per-request CSP nonce, so match everything except API
  // routes (JSON, no scripts), build assets and static files.
  matcher: ['/((?!api/|_next/static|_next/image|_vercel|.*\\.(?:ico|png|jpg|jpeg|svg|webp|txt|xml|webmanifest)$).*)'],
}
