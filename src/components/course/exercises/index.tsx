"use client";
import type { Exercise } from "@/lib/course/types";
import { ConceptSlide } from "./concept-slide";
import { TapToHear } from "./tap-to-hear";
import { AbCompare } from "./ab-compare";
import { WaveformPick } from "./waveform-pick";
import { KnobTweak } from "./knob-tweak";
import { MultiChoice } from "./multi-choice";
import { PlayMelody } from "./play-melody";
import { FreePlay } from "./free-play";

interface Props { ex: Exercise; onAnswered: (correct: boolean) => void; }

export function ExerciseRenderer({ ex, onAnswered }: Props) {
  switch (ex.type) {
    case "concept-slide": return <ConceptSlide ex={ex} onAnswered={onAnswered} />;
    case "tap-to-hear":   return <TapToHear ex={ex} onAnswered={onAnswered} />;
    case "ab-compare":    return <AbCompare ex={ex} onAnswered={onAnswered} />;
    case "waveform-pick": return <WaveformPick ex={ex} onAnswered={onAnswered} />;
    case "knob-tweak":    return <KnobTweak ex={ex} onAnswered={onAnswered} />;
    case "multi-choice":  return <MultiChoice ex={ex} onAnswered={onAnswered} />;
    case "play-melody":   return <PlayMelody ex={ex} onAnswered={onAnswered} />;
    case "free-play":     return <FreePlay ex={ex} onAnswered={onAnswered} />;
  }
}

export function isPassiveExercise(ex: Exercise): boolean {
  return ex.type === "concept-slide" || ex.type === "tap-to-hear" || ex.type === "free-play";
}
