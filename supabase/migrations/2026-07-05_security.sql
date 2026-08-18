-- ============================================================
-- 1. Rate limiting table + function (used by lib/apiGuard.ts)
-- ============================================================
create table if not exists public.api_usage (
  user_id uuid not null,
  route text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (user_id, route, window_start)
);

-- No policies on purpose: only the service role (which bypasses RLS) touches this table.
alter table public.api_usage enable row level security;

create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_route text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c integer;
begin
  insert into public.api_usage (user_id, route, window_start, count)
  values (p_user_id, p_route, w, 1)
  on conflict (user_id, route, window_start)
  do update set count = public.api_usage.count + 1
  returning count into c;

  return c <= p_limit;
end;
$$;

-- Optional cleanup helper: delete windows older than a day
create or replace function public.cleanup_api_usage() returns void
language sql security definer set search_path = public as $$
  delete from public.api_usage where window_start < now() - interval '1 day';
$$;

-- Postgres grants EXECUTE on new functions to PUBLIC, and PostgREST exposes
-- public-schema functions to anon/authenticated. Both functions above are
-- security definer, so leaving that default in place would let anyone holding
-- the (deliberately public) anon key call them directly: check_rate_limit to
-- inflate another user's counters or bloat this table, cleanup_api_usage to
-- wipe it and reset every quota. Only the server-side service-role client is
-- supposed to reach them, so revoke first, then grant back to that role alone.
revoke execute on function public.check_rate_limit(uuid, text, integer, integer)
  from public, anon, authenticated;
revoke execute on function public.cleanup_api_usage()
  from public, anon, authenticated;

grant execute on function public.check_rate_limit(uuid, text, integer, integer)
  to service_role;
grant execute on function public.cleanup_api_usage()
  to service_role;

-- ============================================================
-- 2. Row Level Security on saved_addresses
-- ============================================================
alter table public.saved_addresses enable row level security;

drop policy if exists "select own addresses" on public.saved_addresses;
drop policy if exists "insert own addresses" on public.saved_addresses;
drop policy if exists "update own addresses" on public.saved_addresses;
drop policy if exists "delete own addresses" on public.saved_addresses;

create policy "select own addresses" on public.saved_addresses
  for select using (auth.uid() = user_id);

create policy "insert own addresses" on public.saved_addresses
  for insert with check (auth.uid() = user_id);

create policy "update own addresses" on public.saved_addresses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own addresses" on public.saved_addresses
  for delete using (auth.uid() = user_id);
