# Liveability — Security & Code Quality Review

**Date:** 2026-07-31
**Scope:** Full application review after the US → Switzerland pivot and subsequent feature work.
**Method:** Static review of the current tree plus live verification against the running app,
the production Supabase project, and each upstream provider. Every claim below marked
"verified" was tested, not assumed.

---

## ⚠️ Needs your decision / action

These could not be fixed from the codebase — they require access to your Google Cloud,
Vercel, and Supabase consoles.

### A-1 · The Google Maps server key is invalid — address search is broken in production
**Severity: Critical (functional) / High (security)**

`GOOGLE_MAPS_SERVER_KEY` is rejected by Google:

```
status: REQUEST_DENIED | error: The provided API key is invalid.
```

Consequences right now: **address search returns "Address not found" for every input**, and the
Sunlight metric silently reports unavailable. Both fail gracefully (no crash, no data
fabricated), but the core feature does not work.

**What you need to do:**
1. Issue a valid server key in Google Cloud and set `GOOGLE_MAPS_SERVER_KEY` locally and in Vercel.
2. Restrict it to **IP addresses / no referrers** and to only the **Geocoding API** and **Solar API**.
3. Separately restrict `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` to **HTTP referrers** matching your
   domain, and to the **Maps JavaScript API + Places API** only.

Step 3 matters for cost: the browser key is necessarily public (it ships in the JS bundle, as
designed), so a referrer restriction is the *only* thing preventing someone from lifting it and
billing Places Autocomplete calls to your account.

### A-2 · Two server-only keys were marked public — remove them from Vercel
**Severity: High · Code fixed, console cleanup still needed**

`NEXT_PUBLIC_CENSUS_API_KEY` and `NEXT_PUBLIC_DATA_GOV_API_KEY` were server-side secrets carrying
the `NEXT_PUBLIC_` prefix, which marks a value as publicly exposable. They did not actually reach
the browser (verified — see V-3), because they were only read inside server routes. But the prefix
is a loaded gun: one client-side import would have inlined them into the bundle.

Both were used exclusively by dead US-era code, so the fix was to delete that code entirely
(see M-3). **No `NEXT_PUBLIC_`-prefixed secret remains in the codebase.**

**What you need to do:** if either variable is still set in Vercel, delete it there. If the
data.gov key was ever real, rotate it — treat anything that carried a `NEXT_PUBLIC_` prefix as
potentially disclosed.

### A-3 · Promote the Content-Security-Policy from Report-Only to enforcing
**Severity: Medium · Shipped in Report-Only mode**

A full CSP is now sent as `Content-Security-Policy-Report-Only` ([next.config.ts](next.config.ts)),
allow-listing exactly the origins the app uses (Supabase, Google Maps, geo.admin.ch, Overpass,
transport.opendata.ch, Open-Meteo, CARTO tiles). It is deliberately **not** enforcing yet: Leaflet
and the Google Maps SDK need `'unsafe-inline'`/`'unsafe-eval'`, and a blocking policy risks
breaking the map or autocomplete in a way I cannot fully exercise without a logged-in session.

**What you need to do:** browse the app for a few sessions, check the console for CSP violation
reports, then rename the header to `Content-Security-Policy` once it is clean.

---

## Findings by severity

### High

| ID | Finding | Status |
|----|---------|--------|
| H-1 | Google Maps server key invalid (A-1) | **Needs your action** |
| H-2 | Server-only secrets carried `NEXT_PUBLIC_` prefix (A-2) | **Fixed** (dead code deleted) |
| H-3 | Rate limiter failed completely open | **Fixed** |

**H-3 — Rate limiter failed open.** [lib/apiGuard.ts](lib/apiGuard.ts) returned `true` (allow)
whenever the Supabase admin client was unavailable or the `check_rate_limit` RPC errored. A
transient database problem therefore removed *all* rate limiting, including on `/api/ai-match`,
which spends Anthropic credits per call.

Fixed by adding an in-process backstop limiter that engages only when the database limiter is
unreachable. It is per-instance rather than global, so it does not replace the DB limiter — but it
turns "unlimited" into "bounded per instance," with the map size capped to prevent unbounded growth.

### Medium

**M-1 — Geocoding route echoed the raw Google payload.** `app/api/geocoding/route.ts` returned
Google's response verbatim. On failure that payload carries an `error_message` field that can name
the API key or project. The route now forwards only `formatted_address` and `geometry.location`
(max 5 results), maps failures to a neutral `{status:'ERROR', results:[]}`, and logs the real
upstream reason server-side only. The missing-key branch no longer names the env var to the client.
**Fixed.**

**M-2 — No length caps on free-text inputs.** The address (`/api/geocoding`), news query
(`/api/news`), and AI Match body accepted unbounded strings and forwarded them to billable or
rate-limited upstreams. New [lib/validate.ts](lib/validate.ts) enforces: address ≤ 200 chars, news
query ≤ 120, AI Match description ≤ 1000, JSON bodies ≤ 8 KB (checked before parsing), plus control
character stripping — which also closes a log-injection vector via CRLF. **Fixed.**

