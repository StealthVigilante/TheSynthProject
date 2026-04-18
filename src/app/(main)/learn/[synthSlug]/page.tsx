import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PathwayMap } from "@/components/learn/pathway-map";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Lesson, UserLessonProgress, SynthModel } from "@/lib/supabase/types";

export default async function SynthLessonsPage({
  params,
}: {
  params: Promise<{ synthSlug: string }>;
}) {
  const { synthSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get synth model
  const { data: synthData } = await supabase
    .from("synth_models")
    .select("*")
    .eq("slug", synthSlug)
    .single();

  const synth = synthData as unknown as SynthModel | null;
  if (!synth) notFound();

  // Get lessons for this synth
  const { data: lessonsData } = await supabase
    .from("lessons")
    .select("*")
    .eq("synth_model_id", synth.id)
    .order("sort_order");

  const lessons = (lessonsData ?? []) as Lesson[];

  // Get user progress for these lessons
  const lessonIds = lessons.map((l) => l.id);
  const { data: progressData } = await supabase
    .from("user_lesson_progress")
    .select("*")
    .eq("user_id", user!.id)
    .in("lesson_id", lessonIds.length > 0 ? lessonIds : ["00000000-0000-0000-0000-000000000000"]);

  const progress = (progressData ?? []) as UserLessonProgress[];
  const progressMap = new Map(progress.map((p) => [p.lesson_id, p]));

  const nodes = lessons.map((lesson) => {
    const p = progressMap.get(lesson.id);
    return {
      lessonId: lesson.id,
      lessonSlug: lesson.slug,
      title: lesson.title,
      description: lesson.description,
      xpReward: lesson.xp_reward,
      status: (p?.status ?? "locked") as "locked" | "available" | "in_progress" | "completed",
      unlocksParams: lesson.unlocks_params,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/learn"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Synths
        </Link>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">{synth.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{synth.description}</p>
      </div>

      {lessons.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-muted-foreground">No lessons available yet</p>
        </div>
      ) : (
        <PathwayMap synthSlug={synthSlug} nodes={nodes} />
      )}
    </div>
  );
}
