-- ============================================================
-- Construction watch: building permits near saved addresses
-- (app/api/cron/permits, components/PermitWatch.tsx)
-- ============================================================

-- 1. Building permits from the cantonal official gazettes (amtsblattportal.ch).
--    Public notices, but they name applicants: by design this table has NO
--    column that could hold a name or free text from the notice — only a
--    derived category, the project address and a link to the official notice.
create table if not exists public.permits (
  -- The gazette's own publication id, so re-fetching a notice is a no-op
  id uuid primary key,
  canton text not null check (canton ~ '^[A-Z]{2}$'),
  address text not null check (char_length(address) between 1 and 300),
  -- Null when the address could not be geocoded; such rows never match a watch
  lat double precision check (lat between 45 and 48.5),
  lng double precision check (lng between 5.5 and 11),
  project_type text not null check (char_length(project_type) <= 60),
  published_at date not null,
  source_url text not null check (source_url ~ '^https://'),
  created_at timestamptz not null default now()
);

create index if not exists permits_published_at_idx on public.permits (published_at);
create index if not exists permits_lat_lng_idx on public.permits (lat, lng);

alter table public.permits enable row level security;

-- Any signed-in user may read permits (the "Recent permits nearby" list). They
-- hold no personal data; writes happen only through the cron route's
-- service-role client, which bypasses RLS.
drop policy if exists "signed-in users read permits" on public.permits;
create policy "signed-in users read permits" on public.permits
  for select to authenticated using (true);

revoke all on table public.permits from anon, authenticated;
grant select on table public.permits to authenticated;

-- 2. Watch flag per saved address.
alter table public.saved_addresses
  add column if not exists watch_enabled boolean not null default false,
  add column if not exists last_notified_at timestamptz,
  -- Secret per address for the one-click unsubscribe link in emails
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists saved_addresses_unsubscribe_token_idx
  on public.saved_addresses (unsubscribe_token);
create index if not exists saved_addresses_watch_idx
  on public.saved_addresses (watch_enabled) where watch_enabled;

-- The existing RLS policies (2026-07-05_security.sql) already limit users to
-- their own rows. Column privileges narrow what they can write: the app only
-- ever updates metrics and the watch toggle, so a user can't forge
-- last_notified_at or set someone else's unsubscribe token.
revoke update on table public.saved_addresses from anon, authenticated;
grant update (metrics, watch_enabled) on table public.saved_addresses to authenticated;
revoke insert on table public.saved_addresses from anon, authenticated;
grant insert (user_id, address, lat, lng, metrics, watch_enabled) on table public.saved_addresses to authenticated;

-- 3. Sent-notification log: one row per user per permit, so the same permit is
--    never emailed to the same person twice (even if two of their saved
--    addresses are near it, or the job reruns).
create table if not exists public.permit_notifications (
  user_id uuid not null references auth.users (id) on delete cascade,
  permit_id uuid not null references public.permits (id) on delete cascade,
  saved_address_id uuid references public.saved_addresses (id) on delete set null,
  sent_at timestamptz not null default now(),
  primary key (user_id, permit_id)
);

-- Service role only: no policies, no grants
alter table public.permit_notifications enable row level security;
revoke all on table public.permit_notifications from anon, authenticated;
