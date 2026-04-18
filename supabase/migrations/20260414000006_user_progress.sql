-- User synths (which synths a user has unlocked + which params)
create table public.user_synths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  synth_model_id uuid not null references public.synth_models on delete cascade,
  unlocked_params text[] not null default '{}',
  unlocked_at timestamptz not null default now(),
  unique(user_id, synth_model_id)
);

alter table public.user_synths enable row level security;

create policy "Users can view own synths"
  on public.user_synths for select
  using (auth.uid() = user_id);

create policy "Users can insert own synths"
  on public.user_synths for insert
  with check (auth.uid() = user_id);

create policy "Users can update own synths"
  on public.user_synths for update
  using (auth.uid() = user_id);

-- User lesson progress
create table public.user_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  lesson_id uuid not null references public.lessons on delete cascade,
  status text not null default 'locked' check (status in ('locked', 'available', 'in_progress', 'completed')),
  score integer,
  xp_earned integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

alter table public.user_lesson_progress enable row level security;

create policy "Users can view own lesson progress"
  on public.user_lesson_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own lesson progress"
  on public.user_lesson_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own lesson progress"
  on public.user_lesson_progress for update
  using (auth.uid() = user_id);

create trigger user_lesson_progress_updated_at
  before update on public.user_lesson_progress
  for each row execute procedure public.update_updated_at();

-- User exercise progress
create table public.user_exercise_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  exercise_id uuid not null references public.exercises on delete cascade,
  completed boolean not null default false,
  answer jsonb,
  score integer,
  attempts integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, exercise_id)
);

alter table public.user_exercise_progress enable row level security;

create policy "Users can view own exercise progress"
  on public.user_exercise_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own exercise progress"
  on public.user_exercise_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own exercise progress"
  on public.user_exercise_progress for update
  using (auth.uid() = user_id);

-- Auto-unlock first synth (Osci Mono) + first lesson on signup
create or replace function public.handle_new_user_synths()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_synth_id uuid;
  v_first_lesson_id uuid;
  v_initial_params text[];
begin
  -- Find the first synth (lowest sort_order in beginner category)
  select sm.id, sm.all_params into v_synth_id, v_initial_params
  from public.synth_models sm
  join public.categories c on c.id = sm.category_id
  where c.difficulty = 'beginner'
  order by sm.sort_order
  limit 1;

  if v_synth_id is not null then
    -- Unlock the synth with basic params (oscillator.type + volume)
    insert into public.user_synths (user_id, synth_model_id, unlocked_params)
    values (new.id, v_synth_id, array['oscillator.type', 'volume']);

    -- Make first lesson available
    select id into v_first_lesson_id
    from public.lessons
    where synth_model_id = v_synth_id
    order by sort_order
    limit 1;

    if v_first_lesson_id is not null then
      insert into public.user_lesson_progress (user_id, lesson_id, status)
      values (new.id, v_first_lesson_id, 'available');
    end if;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created_synths
  after insert on auth.users
  for each row execute procedure public.handle_new_user_synths();
