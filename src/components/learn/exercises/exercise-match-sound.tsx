"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Knob } from "@/components/synth/knob";
import { getParamDefs, type EngineType, type ParamValues } from "@/lib/synth-engine";
import { evaluateExercise } from "@/lib/lessons/exercise-evaluator";
import { Volume2 } from "lucide-react";
import type { Json } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface ExerciseMatchSoundProps {
  instructions: string;
  content: Json;
  engineType: EngineType;
  currentParams: ParamValues;
  onComplete: (score: number) => void;
  setParam: (key: string, value: number | string) => void;
  playNote: (note: string, duration?: string) => void;
}

export function ExerciseMatchSound({
  instructions,
  content,
  engineType,
  currentParams,
  onComplete,
  setParam,
  playNote,
}: ExerciseMatchSoundProps) {
  const c = content as Record<string, Json>;
  const targetParams = c.target_params as Record<string, number>;
  const hint = c.hint as string | undefined;
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);

  const paramDefs = getParamDefs(engineType);
  const targetKeys = Object.keys(targetParams);
  const relevantDefs = paramDefs.filter((d) => targetKeys.includes(d.key));

  // Play the target sound by temporarily setting target params
  const handleListenTarget = useCallback(() => {
    // Save current
    const saved: Record<string, number | string> = {};
    for (const key of targetKeys) {
      saved[key] = currentParams[key] ?? 0;
    }
    // Set target
    for (const [key, val] of Object.entries(targetParams)) {
      setParam(key, val);
    }
    playNote("C4", "4n");
    // Restore after sound plays
    setTimeout(() => {
      for (const [key, val] of Object.entries(saved)) {
        setParam(key, val);
      }
    }, 1200);
  }, [targetParams, targetKeys, currentParams, setParam, playNote]);

  function handleCheck() {
    const userParams: Record<string, number> = {};
    for (const key of targetKeys) {
      userParams[key] = Number(currentParams[key] ?? 0);
    }
    const result = evaluateExercise("match_sound", content, userParams);
    setFeedback(result.feedback);
    setIsCorrect(result.correct);
  }

  return (
    <div className="space-y-6">
      <p className="text-base leading-relaxed">{instructions}</p>

      {hint && (
        <p className="text-sm text-muted-foreground italic">Hint: {hint}</p>
      )}

      <div className="flex justify-center gap-4">
        <Button variant="outline" className="gap-2" onClick={handleListenTarget}>
          <Volume2 className="h-4 w-4" />
          Listen to target
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => playNote("C4", "4n")}>
          <Volume2 className="h-4 w-4" />
          Your sound
        </Button>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {relevantDefs.map((def) => (
          <Knob
            key={def.key}
            value={Number(currentParams[def.key] ?? def.defaultValue)}
            min={def.min}
            max={def.max}
            step={def.step}
            label={def.label}
            unit={def.unit}
            onChange={(v) => {
              setParam(def.key, v);
              setFeedback(null);
              setIsCorrect(false);
            }}
          />
        ))}
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
          Check match
        </Button>
      )}
    </div>
  );
}
