"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Knob } from "@/components/synth/knob";
import { getParamDefs, type EngineType } from "@/lib/synth-engine";
import { evaluateExercise } from "@/lib/lessons/exercise-evaluator";
import type { Json } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface ExerciseTweakProps {
  instructions: string;
  content: Json;
  engineType: EngineType;
  currentParams: Record<string, number | string>;
  onComplete: (score: number) => void;
  setParam: (key: string, value: number | string) => void;
  playNote: (note: string, duration?: string) => void;
}

export function ExerciseTweak({
  instructions,
  content,
  engineType,
  currentParams,
  onComplete,
  setParam,
  playNote,
}: ExerciseTweakProps) {
  const c = content as Record<string, Json>;
  const targetParam = c.target_param as string;
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);

  // Get param def for the target
  const paramDefs = getParamDefs(engineType);
  const paramDef = paramDefs.find((d) => d.key === targetParam);

  if (!paramDef) {
    return <p className="text-destructive">Unknown parameter: {targetParam}</p>;
  }

  const currentValue = Number(currentParams[targetParam] ?? paramDef.defaultValue);

  function handleCheck() {
    const result = evaluateExercise("tweak", content, currentValue);
    setFeedback(result.feedback);
    setIsCorrect(result.correct);
    if (result.correct) {
      playNote("C4", "8n");
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-base leading-relaxed">{instructions}</p>

      <div className="flex flex-col items-center gap-4">
        <Knob
          value={currentValue}
          min={paramDef.min}
          max={paramDef.max}
          step={paramDef.step}
          label={paramDef.label}
          unit={paramDef.unit}
          onChange={(v) => {
            setParam(targetParam, v);
            setFeedback(null);
            setIsCorrect(false);
          }}
          size="lg"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => playNote("C4", "4n")}
        >
          Preview sound
        </Button>
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
