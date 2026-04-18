import type { Json } from "@/lib/supabase/types";

/** Supported Tone.js synth class names */
export type EngineType =
  | "MonoSynth"
  | "Synth"
  | "FMSynth"
  | "AMSynth"
  | "DuoSynth"
  | "GrainPlayer";

/** Oscillator waveform types */
export type OscillatorType =
  | "sine"
  | "square"
  | "sawtooth"
  | "triangle"
  | "fatsine"
  | "fatsquare"
  | "fatsawtooth"
  | "fattriangle";

/** A parameter definition for the synth UI */
export interface ParamDef {
  key: string;
  label: string;
  group: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number | string;
  unit?: string;
  type: "knob" | "fader" | "select";
  options?: string[]; // for select type
}

/** Synth model config as stored in DB */
export interface SynthModelConfig {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  engineType: EngineType;
  engineConfig: Json;
  defaultParams: Record<string, number | string>;
  allParams: string[];
}

/** Current state of all synth parameters */
export type ParamValues = Record<string, number | string>;

/** Events emitted by the synth engine */
export interface SynthEngineEvents {
  paramChange: (key: string, value: number | string) => void;
  noteOn: (note: string, velocity: number) => void;
  noteOff: (note: string) => void;
}
