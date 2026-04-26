"use client";
import { useEffect, useState } from "react";
import type { FreePlayExercise } from "@/lib/course/types";
import { ExerciseShell } from "./exercise-shell";
import { Synth1ProEmbedded } from "@/components/course/synth1-pro-embedded";
import { CourseAudioEngine } from "@/lib/course/audio";

interface Props { ex: FreePlayExercise; onAnswered: (correct: boolean) => void; }

export function FreePlay({ ex, onAnswered }: Props) {
  const [remaining, setRemaining] = useState(ex.durationS ?? null);

  useEffect(() => {
    void CourseAudioEngine.start().then(() => {
      if (ex.patch) CourseAudioEngine.setPatch(ex.patch);
    });
  }, [ex.id, ex.patch]);

  useEffect(() => {
    onAnswered(true);
    if (remaining === null) return;
    const id = window.setInterval(() => {
      setRemaining((r) => (r !== null && r > 0 ? r - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [ex.id, onAnswered, remaining]);

  return (
    <ExerciseShell prompt={ex.prompt}>
      <div className="flex flex-col items-center gap-3 w-full">
        {ex.caption && <p className="text-sm text-muted-foreground text-center">{ex.caption}</p>}
        {remaining !== null && (
          <p className="text-xs text-muted-foreground">{remaining}s remaining</p>
        )}
        <div className="w-full">
          <Synth1ProEmbedded />
        </div>
      </div>
    </ExerciseShell>
  );
}
