"use client";

import { Button } from "@/components/ui/button";
import type { Json } from "@/lib/supabase/types";

interface ExerciseInfoProps {
  instructions: string;
  content: Json;
  onComplete: () => void;
}

export function ExerciseInfo({ instructions, content, onComplete }: ExerciseInfoProps) {
  const c = content as Record<string, Json>;
  const text = (c.text as string) ?? "";

  return (
    <div className="space-y-6">
      <div className="prose prose-sm prose-invert max-w-none">
        <p className="text-base leading-relaxed">{instructions}</p>
        {text && (
          <div className="mt-4 rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
            {text}
          </div>
        )}
      </div>
      <Button onClick={onComplete} className="w-full">
        Got it!
      </Button>
    </div>
  );
}
