"use client";
import { useEffect, useRef } from "react";
import type { ConceptSlideExercise } from "@/lib/course/types";
import { ConceptVisual } from "../concept-visuals";
import { ExerciseShell } from "./exercise-shell";
import { CourseAudioEngine } from "@/lib/course/audio";

interface Props { ex: ConceptSlideExercise; onAnswered: (correct: boolean) => void; }

export function ConceptSlide({ ex, onAnswered }: Props) {
  const onAnsweredRef = useRef(onAnswered);
  useEffect(() => {
    onAnsweredRef.current = onAnswered;
  });

  useEffect(() => {
    onAnsweredRef.current(true);
  }, [ex.id]);

  const playDemo = () => {
    if (!ex.audio) return;
    void CourseAudioEngine.start().then(() => {
      CourseAudioEngine.setPatch(ex.audio!.patch);
      if (ex.audio!.notes) CourseAudioEngine.playSequence(ex.audio!.notes);
    });
  };

  return (
    <ExerciseShell prompt={ex.prompt}>
      <div className="flex flex-col items-center gap-4">
        <ConceptVisual visual={ex.visual} />
        <p className="text-sm text-muted-foreground text-center">{ex.caption}</p>
        {ex.audio && (
          <button
            onClick={playDemo}
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
          >
            ▶ Hear it
          </button>
        )}
      </div>
    </ExerciseShell>
  );
}
