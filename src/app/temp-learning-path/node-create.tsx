"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SynthModule } from "./synth-module";
import type { ParamValues } from "@/lib/synth-engine";

interface NodeCreateProps {
  instruction: string;
  targetParams: Partial<ParamValues>;
  enabledParams: string[];
  params: ParamValues;
  onChange: (key: string, value: number | string) => void;
  onNoteOn: (note: string, velocity: number) => void;
  onNoteOff: (note: string) => void;
  playNote: (note: string, duration?: string) => void;
  getWaveform: () => Float32Array;
  onConcept: (concept: string, correct: boolean) => void;
  onComplete: () => void;
}

export function NodeCreate({
  instruction,
  targetParams,
  enabledParams,
  params,
  onChange,
  onNoteOn,
  onNoteOff,
  playNote,
  getWaveform,
  onConcept,
  onComplete,
}: NodeCreateProps) {
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [attempts, setAttempts] = useState(0);

  function playTarget() {
    const snapshot: Partial<ParamValues> = {};
    for (const key of Object.keys(targetParams)) {
      snapshot[key] = params[key];
      onChange(key, targetParams[key] as number | string);
    }
    playNote("C4", "2n");
    setTimeout(() => {
      for (const key of Object.keys(snapshot)) {
        onChange(key, snapshot[key] as number | string);
      }
    }, 1200);
  }

  function checkAnswer() {
    let allCorrect = true;
    for (const [key, target] of Object.entries(targetParams)) {
      const current = params[key];
      if (typeof target === "string") {
        if (current !== target) { allCorrect = false; break; }
      } else if (typeof target === "number") {
        const tolerance = Math.abs(target) * 0.15 || 1;
        if (Math.abs(Number(current) - target) > tolerance) { allCorrect = false; break; }
      }
    }
    setAttempts((a) => a + 1);
    onConcept("match-waveform", allCorrect);
    setFeedback(allCorrect ? "correct" : "wrong");
    if (allCorrect) {
      setTimeout(onComplete, 900);
    } else {
      setTimeout(() => setFeedback(null), 1200);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6 }}>{instruction}</p>

      <Button variant="outline" onClick={playTarget} style={{ width: "100%" }}>
        ▶ Play Target Sound
      </Button>

      <SynthModule
        enabledParams={enabledParams}
        params={params}
        onChange={onChange}
        onNoteOn={onNoteOn}
        onNoteOff={onNoteOff}
        getWaveform={getWaveform}
      />

      <Button
        onClick={checkAnswer}
        disabled={feedback === "correct"}
        style={{
          width: "100%",
          background: feedback === "correct" ? "oklch(0.45 0.15 142)" : feedback === "wrong" ? "var(--destructive)" : undefined,
          transition: "background 200ms",
        }}
      >
        {feedback === "correct" ? "Correct! ✓" : feedback === "wrong" ? "Not quite — try again" : "Check"}
      </Button>

      {attempts > 2 && feedback === "wrong" && (
        <p style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>
          Hint: listen to the target again and compare the waveform shape
        </p>
      )}
    </div>
  );
}
