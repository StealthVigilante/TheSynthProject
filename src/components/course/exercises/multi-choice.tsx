"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { MultiChoiceExercise } from "@/lib/course/types";
import { ExerciseShell } from "./exercise-shell";

interface Props { ex: MultiChoiceExercise; onAnswered: (correct: boolean) => void; }

export function MultiChoice({ ex, onAnswered }: Props) {
  const [picked, setPicked] = useState<number | null>(null);

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    onAnswered(i === ex.correctIndex);
  };

  return (
    <ExerciseShell
      prompt={ex.prompt}
      feedback={picked === null ? null : {
        correct: picked === ex.correctIndex,
        explainer: ex.explainer,
      }}
    >
      <div className="flex flex-col gap-2 w-full">
        <p className="text-sm text-foreground/80">{ex.question}</p>
        {ex.options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === ex.correctIndex;
          const showState = picked !== null && (isPicked || isCorrect);
          const cls = showState
            ? isCorrect
              ? "border-emerald-500 bg-emerald-500/10"
              : isPicked
                ? "border-red-500 bg-red-500/10"
                : "border-border"
            : "border-border hover:border-primary";
          return (
            <motion.button
              key={i}
              onClick={() => choose(i)}
              whileTap={{ scale: 0.98 }}
              className={`w-full rounded-lg border px-4 py-3 text-sm text-left transition ${cls}`}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>
    </ExerciseShell>
  );
}
