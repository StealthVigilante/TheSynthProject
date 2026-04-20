import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LessonPageClient } from "./lesson-page-client";
import type { Exercise, Lesson, SynthModel, UserLessonProgress, UserSynth } from "@/lib/supabase/types";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ synthSlug: string; lessonSlug: string }>;
}) {
  const { synthSlug, lessonSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get synth
  const { data: synthData } = await supabase
    .from("synth_models")
    .select("*")
    .eq("slug", synthSlug)
    .single();

  const synth = synthData as unknown as SynthModel | null;
  if (!synth) notFound();

  // Get lesson
  const { data: lessonData } = await supabase
    .from("lessons")
    .select("*")
    .eq("synth_model_id", synth.id)
    .eq("slug", lessonSlug)
    .single();

  const lesson = lessonData as unknown as Lesson | null;
  if (!lesson) notFound();

  // Check user has access (available, in_progress, or completed)
  const { data: progressData } = await supabase
    .from("user_lesson_progress")
    .select("status")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson.id)
    .single();

  const progress = progressData as { status: string } | null;

  if (!progress || progress.status === "locked") {
    redirect(`/learn/${synthSlug}`);
  }

  // Get exercises
  const { data: exercisesData } = await supabase
    .from("exercises")
    .select("*")
    .eq("lesson_id", lesson.id)
    .order("sort_order");

  const exercises = (exercisesData ?? []) as Exercise[];

  // Mark lesson as in_progress if it's available
  if (progress.status === "available") {
    await (supabase
      .from("user_lesson_progress") as any)
      .update({ status: "in_progress" })
      .eq("user_id", user.id)
      .eq("lesson_id", lesson.id);
  }

  // Build param → lesson title map for all lessons on this synth
  const { data: allLessons } = await supabase
    .from("lessons")
    .select("title, unlocks_params")
    .eq("synth_model_id", synth.id)
    .order("sort_order");

  const paramLessonMap: Record<string, string> = {};
  for (const l of allLessons ?? []) {
    const unlockedByLesson = l.unlocks_params as string[] | null;
    for (const p of unlockedByLesson ?? []) {
      paramLessonMap[p] = l.title;
    }
  }

  // Get user's currently unlocked params for this synth
  const { data: userSynthData } = await supabase
    .from("user_synths")
    .select("unlocked_params")
    .eq("user_id", user.id)
    .eq("synth_model_id", synth.id)
    .single();

  // Always merge current lesson's params so they're accessible during the lesson
  const dbUnlocked = userSynthData
    ? (userSynthData as unknown as UserSynth).unlocked_params
    : [];
  const lessonParams = (lesson.unlocks_params as string[]) ?? [];
  const unlockedParams = [...new Set([...dbUnlocked, ...lessonParams])];

  return (
    <LessonPageClient
      lessonId={lesson.id}
      lessonSlug={lessonSlug}
      lessonTitle={lesson.title}
      exercises={exercises}
      synthSlug={synthSlug}
      synthName={synth.name}
      engineType={synth.engine_type}
      engineConfig={synth.engine_config}
      defaultParams={synth.default_params}
      allParams={synth.all_params}
      unlockedParams={unlockedParams}
      paramLessonMap={paramLessonMap}
    />
  );
}
