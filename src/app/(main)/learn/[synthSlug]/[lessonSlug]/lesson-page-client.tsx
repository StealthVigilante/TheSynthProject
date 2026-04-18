"use client";

import { AudioProvider } from "@/providers/audio-provider";
import { ExercisePlayer } from "@/components/learn/exercise-player";
import { ThemedSynthPanel } from "@/components/synths/themed-synth-panel";
import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useKeyboard } from "@/hooks/use-keyboard";
import type { Exercise } from "@/lib/supabase/types";
import type { EngineType } from "@/lib/synth-engine";
import type { Json } from "@/lib/supabase/types";

interface LessonPageClientProps {
  lessonId: string;
  lessonTitle: string;
  exercises: Exercise[];
  synthSlug: string;
  synthName: string;
  engineType: string;
  engineConfig: Json;
  defaultParams: Json;
  allParams: string[];
  unlockedParams: string[] | null;
  paramLessonMap: Record<string, string>;
}

function LessonPageInner({
  lessonId,
  lessonTitle,
  exercises,
  synthSlug,
  synthName,
  engineType,
  engineConfig,
  defaultParams,
  allParams,
  unlockedParams,
  paramLessonMap,
}: LessonPageClientProps) {
  const {
    params,
    isReady,
    setParam,
    noteOn,
    noteOff,
    playNote,
  } = useSynthEngine({
    engineType,
    engineConfig,
    defaultParams,
    allParams,
  });

  useKeyboard({
    onNoteOn: noteOn,
    onNoteOff: noteOff,
    enabled: isReady,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Exercise panel */}
      <div>
        <ExercisePlayer
          lessonId={lessonId}
          lessonTitle={lessonTitle}
          exercises={exercises}
          engineType={engineType as EngineType}
          params={params}
          synthSlug={synthSlug}
          setParam={setParam}
          playNote={playNote}
        />
      </div>

      {/* Synth panel — sticky on desktop */}
      <div className="hidden lg:block">
        <div className="sticky top-4">
          <ThemedSynthPanel
            engineType={engineType as EngineType}
            params={params}
            onParamChange={setParam}
            onNoteOn={noteOn}
            onNoteOff={noteOff}
            unlockedParams={unlockedParams}
            paramLessonMap={paramLessonMap}
            isReady={isReady}
            synthName={synthName}
          />
        </div>
      </div>
    </div>
  );
}

export function LessonPageClient(props: LessonPageClientProps) {
  return (
    <AudioProvider>
      <LessonPageInner {...props} />
    </AudioProvider>
  );
}
