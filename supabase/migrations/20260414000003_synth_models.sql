-- Synth models table
create table public.synth_models (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  engine_type text not null, -- e.g. 'MonoSynth', 'FMSynth', 'DuoSynth'
  engine_config jsonb not null default '{}',
  default_params jsonb not null default '{}',
  all_params text[] not null default '{}',
  icon text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.synth_models enable row level security;

-- Synth models are read-only for all authenticated users
create policy "Synth models are viewable by authenticated users"
  on public.synth_models for select
  to authenticated
  using (true);

-- Index for category lookup
create index synth_models_category_id_idx on public.synth_models (category_id);
