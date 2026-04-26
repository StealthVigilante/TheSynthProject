"use client";
import { useEffect, useRef, useState } from "react";
import type { FreePlayExercise } from "@/lib/course/types";
import { ExerciseShell } from "./exercise-shell";
import { Synth1ProEmbedded } from "@/components/course/synth1-pro-embedded";
import { CourseAudioEngine } from "@/lib/course/audio";

interface Props { ex: FreePlayExercise; onAnswered: (correct: boolean) => void; }

export function FreePlay({ ex, onAnswered }: Props) {
  const [remaining, setRemaining] = useState<number | null>(ex.durationS ?? null);
  const onAnsweredRef = useRef(onAnswered);
  useEffect(() => { onAnsweredRef.current = onAnswered; });

  useEffect(() => {
    void CourseAudioEngine.start().then(() => {
      if (ex.patch) CourseAudioEngine.setPatch(ex.patch);
    });
    onAnsweredRef.current(true);
    if (ex.durationS == null) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r == null || r <= 0) {
          window.clearInterval(id);
          return r;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id]);

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
