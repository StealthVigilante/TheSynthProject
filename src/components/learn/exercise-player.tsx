"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Exercise, ExerciseType, Json } from "@/lib/supabase/types";
import type { EngineType, ParamValues } from "@/lib/synth-engine";
import { ExerciseInfo } from "./exercises/exercise-info";
import { ExerciseListen } from "./exercises/exercise-listen";
import { ExerciseTweak } from "./exercises/exercise-tweak";
import { ExerciseMatchSound } from "./exercises/exercise-match-sound";
import { ExerciseQuizMc } from "./exercises/exercise-quiz-mc";
import { ExerciseQuizParam } from "./exercises/exercise-quiz-param";
import { ExerciseFreePlay } from "./exercises/exercise-free-play";
import { ExerciseAdsrDisplay } from "./exercises/exercise-adsr-display";
import { ExerciseFilterDisplay } from "./exercises/exercise-filter-display";
import { ExerciseWaveformDisplay } from "./exercises/exercise-waveform-display";
import { XpRewardModal } from "./xp-reward-modal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";

interface ExercisePlayerProps {
  lessonId: string;
  lessonTitle: string;
  exercises: Exercise[];
  engineType: EngineType;
  params: ParamValues;
  synthSlug: string;
  setParam: (key: string, value: number | string) => void;
  playNote: (note: string, duration?: string) => void;
  getWaveform: () => Float32Array;
  onSlideChange?: (index: number) => void;
}

interface CompletionResult {
  xp_earned: number;
  total_xp: number;
  new_level: number;
  new_streak: number;
  next_lesson_id: string | null;
  unlocked_params: string[];
  first_completion: boolean;
}

export function ExercisePlayer({
  lessonId,
  lessonTitle,
  exercises,
  engineType,
  params,
  synthSlug,
  setParam,
  playNote,
  getWaveform,
  onSlideChange,
}: ExercisePlayerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const exercise = exercises[currentIndex];
  const progress = ((currentIndex) / exercises.length) * 100;

  useEffect(() => {
    onSlideChange?.(currentIndex);
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExerciseComplete = useCallback(
    async (score = 100) => {
      const newScores = [...scores, score];
      setScores(newScores);

      if (currentIndex < exercises.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        // All exercises done - submit to server
        setIsSubmitting(true);
        try {
          const avgScore = Math.round(
            newScores.reduce((a, b) => a + b, 0) / newScores.length
          );

          const res = await fetch("/api/progress/complete-lesson", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lessonId, score: avgScore }),
          });

          if (res.ok) {
            const result = await res.json();
            setCompletionResult(result);
            setShowReward(true);
          }
        } catch (err) {
          console.error("Failed to submit progress:", err);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [currentIndex, exercises.length, scores, lessonId]
  );

  const handleRewardClose = () => {
    setShowReward(false);
    router.push(`/learn/${synthSlug}`);
    router.refresh();
  };

  if (!exercise) {
    return <p className="text-muted-foreground">No exercises in this lesson.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            router.push(`/learn/${synthSlug}`);
          }}
        >
          <X className="h-5 w-5" />
        </Button>
        <Progress value={progress} className="flex-1" />
        <span className="text-xs text-muted-foreground tabular-nums">
          {currentIndex + 1}/{exercises.length}
        </span>
      </div>

      {/* Exercise title */}
      {exercise.title && (
        <h2 className="text-lg font-semibold">{exercise.title}</h2>
      )}

      {/* Exercise component */}
      <div
        key={currentIndex}
        className="rounded-lg border bg-card p-6"
        style={{ animation: "exercise-slide-in 0.3s ease-out both" }}
      >
        <ExerciseRenderer
          exercise={exercise}
          engineType={engineType}
          params={params}
          setParam={setParam}
          playNote={playNote}
          getWaveform={getWaveform}
          onComplete={handleExerciseComplete}
        />
      </div>

      {isSubmitting && (
        <p className="text-center text-sm text-muted-foreground">
          Saving progress...
        </p>
      )}

      {/* XP Reward Modal — portalled to body so overflow/transform parents can't clip it */}
      {showReward && completionResult &&
        createPortal(
          <XpRewardModal
            xpEarned={completionResult.xp_earned}
            totalXp={completionResult.total_xp}
            newLevel={completionResult.new_level}
            newStreak={completionResult.new_streak ?? 0}
            unlockedParams={completionResult.unlocked_params}
            firstCompletion={completionResult.first_completion}
            onClose={handleRewardClose}
          />,
          document.body
        )
      }
    </div>
  );
}

function ExerciseRenderer({
  exercise,
  engineType,
  params,
  setParam,
  playNote,
  getWaveform,
  onComplete,
}: {
  exercise: Exercise;
  engineType: EngineType;
  params: ParamValues;
  setParam: (key: string, value: number | string) => void;
  playNote: (note: string, duration?: string) => void;
  getWaveform: () => Float32Array;
  onComplete: (score?: number) => void;
}) {
  switch (exercise.exercise_type) {
    case "info":
      return (
        <ExerciseInfo
          instructions={exercise.instructions}
          content={exercise.content}
          onComplete={() => onComplete(100)}
        />
      );
    case "listen":
      return (
        <ExerciseListen
          instructions={exercise.instructions}
          content={exercise.content}
          onComplete={() => onComplete(100)}
          playNote={playNote}
          setParam={setParam}
        />
      );
    case "tweak":
      return (
        <ExerciseTweak
          instructions={exercise.instructions}
          content={exercise.content}
          engineType={engineType}
          currentParams={params}
          onComplete={onComplete}
          setParam={setParam}
          playNote={playNote}
        />
      );
    case "match_sound":
      return (
        <ExerciseMatchSound
          instructions={exercise.instructions}
          content={exercise.content}
          engineType={engineType}
          currentParams={params}
          onComplete={onComplete}
          setParam={setParam}
          playNote={playNote}
        />
      );
    case "quiz_mc":
      return (
        <ExerciseQuizMc
          instructions={exercise.instructions}
          content={exercise.content}
          onComplete={onComplete}
        />
      );
    case "quiz_param":
      return (
        <ExerciseQuizParam
          instructions={exercise.instructions}
          content={exercise.content}
          engineType={engineType}
          onComplete={onComplete}
        />
      );
    case "free_play":
      return (
        <ExerciseFreePlay
          instructions={exercise.instructions}
          content={exercise.content}
          onComplete={() => onComplete(100)}
        />
      );
    case "adsr_display":
      return (
        <ExerciseAdsrDisplay
          instructions={exercise.instructions}
          content={exercise.content}
          params={params}
          onComplete={() => onComplete(100)}
        />
      );
    case "filter_display":
      return (
        <ExerciseFilterDisplay
          instructions={exercise.instructions}
          content={exercise.content}
          params={params}
          onComplete={() => onComplete(100)}
        />
      );
    case "waveform_display":
      return (
        <ExerciseWaveformDisplay
          instructions={exercise.instructions}
          content={exercise.content}
          params={params}
          getWaveform={getWaveform}
          onComplete={() => onComplete(100)}
        />
      );
    default:
      return <p>Unknown exercise type</p>;
  }
}
