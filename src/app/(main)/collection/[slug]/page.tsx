import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SynthPageClient } from "./synth-page-client";
import type { SynthModel, UserSynth } from "@/lib/supabase/types";

export default async function SynthPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: synth } = await supabase
    .from("synth_models")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!synth) {
    notFound();
  }

  const typedSynth = synth as unknown as SynthModel;

  // Build param → lesson title map from lessons for this synth
  const { data: lessons } = await supabase
    .from("lessons")
    .select("title, unlocks_params")
    .eq("synth_model_id", typedSynth.id)
    .order("sort_order");

  const paramLessonMap: Record<string, string> = {};
  for (const lesson of lessons ?? []) {
    const params = lesson.unlocks_params as string[] | null;
    for (const p of params ?? []) {
      paramLessonMap[p] = lesson.title;
    }
  }

  // Get user's unlocked params for this synth
  let unlockedParams: string[] | null = null;
  if (user) {
    const { data: userSynth } = await supabase
      .from("user_synths")
      .select("unlocked_params")
      .eq("user_id", user.id)
      .eq("synth_model_id", typedSynth.id)
      .single();

    if (userSynth) {
      unlockedParams = (userSynth as unknown as UserSynth).unlocked_params;
    }
  }

  return (
    <SynthPageClient
      synth={{
        id: typedSynth.id,
        name: typedSynth.name,
        slug: typedSynth.slug,
        description: typedSynth.description,
        engineType: typedSynth.engine_type,
        engineConfig: typedSynth.engine_config,
        defaultParams: typedSynth.default_params,
        allParams: typedSynth.all_params,
      }}
      unlockedParams={unlockedParams}
      paramLessonMap={paramLessonMap}
    />
  );
}
