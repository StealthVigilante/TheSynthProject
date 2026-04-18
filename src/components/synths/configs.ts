import type { Json } from "@/lib/supabase/types";

export type SynthSlug =
  | "osci-mono"
  | "osci-sub"
  | "osci-fm"
  | "osci-wave"
  | "osci-mod"
  | "osci-grain";

export interface SynthTheme {
  bg: string;
  panel: string;
  surface: string;
  border: string;
  accent: string;
  accent2: string;
  text: string;
  dim: string;
  glow: string;
}

export interface LabSynthConfig {
  slug: SynthSlug;
  name: string;
  tagline: string;
  description: string;
  engineType: string;
  engineConfig: Json;
  defaultParams: Json;
  allParams: string[];
  category: "beginner" | "intermediate" | "advanced";
  theme: SynthTheme;
}

export const SYNTH_CONFIGS: Record<SynthSlug, LabSynthConfig> = {
  "osci-mono": {
    slug: "osci-mono",
    name: "Osci Mono",
    tagline: "Classic Analog Monosynth",
    description:
      "Warm, fat analog subtractive synthesis. Perfect for basses, leads, and learning the fundamentals.",
    engineType: "MonoSynth",
    engineConfig: {
      oscillator: { type: "sawtooth" },
      filter: { Q: 2, type: "lowpass", rolloff: -24 },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.5 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0.5,
        release: 0.5,
        baseFrequency: 200,
        octaves: 3,
      },
    } as Json,
    defaultParams: {
      "oscillator.type": "sawtooth",
      "filter.frequency": 2000,
      "filter.Q": 2,
      "envelope.attack": 0.01,
      "envelope.decay": 0.3,
      "envelope.sustain": 0.7,
      "envelope.release": 0.5,
      "filterEnvelope.attack": 0.01,
      "filterEnvelope.decay": 0.3,
      "filterEnvelope.sustain": 0.5,
      "filterEnvelope.release": 0.5,
      "filterEnvelope.baseFrequency": 200,
      "filterEnvelope.octaves": 3,
      volume: -6,
    } as Json,
    allParams: [
      "oscillator.type",
      "filter.frequency",
      "filter.Q",
      "envelope.attack",
      "envelope.decay",
      "envelope.sustain",
      "envelope.release",
      "filterEnvelope.attack",
      "filterEnvelope.decay",
      "filterEnvelope.sustain",
      "filterEnvelope.release",
      "filterEnvelope.baseFrequency",
      "filterEnvelope.octaves",
      "volume",
    ],
    category: "beginner",
    theme: {
      bg: "#14100a",
      panel: "#1e1710",
      surface: "#2a2015",
      border: "#5c3d11",
      accent: "#e8930a",
      accent2: "#f5c842",
      text: "#f7e8c8",
      dim: "#9a7440",
      glow: "#e8930a40",
    },
  },

  "osci-sub": {
    slug: "osci-sub",
    name: "Osci Sub",
    tagline: "Punchy Bass Synthesizer",
    description:
      "Heavy, punchy monosynth inspired by the Roland SH-101. Designed for basses and aggressive leads.",
    engineType: "MonoSynth",
    engineConfig: {
      oscillator: { type: "square" },
      filter: { Q: 3, type: "lowpass", rolloff: -24 },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.8, release: 0.3 },
      filterEnvelope: {
        attack: 0.005,
        decay: 0.2,
        sustain: 0.6,
        release: 0.3,
        baseFrequency: 300,
        octaves: 2.5,
      },
    } as Json,
    defaultParams: {
      "oscillator.type": "square",
      "filter.frequency": 3000,
      "filter.Q": 3,
      "envelope.attack": 0.005,
      "envelope.decay": 0.2,
      "envelope.sustain": 0.8,
      "envelope.release": 0.3,
      "filterEnvelope.attack": 0.005,
      "filterEnvelope.decay": 0.2,
      "filterEnvelope.sustain": 0.6,
      "filterEnvelope.release": 0.3,
      "filterEnvelope.baseFrequency": 300,
      "filterEnvelope.octaves": 2.5,
      volume: -6,
    } as Json,
    allParams: [
      "oscillator.type",
      "filter.frequency",
      "filter.Q",
      "envelope.attack",
      "envelope.decay",
      "envelope.sustain",
      "envelope.release",
      "filterEnvelope.attack",
      "filterEnvelope.decay",
      "filterEnvelope.sustain",
      "filterEnvelope.release",
      "filterEnvelope.baseFrequency",
      "filterEnvelope.octaves",
      "volume",
    ],
    category: "beginner",
    theme: {
      bg: "#06040e",
      panel: "#0d0a1a",
      surface: "#140e28",
      border: "#3b1f6e",
      accent: "#8b5cf6",
      accent2: "#c084fc",
      text: "#ede9fe",
      dim: "#6d4faa",
      glow: "#8b5cf650",
    },
  },

  "osci-fm": {
    slug: "osci-fm",
    name: "Osci FM",
    tagline: "DX7-Inspired FM Synthesizer",
    description:
      "Frequency modulation synthesis for complex harmonic timbres. From bell tones to electric pianos.",
    engineType: "FMSynth",
    engineConfig: {
      harmonicity: 3,
      modulationIndex: 10,
      oscillator: { type: "sine" },
      modulation: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.4, release: 0.8 },
      modulationEnvelope: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0.5,
        release: 0.5,
      },
    } as Json,
    defaultParams: {
      harmonicity: 3,
      modulationIndex: 10,
      "oscillator.type": "sine",
      "modulation.type": "sine",
      "envelope.attack": 0.01,
      "envelope.decay": 0.5,
      "envelope.sustain": 0.4,
      "envelope.release": 0.8,
      "modulationEnvelope.attack": 0.01,
      "modulationEnvelope.decay": 0.3,
      "modulationEnvelope.sustain": 0.5,
      "modulationEnvelope.release": 0.5,
      volume: -6,
    } as Json,
    allParams: [
      "harmonicity",
      "modulationIndex",
      "oscillator.type",
      "modulation.type",
      "envelope.attack",
      "envelope.decay",
      "envelope.sustain",
      "envelope.release",
      "modulationEnvelope.attack",
      "modulationEnvelope.decay",
      "modulationEnvelope.sustain",
      "modulationEnvelope.release",
      "volume",
    ],
    category: "intermediate",
    theme: {
      bg: "#030a10",
      panel: "#081420",
      surface: "#0c1e30",
      border: "#0e4a7a",
      accent: "#0ea5e9",
      accent2: "#38bdf8",
      text: "#e0f2fe",
      dim: "#3a7fa8",
      glow: "#0ea5e940",
    },
  },

  "osci-wave": {
    slug: "osci-wave",
    name: "Osci Wave",
    tagline: "Wavetable-Style Synthesizer",
    description:
      "Explore oscillator waveforms with unison voice stacking for lush, wide sounds.",
    engineType: "Synth",
    engineConfig: {
      oscillator: { type: "fatsawtooth", spread: 20, count: 3 },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.6, release: 0.8 },
    } as Json,
    defaultParams: {
      "oscillator.type": "fatsawtooth",
      "oscillator.spread": 20,
      "oscillator.count": 3,
      "envelope.attack": 0.1,
      "envelope.decay": 0.3,
      "envelope.sustain": 0.6,
      "envelope.release": 0.8,
      volume: -6,
    } as Json,
    allParams: [
      "oscillator.type",
      "oscillator.spread",
      "oscillator.count",
      "envelope.attack",
      "envelope.decay",
      "envelope.sustain",
      "envelope.release",
      "volume",
    ],
    category: "intermediate",
    theme: {
      bg: "#060e08",
      panel: "#0a1a0d",
      surface: "#102415",
      border: "#1a5c28",
      accent: "#22c55e",
      accent2: "#4ade80",
      text: "#dcfce7",
      dim: "#3a8a50",
      glow: "#22c55e40",
    },
  },

  "osci-mod": {
    slug: "osci-mod",
    name: "Osci Mod",
    tagline: "Dual-Voice Modular Synthesizer",
    description:
      "Two oscillators with cross-modulation and vibrato for rich, evolving textures.",
    engineType: "DuoSynth",
    engineConfig: {
      vibratoAmount: 0.5,
      vibratoRate: 5,
      harmonicity: 1.5,
      voice0: {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.01, decay: 0.5, sustain: 0.5, release: 1 },
      },
      voice1: {
        oscillator: { type: "square" },
        envelope: { attack: 0.01, decay: 0.5, sustain: 0.5, release: 1 },
      },
    } as Json,
    defaultParams: {
      vibratoAmount: 0.5,
      vibratoRate: 5,
      harmonicity: 1.5,
      "voice0.oscillator.type": "sawtooth",
      "voice0.envelope.attack": 0.01,
      "voice0.envelope.decay": 0.5,
      "voice0.envelope.sustain": 0.5,
      "voice0.envelope.release": 1,
      "voice1.oscillator.type": "square",
      "voice1.envelope.attack": 0.01,
      "voice1.envelope.decay": 0.5,
      "voice1.envelope.sustain": 0.5,
      "voice1.envelope.release": 1,
      volume: -6,
    } as Json,
    allParams: [
      "vibratoAmount",
      "vibratoRate",
      "harmonicity",
      "voice0.oscillator.type",
      "voice0.envelope.attack",
      "voice0.envelope.decay",
      "voice0.envelope.sustain",
      "voice0.envelope.release",
      "voice1.oscillator.type",
      "voice1.envelope.attack",
      "voice1.envelope.decay",
      "voice1.envelope.sustain",
      "voice1.envelope.release",
      "volume",
    ],
    category: "advanced",
    theme: {
      bg: "#080808",
      panel: "#111111",
      surface: "#1a1a1a",
      border: "#333333",
      accent: "#fbbf24",
      accent2: "#60a5fa",
      text: "#f5f5f5",
      dim: "#666666",
      glow: "#fbbf2430",
    },
  },

  "osci-grain": {
    slug: "osci-grain",
    name: "Osci Grain",
    tagline: "Granular Synthesizer",
    description:
      "Deconstruct audio into clouds of micro-grains. Create evolving textures and ambient soundscapes.",
    engineType: "GrainPlayer",
    engineConfig: {
      grainSize: 0.1,
      overlap: 0.05,
      playbackRate: 1,
      detune: 0,
      loop: true,
    } as Json,
    defaultParams: {
      grainSize: 0.1,
      overlap: 0.05,
      playbackRate: 1,
      detune: 0,
      volume: -6,
    } as Json,
    allParams: ["grainSize", "overlap", "playbackRate", "detune", "volume"],
    category: "advanced",
    theme: {
      bg: "#04040f",
      panel: "#080818",
      surface: "#0e0e28",
      border: "#2a2a5a",
      accent: "#818cf8",
      accent2: "#a78bfa",
      text: "#e0e7ff",
      dim: "#4a5090",
      glow: "#818cf840",
    },
  },
};

export const SYNTH_LIST = Object.values(SYNTH_CONFIGS);