**M-3 — Dead US integrations still executing.** Two leftovers from the pivot:
- `/api/fbi-crime` (+ `lib/fbi-crime.ts`) was called on **every single address search**
  ([lib/metrics.ts](lib/metrics.ts), [components/AddressSearch.tsx](components/AddressSearch.tsx))
  and queried the FBI API for **Ohio** crime data. Its result was no longer rendered anywhere.
- `/api/demographics` (+ `lib/demographics.ts`) queried the **US Census** geocoder and was not
  called by anything at all.

Both deleted, along with the `fbiCrimeData` parameter threaded through `buildMetrics`. This removes
one wasted network round-trip per search and both mis-prefixed keys. The `fbiCrime` field is
retained on the `AddressMetrics` type (marked `@deprecated`) so previously saved addresses still
parse. **Fixed.**

**M-4 — Missing hardening headers.** Added `Strict-Transport-Security` (2 years, preload),
`Cross-Origin-Opener-Policy: same-origin`, `X-DNS-Prefetch-Control: off`, and — for `/api/*` —
`Cache-Control: no-store, private` plus `X-Robots-Tag: noindex`, so per-user API responses can
never be held by a shared cache or indexed. **Fixed.**

**M-5 — Prompt-injection surface in AI Match.** User text was already passed as a separate `user`
message rather than concatenated into the system prompt, which is the structurally correct defence.
Added an explicit instruction telling the model to treat that message as preference data only and
never to reveal the system prompt or the raw area dataset. **Fixed.**

Worth noting the downstream parsing was already safe by construction: model output is matched
against the known area list in `MATCHABLE_AREAS`, so even fully attacker-controlled model output
can only ever resolve to a real area or `null` — it cannot inject a fabricated area or coordinates.

### Low

**L-1 — `npm audit`.** `postcss` (3 advisories) resolved via `npm audit fix`. **`sharp` /
libvips (4 CVEs) is left in place deliberately:** the only offered remediation is
`npm audit fix --force`, which would downgrade Next.js from 16.2.12 to **9.3.3** — a
catastrophic downgrade to fix a vulnerability with no exploit path here. Verified: the app never
imports `next/image` and defines no `images` config, so the image optimiser that pulls in
libvips is never invoked with untrusted input. Revisit when Next ships a bumped `sharp`.

**L-2 — Legacy `demographics` metric branch retained.** `AddressResults` still has a
`case 'demographics'` path reading the old US Census shape. Intentional: it renders correctly for
addresses saved before the pivot. No live code populates it.

---

## Verified clean — no action needed

These were tested and passed; recording them so the next review does not redo the work.

**V-1 · `.env.local` was never committed.** `git log --all --full-history -- .env.local` is empty.
The only tracked env file is `.env.example` (names only, no values). **No key rotation needed on
this account.**

**V-2 · No hardcoded secrets.** Grep for JWT/`sk-`/`AIza` patterns and inline Supabase URLs across
`app/`, `lib/`, `components/`, `proxy.ts`, `next.config.ts` found nothing; every credential is read
from `process.env`.

**V-3 · No server secret reaches the client bundle.** Built the app and searched `.next/static` for
the **actual values** of `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RENTCAST_API_KEY`,
`CENSUS_API_KEY`, and `GOOGLE_MAPS_SERVER_KEY` — none present. The two values that *should* be
public (Supabase anon key, browser Maps key) were found, as expected.

**V-4 · Row Level Security is enabled and enforced on all three tables.** This matters more than
usual here, because [lib/savedAddresses.ts](lib/savedAddresses.ts) queries with `.select('*')` and
deletes by row `id` with **no `user_id` filter** — data isolation rests entirely on RLS. Tested
against the production project:

| Table | service role (bypasses RLS) | anon (RLS applies) | anon INSERT |
|---|---|---|---|
| `profiles` | 1 row | 0 rows | blocked `42501` |
| `saved_addresses` | 0 rows | 0 rows | blocked `42501` |
| `api_usage` | 70 rows | 0 rows | blocked `42501` |

`api_usage` is the decisive case: 70 rows visible to the service role, 0 to anon, proves RLS is
actively filtering rather than the table merely being empty. Policies are `auth.uid() = user_id`
per [supabase/migrations/2026-07-05_security.sql](supabase/migrations/2026-07-05_security.sql).

**V-5 · The rate-limit migration is deployed and recording.** `check_rate_limit` responds and
`api_usage` holds 70 rows, so the limiter is live in production — not silently absent.

**V-6 · `delete-account` is correctly authenticated.** It requires a Bearer token, resolves the
user identity from that token via `adminClient.auth.getUser(token)`, and deletes only
`user.id`'s rows. It never reads a `userId` from the request body, so it cannot be pointed at
another account. Verified returns 401 without a token. The service role key is used **only** here
and in the rate-limit guard, both server-side.

**V-7 · Route protection covers every authenticated page.** The app has exactly two
authenticated pages, `/dashboard` and `/settings`; [proxy.ts](proxy.ts) matches both
(`/dashboard/:path*`, `/settings/:path*`). All other pages are intentionally public marketing/legal
content.

