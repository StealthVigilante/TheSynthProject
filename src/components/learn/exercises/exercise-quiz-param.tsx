"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Knob } from "@/components/synth/knob";
import { getParamDefs, type EngineType } from "@/lib/synth-engine";
import { evaluateExercise } from "@/lib/lessons/exercise-evaluator";
import type { Json } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface ExerciseQuizParamProps {
  instructions: string;
  content: Json;
  engineType: EngineType;
  onComplete: (score: number) => void;
}

export function ExerciseQuizParam({
  instructions,
  content,
  engineType,
  onComplete,
}: ExerciseQuizParamProps) {
  const c = content as Record<string, Json>;
  const paramKey = c.param_key as string;
  const question = (c.question as string) ?? instructions;

  const paramDefs = getParamDefs(engineType);
  const paramDef = paramDefs.find((d) => d.key === paramKey);

  const [value, setValue] = useState(paramDef ? (paramDef.min + paramDef.max) / 2 : 0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);

  if (!paramDef) {
    return <p className="text-destructive">Unknown parameter: {paramKey}</p>;
  }

  function handleCheck() {
    const result = evaluateExercise("quiz_param", content, value);
    setFeedback(result.feedback);
    setIsCorrect(result.correct);
  }

  return (
    <div className="space-y-6">
      <p className="text-base leading-relaxed">{question}</p>

      <div className="flex justify-center">
        <Knob
          value={value}
          min={paramDef.min}
          max={paramDef.max}
          step={paramDef.step}
          label={paramDef.label}
          unit={paramDef.unit}
          onChange={(v) => {
            setValue(v);
            setFeedback(null);
            setIsCorrect(false);
          }}
          size="lg"
        />
      </div>

      {feedback && (
        <p
          className={cn(
            "text-center text-sm font-medium",
            isCorrect ? "text-green-500" : "text-yellow-500"
          )}
        >
          {feedback}
        </p>
      )}

      {isCorrect ? (
        <Button onClick={() => onComplete(100)} className="w-full">
          Continue
        </Button>
      ) : (
        <Button onClick={handleCheck} className="w-full">
          Check
        </Button>
      )}
    </div>
  );
}
