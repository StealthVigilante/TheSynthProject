-- RPC function to complete a lesson: awards XP, unlocks next lesson, unlocks params
create or replace function public.complete_lesson(
  p_lesson_id uuid,
  p_score integer default 100
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_user_id uuid;
  v_lesson record;
  v_xp integer;
  v_next_lesson_id uuid;
  v_synth_model_id uuid;
  v_current_params text[];
  v_new_params text[];
  v_already_completed boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Get lesson details
  select * into v_lesson
  from public.lessons
  where id = p_lesson_id;

  if v_lesson is null then
    raise exception 'Lesson not found';
  end if;

  v_synth_model_id := v_lesson.synth_model_id;

  -- Check if already completed
  select exists(
    select 1 from public.user_lesson_progress
    where user_id = v_user_id and lesson_id = p_lesson_id and status = 'completed'
  ) into v_already_completed;

  -- Calculate XP (full XP first time, 25% for replays)
  v_xp := case when v_already_completed then v_lesson.xp_reward / 4 else v_lesson.xp_reward end;

  -- Update or insert lesson progress
  insert into public.user_lesson_progress (user_id, lesson_id, status, score, xp_earned, completed_at)
  values (v_user_id, p_lesson_id, 'completed', p_score, v_xp, now())
  on conflict (user_id, lesson_id) do update set
    status = 'completed',
    score = greatest(public.user_lesson_progress.score, p_score),
    xp_earned = greatest(public.user_lesson_progress.xp_earned, v_xp),
    completed_at = coalesce(public.user_lesson_progress.completed_at, now());

  -- Award XP to profile
  update public.profiles
  set xp = xp + v_xp,
      level = greatest(level, 1 + ((xp + v_xp) / 100))
  where id = v_user_id;

  -- Unlock params from this lesson
  if array_length(v_lesson.unlocks_params, 1) > 0 then
    select unlocked_params into v_current_params
    from public.user_synths
    where user_id = v_user_id and synth_model_id = v_synth_model_id;

    if v_current_params is not null then
      -- Merge new params
      select array_agg(distinct p) into v_new_params
      from (
        select unnest(v_current_params) as p
        union
        select unnest(v_lesson.unlocks_params) as p
      ) sub;

      update public.user_synths
      set unlocked_params = v_new_params
      where user_id = v_user_id and synth_model_id = v_synth_model_id;
    end if;
  end if;

  -- Unlock next lesson
  select id into v_next_lesson_id
  from public.lessons
  where synth_model_id = v_synth_model_id
    and sort_order > v_lesson.sort_order
  order by sort_order
  limit 1;

  if v_next_lesson_id is not null then
    insert into public.user_lesson_progress (user_id, lesson_id, status)
    values (v_user_id, v_next_lesson_id, 'available')
    on conflict (user_id, lesson_id) do nothing;
  end if;

  return jsonb_build_object(
    'xp_earned', v_xp,
    'total_xp', (select xp from public.profiles where id = v_user_id),
    'new_level', (select level from public.profiles where id = v_user_id),
    'next_lesson_id', v_next_lesson_id,
    'unlocked_params', v_lesson.unlocks_params,
    'first_completion', not v_already_completed
  );
end;
$$;
