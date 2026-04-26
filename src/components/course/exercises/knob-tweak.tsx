"use client";
import { useEffect, useState } from "react";
import type { KnobTweakExercise } from "@/lib/course/types";
import { ExerciseShell } from "./exercise-shell";
import { Knob } from "@/components/synth/knob";
import { CourseAudioEngine } from "@/lib/course/audio";

interface Props { ex: KnobTweakExercise; onAnswered: (correct: boolean) => void; }

const RANGES: Record<KnobTweakExercise["param"], { min: number; max: number; scale: "linear" | "log"; unit: string; label: string }> = {
  filterFreq: { min: 100, max: 10000, scale: "log", unit: "Hz", label: "Cutoff" },
  attack:     { min: 0.001, max: 4,   scale: "log", unit: "s",  label: "Attack" },
  release:    { min: 0.05, max: 4,    scale: "log", unit: "s",  label: "Release" },
  volume:     { min: 0,    max: 1,    scale: "linear", unit: "", label: "Volume" },
};

export function KnobTweak({ ex, onAnswered }: Props) {
  const cfg = RANGES[ex.param];
  const initial = (ex.initialPatch[ex.param] as number | undefined) ?? cfg.min;
  const [val, setVal] = useState(initial);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    void CourseAudioEngine.start().then(() => {
      CourseAudioEngine.setPatch(ex.initialPatch);
    });
  }, [ex.id, ex.initialPatch]);

  const onChange = (v: number) => {
    setVal(v);
    if (ex.param === "filterFreq") CourseAudioEngine.setPatch({ filterFreq: v });
    else if (ex.param === "attack") CourseAudioEngine.setPatch({ attack: v });
    else if (ex.param === "release") CourseAudioEngine.setPatch({ release: v });
    else if (ex.param === "volume") CourseAudioEngine.setPatch({ volume: v });
  };

  const preview = () => {
    const note = ex.previewNote ?? "C4";
    CourseAudioEngine.playNote(note, 700);
  };

  const check = () => {
    if (submitted) return;
    setSubmitted(true);
    onAnswered(Math.abs(val - ex.target) <= ex.tolerance);
  };

  const targetHint = `Target: ${cfg.label.toLowerCase()} ≈ ${ex.target}${cfg.unit}`;

  return (
    <ExerciseShell
      prompt={ex.prompt}
      feedback={submitted ? { correct: Math.abs(val - ex.target) <= ex.tolerance } : null}
    >
      <div className="flex flex-col items-center gap-4">
        <p className="text-xs text-muted-foreground">{targetHint}</p>
        <Knob
          value={val}
          min={cfg.min}
          max={cfg.max}
          step={cfg.scale === "log" ? 0.001 : 0.01}
          scale={cfg.scale}
          label={cfg.label}
          unit={cfg.unit}
          size="lg"
          onChange={onChange}
        />
        <button
          onClick={preview}
          className="rounded-full bg-primary/20 text-primary px-4 py-2 text-sm"
        >▶ Preview</button>
        <button
          onClick={check}
          disabled={submitted}
          className="rounded-lg bg-primary text-primary-foreground px-6 py-2 text-sm font-semibold disabled:opacity-50"
        >Check</button>
      </div>
    </ExerciseShell>
  );
}
