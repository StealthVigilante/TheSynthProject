"use client";

import { Button } from "@/components/ui/button";
import type { Json } from "@/lib/supabase/types";

interface ExerciseFreePlayProps {
  instructions: string;
  content: Json;
  onComplete: () => void;
}

export function ExerciseFreePlay({ instructions, content, onComplete }: ExerciseFreePlayProps) {
  const c = content as Record<string, Json>;
  const prompt = (c.prompt as string) ?? "";

  return (
    <div className="space-y-6">
      <p className="text-base leading-relaxed">{instructions}</p>
      {prompt && (
        <p className="text-sm text-muted-foreground italic">{prompt}</p>
      )}
      <Button onClick={onComplete} className="w-full" size="lg">
        Continue
      </Button>
    </div>
  );
}
