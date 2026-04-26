"use client";
import { useEffect, useState } from "react";
import type { TapToHearExercise } from "@/lib/course/types";
import { ExerciseShell } from "./exercise-shell";
import { CourseAudioEngine } from "@/lib/course/audio";

interface Props { ex: TapToHearExercise; onAnswered: (correct: boolean) => void; }

export function TapToHear({ ex, onAnswered }: Props) {
  const [played, setPlayed] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPlayed(false); }, [ex.id]);

  const play = async () => {
    await CourseAudioEngine.start();
    CourseAudioEngine.setPatch(ex.patch);
    CourseAudioEngine.playSequence(ex.notes);
    setPlayed(true);
    onAnswered(true);
  };

  return (
    <ExerciseShell prompt={ex.prompt}>
      <div className="flex flex-col items-center gap-4">
        {ex.caption && <p className="text-sm text-muted-foreground text-center">{ex.caption}</p>}
        <button
          onClick={play}
          className="w-20 h-20 rounded-full bg-primary text-primary-foreground text-3xl flex items-center justify-center active:scale-95 transition"
          aria-label="Play sound"
        >▶</button>
        {played && <p className="text-xs text-emerald-400">Played — tap CONTINUE.</p>}
      </div>
    </ExerciseShell>
  );
}
