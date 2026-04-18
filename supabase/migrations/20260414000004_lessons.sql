-- Lessons table (ordered within a synth model)
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  synth_model_id uuid not null references public.synth_models on delete cascade,
  title text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  xp_reward integer not null default 10,
  unlocks_params text[] not null default '{}', -- params unlocked on completion
  created_at timestamptz not null default now(),
  unique(synth_model_id, slug)
);

alter table public.lessons enable row level security;

create policy "Lessons are viewable by authenticated users"
  on public.lessons for select
  to authenticated
  using (true);

create index lessons_synth_model_id_idx on public.lessons (synth_model_id, sort_order);
