-- Trackfi — Supabase Schema
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. user_data — key/value store for all app data per user
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_data (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  key         text not null,
  value       jsonb,
  updated_at  timestamptz default now(),
  unique (user_id, key)
);

-- Index for fast per-user lookups
create index if not exists user_data_user_id_idx on public.user_data(user_id);

-- Row Level Security — users can only read/write their own rows
alter table public.user_data enable row level security;

create policy "Users can read their own data"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "Users can insert their own data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own data"
  on public.user_data for update
  using (auth.uid() = user_id);

create policy "Users can delete their own data"
  on public.user_data for delete
  using (auth.uid() = user_id);


-- 2. push_subscriptions — web push endpoint per user/device
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  endpoint  text not null unique,
  p256dh    text,
  auth      text,
  created_at timestamptz default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users can read their own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- Done. After running this:
-- 1. Copy .env.example → .env and fill in your Supabase URL + anon key
-- 2. Deploy / run locally — sync will work immediately for all signed-in users
-- ─────────────────────────────────────────────────────────────────────────────
