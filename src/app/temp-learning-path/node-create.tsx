"use client";

import { useState, useRef, useEffect } from "react";
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
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function playTarget() {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    const snapshot: Partial<ParamValues> = {};
    for (const key of Object.keys(targetParams)) {
      snapshot[key] = params[key];
      onChange(key, targetParams[key] as number | string);
    }
    playNote("C4", "2n");
    timerRef.current = setTimeout(() => {
      for (const key of Object.keys(snapshot)) {
        onChange(key, snapshot[key] as number | string);
      }
      isPlayingRef.current = false;
    }, 1200);
  }

  function checkAnswer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    isPlayingRef.current = false;
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
    onConcept("match-waveform", allCorrect);
    if (allCorrect) {
      setFeedback("correct");
      timerRef.current = setTimeout(onComplete, 900);
    } else {
      setWrongAttempts((n) => n + 1);
      setFeedback("wrong");
      timerRef.current = setTimeout(() => setFeedback(null), 1200);
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

      {wrongAttempts >= 2 && feedback === "wrong" && (
        <p style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>
          Hint: listen to the target again and compare the waveform shape
        </p>
      )}
    </div>
  );
}
