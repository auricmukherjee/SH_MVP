-- Runverve SmartHeal sessions
create table if not exists public.smartheal_sessions (
  id uuid primary key,
  created_at timestamptz not null default now(),
  clinical_note text,
  user_inputs jsonb,
  profile_result jsonb,
  strategy_result jsonb
);

alter table public.smartheal_sessions enable row level security;

-- Functions use the service role key, which bypasses RLS.
-- No public policies are created, so the anon key cannot read sessions.

-- Storage bucket for uploads and pooled clinical notes
insert into storage.buckets (id, name, public)
values ('smartheal', 'smartheal', false)
on conflict (id) do nothing;
