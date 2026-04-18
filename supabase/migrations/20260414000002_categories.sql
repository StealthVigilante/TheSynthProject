-- Difficulty enum
create type public.difficulty_level as enum ('beginner', 'intermediate', 'advanced');

-- Categories table
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  difficulty public.difficulty_level not null,
  sort_order integer not null default 0,
  icon text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.categories enable row level security;

-- Categories are read-only for all authenticated users
create policy "Categories are viewable by authenticated users"
  on public.categories for select
  to authenticated
  using (true);
