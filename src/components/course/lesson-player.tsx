"use client";
import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Lesson } from "@/lib/course/types";
import { ExerciseRenderer, isPassiveExercise } from "./exercises";
import { markLessonComplete, recordExerciseAttempt } from "@/lib/course/progress";

interface Props {
  lesson: Lesson;
  lessonId: string;        // fully-qualified e.g. "1-1.1-1-1"
  subLessonSlug: string;   // e.g. "1-1"
  onExit: () => void;
  onComplete: () => void;
}

type Phase = "idle" | "answered" | "advancing";

export function LessonPlayer({ lesson, lessonId, subLessonSlug, onExit, onComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [completedPanel, setCompletedPanel] = useState(false);

  const ex = lesson.exercises[idx];
  const isPassive = isPassiveExercise(ex);

  const handleAnswered = useCallback(
    (correct: boolean) => {
      if (phase !== "idle") return;
      recordExerciseAttempt(ex, subLessonSlug, correct);
      setLastCorrect(correct);
      setPhase("answered");
    },
    [ex, phase, subLessonSlug],
  );

  const advance = useCallback(() => {
    setPhase("advancing");
    setLastCorrect(null);
    if (idx + 1 < lesson.exercises.length) {
      window.setTimeout(() => {
        setIdx(idx + 1);
        setPhase("idle");
      }, 250);
    } else {
      setCompletedPanel(true);
      markLessonComplete(lessonId);
      window.setTimeout(() => { onComplete(); }, 1500);
    }
  }, [idx, lesson.exercises.length, lessonId, onComplete]);

  const buttonLabel = isPassive ? "CONTINUE" : phase === "idle" ? "CHECK" : "CONTINUE";
  const buttonDisabled = !isPassive && phase === "idle";

  const onButton = () => {
    if (isPassive || phase === "answered") advance();
  };

  const exitWithConfirm = () => {
    if (window.confirm("Quit lesson? Progress in this lesson resets.")) onExit();
  };

  if (completedPanel) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">★</div>
          <h2 className="text-2xl font-bold">Lesson complete</h2>
        </motion.div>
      </div>
    );
  }

  const progress = (idx / lesson.exercises.length) * 100;

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={exitWithConfirm} aria-label="Quit" className="p-1">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{idx + 1}/{lesson.exercises.length}</span>
      </header>

      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={ex.id}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ExerciseRenderer ex={ex} onAnswered={handleAnswered} />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-border p-4">
        <button
          onClick={onButton}
          disabled={buttonDisabled}
          className={`w-full rounded-xl py-3 text-sm font-bold transition ${
            buttonDisabled
              ? "bg-muted text-muted-foreground"
              : lastCorrect === false
                ? "bg-red-500 text-white"
                : "bg-primary text-primary-foreground"
          }`}
        >
          {buttonLabel}
        </button>
      </footer>
    </div>
  );
}
