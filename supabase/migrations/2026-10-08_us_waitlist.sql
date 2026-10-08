-- ============================================================
-- US launch waitlist (components/UsWaitlistBanner.tsx → app/api/waitlist)
-- ============================================================
-- Capture only: an email to notify about the US launch, the city/state the
-- visitor is moving to, and an optional free-text note. Rows are written
-- exclusively by the server route with the service-role client.
create table if not exists public.us_waitlist (
  id uuid primary key default gen_random_uuid(),
  -- The route lowercases and trims before inserting; the check keeps the
  -- unique constraint case-insensitive even if something else writes here.
  email text not null unique
    check (email = lower(btrim(email)) and char_length(email) between 3 and 254),
  city text not null check (char_length(btrim(city)) between 1 and 100),
  state text not null check (state ~ '^[A-Z]{2}$'),
  notes text check (char_length(notes) <= 500),
  -- From Vercel's x-vercel-ip-country at signup time, never from the client
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now()
);

alter table public.us_waitlist enable row level security;

-- Deliberately no policies: anon and authenticated can neither read nor write.
-- The service role bypasses RLS, so only app/api/waitlist/route.ts can insert,
-- and the list is read from the Supabase dashboard.
--
-- Supabase's default privileges grant anon/authenticated full access to new
-- public tables, leaving RLS as the only barrier. Revoke them too, so a later
-- policy added by mistake still can't expose the emails.
revoke all on table public.us_waitlist from anon, authenticated;
