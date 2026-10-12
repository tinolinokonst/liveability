import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/apiGuard'
import { buildPermit, FeedEntry, listNotices } from '@/lib/permitFeed'
import { buildPermitEmail, PermitMailItem, sendEmail } from '@/lib/permitEmail'
import { boundingBox, distanceM, Permit, PERMIT_SOURCES, WATCH_RADIUS_M } from '@/lib/permits'
import { SITE_URL } from '@/lib/site'

// Daily (vercel.json). Fetches new building-permit notices, stores them, and
// emails users whose watched saved addresses are within WATCH_RADIUS_M.
//
// Query params: ?days=N (look-back, 1–30, default 3 — overlap is harmless,
// notices are keyed by their gazette id) and ?dryRun=1 (fetch, parse and
// geocode only: no database writes, no emails).
export const maxDuration = 300

const DEFAULT_LOOKBACK_DAYS = 3
// Bounded per run so a long look-back can't time out; the rest is picked up
// on the next run, since stored notices are skipped
const MAX_NEW_NOTICES = 400
const CONCURRENCY = 4
// Only permits this recent are emailed — an old notice is no longer news
const NOTIFY_WITHIN_DAYS = 14
// The gazettes take notices down after a year; keep nothing longer
const RETENTION_DAYS = 400

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

function zurichDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(d)
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i])
      }
    })
  )
  return out
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 })
  }
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const dryRun = params.get('dryRun') === '1'
  const days = Math.min(30, Math.max(1, Number(params.get('days')) || DEFAULT_LOOKBACK_DAYS))
  const admin = getAdminClient()
  if (!admin && !dryRun) return NextResponse.json({ error: 'Supabase admin client unavailable' }, { status: 500 })

  // ── 1. list notices ──────────────────────────────────────────────────────
  const start = zurichDate(-days)
  const end = zurichDate()
  const entries: FeedEntry[] = []
  const sourceErrors: string[] = []
  for (const source of PERMIT_SOURCES) {
    try {
      entries.push(...(await listNotices(source, start, end)))
    } catch (err) {
      sourceErrors.push(`${source.canton}: ${err instanceof Error ? err.message : 'failed'}`)
    }
  }

  // ── 2. fetch the ones we don't have yet ──────────────────────────────────
  const known = new Set<string>()
  if (admin && !dryRun) {
    for (let i = 0; i < entries.length; i += 200) {
      const { data, error } = await admin.from('permits').select('id').in('id', entries.slice(i, i + 200).map(e => e.id))
      if (error) return NextResponse.json({ error: `permits lookup failed: ${error.message}` }, { status: 500 })
      for (const row of data ?? []) known.add(row.id as string)
    }
  }
  const todo = entries.filter(e => !known.has(e.id)).slice(0, MAX_NEW_NOTICES)

  let failedNotices = 0
  const built = await mapLimit(todo, CONCURRENCY, async entry => {
    try {
      return await buildPermit(entry)
    } catch (err) {
      failedNotices++
      console.log(`[permits] notice ${entry.id} failed:`, err instanceof Error ? err.message : err)
      return null
    }
  })
  const fresh = built.filter((p): p is Permit => p !== null)
  const summary = {
    window: { start, end },
    listed: entries.length,
    byCanton: Object.fromEntries(PERMIT_SOURCES.map(s => [s.canton, entries.filter(e => e.source.canton === s.canton).length])),
    newNotices: todo.length,
    stored: 0,
    geocoded: fresh.filter(p => p.lat !== null).length,
    withoutLocation: todo.length - fresh.length - failedNotices,
    failedNotices,
    sourceErrors,
  }

  if (dryRun || !admin) {
    return NextResponse.json({ dryRun: true, ...summary, permits: fresh })
  }

  // ── 3. store ─────────────────────────────────────────────────────────────
  if (fresh.length) {
    const { error } = await admin.from('permits').upsert(fresh, { onConflict: 'id', ignoreDuplicates: true })
    if (error) return NextResponse.json({ error: `storing permits failed: ${error.message}`, ...summary }, { status: 500 })
    summary.stored = fresh.length
  }
  await admin.from('permits').delete().lt('published_at', zurichDate(-RETENTION_DAYS))

  // ── 4. match watches ─────────────────────────────────────────────────────
  // Against every recent permit, not just today's: a send that failed (and was
  // un-claimed) is retried tomorrow, and the log below stops any repeat.
  const { data: recent, error: recentError } = await admin
    .from('permits')
    .select('id, address, lat, lng, project_type, published_at, source_url')
    .gte('published_at', zurichDate(-NOTIFY_WITHIN_DAYS))
    .not('lat', 'is', null)
  const { data: watches, error: watchError } = await admin
    .from('saved_addresses')
    .select('id, user_id, address, lat, lng, unsubscribe_token')
    .eq('watch_enabled', true)
  if (recentError || watchError) {
    return NextResponse.json({ error: 'matching query failed', ...summary }, { status: 500 })
  }

  const origin = process.env.NODE_ENV === 'development' ? request.nextUrl.origin : SITE_URL
  let emailsSent = 0
  let emailErrors = 0
  // A permit near two of one user's addresses is mentioned once (first address)
  const mentioned = new Map<string, Set<string>>()

  for (const w of watches ?? []) {
    const box = boundingBox(w.lat, w.lng, WATCH_RADIUS_M)
    const seen = mentioned.get(w.user_id) ?? new Set<string>()
    mentioned.set(w.user_id, seen)
    const near = (recent ?? [])
      .filter(p => p.lat >= box.minLat && p.lat <= box.maxLat && p.lng >= box.minLng && p.lng <= box.maxLng)
      .map(p => ({ p, d: Math.round(distanceM(w.lat, w.lng, p.lat, p.lng)) }))
      .filter(({ p, d }) => d <= WATCH_RADIUS_M && !seen.has(p.id))
    if (!near.length) continue
    near.forEach(({ p }) => seen.add(p.id))

    // Claim before sending: only rows actually inserted now are ours to send,
    // so a permit already emailed to this user (or claimed by a parallel run) is skipped
    const { data: claimed, error: claimError } = await admin
      .from('permit_notifications')
      .upsert(near.map(({ p }) => ({ user_id: w.user_id, permit_id: p.id, saved_address_id: w.id })), {
        onConflict: 'user_id,permit_id',
        ignoreDuplicates: true,
      })
      .select('permit_id')
    if (claimError) {
      emailErrors++
      console.log('[permits] claim failed:', claimError.message)
      continue
    }
    const claimedIds = new Set((claimed ?? []).map(r => r.permit_id as string))
    const items: PermitMailItem[] = near
      .filter(({ p }) => claimedIds.has(p.id))
      .sort((a, b) => a.d - b.d)
      .map(({ p, d }) => ({ projectType: p.project_type, address: p.address, distanceM: d, publishedAt: p.published_at, sourceUrl: p.source_url }))
    if (!items.length) continue

    const unclaim = () =>
      admin.from('permit_notifications').delete().eq('user_id', w.user_id).in('permit_id', [...claimedIds])

    const { data: profile } = await admin.from('profiles').select('email').eq('id', w.user_id).maybeSingle()
    let email = profile?.email as string | undefined
    if (!email) {
      const { data } = await admin.auth.admin.getUserById(w.user_id)
      email = data.user?.email ?? undefined
    }
    if (!email) {
      await unclaim()
      emailErrors++
      continue
    }

    try {
      const mail = buildPermitEmail(w.address, items, w.unsubscribe_token, origin)
      // Hashed: a truncated key could collide across different batches, and
      // Resend would then silently skip the second send
      const idempotencyKey = createHash('sha256').update(`${w.id}:${[...claimedIds].sort().join(',')}`).digest('hex')
      await sendEmail(email, mail, `permit-watch-${idempotencyKey}`)
      emailsSent++
      await admin.from('saved_addresses').update({ last_notified_at: new Date().toISOString() }).eq('id', w.id)
    } catch (err) {
      // Release the claim so tomorrow's run retries; never log the recipient
      await unclaim()
      emailErrors++
      console.log('[permits] send failed:', err instanceof Error ? err.message : err)
    }
  }

  return NextResponse.json({ ...summary, watches: watches?.length ?? 0, emailsSent, emailErrors })
}