**V-8 · Every API route requires a session.** All 13 routes verified returning `401` unauthenticated:

| Route | Limit / user / hour | Spends money |
|---|---|---|
| `ai-match` | 10 | **Yes — Anthropic** |
| `rentcast` | 30 | No (gated off for CH) |
| `geocoding` | 60 | **Yes — Google Geocoding** |
| `sunlight` | 60 | **Yes — Google Solar** |
| `airquality`, `census`, `crime`, `nearest`, `news`, `noise`, `overpass`, `transit-ch` | 60 | No (free public APIs) |
| `delete-account` | own token auth | No |

The auth check runs *before* input validation and before any upstream call, so an anonymous
request costs nothing. Verified an unauthenticated `POST /api/ai-match` — including a 1 MB body —
is rejected at 401 with no Anthropic spend.

**V-9 · XSS is properly defended.** `renderMarkdown` in
[components/AiMatch.tsx](components/AiMatch.tsx) escapes HTML entities *before* applying markdown
transforms. Tested 10 adversarial payloads (`<script>`, `<img onerror>`, `<svg onload>`, `<iframe
javascript:>`, comment-breakout, and payloads wrapped in `###`/`##`/`-`/`**` so they pass through
each transform). In every case the only tags created were the renderer's own whitelist
(`h2/h3/strong/li/br`) — no attacker tag or event handler is ever constructed.

Leaflet popups are safe by a different mechanism: OSM place names and transit departures are
rendered as **React children** in [components/MetricInfoMap.tsx](components/MetricInfoMap.tsx),
which React escapes automatically. The only raw-HTML use is `L.divIcon`, whose template
interpolates solely internal colour constants and numeric counts — never user or OSM data.

**V-10 · Overpass injection is not reachable.** Coordinates are interpolated into Overpass QL, but
`parseCoords` admits only finite numbers inside Switzerland's bounding box; a payload like
`47.3);out;//` is rejected. Verified alongside the other validator tests (15/15 passing).

**V-11 · Caching behaves as intended.** BAFU/swisstopo lookups cache 24 h
(`next: { revalidate: 86400 }` in [lib/geoAdmin.ts](lib/geoAdmin.ts)); Open-Meteo caches 1 h;
transit departures use `cache: 'no-store'`, which is correct since stale departure times would be
worse than none. The Rentcast 24 h in-memory cache is currently moot — the route returns the Swiss
city-tier estimate before reaching Rentcast, so **Rentcast spend is currently zero**. Note for
later: that cache is a module-level `Map`, so on Vercel it is per-instance and resets on cold
start; it would need Redis or similar to be effective if Rentcast is ever re-enabled.

**V-12 · Fallbacks label themselves honestly.** Every degraded path is marked as such rather than
presenting a fallback as measured data: the OSM noise fallback is labelled "(estimated)" while
sonBASE data is not, rent estimates read "Estimated, area-level average — not an address-specific
figure", safety is labelled "Canton-level, Source: Swiss Federal Statistical Office", and missing
data renders an explicit unavailable message.

**V-13 · No unguarded metric access.** Swept components for the old `e.grocery`-style crash
pattern. Every nested read is either optional-chained or sits inside a branch already guarded by
an early return (verified individually for `sunlight`, `transitCh`, `places`, `nearestEssentials`).
`AddressCompare` and `SavedAddresses` are clean.

---

## Files changed in this review

| File | Change |
|---|---|
| `lib/validate.ts` | **New** — shared input caps, control-char stripping, size-capped JSON body reader |
| `lib/apiGuard.ts` | In-process rate-limit backstop when the DB limiter is unreachable |
| `app/api/geocoding/route.ts` | Address cap; response reshaped so upstream errors never reach the client |
| `app/api/news/route.ts` | Query cap + sanitisation |
| `app/api/ai-match/route.ts` | 8 KB body cap, description sanitisation, prompt-injection instruction |
| `next.config.ts` | HSTS, COOP, DNS-prefetch off, `no-store` on `/api/*`, CSP (Report-Only) |
| `lib/metrics.ts`, `components/AddressSearch.tsx` | Dropped the dead FBI crime call and parameter |
| `lib/types.ts` | `fbiCrime` marked `@deprecated` (legacy saved data only) |
| `app/api/fbi-crime/`, `lib/fbi-crime.ts`, `app/api/demographics/`, `lib/demographics.ts` | **Deleted** — dead US-era code |
| `package-lock.json` | `npm audit fix` (postcss advisories) |

## Suggested next steps

1. Fix and restrict the Google Maps keys (**A-1**) — this is blocking core functionality today.
2. Remove the two `NEXT_PUBLIC_`-prefixed keys from Vercel (**A-2**).
3. Run the app, then promote the CSP to enforcing (**A-3**).
4. Consider lowering the `geocoding` limit from 60/hour — it is the cheapest route to abuse for
   billing, and a real user needs only a handful of searches per session.
5. If Rentcast is ever re-enabled, move its cache to shared storage (**V-11**).
