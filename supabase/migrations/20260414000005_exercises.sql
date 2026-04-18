-- Exercise type enum
create type public.exercise_type as enum (
  'info',
  'listen',
  'tweak',
  'match_sound',
  'quiz_mc',
  'quiz_param',
  'free_play'
);

-- Exercises table (ordered within a lesson)
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons on delete cascade,
  exercise_type public.exercise_type not null,
  sort_order integer not null default 0,
  title text,
  instructions text not null,
  content jsonb not null default '{}',
  -- content varies by type:
  --   info: { text, image_url? }
  --   listen: { params_to_set, note_sequence }
  --   tweak: { target_param, target_value, tolerance, initial_params? }
  --   match_sound: { target_params, tolerance, hint? }
  --   quiz_mc: { question, options[], correct_index }
  --   quiz_param: { question, param_key, correct_value, tolerance }
  --   free_play: { duration_seconds?, prompt? }
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "Exercises are viewable by authenticated users"
  on public.exercises for select
  to authenticated
  using (true);

create index exercises_lesson_id_idx on public.exercises (lesson_id, sort_order);
