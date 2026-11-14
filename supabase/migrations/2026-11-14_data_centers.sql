-- ============================================================
-- Data centers near US addresses ("Data centers nearby" card)
-- Filled by scripts/import-datacenters.ts; read by /api/us/datacenters.
-- ============================================================
--
-- One row per facility after de-duplication. A facility found in both
-- trackers keeps every contributing record in `sources`, each with that
-- source's own name, operator, status and position, so the API can show only
-- the records whose source is enabled (ENABLE_FRACTRACKER, lib/flags.ts).
-- The top-level columns describe the preferred (most detailed) record.

create table if not exists public.data_centers (
  id text primary key check (char_length(id) between 1 and 80),
  name text check (char_length(name) <= 300),
  operator text check (char_length(operator) <= 300),
  status text not null check (status in ('operating', 'approved', 'proposed')),
  -- The 50 states, DC, Puerto Rico and the US Virgin Islands
  lat double precision not null check (lat between 17 and 72),
  lng double precision not null check (lng between -180 and -64),
  source text not null check (source in ('pnnl', 'fractracker')),
  source_url text not null check (source_url ~ '^https://'),
  source_date date not null,
  -- [{ source, record_id, name, operator, status, lat, lng, source_url, source_date }]
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  -- Set to the same value for every row of one import run; rows left over
  -- from an earlier run (a facility that dropped out of a tracker) are deleted
  imported_at timestamptz not null default now()
);

-- The API looks up a bounding box first, then measures exact distances
create index if not exists data_centers_lat_lng_idx on public.data_centers (lat, lng);

alter table public.data_centers enable row level security;

-- Public read: published tracker data, no personal information (PNNL removed
-- records whose operator looked like a person's name). Writes happen only
-- through the import script's service-role client, which bypasses RLS.
drop policy if exists "anyone reads data centers" on public.data_centers;
create policy "anyone reads data centers" on public.data_centers
  for select to anon, authenticated using (true);

revoke all on table public.data_centers from anon, authenticated;
grant select on table public.data_centers to anon, authenticated;
