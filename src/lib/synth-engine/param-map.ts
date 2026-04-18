import type { ParamDef, EngineType } from "./types";

/**
 * Returns parameter definitions for a given engine type.
 * These define the UI controls and their ranges.
 */
export function getParamDefs(engineType: EngineType): ParamDef[] {
  const common: ParamDef[] = [
    {
      key: "volume",
      label: "Volume",
      group: "Master",
      min: -40,
      max: 6,
      step: 1,
      defaultValue: -6,
      unit: "dB",
      type: "fader",
    },
  ];

  const envelope: ParamDef[] = [
    {
      key: "envelope.attack",
      label: "Attack",
      group: "Envelope",
      min: 0.001,
      max: 2,
      step: 0.001,
      defaultValue: 0.01,
      unit: "s",
      type: "knob",
    },
    {
      key: "envelope.decay",
      label: "Decay",
      group: "Envelope",
      min: 0.01,
      max: 2,
      step: 0.01,
      defaultValue: 0.3,
      unit: "s",
      type: "knob",
    },
    {
      key: "envelope.sustain",
      label: "Sustain",
      group: "Envelope",
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: 0.7,
      type: "knob",
    },
    {
      key: "envelope.release",
      label: "Release",
      group: "Envelope",
      min: 0.01,
      max: 5,
      step: 0.01,
      defaultValue: 0.5,
      unit: "s",
      type: "knob",
    },
  ];

  const oscillator: ParamDef = {
    key: "oscillator.type",
    label: "Waveform",
    group: "Oscillator",
    min: 0,
    max: 0,
    step: 1,
    defaultValue: "sawtooth",
    type: "select",
    options: ["sine", "square", "sawtooth", "triangle"],
  };

  switch (engineType) {
    case "MonoSynth":
      return [
        oscillator,
        {
          key: "filter.frequency",
          label: "Cutoff",
          group: "Filter",
          min: 20,
          max: 20000,
          step: 1,
          defaultValue: 2000,
          unit: "Hz",
          type: "knob",
        },
        {
          key: "filter.Q",
          label: "Resonance",
          group: "Filter",
          min: 0.1,
          max: 20,
          step: 0.1,
          defaultValue: 2,
          type: "knob",
        },
        ...envelope,
        {
          key: "filterEnvelope.attack",
          label: "Flt Attack",
          group: "Filter Env",
          min: 0.001,
          max: 2,
          step: 0.001,
          defaultValue: 0.01,
          unit: "s",
          type: "knob",
        },
        {
          key: "filterEnvelope.decay",
          label: "Flt Decay",
          group: "Filter Env",
          min: 0.01,
          max: 2,
          step: 0.01,
          defaultValue: 0.3,
          unit: "s",
          type: "knob",
        },
        {
          key: "filterEnvelope.sustain",
          label: "Flt Sustain",
          group: "Filter Env",
          min: 0,
          max: 1,
          step: 0.01,
          defaultValue: 0.5,
          type: "knob",
        },
        {
          key: "filterEnvelope.release",
          label: "Flt Release",
          group: "Filter Env",
          min: 0.01,
          max: 5,
          step: 0.01,
          defaultValue: 0.5,
          unit: "s",
          type: "knob",
        },
        {
          key: "filterEnvelope.baseFrequency",
          label: "Base Freq",
          group: "Filter Env",
          min: 20,
          max: 5000,
          step: 1,
          defaultValue: 200,
          unit: "Hz",
          type: "knob",
        },
        {
          key: "filterEnvelope.octaves",
          label: "Octaves",
          group: "Filter Env",
          min: 0,
          max: 8,
          step: 0.1,
          defaultValue: 3,
          type: "knob",
        },
        ...common,
      ];

    case "FMSynth":
      return [
        {
          ...oscillator,
          options: ["sine", "square", "sawtooth", "triangle"],
          defaultValue: "sine",
        },
        {
          key: "harmonicity",
          label: "Harmonicity",
          group: "FM",
          min: 0.1,
          max: 20,
          step: 0.1,
          defaultValue: 3,
          type: "knob",
        },
        {
          key: "modulationIndex",
          label: "Mod Index",
          group: "FM",
          min: 0,
          max: 100,
          step: 0.1,
          defaultValue: 10,
          type: "knob",
        },
        {
          key: "modulation.type",
          label: "Mod Waveform",
          group: "FM",
          min: 0,
          max: 0,
          step: 1,
          defaultValue: "sine",
          type: "select",
          options: ["sine", "square", "sawtooth", "triangle"],
        },
        ...envelope,
        {
          key: "modulationEnvelope.attack",
          label: "Mod Attack",
          group: "Mod Env",
          min: 0.001,
          max: 2,
          step: 0.001,
          defaultValue: 0.01,
          unit: "s",
          type: "knob",
        },
        {
          key: "modulationEnvelope.decay",
          label: "Mod Decay",
          group: "Mod Env",
          min: 0.01,
          max: 2,
          step: 0.01,
          defaultValue: 0.3,
          unit: "s",
          type: "knob",
        },
        {
          key: "modulationEnvelope.sustain",
          label: "Mod Sustain",
          group: "Mod Env",
          min: 0,
          max: 1,
          step: 0.01,
          defaultValue: 0.5,
          type: "knob",
        },
        {
          key: "modulationEnvelope.release",
          label: "Mod Release",
          group: "Mod Env",
          min: 0.01,
          max: 5,
          step: 0.01,
          defaultValue: 0.5,
          unit: "s",
          type: "knob",
        },
        ...common,
      ];

    case "Synth":
      return [
        {
          ...oscillator,
          options: [
            "sine",
            "square",
            "sawtooth",
            "triangle",
            "fatsine",
            "fatsquare",
            "fatsawtooth",
            "fattriangle",
          ],
          defaultValue: "fatsawtooth",
        },
        {
          key: "oscillator.spread",
          label: "Spread",
          group: "Oscillator",
          min: 0,
          max: 100,
          step: 1,
          defaultValue: 20,
          type: "knob",
        },
        {
          key: "oscillator.count",
          label: "Voices",
          group: "Oscillator",
          min: 1,
          max: 8,
          step: 1,
          defaultValue: 3,
          type: "knob",
        },
        ...envelope,
        ...common,
      ];

    case "DuoSynth":
      return [
        {
          key: "harmonicity",
          label: "Harmonicity",
          group: "Master",
          min: 0.1,
          max: 10,
          step: 0.1,
          defaultValue: 1.5,
          type: "knob",
        },
        {
          key: "vibratoAmount",
          label: "Vibrato Amt",
          group: "Vibrato",
          min: 0,
          max: 1,
          step: 0.01,
          defaultValue: 0.5,
          type: "knob",
        },
        {
          key: "vibratoRate",
          label: "Vibrato Rate",
          group: "Vibrato",
          min: 0.1,
          max: 20,
          step: 0.1,
          defaultValue: 5,
          unit: "Hz",
          type: "knob",
        },
        ...common,
      ];

    case "GrainPlayer":
      return [
        {
          key: "grainSize",
          label: "Grain Size",
          group: "Granular",
          min: 0.01,
          max: 0.5,
          step: 0.01,
          defaultValue: 0.1,
          unit: "s",
          type: "knob",
        },
        {
          key: "overlap",
          label: "Overlap",
          group: "Granular",
          min: 0.01,
          max: 0.5,
          step: 0.01,
          defaultValue: 0.05,
          unit: "s",
          type: "knob",
        },
        {
          key: "playbackRate",
          label: "Playback Rate",
          group: "Granular",
          min: 0.1,
          max: 4,
          step: 0.01,
          defaultValue: 1,
          type: "knob",
        },
        {
          key: "detune",
          label: "Detune",
          group: "Granular",
          min: -1200,
          max: 1200,
          step: 1,
          defaultValue: 0,
          unit: "cents",
          type: "knob",
        },
        ...common,
      ];

    default:
      return [...envelope, ...common];
  }
}

/**
 * Group param defs by their group name.
 */
export function groupParamDefs(
  defs: ParamDef[]
): Map<string, ParamDef[]> {
  const groups = new Map<string, ParamDef[]>();
  for (const def of defs) {
    const list = groups.get(def.group) ?? [];
    list.push(def);
    groups.set(def.group, list);
  }
  return groups;
}
