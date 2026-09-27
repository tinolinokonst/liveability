-- ============================================================
-- Feedback submitted from the dashboard (components/FeedbackButton.tsx)
-- ============================================================
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  -- Cascade so deleting an account also erases the feedback it left
  user_id uuid not null references auth.users (id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  page text check (char_length(page) <= 200),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Insert-only for signed-in users, and only as themselves. There are
-- deliberately no select/update/delete policies: users can't read feedback
-- back (their own or anyone else's) or alter it once sent. Read it in the
-- Supabase dashboard, which uses the service role and bypasses RLS.
drop policy if exists "insert own feedback" on public.feedback;
create policy "insert own feedback" on public.feedback
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Supabase's default privileges grant anon/authenticated full access to new
-- public tables, leaving RLS as the only barrier. Narrow the grants to match
-- the policy so a later, broader policy can't silently open reads.
revoke all on table public.feedback from anon, authenticated;
grant insert on table public.feedback to authenticated;
