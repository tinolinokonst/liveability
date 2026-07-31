import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null = null

function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  if (!adminClient) {
    adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return adminClient
}

async function getAuthedUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Read-only in route handlers; session refresh is handled by middleware
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// In-process backstop used only when the database limiter is unreachable.
// It is per-instance rather than global, so it does not replace the DB limiter —
// it just bounds the blast radius instead of degrading to "no limit at all".
const memoryCounters = new Map<string, { windowStart: number; count: number }>()

function checkMemoryRateLimit(
  userId: string,
  route: string,
  limit: number,
  windowSeconds: number
): boolean {
  const windowMs = windowSeconds * 1000
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs
  const key = `${userId}:${route}`

  const entry = memoryCounters.get(key)
  if (!entry || entry.windowStart !== windowStart) {
    memoryCounters.set(key, { windowStart, count: 1 })
    // Opportunistic cleanup so the map cannot grow without bound
    if (memoryCounters.size > 5000) {
      for (const [k, v] of memoryCounters) {
        if (v.windowStart !== windowStart) memoryCounters.delete(k)
      }
    }
    return true
  }

  entry.count += 1
  return entry.count <= limit
}

async function checkRateLimit(
  userId: string,
  route: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const admin = getAdminClient()

  // If the admin client or RPC is unavailable we still avoid hard-failing the
  // product, but we fall back to the in-process limiter rather than to no limit.
  if (!admin) {
    console.error('[rate-limit] admin client unavailable, using in-process limiter')
    return checkMemoryRateLimit(userId, route, limit, windowSeconds)
  }

  const { data, error } = await admin.rpc('check_rate_limit', {
    p_user_id: userId,
    p_route: route,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error(`[rate-limit] RPC failed for ${route}:`, error.message)
    return checkMemoryRateLimit(userId, route, limit, windowSeconds)
  }
  return data === true
}

/**
 * Auth + rate-limit guard for API routes.
 * Returns { user } on success, or a NextResponse (401/429) the route should return immediately.
 */
export async function guardRequest(
  route: string,
  limit: number,
  windowSeconds: number
): Promise<{ user: User } | { response: NextResponse }> {
  const user = await getAuthedUser()
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const allowed = await checkRateLimit(user.id, route, limit, windowSeconds)
  if (!allowed) {
    return {
      response: NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      ),
    }
  }

  return { user }
}
