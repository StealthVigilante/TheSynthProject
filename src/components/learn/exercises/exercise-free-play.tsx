"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Json } from "@/lib/supabase/types";

interface ExerciseFreePlayProps {
  instructions: string;
  content: Json;
  onComplete: () => void;
}

export function ExerciseFreePlay({ instructions, content, onComplete }: ExerciseFreePlayProps) {
  const c = content as Record<string, Json>;
  const durationSeconds = (c.duration_seconds as number) ?? 15;
  const prompt = (c.prompt as string) ?? "";
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [started, timeLeft]);

  return (
    <div className="space-y-6">
      <p className="text-base leading-relaxed">{instructions}</p>
      {prompt && (
        <p className="text-sm text-muted-foreground italic">{prompt}</p>
      )}

      <div className="text-center">
        {!started ? (
          <Button onClick={() => setStarted(true)} size="lg">
            Start free play
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-3xl font-mono font-bold tabular-nums">
              {timeLeft > 0 ? `${timeLeft}s` : "Done!"}
            </p>
            <p className="text-sm text-muted-foreground">
              {timeLeft > 0
                ? "Play notes using your keyboard or click the piano below"
                : "Great exploration!"}
            </p>
          </div>
        )}
      </div>

      <Button
        onClick={onComplete}
        className="w-full"
        disabled={!started || timeLeft > 0}
      >
        Continue
      </Button>
    </div>
  );
}
