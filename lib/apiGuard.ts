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

async function checkRateLimit(
  userId: string,
  route: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const admin = getAdminClient()
  // Fail open if the admin client or RPC is unavailable, so a config issue
  // degrades to "no rate limit" rather than breaking the product.
  if (!admin) return true
  const { data, error } = await admin.rpc('check_rate_limit', {
    p_user_id: userId,
    p_route: route,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error(`[rate-limit] RPC failed for ${route}:`, error.message)
    return true
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
