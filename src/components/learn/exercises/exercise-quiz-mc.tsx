"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { evaluateExercise } from "@/lib/lessons/exercise-evaluator";
import type { Json } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface ExerciseQuizMcProps {
  instructions: string;
  content: Json;
  onComplete: (score: number) => void;
}

export function ExerciseQuizMc({ instructions, content, onComplete }: ExerciseQuizMcProps) {
  const c = content as Record<string, Json>;
  const question = (c.question as string) ?? instructions;
  const options = (c.options as string[]) ?? [];
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);

  function handleSelect(index: number) {
    if (isCorrect) return;
    setSelected(index);
    const result = evaluateExercise("quiz_mc", content, index);
    setFeedback(result.feedback);
    setIsCorrect(result.correct);
  }

  const correctIndex = c.correct_index as number;

  return (
    <div className="space-y-6">
      <p className="text-base leading-relaxed">{question}</p>

      <div className="space-y-2">
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            disabled={isCorrect}
            className={cn(
              "w-full rounded-lg border p-3 text-left text-sm transition-colors",
              selected === null && "hover:bg-muted",
              selected === i && isCorrect && "border-green-500 bg-green-500/10",
              selected === i && !isCorrect && feedback && "border-destructive bg-destructive/10",
              selected !== i && isCorrect && i === correctIndex && "border-green-500 bg-green-500/10",
              selected !== i && "border-border"
            )}
          >
            <span className="mr-2 font-mono text-muted-foreground">
              {String.fromCharCode(65 + i)}.
            </span>
            {option}
          </button>
        ))}
      </div>

      {feedback && (
        <p
          className={cn(
            "text-center text-sm font-medium",
            isCorrect ? "text-green-500" : "text-destructive"
          )}
        >
          {feedback}
        </p>
      )}

      {isCorrect && (
        <Button onClick={() => onComplete(100)} className="w-full">
          Continue
        </Button>
      )}
      {feedback && !isCorrect && (
        <Button
          variant="outline"
          onClick={() => {
            setSelected(null);
            setFeedback(null);
          }}
          className="w-full"
        >
          Try again
        </Button>
      )}
    </div>
  );
}
