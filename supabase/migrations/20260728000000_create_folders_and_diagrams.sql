-- Migration: Create Folders and Diagrams Tables with RLS Policies
-- Date: 2026-07-28

-- 1. Create Folders Table
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  parent_id uuid null references public.folders(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create Diagrams Table
create table if not exists public.diagrams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  folder_id uuid null references public.folders(id) on delete cascade,
  title text not null default 'Untitled Diagram' check (char_length(trim(title)) > 0),
  code text not null default 'flowchart TD' || chr(10) || '    A[Start] --> B[End]',
  config jsonb not null default '{}'::jsonb,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Indexes for RLS and Tree Traversal Performance
create index if not exists idx_folders_user_parent on public.folders(user_id, parent_id);
create index if not exists idx_diagrams_user_folder on public.diagrams(user_id, folder_id) where is_deleted = false;

-- 4. Automatically update updated_at timestamp function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- 5. Triggers for updated_at
drop trigger if exists set_folders_updated_at on public.folders;
create trigger set_folders_updated_at
  before update on public.folders
  for each row execute function public.handle_updated_at();

drop trigger if exists set_diagrams_updated_at on public.diagrams;
create trigger set_diagrams_updated_at
  before update on public.diagrams
  for each row execute function public.handle_updated_at();

-- 6. Enable Row Level Security (RLS)
alter table public.folders enable row level security;
alter table public.diagrams enable row level security;

-- 7. RLS Policies for Folders (Users can only access their own folders)
drop policy if exists "Users manage own folders" on public.folders;
create policy "Users manage own folders"
  on public.folders
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 8. RLS Policies for Diagrams (Users can only access their own diagrams)
drop policy if exists "Users manage own diagrams" on public.diagrams;
create policy "Users manage own diagrams"
  on public.diagrams
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
