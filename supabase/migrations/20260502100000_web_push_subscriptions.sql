-- Browser Web Push (VAPID) subscriptions per user/device.
create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint web_push_subscriptions_user_endpoint unique (user_id, endpoint)
);

create index if not exists web_push_subscriptions_user_id_idx on public.web_push_subscriptions (user_id);

alter table public.web_push_subscriptions enable row level security;

create policy "web_push_subscriptions_select_own"
  on public.web_push_subscriptions for select
  using (auth.uid() = user_id);

create policy "web_push_subscriptions_insert_own"
  on public.web_push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "web_push_subscriptions_update_own"
  on public.web_push_subscriptions for update
  using (auth.uid() = user_id);

create policy "web_push_subscriptions_delete_own"
  on public.web_push_subscriptions for delete
  using (auth.uid() = user_id);
