"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { WaveformPickExercise, Waveform } from "@/lib/course/types";
import { ExerciseShell } from "./exercise-shell";
import { WaveformMorph } from "../concept-visuals/waveform-morph";

interface Props { ex: WaveformPickExercise; onAnswered: (correct: boolean) => void; }

const LABELS: Record<Waveform, string> = {
  sine: "Sine", square: "Square", triangle: "Triangle", sawtooth: "Sawtooth",
};

export function WaveformPick({ ex, onAnswered }: Props) {
  const [picked, setPicked] = useState<Waveform | null>(null);

  const choose = (w: Waveform) => {
    if (picked !== null) return;
    setPicked(w);
    onAnswered(w === ex.shape);
  };

  return (
    <ExerciseShell
      prompt={ex.prompt}
      feedback={picked === null ? null : { correct: picked === ex.shape }}
    >
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="w-full bg-card rounded-lg p-3 border border-border">
          <WaveformMorph focus={ex.shape} />
        </div>
        <div className="grid grid-cols-2 gap-2 w-full">
          {ex.options.map((w) => {
            const isPicked = picked === w;
            const isCorrect = w === ex.shape;
            const show = picked !== null && (isPicked || isCorrect);
            const cls = show
              ? isCorrect ? "border-emerald-500 bg-emerald-500/10" : "border-red-500 bg-red-500/10"
              : "border-border hover:border-primary";
            return (
              <motion.button
                key={w}
                whileTap={{ scale: 0.98 }}
                onClick={() => choose(w)}
                disabled={picked !== null}
                className={`rounded-lg border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed ${cls}`}
              >
                {LABELS[w]}
              </motion.button>
            );
          })}
        </div>
      </div>
    </ExerciseShell>
  );
}
