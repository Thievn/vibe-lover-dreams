-- Rolling cloud backup for Companion Forge portrait preview history (max 10 per user + mode).
-- Client inserts after each successful preview; old rows are pruned in application code.

create table if not exists public.forge_portrait_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  forge_mode text not null check (forge_mode in ('user', 'admin')),
  canonical_url text not null,
  display_url text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists forge_portrait_history_user_mode_created_idx
  on public.forge_portrait_history (user_id, forge_mode, created_at desc);

comment on table public.forge_portrait_history is
  'Last forge portrait previews with full form snapshots; RLS limits to owner; app keeps ≤10 rows per user_id+forge_mode.';

alter table public.forge_portrait_history enable row level security;

create policy "forge_portrait_history_select_own"
  on public.forge_portrait_history for select
  using (auth.uid() = user_id);

create policy "forge_portrait_history_insert_own"
  on public.forge_portrait_history for insert
  with check (auth.uid() = user_id);

create policy "forge_portrait_history_delete_own"
  on public.forge_portrait_history for delete
  using (auth.uid() = user_id);
