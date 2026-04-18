import * as Tone from "tone";
import type { EngineType } from "./types";
import type { Json } from "@/lib/supabase/types";

/** Tone.js instrument types that the factory can produce */
export type ToneInstrument =
  | Tone.MonoSynth
  | Tone.Synth
  | Tone.FMSynth
  | Tone.AMSynth
  | Tone.DuoSynth;

/**
 * Creates a Tone.js instrument instance from engine type and config.
 * GrainPlayer is excluded since it needs a buffer URL, handled separately.
 */
export function createInstrument(
  engineType: EngineType,
  engineConfig: Json
): ToneInstrument {
  const config = engineConfig as Record<string, unknown>;

  switch (engineType) {
    case "MonoSynth":
      return new Tone.MonoSynth(config as Partial<Tone.MonoSynthOptions>);
    case "Synth":
      return new Tone.Synth(config as Partial<Tone.SynthOptions>);
    case "FMSynth":
      return new Tone.FMSynth(config as Partial<Tone.FMSynthOptions>);
    case "AMSynth":
      return new Tone.AMSynth(config as Partial<Tone.AMSynthOptions>);
    case "DuoSynth":
      return new Tone.DuoSynth(config as Partial<Tone.DuoSynthOptions>);
    default:
      throw new Error(`Unsupported engine type: ${engineType}`);
  }
}

/**
 * Set a parameter on a Tone.js instrument using dot-path notation.
 * e.g., "filter.frequency" -> instrument.filter.frequency.value = val
 */
export function setParam(
  instrument: ToneInstrument,
  key: string,
  value: number | string
): void {
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let target: any = instrument;

  for (let i = 0; i < parts.length - 1; i++) {
    target = target[parts[i]];
    if (!target) return;
  }

  const lastKey = parts[parts.length - 1];
  const prop = target[lastKey];

  // Tone.js Signal/Param objects have a .value property
  if (prop && typeof prop === "object" && "value" in prop) {
    prop.value = value;
  } else {
    target[lastKey] = value;
  }
}

/**
 * Get a parameter value from a Tone.js instrument using dot-path notation.
 */
export function getParam(
  instrument: ToneInstrument,
  key: string
): number | string | undefined {
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let target: any = instrument;

  for (let i = 0; i < parts.length - 1; i++) {
    target = target[parts[i]];
    if (!target) return undefined;
  }

  const lastKey = parts[parts.length - 1];
  const prop = target[lastKey];

  if (prop && typeof prop === "object" && "value" in prop) {
    return prop.value;
  }
  return prop;
}
