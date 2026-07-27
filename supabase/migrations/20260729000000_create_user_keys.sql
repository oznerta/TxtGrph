-- Migration: Create User Keys Table with RLS Policies
-- Date: 2026-07-29

create table if not exists public.user_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  provider text not null check (provider in ('anthropic', 'openai', 'gemini', 'custom')),
  encrypted_key text not null,
  key_hint text not null,
  base_url text null,
  model text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_keys_user_provider_unique unique (user_id, provider)
);

create index if not exists idx_user_keys_user_id on public.user_keys(user_id);

drop trigger if exists set_user_keys_updated_at on public.user_keys;
create trigger set_user_keys_updated_at
  before update on public.user_keys
  for each row execute function public.handle_updated_at();

alter table public.user_keys enable row level security;

drop policy if exists "Users manage own user_keys" on public.user_keys;
create policy "Users manage own user_keys"
  on public.user_keys
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
