export type Waveform = "sine" | "square" | "triangle" | "sawtooth";
export type Note = string; // e.g. "C4", "F#3"

export interface PatchPreset {
  waveform?: Waveform;
  filterFreq?: number;
  attack?: number;
  release?: number;
  reverb?: boolean;
  volume?: number;
}

export type ConceptVisualKey =
  | "vibrating-string"
  | "waveform-morph"
  | "filter-sweep"
  | "envelope-shape"
  | "octave-keyboard"
  | "amplitude-vs-frequency";

interface ExerciseBase {
  id: string;
  prompt: string;
}

export type ConceptSlideExercise = ExerciseBase & {
  type: "concept-slide";
  visual: ConceptVisualKey;
  caption: string;
  audio?: { patch: PatchPreset; notes?: Note[] };
};

export type TapToHearExercise = ExerciseBase & {
  type: "tap-to-hear";
  patch: PatchPreset;
  notes: Note[];
  caption?: string;
};

export type AbCompareExercise = ExerciseBase & {
  type: "ab-compare";
  a: { patch: PatchPreset; notes: Note[]; label?: string };
  b: { patch: PatchPreset; notes: Note[]; label?: string };
  correct: "a" | "b";
  explainer?: string;
};

export type WaveformPickExercise = ExerciseBase & {
  type: "waveform-pick";
  shape: Waveform;
  options: Waveform[];
};

export type KnobTweakExercise = ExerciseBase & {
  type: "knob-tweak";
  param: "filterFreq" | "attack" | "release" | "volume";
  target: number;
  tolerance: number;
  initialPatch: PatchPreset;
  previewNote?: Note;
};

export type MultiChoiceExercise = ExerciseBase & {
  type: "multi-choice";
  question: string;
  options: string[];
  correctIndex: number;
  explainer?: string;
};

export type PlayMelodyExercise = ExerciseBase & {
  type: "play-melody";
  patch: PatchPreset;
  sequence: Note[];
  hint?: string;
};

export type FreePlayExercise = ExerciseBase & {
  type: "free-play";
  patch?: PatchPreset;
  durationS?: number;
  caption?: string;
};

export type Exercise =
  | ConceptSlideExercise
  | TapToHearExercise
  | AbCompareExercise
  | WaveformPickExercise
  | KnobTweakExercise
  | MultiChoiceExercise
  | PlayMelodyExercise
  | FreePlayExercise;

export type ExerciseType = Exercise["type"];

export const ACTIVE_EXERCISE_TYPES: readonly ExerciseType[] = [
  "ab-compare",
  "waveform-pick",
  "knob-tweak",
  "multi-choice",
  "play-melody",
] as const;

export interface Lesson {
  slug: string;
  title: string;
  exercises: Exercise[];
}

export interface SubLesson {
  slug: string;
  title: string;
  blurb: string;
  lessons: Lesson[];
}

export interface Unit {
  slug: string;
  title: string;
  blurb: string;
  subLessons: SubLesson[];
}
