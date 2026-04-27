"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  prompt: string;
  children: ReactNode;
  feedback?: { correct: boolean; explainer?: string } | null;
}

export function ExerciseShell({ prompt, children, feedback }: Props) {
  return (
    <div className="flex flex-col items-center gap-6 px-4 py-6 w-full max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-foreground text-center">{prompt}</h2>
      <div className="w-full">{children}</div>
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`w-full rounded-lg p-3 text-sm ${
              feedback.correct
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : "bg-red-500/15 text-red-300 border border-red-500/30"
            }`}
          >
            <div className="font-semibold">{feedback.correct ? "Correct" : "Not quite"}</div>
            {feedback.explainer && <div className="mt-1 opacity-90">{feedback.explainer}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
