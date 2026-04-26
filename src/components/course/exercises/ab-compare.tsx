"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { AbCompareExercise } from "@/lib/course/types";
import { ExerciseShell } from "./exercise-shell";
import { CourseAudioEngine } from "@/lib/course/audio";

interface Props { ex: AbCompareExercise; onAnswered: (correct: boolean) => void; }

export function AbCompare({ ex, onAnswered }: Props) {
  const [picked, setPicked] = useState<"a" | "b" | null>(null);

  const play = async (which: "a" | "b") => {
    await CourseAudioEngine.start();
    const slot = ex[which];
    CourseAudioEngine.setPatch(slot.patch);
    CourseAudioEngine.playSequence(slot.notes);
  };

  const choose = (which: "a" | "b") => {
    if (picked !== null) return;
    setPicked(which);
    onAnswered(which === ex.correct);
  };

  return (
    <ExerciseShell
      prompt={ex.prompt}
      feedback={picked === null ? null : {
        correct: picked === ex.correct,
        explainer: ex.explainer,
      }}
    >
      <div className="grid grid-cols-2 gap-3 w-full">
        {(["a", "b"] as const).map((which) => {
          const slot = ex[which];
          const isPicked = picked === which;
          const isCorrect = which === ex.correct;
          const showState = picked !== null && (isPicked || isCorrect);
          const cls = showState
            ? isCorrect
              ? "border-emerald-500 bg-emerald-500/10"
              : isPicked
                ? "border-red-500 bg-red-500/10"
                : "border-border"
            : "border-border hover:border-primary";
          return (
            <motion.div
              key={which}
              className={`rounded-xl border p-3 flex flex-col gap-2 ${cls}`}
              whileTap={{ scale: 0.98 }}
            >
              <button
                onClick={() => play(which)}
                className="w-full h-16 rounded-lg bg-primary/20 text-primary text-xl flex items-center justify-center"
                aria-label={`Play ${which.toUpperCase()}`}
              >▶</button>
              <button
                onClick={() => choose(which)}
                disabled={picked !== null}
                className="w-full text-xs font-semibold py-1 rounded bg-card border border-border disabled:cursor-not-allowed"
              >
                {slot.label ?? `Pick ${which.toUpperCase()}`}
              </button>
            </motion.div>
          );
        })}
      </div>
    </ExerciseShell>
  );
}
