"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import type { Json } from "@/lib/supabase/types";

interface ExerciseListenProps {
  instructions: string;
  content: Json;
  onComplete: () => void;
  playNote: (note: string, duration?: string) => void;
  setParam: (key: string, value: number | string) => void;
}

export function ExerciseListen({
  instructions,
  content,
  onComplete,
  playNote,
  setParam,
}: ExerciseListenProps) {
  const c = content as Record<string, Json>;
  const paramsToSet = (c.params_to_set as Record<string, number | string>) ?? {};
  const noteSequence = (c.note_sequence as string[]) ?? ["C4"];
  const [hasListened, setHasListened] = useState(false);

  function handleListen() {
    // Apply params
    for (const [key, value] of Object.entries(paramsToSet)) {
      setParam(key, value);
    }

    // Play the note sequence
    noteSequence.forEach((note, i) => {
      setTimeout(() => playNote(note, "4n"), i * 500);
    });

    setHasListened(true);
  }

  return (
    <div className="space-y-6">
      <p className="text-base leading-relaxed">{instructions}</p>

      <div className="flex justify-center">
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={handleListen}
        >
          <Volume2 className="h-5 w-5" />
          {hasListened ? "Listen again" : "Listen"}
        </Button>
      </div>

      <Button onClick={onComplete} className="w-full" disabled={!hasListened}>
        Continue
      </Button>
    </div>
  );
}
