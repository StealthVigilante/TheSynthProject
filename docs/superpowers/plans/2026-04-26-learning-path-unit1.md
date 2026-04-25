# Learning Path — Unit 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/learn` with a Duolingo-style learning path, no XP/streak, focused on Synth 1 Pro mastery via Unit 1 (7 sub-lessons, ~150 exercises, ~32 lessons + 7 generated mixed tests).

**Architecture:** Static TS content + `localStorage` progress + runtime-generated mixed-test sessions. 4-level hierarchy (Unit → Sub-lesson → Pathway → Lesson). Snake pathway visual, fullscreen lesson player with Framer Motion transitions and Canvas/SVG concept visuals. Audio via `CourseAudioEngine`, a thin wrapper over the existing `StarterProEngine` AudioWorklet.

**Tech Stack:** Next.js 16 App Router, TypeScript (strict), Tailwind v4 + CSS variables, Framer Motion (new dep), AudioWorklet, React 19. No test runner — validation via `npx tsc --noEmit`, `npm run lint`, and manual smoke tests on a phone-sized viewport (≤640px).

**Reference spec:** `docs/superpowers/specs/2026-04-26-learning-path-unit1-design.md`

---

### Task 1: Bootstrap — deps, dirs, types

**Files:**
- Modify: `package.json` (add `framer-motion`)
- Create: `src/lib/course/types.ts`
- Create: `src/lib/course/index.ts`
- Create: `src/lib/course/content/index.ts`
- Create: `src/lib/course/content/unit-1/index.ts` (placeholder export)

- [ ] **Step 1: Install framer-motion**

```bash
npm install framer-motion
```

- [ ] **Step 2: Create `src/lib/course/types.ts`**

```ts
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
```

- [ ] **Step 3: Create `src/lib/course/content/unit-1/index.ts`**

```ts
import type { Unit } from "../../types";

// Sub-lesson modules will be added in later tasks.
// Keeping this file as the single import point for unit-1 content.
export const unit1: Unit = {
  slug: "unit-1",
  title: "Sound Foundations",
  blurb: "Sound, pitch, oscillator, filter, amp — everything you need to play Synth 1 Pro.",
  subLessons: [],
};
```

- [ ] **Step 4: Create `src/lib/course/content/index.ts`**

```ts
import type { Unit } from "../types";
import { unit1 } from "./unit-1";

export const UNITS: Unit[] = [unit1];

export function findUnit(slug: string): Unit | undefined {
  return UNITS.find((u) => u.slug === slug);
}

export function findSubLesson(unitSlug: string, subSlug: string) {
  const unit = findUnit(unitSlug);
  return unit?.subLessons.find((s) => s.slug === subSlug);
}

export function findLesson(unitSlug: string, subSlug: string, lessonSlug: string) {
  const sub = findSubLesson(unitSlug, subSlug);
  return sub?.lessons.find((l) => l.slug === lessonSlug);
}
```

- [ ] **Step 5: Create `src/lib/course/index.ts`**

```ts
export * from "./types";
export * from "./content";
```

- [ ] **Step 6: Type check + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: PASS (no TypeScript errors, no lint warnings).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/course/
git commit -m "feat(course): scaffold types, content registry, framer-motion dep"
```

---

### Task 2: Progress + mistake-pool (`progress.ts`, `mistake-pool.ts`)

**Files:**
- Create: `src/lib/course/progress.ts`
- Create: `src/lib/course/mistake-pool.ts`

- [ ] **Step 1: Create `src/lib/course/progress.ts`**

```ts
"use client";

import type { Exercise, SubLesson, Unit } from "./types";

const STORAGE_KEY = "osciscoops:progress";

export interface MistakeStat {
  wrongCount: number;
  correctSinceWrong: number;
  subLessonSlug: string;
  exerciseSnapshot: Exercise;
  lastWrongAt: number;
}

export interface Progress {
  completedLessons: string[];
  mistakes: Record<string, MistakeStat>;
  lastUpdatedAt: number;
}

const EMPTY: Progress = {
  completedLessons: [],
  mistakes: {},
  lastUpdatedAt: 0,
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadProgress(): Progress {
  if (!isBrowser()) return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      completedLessons: parsed.completedLessons ?? [],
      mistakes: parsed.mistakes ?? {},
      lastUpdatedAt: parsed.lastUpdatedAt ?? 0,
    };
  } catch {
    return EMPTY;
  }
}

export function saveProgress(p: Progress): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...p,
      lastUpdatedAt: Date.now(),
    }));
  } catch {
    // localStorage may be disabled / quota exceeded; silently ignore
  }
}

export function markLessonComplete(lessonId: string): void {
  const p = loadProgress();
  if (!p.completedLessons.includes(lessonId)) {
    p.completedLessons = [...p.completedLessons, lessonId];
    saveProgress(p);
  }
}

export function isLessonComplete(lessonId: string): boolean {
  return loadProgress().completedLessons.includes(lessonId);
}

export function recordExerciseAttempt(
  ex: Exercise,
  subLessonSlug: string,
  correct: boolean,
): void {
  const p = loadProgress();
  const existing = p.mistakes[ex.id];

  if (correct) {
    if (!existing) return; // not in mistake pool, no-op
    const next: MistakeStat = {
      ...existing,
      correctSinceWrong: existing.correctSinceWrong + 1,
    };
    if (next.correctSinceWrong >= 2) {
      // drop from mistake pool
      const { [ex.id]: _drop, ...rest } = p.mistakes;
      void _drop;
      p.mistakes = rest;
    } else {
      p.mistakes = { ...p.mistakes, [ex.id]: next };
    }
  } else {
    p.mistakes = {
      ...p.mistakes,
      [ex.id]: {
        wrongCount: (existing?.wrongCount ?? 0) + 1,
        correctSinceWrong: 0,
        subLessonSlug,
        exerciseSnapshot: ex,
        lastWrongAt: Date.now(),
      },
    };
  }

  saveProgress(p);
}

export function isLessonAvailable(lessonId: string, sub: SubLesson): boolean {
  const idx = sub.lessons.findIndex((l) => l.slug === lessonId.split(".").pop());
  if (idx <= 0) return idx === 0; // first lesson always available
  const prev = `${sub.slug}.${sub.lessons[idx - 1].slug}`;
  return isLessonComplete(prev);
}

export function isSubLessonAvailable(unit: Unit, subSlug: string): boolean {
  const idx = unit.subLessons.findIndex((s) => s.slug === subSlug);
  if (idx <= 0) return idx === 0;
  const prev = unit.subLessons[idx - 1];
  return isLessonComplete(`${prev.slug}.test`);
}

export function resetProgress(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 2: Create `src/lib/course/mistake-pool.ts`**

```ts
import type { Exercise, Lesson, SubLesson, Unit } from "./types";
import { ACTIVE_EXERCISE_TYPES } from "./types";
import { loadProgress, type MistakeStat } from "./progress";

interface MixedTestOptions {
  totalQuestions?: number;
  currentRatio?: number;          // 0..1, fraction from current sub-lesson
  pastCap?: number;
  unitWideMistakes?: boolean;     // if true, include current sub-lesson in past pool too (for capstone)
}

const DEFAULTS: Required<MixedTestOptions> = {
  totalQuestions: 8,
  currentRatio: 0.6,
  pastCap: 6,
  unitWideMistakes: false,
};

function flattenActiveExercises(sub: SubLesson): Exercise[] {
  const exs: Exercise[] = [];
  for (const lesson of sub.lessons) {
    for (const ex of lesson.exercises) {
      if ((ACTIVE_EXERCISE_TYPES as readonly string[]).includes(ex.type)) {
        exs.push(ex);
      }
    }
  }
  return exs;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateMixedTest(
  currentSub: SubLesson,
  unit: Unit,
  options: MixedTestOptions = {},
): Lesson {
  const opts = { ...DEFAULTS, ...options };
  const total = opts.totalQuestions;
  const targetCurrent = Math.floor(opts.currentRatio * total);
  const targetPast = total - targetCurrent;

  // Current pool: active exercises from current sub-lesson
  const currentPool = shuffle(flattenActiveExercises(currentSub));

  // Past pool: mistakes from earlier sub-lessons (or all unit if unitWideMistakes)
  const progress = loadProgress();
  const allMistakeEntries: MistakeStat[] = Object.values(progress.mistakes);
  const pastEntries = opts.unitWideMistakes
    ? allMistakeEntries
    : allMistakeEntries.filter((m) => m.subLessonSlug !== currentSub.slug);

  // Sort by recency-of-last-wrong (most recent first), cap, take snapshots
  const pastPool = pastEntries
    .sort((a, b) => b.lastWrongAt - a.lastWrongAt)
    .slice(0, opts.pastCap)
    .map((m) => m.exerciseSnapshot);

  const pickedPast = shuffle(pastPool).slice(0, Math.min(targetPast, pastPool.length));
  const remainingFromCurrent = total - pickedPast.length;
  const pickedCurrent = currentPool.slice(0, remainingFromCurrent);

  const exercises = shuffle([...pickedPast, ...pickedCurrent]);

  return {
    slug: "test",
    title: "Mixed Test",
    exercises,
  };
}

export function isCapstoneSlug(subSlug: string): boolean {
  return subSlug === "1-7";
}

export function mixedTestOptionsFor(subSlug: string): MixedTestOptions {
  if (isCapstoneSlug(subSlug)) {
    return { totalQuestions: 10, currentRatio: 0.5, pastCap: 6, unitWideMistakes: true };
  }
  return {};
}
```

- [ ] **Step 3: Type check + lint**

```bash
npx tsc --noEmit && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/course/progress.ts src/lib/course/mistake-pool.ts
git commit -m "feat(course): localStorage progress + mixed-test generator"
```

---

### Task 3: `CourseAudioEngine` audio wrapper

**Files:**
- Create: `src/lib/course/audio.ts`

- [ ] **Step 1: Create `src/lib/course/audio.ts`**

```ts
"use client";

import { StarterProEngine } from "@/app/temp-synths/1-pro/engine";
import type { Note, PatchPreset } from "./types";

let engine: StarterProEngine | null = null;
let initPromise: Promise<StarterProEngine> | null = null;

export class CourseAudioEngine {
  static async start(): Promise<StarterProEngine> {
    if (engine) return engine;
    if (!initPromise) {
      initPromise = StarterProEngine.create().then((e) => {
        engine = e;
        return e;
      });
    }
    return initPromise;
  }

  static isReady(): boolean {
    return engine !== null;
  }

  static dispose(): void {
    engine?.dispose();
    engine = null;
    initPromise = null;
  }

  static setPatch(patch: PatchPreset): void {
    if (!engine) return;
    if (patch.waveform !== undefined) engine.setWaveform(patch.waveform);
    if (patch.filterFreq !== undefined) engine.setFilterFreq(patch.filterFreq);
    if (patch.attack !== undefined) engine.setAttack(patch.attack);
    if (patch.release !== undefined) engine.setRelease(patch.release);
    if (patch.reverb !== undefined) engine.setReverb(patch.reverb);
    if (patch.volume !== undefined) engine.setVolume(patch.volume);
  }

  static playNote(note: Note, durationMs = 400): void {
    if (!engine) return;
    engine.noteOn(note, 0.8);
    window.setTimeout(() => engine?.noteOff(note), durationMs);
  }

  static playSequence(notes: Note[], gapMs = 350, durationMs = 300): void {
    if (!engine) return;
    notes.forEach((n, i) => {
      window.setTimeout(() => CourseAudioEngine.playNote(n, durationMs), i * gapMs);
    });
  }

  static noteOn(note: Note, velocity = 0.8): void {
    engine?.noteOn(note, velocity);
  }

  static noteOff(note: Note): void {
    engine?.noteOff(note);
  }

  static getFFT(): Float32Array {
    return engine?.getFFT() ?? new Float32Array();
  }

  static getWaveform(): Float32Array {
    return engine?.getWaveform() ?? new Float32Array();
  }

  static get sampleRate(): number {
    return engine?.sampleRate ?? 44100;
  }
}
```

- [ ] **Step 2: Type check + lint**

```bash
npx tsc --noEmit && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/course/audio.ts
git commit -m "feat(course): CourseAudioEngine wrapper around StarterProEngine"
```

---

### Task 4: Concept visuals — 6 components

**Files:**
- Create: `src/components/course/concept-visuals/vibrating-string.tsx`
- Create: `src/components/course/concept-visuals/amplitude-vs-frequency.tsx`
- Create: `src/components/course/concept-visuals/waveform-morph.tsx`
- Create: `src/components/course/concept-visuals/octave-keyboard.tsx`
- Create: `src/components/course/concept-visuals/envelope-shape.tsx`
- Create: `src/components/course/concept-visuals/filter-sweep.tsx`
- Create: `src/components/course/concept-visuals/index.tsx`

Each visual is a self-contained client component that animates on mount and exposes an optional `playing: boolean` prop to drive animation speed/state.

- [ ] **Step 1: `vibrating-string.tsx`**

```tsx
"use client";
import { motion } from "framer-motion";

export function VibratingString({ frequency = 1 }: { frequency?: number }) {
  return (
    <svg viewBox="0 0 320 120" className="w-full h-32">
      <motion.path
        d="M 10 60 Q 80 60 80 60 Q 160 60 160 60 Q 240 60 240 60 Q 310 60 310 60"
        stroke="var(--primary, #a78bfa)"
        strokeWidth="3"
        fill="none"
        animate={{
          d: [
            "M 10 60 Q 80 30 160 60 Q 240 90 310 60",
            "M 10 60 Q 80 90 160 60 Q 240 30 310 60",
            "M 10 60 Q 80 30 160 60 Q 240 90 310 60",
          ],
        }}
        transition={{ duration: 1 / frequency, repeat: Infinity, ease: "easeInOut" }}
      />
      <circle cx="10" cy="60" r="6" fill="var(--muted-foreground, #71717a)" />
      <circle cx="310" cy="60" r="6" fill="var(--muted-foreground, #71717a)" />
    </svg>
  );
}
```

- [ ] **Step 2: `amplitude-vs-frequency.tsx`**

```tsx
"use client";
import { motion } from "framer-motion";

export function AmplitudeVsFrequency({
  focus = "both",
}: {
  focus?: "amp" | "freq" | "both";
}) {
  const showAmp = focus !== "freq";
  const showFreq = focus !== "amp";
  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {showAmp && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">Amplitude</span>
          <svg viewBox="0 0 160 80" className="w-full h-20">
            <motion.path
              d="M 0 40 Q 40 10 80 40 T 160 40"
              stroke="var(--primary, #a78bfa)"
              strokeWidth="2"
              fill="none"
              animate={{ scaleY: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "center" }}
            />
          </svg>
        </div>
      )}
      {showFreq && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">Frequency</span>
          <svg viewBox="0 0 160 80" className="w-full h-20">
            <motion.path
              stroke="var(--primary, #a78bfa)"
              strokeWidth="2"
              fill="none"
              animate={{
                d: [
                  "M 0 40 Q 20 10 40 40 T 80 40 T 120 40 T 160 40",
                  "M 0 40 Q 10 10 20 40 T 40 40 T 60 40 T 80 40 T 100 40 T 120 40 T 140 40 T 160 40",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
          </svg>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `waveform-morph.tsx`**

```tsx
"use client";
import { useEffect, useRef } from "react";
import type { Waveform } from "@/lib/course/types";

interface Props { focus?: Waveform | "morph"; }

const SHAPES: Waveform[] = ["sine", "triangle", "square", "sawtooth"];

function sample(shape: Waveform, x: number): number {
  // x in [0, 1] phase
  switch (shape) {
    case "sine": return Math.sin(x * Math.PI * 2);
    case "triangle": return x < 0.5 ? 4 * x - 1 : 3 - 4 * x;
    case "square": return x < 0.5 ? 1 : -1;
    case "sawtooth": return 2 * x - 1;
  }
}

export function WaveformMorph({ focus = "morph" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const focusRef = useRef(focus);
  focusRef.current = focus;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    let raf = 0;
    const start = performance.now();

    const draw = () => {
      const t = (performance.now() - start) / 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary").trim() || "#a78bfa";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const f = focusRef.current;
      const morphIdx = f === "morph" ? (t * 0.4) % SHAPES.length : SHAPES.indexOf(f as Waveform);
      const i0 = Math.floor(morphIdx) % SHAPES.length;
      const i1 = (i0 + 1) % SHAPES.length;
      const blend = morphIdx - Math.floor(morphIdx);

      const cycles = 2;
      for (let px = 0; px < W; px++) {
        const phase = ((px / W) * cycles) % 1;
        const y0 = sample(SHAPES[i0], phase);
        const y1 = sample(SHAPES[i1], phase);
        const y = f === "morph" ? y0 * (1 - blend) + y1 * blend : sample(SHAPES[i0], phase);
        const py = H / 2 - (y * H * 0.4);
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      ctx.stroke();
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="w-full h-32" />;
}
```

- [ ] **Step 4: `octave-keyboard.tsx`**

```tsx
"use client";
import { motion } from "framer-motion";

const WHITE = ["C", "D", "E", "F", "G", "A", "B"];

export function OctaveKeyboard({ highlightC = true, octaves = 2 }: { highlightC?: boolean; octaves?: number }) {
  const total = WHITE.length * octaves;
  return (
    <div className="flex w-full h-24 gap-px">
      {Array.from({ length: total }, (_, i) => {
        const note = WHITE[i % WHITE.length];
        const oct = Math.floor(i / WHITE.length);
        const isC = note === "C";
        return (
          <motion.div
            key={i}
            className="flex-1 bg-card border border-border rounded-b text-[10px] text-muted-foreground flex items-end justify-center pb-1"
            style={{
              backgroundColor: isC && highlightC ? "var(--primary, #a78bfa)" : undefined,
              color: isC && highlightC ? "white" : undefined,
            }}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.04 }}
          >
            {isC ? `${note}${oct + 3}` : note}
          </motion.div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: `envelope-shape.tsx`**

```tsx
"use client";
import { useEffect, useRef } from "react";

interface Props { attack?: number; release?: number; trigger?: number; }

export function EnvelopeShape({ attack = 0.3, release = 1.0, trigger = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    let raf = 0;
    const tStart = performance.now();
    const totalDuration = (attack + release) * 1000;

    const draw = () => {
      const elapsed = performance.now() - tStart;
      const t = (elapsed % (totalDuration + 600)) / 1000; // loop with breath
      ctx.clearRect(0, 0, W, H);

      const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#a78bfa";

      ctx.strokeStyle = primary; ctx.lineWidth = 2;
      ctx.beginPath();
      const attackEnd = attack;
      const releaseEnd = attack + release;
      const peakX = (attackEnd / releaseEnd) * W;

      ctx.moveTo(0, H);
      ctx.lineTo(peakX, H * 0.1);
      ctx.lineTo(W, H);
      ctx.stroke();

      // ball position
      let bx = 0, by = H;
      if (t <= attackEnd) {
        bx = (t / attackEnd) * peakX;
        by = H - ((t / attackEnd) * H * 0.9);
      } else if (t <= releaseEnd) {
        const r = (t - attackEnd) / release;
        bx = peakX + r * (W - peakX);
        by = H * 0.1 + r * (H * 0.9);
      } else {
        bx = W; by = H;
      }
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [attack, release, trigger]);

  return <canvas ref={canvasRef} className="w-full h-32" />;
}
```

- [ ] **Step 6: `filter-sweep.tsx`**

```tsx
"use client";
import { useEffect, useRef } from "react";

export function FilterSweep({ minHz = 200, maxHz = 8000, durationS = 4 }: {
  minHz?: number; maxHz?: number; durationS?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    let raf = 0;
    const start = performance.now();
    const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#a78bfa";

    const draw = () => {
      const elapsed = (performance.now() - start) / 1000;
      const phase = (elapsed % durationS) / durationS;
      const cutoffNorm = phase; // 0..1 sweep

      ctx.clearRect(0, 0, W, H);

      // bars (32 bins, simulated content peak around mid)
      const bins = 32;
      const barW = W / bins;
      for (let i = 0; i < bins; i++) {
        const norm = i / (bins - 1);
        const baseHeight = Math.sin(norm * Math.PI) * 0.7 + 0.2 * Math.random();
        const aboveCutoff = norm > cutoffNorm;
        const h = baseHeight * H * (aboveCutoff ? 0.15 : 1.0);
        ctx.fillStyle = aboveCutoff ? "rgba(120,120,120,0.4)" : primary;
        ctx.fillRect(i * barW + 1, H - h, barW - 2, h);
      }

      // cutoff line
      const cx = cutoffNorm * W;
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
      ctx.setLineDash([]);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [minHz, maxHz, durationS]);

  return <canvas ref={canvasRef} className="w-full h-32" />;
}
```

- [ ] **Step 7: `index.tsx` registry**

```tsx
"use client";
import type { ConceptVisualKey } from "@/lib/course/types";
import { VibratingString } from "./vibrating-string";
import { AmplitudeVsFrequency } from "./amplitude-vs-frequency";
import { WaveformMorph } from "./waveform-morph";
import { OctaveKeyboard } from "./octave-keyboard";
import { EnvelopeShape } from "./envelope-shape";
import { FilterSweep } from "./filter-sweep";

export function ConceptVisual({ visual }: { visual: ConceptVisualKey }) {
  switch (visual) {
    case "vibrating-string": return <VibratingString />;
    case "amplitude-vs-frequency": return <AmplitudeVsFrequency />;
    case "waveform-morph": return <WaveformMorph />;
    case "octave-keyboard": return <OctaveKeyboard />;
    case "envelope-shape": return <EnvelopeShape />;
    case "filter-sweep": return <FilterSweep />;
  }
}
```

- [ ] **Step 8: Type check + lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/components/course/concept-visuals/
git commit -m "feat(course): six animated concept visuals (SVG + Canvas)"
```

---

### Task 5: Exercise components — 4 simple types

**Files:**
- Create: `src/components/course/exercises/exercise-shell.tsx` (shared layout)
- Create: `src/components/course/exercises/concept-slide.tsx`
- Create: `src/components/course/exercises/tap-to-hear.tsx`
- Create: `src/components/course/exercises/multi-choice.tsx`
- Create: `src/components/course/exercises/ab-compare.tsx`

Each exercise component receives its typed exercise + a callback `onAnswered(correct: boolean)` and a `phase: "idle" | "answered" | "revealed"`. Shell handles common layout (prompt header + feedback area).

- [ ] **Step 1: `exercise-shell.tsx`**

```tsx
"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  prompt: string;
  children: ReactNode;
  feedback?: { correct: boolean; explainer?: string } | null;
}

export function ExerciseShell({ prompt, children, feedback }: Props) {
  return (
    <div className="flex flex-col items-center gap-6 px-4 py-6 w-full max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-foreground text-center">{prompt}</h2>
      <div className="w-full">{children}</div>
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`w-full rounded-lg p-3 text-sm ${
              feedback.correct
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : "bg-red-500/15 text-red-300 border border-red-500/30"
            }`}
          >
            <div className="font-semibold">{feedback.correct ? "Correct" : "Not quite"}</div>
            {feedback.explainer && <div className="mt-1 opacity-90">{feedback.explainer}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: `concept-slide.tsx`**

```tsx
"use client";
import { useEffect } from "react";
import type { ConceptSlideExercise } from "@/lib/course/types";
import { ConceptVisual } from "../concept-visuals";
import { ExerciseShell } from "./exercise-shell";
import { CourseAudioEngine } from "@/lib/course/audio";

interface Props { ex: ConceptSlideExercise; onAnswered: (correct: boolean) => void; }

export function ConceptSlide({ ex, onAnswered }: Props) {
  useEffect(() => {
    // mark passive auto-pass on first render
    onAnswered(true);
  }, [ex.id, onAnswered]);

  const playDemo = () => {
    if (!ex.audio) return;
    void CourseAudioEngine.start().then(() => {
      CourseAudioEngine.setPatch(ex.audio!.patch);
      if (ex.audio!.notes) CourseAudioEngine.playSequence(ex.audio!.notes);
    });
  };

  return (
    <ExerciseShell prompt={ex.prompt}>
      <div className="flex flex-col items-center gap-4">
        <ConceptVisual visual={ex.visual} />
        <p className="text-sm text-muted-foreground text-center">{ex.caption}</p>
        {ex.audio && (
          <button
            onClick={playDemo}
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
          >
            ▶ Hear it
          </button>
        )}
      </div>
    </ExerciseShell>
  );
}
```

- [ ] **Step 3: `tap-to-hear.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import type { TapToHearExercise } from "@/lib/course/types";
import { ExerciseShell } from "./exercise-shell";
import { CourseAudioEngine } from "@/lib/course/audio";

interface Props { ex: TapToHearExercise; onAnswered: (correct: boolean) => void; }

export function TapToHear({ ex, onAnswered }: Props) {
  const [played, setPlayed] = useState(false);

  useEffect(() => { setPlayed(false); }, [ex.id]);

  const play = async () => {
    await CourseAudioEngine.start();
    CourseAudioEngine.setPatch(ex.patch);
    CourseAudioEngine.playSequence(ex.notes);
    setPlayed(true);
    onAnswered(true);
  };

  return (
    <ExerciseShell prompt={ex.prompt}>
      <div className="flex flex-col items-center gap-4">
        {ex.caption && <p className="text-sm text-muted-foreground text-center">{ex.caption}</p>}
        <button
          onClick={play}
          className="w-20 h-20 rounded-full bg-primary text-primary-foreground text-3xl flex items-center justify-center active:scale-95 transition"
          aria-label="Play sound"
        >▶</button>
        {played && <p className="text-xs text-emerald-400">Played — tap CONTINUE.</p>}
      </div>
    </ExerciseShell>
  );
}
```

- [ ] **Step 4: `multi-choice.tsx`**

```tsx
"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { MultiChoiceExercise } from "@/lib/course/types";
import { ExerciseShell } from "./exercise-shell";

interface Props { ex: MultiChoiceExercise; onAnswered: (correct: boolean) => void; }

export function MultiChoice({ ex, onAnswered }: Props) {
  const [picked, setPicked] = useState<number | null>(null);

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    onAnswered(i === ex.correctIndex);
  };

  return (
    <ExerciseShell
      prompt={ex.prompt}
      feedback={picked === null ? null : {
        correct: picked === ex.correctIndex,
        explainer: ex.explainer,
      }}
    >
      <div className="flex flex-col gap-2 w-full">
        <p className="text-sm text-foreground/80">{ex.question}</p>
        {ex.options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === ex.correctIndex;
          const showState = picked !== null && (isPicked || isCorrect);
          const cls = showState
            ? isCorrect
              ? "border-emerald-500 bg-emerald-500/10"
              : isPicked
                ? "border-red-500 bg-red-500/10"
                : "border-border"
            : "border-border hover:border-primary";
          return (
            <motion.button
              key={i}
              onClick={() => choose(i)}
              whileTap={{ scale: 0.98 }}
              className={`w-full rounded-lg border px-4 py-3 text-sm text-left transition ${cls}`}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>
    </ExerciseShell>
  );
}
```

- [ ] **Step 5: `ab-compare.tsx`**

```tsx
"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { AbCompareExercise } from "@/lib/course/types";
import { ExerciseShell } from "./exercise-shell";
import { CourseAudioEngine } from "@/lib/course/audio";

interface Props { ex: AbCompareExercise; onAnswered: (correct: boolean) => void; }

export function AbCompare({ ex, onAnswered }: Props) {
  const [picked, setPicked] = useState<"a" | "b" | null>(null);

  const play = async (which: "a" | "b") => {
    await CourseAudioEngine.start();
    const slot = ex[which];
    CourseAudioEngine.setPatch(slot.patch);
    CourseAudioEngine.playSequence(slot.notes);
  };

  const choose = (which: "a" | "b") => {
    if (picked !== null) return;
    setPicked(which);
    onAnswered(which === ex.correct);
  };

  return (
    <ExerciseShell
      prompt={ex.prompt}
      feedback={picked === null ? null : {
        correct: picked === ex.correct,
        explainer: ex.explainer,
      }}
    >
      <div className="grid grid-cols-2 gap-3 w-full">
        {(["a", "b"] as const).map((which) => {
          const slot = ex[which];
          const isPicked = picked === which;
          const isCorrect = which === ex.correct;
          const showState = picked !== null && (isPicked || isCorrect);
          const cls = showState
            ? isCorrect
              ? "border-emerald-500 bg-emerald-500/10"
              : isPicked
                ? "border-red-500 bg-red-500/10"
                : "border-border"
            : "border-border hover:border-primary";
          return (
            <motion.div
              key={which}
              className={`rounded-xl border p-3 flex flex-col gap-2 ${cls}`}
              whileTap={{ scale: 0.98 }}
            >
              <button
                onClick={() => play(which)}
                className="w-full h-16 rounded-lg bg-primary/20 text-primary text-xl flex items-center justify-center"
                aria-label={`Play ${which.toUpperCase()}`}
              >▶</button>
              <button
                onClick={() => choose(which)}
                className="w-full text-xs font-semibold py-1 rounded bg-card border border-border"
              >
                {slot.label ?? `Pick ${which.toUpperCase()}`}
              </button>
            </motion.div>
          );
        })}
      </div>
    </ExerciseShell>
  );
}
```

- [ ] **Step 6: Type check + lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/components/course/exercises/
git commit -m "feat(course): exercise components — concept-slide, tap-to-hear, multi-choice, ab-compare"
```

---

### Task 6: Exercise components — 4 complex types

**Files:**
- Create: `src/components/course/exercises/waveform-pick.tsx`
- Create: `src/components/course/exercises/knob-tweak.tsx`
- Create: `src/components/course/exercises/play-melody.tsx`
- Create: `src/components/course/exercises/free-play.tsx`

- [ ] **Step 1: `waveform-pick.tsx`**

```tsx
"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { WaveformPickExercise, Waveform } from "@/lib/course/types";
import { ExerciseShell } from "./exercise-shell";
import { WaveformMorph } from "../concept-visuals/waveform-morph";

interface Props { ex: WaveformPickExercise; onAnswered: (correct: boolean) => void; }

const LABELS: Record<Waveform, string> = {
  sine: "Sine", square: "Square", triangle: "Triangle", sawtooth: "Sawtooth",
};

export function WaveformPick({ ex, onAnswered }: Props) {
  const [picked, setPicked] = useState<Waveform | null>(null);

  const choose = (w: Waveform) => {
    if (picked !== null) return;
    setPicked(w);
    onAnswered(w === ex.shape);
  };

  return (
    <ExerciseShell
      prompt={ex.prompt}
      feedback={picked === null ? null : { correct: picked === ex.shape }}
    >
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="w-full bg-card rounded-lg p-3 border border-border">
          <WaveformMorph focus={ex.shape} />
        </div>
        <div className="grid grid-cols-2 gap-2 w-full">
          {ex.options.map((w) => {
            const isPicked = picked === w;
            const isCorrect = w === ex.shape;
            const show = picked !== null && (isPicked || isCorrect);
            const cls = show
              ? isCorrect ? "border-emerald-500 bg-emerald-500/10" : "border-red-500 bg-red-500/10"
              : "border-border hover:border-primary";
            return (
              <motion.button
                key={w}
                whileTap={{ scale: 0.98 }}
                onClick={() => choose(w)}
                className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${cls}`}
              >
                {LABELS[w]}
              </motion.button>
            );
          })}
        </div>
      </div>
    </ExerciseShell>
  );
}
```

- [ ] **Step 2: `knob-tweak.tsx`**

```tsx
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
```

- [ ] **Step 3: `play-melody.tsx`**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import type { PlayMelodyExercise, Note } from "@/lib/course/types";
import { ExerciseShell } from "./exercise-shell";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { CourseAudioEngine } from "@/lib/course/audio";

interface Props { ex: PlayMelodyExercise; onAnswered: (correct: boolean) => void; }

export function PlayMelody({ ex, onAnswered }: Props) {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);
  const startedAt = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    void CourseAudioEngine.start().then(() => CourseAudioEngine.setPatch(ex.patch));
    startedAt.current = performance.now();
    timeoutRef.current = window.setTimeout(() => {
      if (!done) onAnswered(false);
      setDone(true);
    }, 8000);
    return () => { if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current); };
  }, [ex.id, ex.patch, onAnswered, done]);

  const onNoteOn = (note: string, vel: number) => {
    setActive((s) => new Set(s).add(note));
    CourseAudioEngine.noteOn(note, vel);
    if (done) return;
    if (note === ex.sequence[progress]) {
      const next = progress + 1;
      setProgress(next);
      if (next === ex.sequence.length) {
        setDone(true);
        if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
        onAnswered(true);
      }
    }
  };

  const onNoteOff = (note: Note) => {
    setActive((s) => { const c = new Set(s); c.delete(note); return c; });
    CourseAudioEngine.noteOff(note);
  };

  return (
    <ExerciseShell prompt={ex.prompt} feedback={done ? { correct: progress === ex.sequence.length } : null}>
      <div className="flex flex-col items-center gap-3 w-full">
        {ex.hint && <p className="text-xs text-muted-foreground">{ex.hint}</p>}
        <div className="flex gap-1 mb-2">
          {ex.sequence.map((n, i) => (
            <span
              key={i}
              className={`rounded px-2 py-1 text-xs font-mono border ${
                i < progress ? "bg-emerald-500/20 border-emerald-500" : "border-border text-muted-foreground"
              }`}
            >{n}</span>
          ))}
        </div>
        <PianoKeyboard
          startOctave={3}
          octaves={2}
          activeNotes={active}
          onNoteOn={onNoteOn}
          onNoteOff={onNoteOff}
        />
      </div>
    </ExerciseShell>
  );
}
```

- [ ] **Step 4: `free-play.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import type { FreePlayExercise } from "@/lib/course/types";
import { ExerciseShell } from "./exercise-shell";
import { Synth1ProEmbedded } from "@/components/course/synth1-pro-embedded";
import { CourseAudioEngine } from "@/lib/course/audio";

interface Props { ex: FreePlayExercise; onAnswered: (correct: boolean) => void; }

export function FreePlay({ ex, onAnswered }: Props) {
  const [remaining, setRemaining] = useState(ex.durationS ?? null);

  useEffect(() => {
    void CourseAudioEngine.start().then(() => {
      if (ex.patch) CourseAudioEngine.setPatch(ex.patch);
    });
  }, [ex.id, ex.patch]);

  useEffect(() => {
    onAnswered(true); // free-play always passes
    if (remaining === null) return;
    const id = window.setInterval(() => {
      setRemaining((r) => (r !== null && r > 0 ? r - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [ex.id, onAnswered, remaining]);

  return (
    <ExerciseShell prompt={ex.prompt}>
      <div className="flex flex-col items-center gap-3 w-full">
        {ex.caption && <p className="text-sm text-muted-foreground text-center">{ex.caption}</p>}
        {remaining !== null && (
          <p className="text-xs text-muted-foreground">{remaining}s remaining</p>
        )}
        <div className="w-full">
          <Synth1ProEmbedded />
        </div>
      </div>
    </ExerciseShell>
  );
}
```

(Note: `Synth1ProEmbedded` is created in Task 8.)

- [ ] **Step 5: Type check (will fail until Task 8 lands; commit anyway and resolve in Task 8)**

Skip strict gate here — type error will reference `Synth1ProEmbedded`. Run `npm run lint` only.

```bash
npm run lint
git add src/components/course/exercises/
git commit -m "feat(course): exercise components — waveform-pick, knob-tweak, play-melody, free-play"
```

---

### Task 7: Exercise dispatcher

**Files:**
- Create: `src/components/course/exercises/index.tsx`

- [ ] **Step 1: Create dispatcher**

```tsx
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
```

- [ ] **Step 2: Lint, commit**

```bash
npm run lint
git add src/components/course/exercises/index.tsx
git commit -m "feat(course): exercise dispatcher"
```

---

### Task 8: Refactor Synth 1 Pro into embeddable component

**Files:**
- Modify: `src/app/temp-synths/1-pro/page.tsx` — extract body into `Synth1Pro` component
- Create: `src/components/course/synth1-pro-embedded.tsx`

- [ ] **Step 1: Extract logic from `src/app/temp-synths/1-pro/page.tsx`**

Move the entire body of `Synth1ProPage` (effects, state, handlers, JSX) into a new exported component `Synth1Pro` accepting an optional `embedded?: boolean` prop. Keep `Synth1ProPage` as a thin default-export wrapper.

```tsx
// src/app/temp-synths/1-pro/page.tsx
"use client";
import { Synth1Pro } from "./synth1-pro";

export default function Synth1ProPage() {
  return <Synth1Pro />;
}
```

Then create `src/app/temp-synths/1-pro/synth1-pro.tsx` containing the original component body. Top of file:

```tsx
"use client";
// (paste original body of Synth1ProPage here, renamed as Synth1Pro)
import { useCallback, useEffect, useRef, useState } from "react";
import { Knob } from "@/components/synth/knob";
// ... rest of original imports

interface Synth1ProProps { embedded?: boolean; }

export function Synth1Pro({ embedded = false }: Synth1ProProps) {
  // ... original Synth1ProPage body, unchanged
  // The only behavior change: when embedded=true, share the global CourseAudioEngine
  // instead of creating its own engine. For unit-1 scope, leave the engine logic
  // unchanged and accept that embedded mode creates a sibling engine — playback works
  // because they target the same AudioContext via getAudioContext().
}
```

- [ ] **Step 2: Create `Synth1ProEmbedded`**

```tsx
// src/components/course/synth1-pro-embedded.tsx
"use client";
import { Synth1Pro } from "@/app/temp-synths/1-pro/synth1-pro";

export function Synth1ProEmbedded() {
  return (
    <div className="w-full">
      <Synth1Pro embedded />
    </div>
  );
}
```

- [ ] **Step 3: Verify the temp route still works**

```bash
npm run dev
```

Manually: visit `http://localhost:3000/temp-synths/1-pro` — keyboard plays, knobs work.

- [ ] **Step 4: Type check + lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/temp-synths/1-pro/ src/components/course/synth1-pro-embedded.tsx
git commit -m "refactor(synth1-pro): extract embeddable Synth1Pro component"
```

---

### Task 9: Lesson player

**Files:**
- Create: `src/components/course/lesson-player.tsx`

- [ ] **Step 1: Implement player**

```tsx
"use client";
import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { Lesson } from "@/lib/course/types";
import { ExerciseRenderer, isPassiveExercise } from "./exercises";
import { markLessonComplete, recordExerciseAttempt } from "@/lib/course/progress";

interface Props {
  lesson: Lesson;
  lessonId: string;        // fully-qualified e.g. "1-1.1-1-1"
  subLessonSlug: string;   // e.g. "1-1"
  onExit: () => void;
  onComplete: () => void;
}

type Phase = "idle" | "answered" | "advancing";

export function LessonPlayer({ lesson, lessonId, subLessonSlug, onExit, onComplete }: Props) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [completedPanel, setCompletedPanel] = useState(false);

  const ex = lesson.exercises[idx];
  const isPassive = isPassiveExercise(ex);

  const handleAnswered = useCallback(
    (correct: boolean) => {
      if (phase !== "idle") return;
      recordExerciseAttempt(ex, subLessonSlug, correct);
      setLastCorrect(correct);
      setPhase("answered");
    },
    [ex, phase, subLessonSlug],
  );

  const advance = useCallback(() => {
    setPhase("advancing");
    setLastCorrect(null);
    if (idx + 1 < lesson.exercises.length) {
      window.setTimeout(() => {
        setIdx(idx + 1);
        setPhase("idle");
      }, 250);
    } else {
      setCompletedPanel(true);
      markLessonComplete(lessonId);
      window.setTimeout(() => { onComplete(); }, 1500);
    }
  }, [idx, lesson.exercises.length, lessonId, onComplete]);

  const buttonLabel = isPassive ? "CONTINUE" : phase === "idle" ? "CHECK" : "CONTINUE";
  const buttonDisabled = !isPassive && phase === "idle";

  const onButton = () => {
    if (isPassive || phase === "answered") advance();
  };

  const exitWithConfirm = () => {
    if (window.confirm("Quit lesson? Progress in this lesson resets.")) onExit();
  };

  if (completedPanel) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">★</div>
          <h2 className="text-2xl font-bold">Lesson complete</h2>
        </motion.div>
      </div>
    );
  }

  const progress = (idx / lesson.exercises.length) * 100;

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={exitWithConfirm} aria-label="Quit" className="p-1">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{idx + 1}/{lesson.exercises.length}</span>
      </header>

      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={ex.id}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ExerciseRenderer ex={ex} onAnswered={handleAnswered} />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-border p-4">
        <button
          onClick={onButton}
          disabled={buttonDisabled}
          className={`w-full rounded-xl py-3 text-sm font-bold transition ${
            buttonDisabled
              ? "bg-muted text-muted-foreground"
              : lastCorrect === false
                ? "bg-red-500 text-white"
                : "bg-primary text-primary-foreground"
          }`}
        >
          {buttonLabel}
        </button>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Type check + lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/components/course/lesson-player.tsx
git commit -m "feat(course): fullscreen lesson player with state machine + transitions"
```

---

### Task 10: Snake pathway component

**Files:**
- Create: `src/components/course/snake-pathway.tsx`

- [ ] **Step 1: Implement curved pathway**

```tsx
"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Lock, Star, Swords } from "lucide-react";

export interface PathwayNode {
  lessonSlug: string;        // "1-1-1" or "test"
  lessonId: string;          // "1-1.1-1-1" or "1-1.test"
  title: string;
  status: "locked" | "available" | "completed";
  isTest?: boolean;
}

interface Props {
  unitSlug: string;
  subSlug: string;
  nodes: PathwayNode[];
}

const COLUMNS = [60, 140, 220, 140]; // x positions (snake)
const ROW_GAP = 90;

export function SnakePathway({ unitSlug, subSlug, nodes }: Props) {
  const positions = nodes.map((_, i) => ({
    x: COLUMNS[i % COLUMNS.length],
    y: 60 + i * ROW_GAP,
  }));
  const height = 60 + nodes.length * ROW_GAP;

  return (
    <div className="relative mx-auto" style={{ width: 280, height }}>
      <svg className="absolute inset-0" width={280} height={height}>
        {positions.slice(0, -1).map((p, i) => {
          const next = positions[i + 1];
          const completed = nodes[i].status === "completed";
          return (
            <motion.path
              key={i}
              d={`M ${p.x} ${p.y} Q ${(p.x + next.x) / 2} ${(p.y + next.y) / 2 + 30} ${next.x} ${next.y}`}
              stroke={completed ? "var(--primary, #a78bfa)" : "var(--muted, #27272a)"}
              strokeWidth={3}
              strokeDasharray={completed ? "0" : "6 6"}
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            />
          );
        })}
      </svg>
      {nodes.map((node, i) => {
        const p = positions[i];
        return (
          <PathwayNodeView
            key={node.lessonId}
            node={node}
            unitSlug={unitSlug}
            subSlug={subSlug}
            x={p.x}
            y={p.y}
            index={i}
          />
        );
      })}
    </div>
  );
}

function PathwayNodeView({
  node, unitSlug, subSlug, x, y, index,
}: {
  node: PathwayNode; unitSlug: string; subSlug: string; x: number; y: number; index: number;
}) {
  const Inner = () => (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center border-2 ${
        node.status === "completed"
          ? "bg-primary border-primary text-primary-foreground"
          : node.status === "available"
            ? node.isTest
              ? "bg-red-600 border-amber-400 text-white shadow-lg shadow-red-500/30"
              : "bg-card border-primary text-primary shadow-lg shadow-primary/20"
            : "bg-card border-border text-muted-foreground"
      }`}
      style={{ left: x, top: y }}
      whileHover={{ scale: node.status === "locked" ? 1 : 1.06 }}
    >
      {node.status === "completed" ? <Check className="w-5 h-5" />
        : node.status === "locked" ? <Lock className="w-4 h-4" />
        : node.isTest ? <Swords className="w-5 h-5" />
        : <Star className="w-5 h-5" />}
    </motion.div>
  );

  if (node.status === "locked") {
    return <Inner />;
  }
  return (
    <Link
      href={`/learn/${unitSlug}/${subSlug}/${node.lessonSlug}`}
      aria-label={node.title}
    >
      <Inner />
    </Link>
  );
}
```

- [ ] **Step 2: Lint, commit**

```bash
npm run lint
git add src/components/course/snake-pathway.tsx
git commit -m "feat(course): SVG snake pathway with animated nodes"
```

---

### Task 11: Routes — `/learn` and `/learn/[unitSlug]`

**Files:**
- Replace: `src/app/(main)/learn/page.tsx`
- Create: `src/app/(main)/learn/[unitSlug]/page.tsx`

- [ ] **Step 1: Replace `/learn` page**

```tsx
// src/app/(main)/learn/page.tsx
import Link from "next/link";
import { UNITS } from "@/lib/course";

export default function LearnPage() {
  return (
    <div className="space-y-6 max-w-md mx-auto px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Learn</h1>
        <p className="text-sm text-muted-foreground">Master synthesis from the ground up.</p>
      </header>
      <div className="flex flex-col gap-3">
        {UNITS.map((unit) => (
          <Link
            key={unit.slug}
            href={`/learn/${unit.slug}`}
            className="rounded-2xl border border-border bg-card p-5 hover:border-primary/60 transition"
          >
            <h2 className="text-lg font-semibold">{unit.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{unit.blurb}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {unit.subLessons.length} sub-lessons
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create unit page**

```tsx
// src/app/(main)/learn/[unitSlug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { findUnit } from "@/lib/course";
import { UnitPageClient } from "./unit-client";

export default async function UnitPage({
  params,
}: {
  params: Promise<{ unitSlug: string }>;
}) {
  const { unitSlug } = await params;
  const unit = findUnit(unitSlug);
  if (!unit) notFound();
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      <Link href="/learn" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> All units
      </Link>
      <header>
        <h1 className="text-2xl font-bold">{unit.title}</h1>
        <p className="text-sm text-muted-foreground">{unit.blurb}</p>
      </header>
      <UnitPageClient unit={unit} />
    </div>
  );
}
```

- [ ] **Step 3: Create unit client component**

```tsx
// src/app/(main)/learn/[unitSlug]/unit-client.tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import type { Unit } from "@/lib/course";
import { isSubLessonAvailable, isLessonComplete } from "@/lib/course/progress";

export function UnitPageClient({ unit }: { unit: Unit }) {
  const [, force] = useState(0);
  useEffect(() => { force((n) => n + 1); }, []); // re-render after mount to read localStorage

  return (
    <div className="flex flex-col gap-3">
      {unit.subLessons.map((sub, i) => {
        const available = isSubLessonAvailable(unit, sub.slug);
        const completed = isLessonComplete(`${sub.slug}.test`);
        const inner = (
          <div className={`rounded-2xl border p-4 ${
            !available ? "border-border opacity-60"
            : completed ? "border-primary/50 bg-primary/5"
            : "border-primary bg-card"
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold tabular-nums opacity-70">{i + 1}</span>
              <div className="flex-1">
                <h3 className="text-base font-semibold">{sub.title}</h3>
                <p className="text-xs text-muted-foreground">{sub.blurb}</p>
              </div>
              {!available && <Lock className="w-4 h-4 text-muted-foreground" />}
            </div>
            {!available && (
              <p className="text-xs text-muted-foreground mt-2">Complete previous sub-lesson</p>
            )}
          </div>
        );
        return available ? (
          <Link key={sub.slug} href={`/learn/${unit.slug}/${sub.slug}`}>{inner}</Link>
        ) : (
          <div key={sub.slug}>{inner}</div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Type check + lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/\(main\)/learn/page.tsx src/app/\(main\)/learn/\[unitSlug\]/
git commit -m "feat(course): /learn unit list + per-unit sub-lesson grid"
```

---

### Task 12: Sub-lesson pathway route + lesson player route

**Files:**
- Create: `src/app/(main)/learn/[unitSlug]/[subLessonSlug]/page.tsx`
- Create: `src/app/(main)/learn/[unitSlug]/[subLessonSlug]/pathway-client.tsx`
- Create: `src/app/(main)/learn/[unitSlug]/[subLessonSlug]/[lessonSlug]/layout.tsx`
- Create: `src/app/(main)/learn/[unitSlug]/[subLessonSlug]/[lessonSlug]/page.tsx`
- Create: `src/app/(main)/learn/[unitSlug]/[subLessonSlug]/[lessonSlug]/lesson-client.tsx`

- [ ] **Step 1: Sub-lesson server page**

```tsx
// src/app/(main)/learn/[unitSlug]/[subLessonSlug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { findUnit, findSubLesson } from "@/lib/course";
import { PathwayClient } from "./pathway-client";

export default async function SubLessonPage({
  params,
}: { params: Promise<{ unitSlug: string; subLessonSlug: string }> }) {
  const { unitSlug, subLessonSlug } = await params;
  const unit = findUnit(unitSlug);
  const sub = findSubLesson(unitSlug, subLessonSlug);
  if (!unit || !sub) notFound();
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      <Link href={`/learn/${unitSlug}`} className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> {unit.title}
      </Link>
      <header className="text-center">
        <h1 className="text-xl font-bold">{sub.title}</h1>
        <p className="text-sm text-muted-foreground">{sub.blurb}</p>
      </header>
      <PathwayClient unit={unit} sub={sub} />
    </div>
  );
}
```

- [ ] **Step 2: Pathway client (computes node statuses)**

```tsx
// src/app/(main)/learn/[unitSlug]/[subLessonSlug]/pathway-client.tsx
"use client";
import { useEffect, useState } from "react";
import { SnakePathway, type PathwayNode } from "@/components/course/snake-pathway";
import type { Unit, SubLesson } from "@/lib/course";
import { isLessonComplete } from "@/lib/course/progress";

export function PathwayClient({ unit, sub }: { unit: Unit; sub: SubLesson }) {
  const [nodes, setNodes] = useState<PathwayNode[]>([]);

  useEffect(() => {
    const completedSet = new Set<string>();
    for (const l of sub.lessons) {
      if (isLessonComplete(`${sub.slug}.${l.slug}`)) completedSet.add(l.slug);
    }
    const testCompleted = isLessonComplete(`${sub.slug}.test`);

    const items: PathwayNode[] = [];
    for (let i = 0; i < sub.lessons.length; i++) {
      const l = sub.lessons[i];
      const prev = i === 0 ? null : sub.lessons[i - 1];
      const status: PathwayNode["status"] =
        completedSet.has(l.slug) ? "completed"
          : prev === null || completedSet.has(prev.slug) ? "available"
          : "locked";
      items.push({
        lessonSlug: l.slug,
        lessonId: `${sub.slug}.${l.slug}`,
        title: l.title,
        status,
      });
    }
    const allLessonsDone = sub.lessons.every((l) => completedSet.has(l.slug));
    items.push({
      lessonSlug: "test",
      lessonId: `${sub.slug}.test`,
      title: "Mixed Test",
      isTest: true,
      status: testCompleted ? "completed" : allLessonsDone ? "available" : "locked",
    });
    setNodes(items);
  }, [unit, sub]);

  return <SnakePathway unitSlug={unit.slug} subSlug={sub.slug} nodes={nodes} />;
}
```

- [ ] **Step 3: Lesson minimal layout**

```tsx
// src/app/(main)/learn/[unitSlug]/[subLessonSlug]/[lessonSlug]/layout.tsx
export default function LessonLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

(Override note: in Next.js App Router, this layout replaces parent layouts only when using a route group escape. To remove the `(main)` sidebar, this lesson route must live outside `(main)`. Re-locate the lesson route to `src/app/learn-lesson/...` OR convert `(main)` layout to render its children directly when a query/path flag is set. **Decision per spec:** keep route inside `(main)` and rely on the lesson player rendering `position: fixed inset-0 z-40` — it visually overlays the sidebar. Remove the layout.tsx file from this task; lesson player handles fullscreen via fixed positioning.)

Actually delete the file created in Step 3 if you created it:

```bash
rm src/app/\(main\)/learn/\[unitSlug\]/\[subLessonSlug\]/\[lessonSlug\]/layout.tsx
```

The fullscreen `fixed inset-0 z-40` in `LessonPlayer` covers sidebar; works fine.

- [ ] **Step 4: Lesson server page**

```tsx
// src/app/(main)/learn/[unitSlug]/[subLessonSlug]/[lessonSlug]/page.tsx
import { notFound } from "next/navigation";
import { findUnit, findSubLesson, findLesson } from "@/lib/course";
import { LessonClient } from "./lesson-client";

export default async function LessonPage({
  params,
}: { params: Promise<{ unitSlug: string; subLessonSlug: string; lessonSlug: string }> }) {
  const { unitSlug, subLessonSlug, lessonSlug } = await params;
  const unit = findUnit(unitSlug);
  const sub = findSubLesson(unitSlug, subLessonSlug);
  if (!unit || !sub) notFound();
  if (lessonSlug !== "test") {
    const lesson = findLesson(unitSlug, subLessonSlug, lessonSlug);
    if (!lesson) notFound();
  }
  return <LessonClient unit={unit} subSlug={sub.slug} lessonSlug={lessonSlug} />;
}
```

- [ ] **Step 5: Lesson client (handles test generation + player)**

```tsx
// src/app/(main)/learn/[unitSlug]/[subLessonSlug]/[lessonSlug]/lesson-client.tsx
"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Unit, Lesson } from "@/lib/course";
import { findSubLesson } from "@/lib/course";
import { LessonPlayer } from "@/components/course/lesson-player";
import { generateMixedTest, mixedTestOptionsFor } from "@/lib/course/mistake-pool";

interface Props { unit: Unit; subSlug: string; lessonSlug: string; }

export function LessonClient({ unit, subSlug, lessonSlug }: Props) {
  const router = useRouter();
  const sub = findSubLesson(unit.slug, subSlug);

  const lesson: Lesson | undefined = useMemo(() => {
    if (!sub) return undefined;
    if (lessonSlug === "test") {
      return generateMixedTest(sub, unit, mixedTestOptionsFor(sub.slug));
    }
    return sub.lessons.find((l) => l.slug === lessonSlug);
  }, [sub, unit, lessonSlug]);

  const [_renderKey] = useState(0);

  if (!sub || !lesson) return null;

  const lessonId = `${subSlug}.${lessonSlug}`;
  const onExit = () => router.push(`/learn/${unit.slug}/${subSlug}`);
  const onComplete = () => router.push(`/learn/${unit.slug}/${subSlug}`);

  return (
    <LessonPlayer
      lesson={lesson}
      lessonId={lessonId}
      subLessonSlug={subSlug}
      onExit={onExit}
      onComplete={onComplete}
    />
  );
}
```

- [ ] **Step 6: Type check + lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/\(main\)/learn/\[unitSlug\]/\[subLessonSlug\]/
git commit -m "feat(course): pathway route + fullscreen lesson player route"
```

---

### Task 13: Unit 1 content — sub-lessons 1-1 and 1-2

**Files:**
- Create: `src/lib/course/content/unit-1/1-1-what-is-sound.ts`
- Create: `src/lib/course/content/unit-1/1-2-pitch-and-notes.ts`
- Modify: `src/lib/course/content/unit-1/index.ts` to import + register them

Authoring guidance: every exercise needs a stable `id` of form `{subSlug}.{lessonSlug}.q{n}` (e.g. `"1-1.1-1-1.q1"`). Lesson slugs use the format `1-1-1` (no dots, hyphens-only) so they survive URL encoding and TS object keys.

- [ ] **Step 1: `1-1-what-is-sound.ts`**

```ts
import type { SubLesson } from "../../types";

export const subLesson_1_1: SubLesson = {
  slug: "1-1",
  title: "What is Sound",
  blurb: "Vibration, frequency, amplitude — the building blocks.",
  lessons: [
    {
      slug: "1-1-1",
      title: "Sound is Vibration",
      exercises: [
        {
          id: "1-1.1-1-1.q1",
          type: "concept-slide",
          prompt: "Sound is something shaking",
          visual: "vibrating-string",
          caption: "When something vibrates, it pushes air. That push reaches your ear as sound.",
        },
        {
          id: "1-1.1-1-1.q2",
          type: "tap-to-hear",
          prompt: "Hear a 440 Hz sine — a pure tone",
          patch: { waveform: "sine", filterFreq: 8000, attack: 0.05, release: 0.5, volume: 0.8 },
          notes: ["A4"],
          caption: "440 vibrations per second. That's the note A.",
        },
        {
          id: "1-1.1-1-1.q3",
          type: "ab-compare",
          prompt: "Pick the one that is sound",
          a: { patch: { volume: 0 }, notes: [], label: "Silence" },
          b: { patch: { waveform: "sine", filterFreq: 8000, volume: 0.8 }, notes: ["A4"], label: "Vibration" },
          correct: "b",
          explainer: "Silence = no vibration. Tone = vibration.",
        },
        {
          id: "1-1.1-1-1.q4",
          type: "multi-choice",
          prompt: "What makes sound?",
          question: "Sound happens when…",
          options: ["Light bounces off walls", "Something vibrates and pushes air", "Magnets line up", "Numbers add up"],
          correctIndex: 1,
        },
      ],
    },
    {
      slug: "1-1-2",
      title: "Frequency = Pitch",
      exercises: [
        {
          id: "1-1.1-1-2.q1",
          type: "concept-slide",
          prompt: "Faster = higher pitch",
          visual: "amplitude-vs-frequency",
          caption: "More wiggles per second = higher note. Frequency is measured in Hertz (Hz).",
        },
        {
          id: "1-1.1-1-2.q2",
          type: "ab-compare",
          prompt: "Which is higher?",
          a: { patch: { waveform: "sine", volume: 0.8 }, notes: ["A3"], label: "A" },
          b: { patch: { waveform: "sine", volume: 0.8 }, notes: ["A5"], label: "B" },
          correct: "b",
        },
        {
          id: "1-1.1-1-2.q3",
          type: "multi-choice",
          prompt: "Doubling the frequency…",
          question: "If you double the Hz, the note goes…",
          options: ["Lower", "Up an octave", "Quieter", "Stays the same"],
          correctIndex: 1,
          explainer: "Each octave = 2× the frequency.",
        },
        {
          id: "1-1.1-1-2.q4",
          type: "tap-to-hear",
          prompt: "Slow sweep, low to high",
          patch: { waveform: "sine", filterFreq: 8000, volume: 0.7 },
          notes: ["C3", "C4", "C5", "C6"],
        },
      ],
    },
    {
      slug: "1-1-3",
      title: "Amplitude = Loudness",
      exercises: [
        {
          id: "1-1.1-1-3.q1",
          type: "concept-slide",
          prompt: "Bigger wiggle = louder",
          visual: "amplitude-vs-frequency",
          caption: "Frequency and loudness are independent. A note can be high and quiet, or low and loud.",
        },
        {
          id: "1-1.1-1-3.q2",
          type: "ab-compare",
          prompt: "Pick the louder one",
          a: { patch: { waveform: "sine", volume: 0.2 }, notes: ["A4"], label: "A" },
          b: { patch: { waveform: "sine", volume: 0.9 }, notes: ["A4"], label: "B" },
          correct: "b",
        },
        {
          id: "1-1.1-1-3.q3",
          type: "knob-tweak",
          prompt: "Set volume to a moderate level",
          param: "volume",
          target: 0.7,
          tolerance: 0.08,
          initialPatch: { waveform: "sine", filterFreq: 8000, volume: 0.2 },
          previewNote: "A4",
        },
        {
          id: "1-1.1-1-3.q4",
          type: "multi-choice",
          prompt: "Loudness is…",
          question: "Volume controls…",
          options: ["Pitch", "Speed", "Amplitude", "Tone color"],
          correctIndex: 2,
        },
      ],
    },
    {
      slug: "1-1-4",
      title: "Timbre Tease",
      exercises: [
        {
          id: "1-1.1-1-4.q1",
          type: "ab-compare",
          prompt: "Same note. Same loudness. Different…?",
          a: { patch: { waveform: "sine", volume: 0.7 }, notes: ["A4"], label: "Sine" },
          b: { patch: { waveform: "sawtooth", volume: 0.7, filterFreq: 8000 }, notes: ["A4"], label: "Saw" },
          correct: "b",
          explainer: "Both are 'A4' at the same loudness. The difference is timbre — the shape of the wave.",
        },
        {
          id: "1-1.1-1-4.q2",
          type: "concept-slide",
          prompt: "Wave shape = tone color",
          visual: "waveform-morph",
          caption: "Different wave shapes have different harmonic content. We'll meet four of them next.",
        },
        {
          id: "1-1.1-1-4.q3",
          type: "multi-choice",
          prompt: "Two notes at the same pitch and loudness can still sound different. That's…",
          question: "The word for 'tone color':",
          options: ["Frequency", "Amplitude", "Timbre", "Octave"],
          correctIndex: 2,
        },
      ],
    },
  ],
};
```

- [ ] **Step 2: `1-2-pitch-and-notes.ts`**

```ts
import type { SubLesson } from "../../types";

export const subLesson_1_2: SubLesson = {
  slug: "1-2",
  title: "Pitch & Notes",
  blurb: "Keyboards, octaves, sharps. Find your way around the keys.",
  lessons: [
    {
      slug: "1-2-1",
      title: "Notes on a Keyboard",
      exercises: [
        {
          id: "1-2.1-2-1.q1",
          type: "concept-slide",
          prompt: "The keyboard repeats",
          visual: "octave-keyboard",
          caption: "Seven white keys (C D E F G A B), then it starts over an octave higher.",
        },
        {
          id: "1-2.1-2-1.q2",
          type: "tap-to-hear",
          prompt: "Listen to a C major scale",
          patch: { waveform: "sine", filterFreq: 8000, volume: 0.7 },
          notes: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
        },
        {
          id: "1-2.1-2-1.q3",
          type: "multi-choice",
          prompt: "Which key is C?",
          question: "C is the white key…",
          options: [
            "Just left of any group of two black keys",
            "Just right of any group of two black keys",
            "The leftmost key on the keyboard",
            "Always green",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      slug: "1-2-2",
      title: "Octaves",
      exercises: [
        {
          id: "1-2.1-2-2.q1",
          type: "concept-slide",
          prompt: "Same name, different height",
          visual: "octave-keyboard",
          caption: "C3, C4, C5… all the C's. Each is twice the frequency of the one below.",
        },
        {
          id: "1-2.1-2-2.q2",
          type: "ab-compare",
          prompt: "Which is C4?",
          a: { patch: { waveform: "sine", volume: 0.7 }, notes: ["C3"], label: "A" },
          b: { patch: { waveform: "sine", volume: 0.7 }, notes: ["C4"], label: "B" },
          correct: "b",
          explainer: "C4 is 'middle C', one octave higher than C3.",
        },
        {
          id: "1-2.1-2-2.q3",
          type: "play-melody",
          prompt: "Play C3 then C4",
          patch: { waveform: "sine", volume: 0.7 },
          sequence: ["C3", "C4"],
        },
        {
          id: "1-2.1-2-2.q4",
          type: "multi-choice",
          prompt: "How many semitones in an octave?",
          question: "One octave equals…",
          options: ["7", "8", "12", "16"],
          correctIndex: 2,
        },
      ],
    },
    {
      slug: "1-2-3",
      title: "Sharps & Flats",
      exercises: [
        {
          id: "1-2.1-2-3.q1",
          type: "concept-slide",
          prompt: "Black keys = sharps and flats",
          visual: "octave-keyboard",
          caption: "The black keys sit between certain whites. C# is just right of C.",
        },
        {
          id: "1-2.1-2-3.q2",
          type: "multi-choice",
          prompt: "Which note is between C and D?",
          question: "The black key between C and D is…",
          options: ["B#", "C#", "D♭", "Both C# and D♭"],
          correctIndex: 3,
          explainer: "C# and D♭ are the same key — just two different names.",
        },
        {
          id: "1-2.1-2-3.q3",
          type: "ab-compare",
          prompt: "Which is C#?",
          a: { patch: { waveform: "sine", volume: 0.7 }, notes: ["C4"], label: "A" },
          b: { patch: { waveform: "sine", volume: 0.7 }, notes: ["C#4"], label: "B" },
          correct: "b",
        },
      ],
    },
    {
      slug: "1-2-4",
      title: "Play a Tune",
      exercises: [
        {
          id: "1-2.1-2-4.q1",
          type: "play-melody",
          prompt: "Walk up: C D E F G",
          patch: { waveform: "sine", filterFreq: 8000, volume: 0.7 },
          sequence: ["C4", "D4", "E4", "F4", "G4"],
          hint: "Tap each key in order.",
        },
        {
          id: "1-2.1-2-4.q2",
          type: "play-melody",
          prompt: "Walk down: G F E D C",
          patch: { waveform: "sine", filterFreq: 8000, volume: 0.7 },
          sequence: ["G4", "F4", "E4", "D4", "C4"],
        },
        {
          id: "1-2.1-2-4.q3",
          type: "free-play",
          prompt: "Find your own pattern",
          patch: { waveform: "sine", filterFreq: 8000, volume: 0.7 },
          durationS: 30,
          caption: "30 seconds. No grading.",
        },
      ],
    },
  ],
};
```

- [ ] **Step 3: Register in `unit-1/index.ts`**

```ts
import type { Unit } from "../../types";
import { subLesson_1_1 } from "./1-1-what-is-sound";
import { subLesson_1_2 } from "./1-2-pitch-and-notes";

export const unit1: Unit = {
  slug: "unit-1",
  title: "Sound Foundations",
  blurb: "Sound, pitch, oscillator, filter, amp — everything you need to play Synth 1 Pro.",
  subLessons: [subLesson_1_1, subLesson_1_2],
};
```

- [ ] **Step 4: Type check + lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/lib/course/content/
git commit -m "feat(course): unit-1 content — 1-1 What is Sound, 1-2 Pitch & Notes"
```

---

### Task 14: Unit 1 content — 1-3 Oscillator and 1-4 Amp Envelope

**Files:**
- Create: `src/lib/course/content/unit-1/1-3-oscillator.ts`
- Create: `src/lib/course/content/unit-1/1-4-amp-envelope.ts`
- Modify: `src/lib/course/content/unit-1/index.ts`

Author following the patterns in Task 13. Each lesson 4–6 exercises. Use ids of form `{subSlug}.{lessonSlug}.q{n}`.

- [ ] **Step 1: `1-3-oscillator.ts`**

```ts
import type { SubLesson } from "../../types";

export const subLesson_1_3: SubLesson = {
  slug: "1-3",
  title: "Oscillator",
  blurb: "Sine, sawtooth, square, triangle — the four shapes.",
  lessons: [
    {
      slug: "1-3-1",
      title: "Sine = Pure",
      exercises: [
        { id: "1-3.1-3-1.q1", type: "concept-slide", prompt: "Sine wave",
          visual: "waveform-morph", caption: "The smoothest possible tone. One frequency, no extras." },
        { id: "1-3.1-3-1.q2", type: "tap-to-hear", prompt: "Hear a sine",
          patch: { waveform: "sine", filterFreq: 8000, volume: 0.8 }, notes: ["A4"] },
        { id: "1-3.1-3-1.q3", type: "waveform-pick", prompt: "Pick the sine",
          shape: "sine", options: ["sine", "square", "triangle", "sawtooth"] },
        { id: "1-3.1-3-1.q4", type: "multi-choice", prompt: "Sine sounds…",
          question: "Compared to other shapes, a sine is…",
          options: ["Pure / smooth", "Buzzy", "Hollow", "Sharp"], correctIndex: 0 },
      ],
    },
    {
      slug: "1-3-2",
      title: "Sawtooth = Bright",
      exercises: [
        { id: "1-3.1-3-2.q1", type: "concept-slide", prompt: "Sawtooth wave",
          visual: "waveform-morph", caption: "Buzzy. Lots of harmonics. Classic synth lead sound." },
        { id: "1-3.1-3-2.q2", type: "tap-to-hear", prompt: "Hear a saw",
          patch: { waveform: "sawtooth", filterFreq: 8000, volume: 0.8 }, notes: ["A4"] },
        { id: "1-3.1-3-2.q3", type: "ab-compare", prompt: "Which is the sawtooth?",
          a: { patch: { waveform: "sine", volume: 0.8 }, notes: ["A4"] },
          b: { patch: { waveform: "sawtooth", filterFreq: 8000, volume: 0.8 }, notes: ["A4"] },
          correct: "b" },
        { id: "1-3.1-3-2.q4", type: "waveform-pick", prompt: "Pick the saw",
          shape: "sawtooth", options: ["sine", "square", "triangle", "sawtooth"] },
      ],
    },
    {
      slug: "1-3-3",
      title: "Square = Hollow",
      exercises: [
        { id: "1-3.1-3-3.q1", type: "concept-slide", prompt: "Square wave",
          visual: "waveform-morph", caption: "Hollow, woody. Like a clarinet — odd harmonics only." },
        { id: "1-3.1-3-3.q2", type: "tap-to-hear", prompt: "Hear a square",
          patch: { waveform: "square", filterFreq: 8000, volume: 0.7 }, notes: ["A4"] },
        { id: "1-3.1-3-3.q3", type: "ab-compare", prompt: "Which is the square?",
          a: { patch: { waveform: "sawtooth", filterFreq: 8000, volume: 0.7 }, notes: ["A4"] },
          b: { patch: { waveform: "square", filterFreq: 8000, volume: 0.7 }, notes: ["A4"] },
          correct: "b" },
        { id: "1-3.1-3-3.q4", type: "waveform-pick", prompt: "Pick the square",
          shape: "square", options: ["sine", "square", "triangle", "sawtooth"] },
        { id: "1-3.1-3-3.q5", type: "multi-choice", prompt: "Square waves are…",
          question: "Which best describes square?",
          options: ["Buzzy", "Hollow", "Pure", "Smooth"], correctIndex: 1 },
      ],
    },
    {
      slug: "1-3-4",
      title: "Triangle = Mellow",
      exercises: [
        { id: "1-3.1-3-4.q1", type: "concept-slide", prompt: "Triangle wave",
          visual: "waveform-morph", caption: "Mellow. Like a softer square — fewer harmonics, gentler edge." },
        { id: "1-3.1-3-4.q2", type: "tap-to-hear", prompt: "Hear a triangle",
          patch: { waveform: "triangle", filterFreq: 8000, volume: 0.8 }, notes: ["A4"] },
        { id: "1-3.1-3-4.q3", type: "ab-compare", prompt: "Which is the triangle?",
          a: { patch: { waveform: "square", filterFreq: 8000, volume: 0.8 }, notes: ["A4"] },
          b: { patch: { waveform: "triangle", filterFreq: 8000, volume: 0.8 }, notes: ["A4"] },
          correct: "b" },
        { id: "1-3.1-3-4.q4", type: "waveform-pick", prompt: "Pick the triangle",
          shape: "triangle", options: ["sine", "square", "triangle", "sawtooth"] },
      ],
    },
    {
      slug: "1-3-5",
      title: "Pick the Wave",
      exercises: [
        { id: "1-3.1-3-5.q1", type: "waveform-pick", prompt: "Sine?",
          shape: "sine", options: ["sine", "square", "triangle", "sawtooth"] },
        { id: "1-3.1-3-5.q2", type: "waveform-pick", prompt: "Sawtooth?",
          shape: "sawtooth", options: ["sine", "square", "triangle", "sawtooth"] },
        { id: "1-3.1-3-5.q3", type: "waveform-pick", prompt: "Square?",
          shape: "square", options: ["sine", "square", "triangle", "sawtooth"] },
        { id: "1-3.1-3-5.q4", type: "ab-compare", prompt: "Which sounds buzziest?",
          a: { patch: { waveform: "sine", volume: 0.8 }, notes: ["A4"] },
          b: { patch: { waveform: "sawtooth", filterFreq: 8000, volume: 0.8 }, notes: ["A4"] },
          correct: "b" },
        { id: "1-3.1-3-5.q5", type: "multi-choice", prompt: "Which shape has the brightest sound?",
          question: "Brightest = most harmonic content =",
          options: ["Sine", "Triangle", "Square", "Sawtooth"], correctIndex: 3 },
      ],
    },
  ],
};
```

- [ ] **Step 2: `1-4-amp-envelope.ts`**

```ts
import type { SubLesson } from "../../types";

export const subLesson_1_4: SubLesson = {
  slug: "1-4",
  title: "Amp Envelope",
  blurb: "Notes have a shape over time — attack and release.",
  lessons: [
    {
      slug: "1-4-1",
      title: "Notes Have Shape",
      exercises: [
        { id: "1-4.1-4-1.q1", type: "concept-slide", prompt: "Volume over time",
          visual: "envelope-shape", caption: "How a note rises in and fades out — the envelope." },
        { id: "1-4.1-4-1.q2", type: "ab-compare", prompt: "Pluck or pad?",
          a: { patch: { waveform: "sawtooth", filterFreq: 4000, attack: 0.01, release: 0.2, volume: 0.8 }, notes: ["C4"], label: "Pluck" },
          b: { patch: { waveform: "triangle", filterFreq: 2000, attack: 1.5, release: 2.0, volume: 0.8 }, notes: ["C4"], label: "Pad" },
          correct: "a",
          explainer: "Pluck: fast attack, short release. Pad: slow attack, long release." },
        { id: "1-4.1-4-1.q3", type: "multi-choice", prompt: "Envelope controls…",
          question: "What does an amp envelope shape?",
          options: ["The pitch over time", "The loudness over time", "The waveform shape", "The reverb amount"],
          correctIndex: 1 },
      ],
    },
    {
      slug: "1-4-2",
      title: "Attack",
      exercises: [
        { id: "1-4.1-4-2.q1", type: "concept-slide", prompt: "Attack = how fast it rises",
          visual: "envelope-shape", caption: "Short attack = punchy. Long attack = swell." },
        { id: "1-4.1-4-2.q2", type: "ab-compare", prompt: "Which has a slow attack?",
          a: { patch: { waveform: "triangle", filterFreq: 4000, attack: 0.01, release: 0.4, volume: 0.8 }, notes: ["C4"] },
          b: { patch: { waveform: "triangle", filterFreq: 4000, attack: 1.5, release: 0.4, volume: 0.8 }, notes: ["C4"] },
          correct: "b" },
        { id: "1-4.1-4-2.q3", type: "knob-tweak", prompt: "Set a fast attack (0.01 s)",
          param: "attack", target: 0.01, tolerance: 0.05,
          initialPatch: { waveform: "sawtooth", filterFreq: 3000, attack: 1.0, release: 0.4, volume: 0.8 },
          previewNote: "C4" },
        { id: "1-4.1-4-2.q4", type: "knob-tweak", prompt: "Set a slow attack (~2 s)",
          param: "attack", target: 2.0, tolerance: 0.4,
          initialPatch: { waveform: "triangle", filterFreq: 2000, attack: 0.01, release: 1.0, volume: 0.8 },
          previewNote: "C4" },
      ],
    },
    {
      slug: "1-4-3",
      title: "Release",
      exercises: [
        { id: "1-4.1-4-3.q1", type: "concept-slide", prompt: "Release = how fast it fades",
          visual: "envelope-shape", caption: "Short release = staccato. Long release = trails." },
        { id: "1-4.1-4-3.q2", type: "ab-compare", prompt: "Which has a long release?",
          a: { patch: { waveform: "sawtooth", filterFreq: 4000, attack: 0.05, release: 0.1, volume: 0.8 }, notes: ["C4"] },
          b: { patch: { waveform: "sawtooth", filterFreq: 4000, attack: 0.05, release: 2.5, volume: 0.8 }, notes: ["C4"] },
          correct: "b" },
        { id: "1-4.1-4-3.q3", type: "knob-tweak", prompt: "Set a short release (~0.1 s)",
          param: "release", target: 0.1, tolerance: 0.08,
          initialPatch: { waveform: "sawtooth", filterFreq: 3000, attack: 0.05, release: 1.5, volume: 0.8 },
          previewNote: "C4" },
        { id: "1-4.1-4-3.q4", type: "knob-tweak", prompt: "Set a long release (~2.5 s)",
          param: "release", target: 2.5, tolerance: 0.4,
          initialPatch: { waveform: "triangle", filterFreq: 2000, attack: 0.05, release: 0.2, volume: 0.8 },
          previewNote: "C4" },
      ],
    },
    {
      slug: "1-4-4",
      title: "Pluck vs Pad",
      exercises: [
        { id: "1-4.1-4-4.q1", type: "knob-tweak", prompt: "Make a pluck — short attack",
          param: "attack", target: 0.01, tolerance: 0.05,
          initialPatch: { waveform: "sawtooth", filterFreq: 3000, attack: 1.0, release: 0.4, volume: 0.8 },
          previewNote: "C4" },
        { id: "1-4.1-4-4.q2", type: "knob-tweak", prompt: "…and short release",
          param: "release", target: 0.2, tolerance: 0.1,
          initialPatch: { waveform: "sawtooth", filterFreq: 3000, attack: 0.01, release: 1.5, volume: 0.8 },
          previewNote: "C4" },
        { id: "1-4.1-4-4.q3", type: "ab-compare", prompt: "Which is the pluck?",
          a: { patch: { waveform: "sawtooth", filterFreq: 4000, attack: 0.01, release: 0.2, volume: 0.8 }, notes: ["C4"] },
          b: { patch: { waveform: "triangle", filterFreq: 2000, attack: 1.5, release: 2.0, volume: 0.8 }, notes: ["C4"] },
          correct: "a" },
        { id: "1-4.1-4-4.q4", type: "multi-choice", prompt: "A pad is…",
          question: "A pad sound has…",
          options: ["Short attack and short release",
                    "Slow attack and long release",
                    "Slow attack and short release",
                    "Fast attack and long release"],
          correctIndex: 1 },
      ],
    },
    {
      slug: "1-4-5",
      title: "Envelope Ear",
      exercises: [
        { id: "1-4.1-4-5.q1", type: "ab-compare", prompt: "Which has a slower attack?",
          a: { patch: { waveform: "triangle", filterFreq: 3000, attack: 0.05, release: 0.5, volume: 0.8 }, notes: ["C4"] },
          b: { patch: { waveform: "triangle", filterFreq: 3000, attack: 1.0, release: 0.5, volume: 0.8 }, notes: ["C4"] },
          correct: "b" },
        { id: "1-4.1-4-5.q2", type: "ab-compare", prompt: "Which has a longer release?",
          a: { patch: { waveform: "sawtooth", filterFreq: 4000, attack: 0.05, release: 0.2, volume: 0.8 }, notes: ["C4"] },
          b: { patch: { waveform: "sawtooth", filterFreq: 4000, attack: 0.05, release: 1.5, volume: 0.8 }, notes: ["C4"] },
          correct: "b" },
        { id: "1-4.1-4-5.q3", type: "ab-compare", prompt: "Which is plucky?",
          a: { patch: { waveform: "sawtooth", filterFreq: 4000, attack: 0.01, release: 0.2, volume: 0.8 }, notes: ["C4"] },
          b: { patch: { waveform: "triangle", filterFreq: 2000, attack: 0.8, release: 1.5, volume: 0.8 }, notes: ["C4"] },
          correct: "a" },
        { id: "1-4.1-4-5.q4", type: "play-melody", prompt: "Play C-E-G with a slow attack",
          patch: { waveform: "triangle", filterFreq: 3000, attack: 0.6, release: 1.0, volume: 0.7 },
          sequence: ["C4", "E4", "G4"] },
        { id: "1-4.1-4-5.q5", type: "multi-choice", prompt: "Long release sounds like…",
          question: "Holding a key with long release =",
          options: ["The note cuts immediately", "The note lingers and fades",
                    "The pitch drops", "Distortion"],
          correctIndex: 1 },
      ],
    },
  ],
};
```

- [ ] **Step 3: Register in `unit-1/index.ts`**

```ts
import type { Unit } from "../../types";
import { subLesson_1_1 } from "./1-1-what-is-sound";
import { subLesson_1_2 } from "./1-2-pitch-and-notes";
import { subLesson_1_3 } from "./1-3-oscillator";
import { subLesson_1_4 } from "./1-4-amp-envelope";

export const unit1: Unit = {
  slug: "unit-1",
  title: "Sound Foundations",
  blurb: "Sound, pitch, oscillator, filter, amp — everything you need to play Synth 1 Pro.",
  subLessons: [subLesson_1_1, subLesson_1_2, subLesson_1_3, subLesson_1_4],
};
```

- [ ] **Step 4: Type check + lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/lib/course/content/
git commit -m "feat(course): unit-1 content — 1-3 Oscillator, 1-4 Amp Envelope"
```

---

### Task 15: Unit 1 content — 1-5 Filter, 1-6 Polish, 1-7 Mastery

**Files:**
- Create: `src/lib/course/content/unit-1/1-5-filter.ts`
- Create: `src/lib/course/content/unit-1/1-6-polish.ts`
- Create: `src/lib/course/content/unit-1/1-7-mastery.ts`
- Modify: `src/lib/course/content/unit-1/index.ts`

- [ ] **Step 1: `1-5-filter.ts`**

```ts
import type { SubLesson } from "../../types";

export const subLesson_1_5: SubLesson = {
  slug: "1-5",
  title: "Filter",
  blurb: "Cutoff = brightness. Sculpt the tone.",
  lessons: [
    {
      slug: "1-5-1",
      title: "Filter = Tone Control",
      exercises: [
        { id: "1-5.1-5-1.q1", type: "concept-slide", prompt: "Filter sweeps cutoff",
          visual: "filter-sweep", caption: "A lowpass filter lets lows through and cuts highs above the cutoff." },
        { id: "1-5.1-5-1.q2", type: "tap-to-hear", prompt: "Saw with cutoff sweeping up",
          patch: { waveform: "sawtooth", filterFreq: 800, attack: 0.05, release: 1.0, volume: 0.8 },
          notes: ["C3"], caption: "Listen as harmonics open up." },
        { id: "1-5.1-5-1.q3", type: "multi-choice", prompt: "What does cutoff do?",
          question: "Lowering the cutoff frequency makes the sound…",
          options: ["Brighter", "Darker", "Louder", "Higher pitched"], correctIndex: 1 },
      ],
    },
    {
      slug: "1-5-2",
      title: "Cutoff = Brightness",
      exercises: [
        { id: "1-5.1-5-2.q1", type: "concept-slide", prompt: "Bright vs dark",
          visual: "filter-sweep", caption: "High cutoff = bright. Low cutoff = dark." },
        { id: "1-5.1-5-2.q2", type: "ab-compare", prompt: "Which is darker?",
          a: { patch: { waveform: "sawtooth", filterFreq: 600, attack: 0.05, release: 0.5, volume: 0.8 }, notes: ["C4"] },
          b: { patch: { waveform: "sawtooth", filterFreq: 6000, attack: 0.05, release: 0.5, volume: 0.8 }, notes: ["C4"] },
          correct: "a" },
        { id: "1-5.1-5-2.q3", type: "knob-tweak", prompt: "Set a low cutoff (~400 Hz) — make it dark",
          param: "filterFreq", target: 400, tolerance: 100,
          initialPatch: { waveform: "sawtooth", filterFreq: 5000, attack: 0.05, release: 0.5, volume: 0.8 },
          previewNote: "C4" },
        { id: "1-5.1-5-2.q4", type: "knob-tweak", prompt: "Set a high cutoff (~8000 Hz) — make it bright",
          param: "filterFreq", target: 8000, tolerance: 1500,
          initialPatch: { waveform: "sawtooth", filterFreq: 500, attack: 0.05, release: 0.5, volume: 0.8 },
          previewNote: "C4" },
      ],
    },
    {
      slug: "1-5-3",
      title: "Lowpass on Each Wave",
      exercises: [
        { id: "1-5.1-5-3.q1", type: "tap-to-hear", prompt: "Saw with cutoff at 800 Hz",
          patch: { waveform: "sawtooth", filterFreq: 800, attack: 0.05, release: 0.5, volume: 0.8 }, notes: ["C4"] },
        { id: "1-5.1-5-3.q2", type: "ab-compare", prompt: "Which is the saw filtered down?",
          a: { patch: { waveform: "sawtooth", filterFreq: 8000, attack: 0.05, release: 0.5, volume: 0.8 }, notes: ["C4"] },
          b: { patch: { waveform: "sawtooth", filterFreq: 600, attack: 0.05, release: 0.5, volume: 0.8 }, notes: ["C4"] },
          correct: "b" },
        { id: "1-5.1-5-3.q3", type: "ab-compare", prompt: "Which is the square filtered down?",
          a: { patch: { waveform: "square", filterFreq: 8000, attack: 0.05, release: 0.5, volume: 0.8 }, notes: ["C4"] },
          b: { patch: { waveform: "square", filterFreq: 500, attack: 0.05, release: 0.5, volume: 0.8 }, notes: ["C4"] },
          correct: "b" },
        { id: "1-5.1-5-3.q4", type: "multi-choice", prompt: "A heavily filtered saw sounds closest to…",
          question: "A saw with very low cutoff begins to sound like…",
          options: ["A square", "A sine", "A triangle", "A higher saw"],
          correctIndex: 1, explainer: "All the buzzy harmonics get cut, leaving mostly the fundamental." },
      ],
    },
    {
      slug: "1-5-4",
      title: "Make it Dark / Bright",
      exercises: [
        { id: "1-5.1-5-4.q1", type: "knob-tweak", prompt: "Make it dark — cutoff ~300 Hz",
          param: "filterFreq", target: 300, tolerance: 80,
          initialPatch: { waveform: "sawtooth", filterFreq: 5000, attack: 0.05, release: 0.5, volume: 0.8 },
          previewNote: "C4" },
        { id: "1-5.1-5-4.q2", type: "knob-tweak", prompt: "Make it bright — cutoff ~6000 Hz",
          param: "filterFreq", target: 6000, tolerance: 1200,
          initialPatch: { waveform: "sawtooth", filterFreq: 400, attack: 0.05, release: 0.5, volume: 0.8 },
          previewNote: "C4" },
        { id: "1-5.1-5-4.q3", type: "ab-compare", prompt: "Which is brighter?",
          a: { patch: { waveform: "sawtooth", filterFreq: 1500, attack: 0.05, release: 0.5, volume: 0.8 }, notes: ["C4"] },
          b: { patch: { waveform: "sawtooth", filterFreq: 5000, attack: 0.05, release: 0.5, volume: 0.8 }, notes: ["C4"] },
          correct: "b" },
        { id: "1-5.1-5-4.q4", type: "play-melody", prompt: "Play C-E-G with a filtered saw",
          patch: { waveform: "sawtooth", filterFreq: 1500, attack: 0.05, release: 0.5, volume: 0.8 },
          sequence: ["C4", "E4", "G4"] },
      ],
    },
    {
      slug: "1-5-5",
      title: "Filter Ear",
      exercises: [
        { id: "1-5.1-5-5.q1", type: "ab-compare", prompt: "Which is brighter?",
          a: { patch: { waveform: "sawtooth", filterFreq: 800, attack: 0.05, release: 0.5, volume: 0.8 }, notes: ["C4"] },
          b: { patch: { waveform: "sawtooth", filterFreq: 4000, attack: 0.05, release: 0.5, volume: 0.8 }, notes: ["C4"] },
          correct: "b" },
        { id: "1-5.1-5-5.q2", type: "ab-compare", prompt: "Which is darker?",
          a: { patch: { waveform: "square", filterFreq: 5000, attack: 0.05, release: 0.5, volume: 0.7 }, notes: ["C4"] },
          b: { patch: { waveform: "square", filterFreq: 800, attack: 0.05, release: 0.5, volume: 0.7 }, notes: ["C4"] },
          correct: "b" },
        { id: "1-5.1-5-5.q3", type: "ab-compare", prompt: "Which has more harmonics letting through?",
          a: { patch: { waveform: "sawtooth", filterFreq: 600, attack: 0.05, release: 0.5, volume: 0.8 }, notes: ["C4"] },
          b: { patch: { waveform: "sawtooth", filterFreq: 4500, attack: 0.05, release: 0.5, volume: 0.8 }, notes: ["C4"] },
          correct: "b" },
        { id: "1-5.1-5-5.q4", type: "multi-choice", prompt: "Cutoff frequency is measured in…",
          question: "Filter cutoff is in…",
          options: ["Decibels (dB)", "Hertz (Hz)", "Seconds (s)", "Cents"], correctIndex: 1 },
      ],
    },
  ],
};
```

- [ ] **Step 2: `1-6-polish.ts`**

```ts
import type { SubLesson } from "../../types";

export const subLesson_1_6: SubLesson = {
  slug: "1-6",
  title: "Polish",
  blurb: "Volume, reverb, sustain, octave — the small stuff that matters.",
  lessons: [
    {
      slug: "1-6-1",
      title: "Volume",
      exercises: [
        { id: "1-6.1-6-1.q1", type: "concept-slide", prompt: "Master volume",
          visual: "amplitude-vs-frequency", caption: "How loud the synth comes out overall." },
        { id: "1-6.1-6-1.q2", type: "knob-tweak", prompt: "Set a moderate volume (~0.5)",
          param: "volume", target: 0.5, tolerance: 0.08,
          initialPatch: { waveform: "sawtooth", filterFreq: 4000, attack: 0.05, release: 0.5, volume: 0.1 },
          previewNote: "C4" },
        { id: "1-6.1-6-1.q3", type: "knob-tweak", prompt: "Set a louder volume (~0.9)",
          param: "volume", target: 0.9, tolerance: 0.08,
          initialPatch: { waveform: "sawtooth", filterFreq: 4000, attack: 0.05, release: 0.5, volume: 0.2 },
          previewNote: "C4" },
        { id: "1-6.1-6-1.q4", type: "multi-choice", prompt: "Volume controls…",
          question: "Master volume affects…",
          options: ["Pitch", "Output amplitude", "Filter cutoff", "Attack time"],
          correctIndex: 1 },
      ],
    },
    {
      slug: "1-6-2",
      title: "Reverb On / Off",
      exercises: [
        { id: "1-6.1-6-2.q1", type: "concept-slide", prompt: "Reverb adds space",
          visual: "envelope-shape", caption: "Reverb simulates the sound bouncing around a room." },
        { id: "1-6.1-6-2.q2", type: "ab-compare", prompt: "Which has reverb?",
          a: { patch: { waveform: "triangle", filterFreq: 3000, attack: 0.05, release: 0.5, volume: 0.7, reverb: false }, notes: ["C4"] },
          b: { patch: { waveform: "triangle", filterFreq: 3000, attack: 0.05, release: 0.5, volume: 0.7, reverb: true }, notes: ["C4"] },
          correct: "b" },
        { id: "1-6.1-6-2.q3", type: "multi-choice", prompt: "Reverb makes a sound feel…",
          question: "What does reverb add?",
          options: ["More bass", "A sense of space / room", "Faster attack", "Higher pitch"],
          correctIndex: 1 },
      ],
    },
    {
      slug: "1-6-3",
      title: "Sustain Pedal",
      exercises: [
        { id: "1-6.1-6-3.q1", type: "concept-slide", prompt: "Sustain holds notes after you let go",
          visual: "envelope-shape", caption: "A sustain pedal keeps notes ringing even after you lift your finger." },
        { id: "1-6.1-6-3.q2", type: "play-melody", prompt: "Play C-E-G with a long release (sustain feel)",
          patch: { waveform: "triangle", filterFreq: 3000, attack: 0.05, release: 2.0, volume: 0.7 },
          sequence: ["C4", "E4", "G4"] },
        { id: "1-6.1-6-3.q3", type: "play-melody", prompt: "Play C-E-G short and snappy (no sustain)",
          patch: { waveform: "sawtooth", filterFreq: 4000, attack: 0.01, release: 0.1, volume: 0.7 },
          sequence: ["C4", "E4", "G4"] },
        { id: "1-6.1-6-3.q4", type: "multi-choice", prompt: "Sustain pedal effect:",
          question: "When sustain is on…",
          options: ["Notes cut off immediately", "Notes ring even after you release them",
                    "The pitch drops", "Volume goes up"],
          correctIndex: 1 },
      ],
    },
    {
      slug: "1-6-4",
      title: "Octave Shift",
      exercises: [
        { id: "1-6.1-6-4.q1", type: "concept-slide", prompt: "Octave shift moves the keyboard",
          visual: "octave-keyboard", caption: "Same note names, different range." },
        { id: "1-6.1-6-4.q2", type: "ab-compare", prompt: "Which is the higher octave?",
          a: { patch: { waveform: "triangle", filterFreq: 4000, volume: 0.7 }, notes: ["C3"] },
          b: { patch: { waveform: "triangle", filterFreq: 4000, volume: 0.7 }, notes: ["C5"] },
          correct: "b" },
        { id: "1-6.1-6-4.q3", type: "play-melody", prompt: "Play C across octaves",
          patch: { waveform: "triangle", filterFreq: 4000, volume: 0.7 },
          sequence: ["C3", "C4", "C5"] },
      ],
    },
  ],
};
```

- [ ] **Step 3: `1-7-mastery.ts`**

```ts
import type { SubLesson } from "../../types";

export const subLesson_1_7: SubLesson = {
  slug: "1-7",
  title: "Synth 1 Pro Mastery",
  blurb: "Recreate iconic sounds, then play freely.",
  lessons: [
    {
      slug: "1-7-1",
      title: "Recreate a Pluck",
      exercises: [
        { id: "1-7.1-7-1.q1", type: "knob-tweak", prompt: "Cutoff ~2000 Hz",
          param: "filterFreq", target: 2000, tolerance: 400,
          initialPatch: { waveform: "sawtooth", filterFreq: 8000, attack: 1.0, release: 1.0, volume: 0.8 },
          previewNote: "C4" },
        { id: "1-7.1-7-1.q2", type: "knob-tweak", prompt: "Fast attack (0.01 s)",
          param: "attack", target: 0.01, tolerance: 0.05,
          initialPatch: { waveform: "sawtooth", filterFreq: 2000, attack: 1.0, release: 1.0, volume: 0.8 },
          previewNote: "C4" },
        { id: "1-7.1-7-1.q3", type: "knob-tweak", prompt: "Short release (~0.3 s)",
          param: "release", target: 0.3, tolerance: 0.15,
          initialPatch: { waveform: "sawtooth", filterFreq: 2000, attack: 0.01, release: 1.5, volume: 0.8 },
          previewNote: "C4" },
        { id: "1-7.1-7-1.q4", type: "play-melody", prompt: "Play your pluck: C-E-G",
          patch: { waveform: "sawtooth", filterFreq: 2000, attack: 0.01, release: 0.3, volume: 0.8 },
          sequence: ["C4", "E4", "G4"] },
      ],
    },
    {
      slug: "1-7-2",
      title: "Recreate a Pad",
      exercises: [
        { id: "1-7.1-7-2.q1", type: "knob-tweak", prompt: "Cutoff ~1500 Hz",
          param: "filterFreq", target: 1500, tolerance: 350,
          initialPatch: { waveform: "triangle", filterFreq: 5000, attack: 0.01, release: 0.5, volume: 0.7 },
          previewNote: "C4" },
        { id: "1-7.1-7-2.q2", type: "knob-tweak", prompt: "Slow attack (~1.5 s)",
          param: "attack", target: 1.5, tolerance: 0.4,
          initialPatch: { waveform: "triangle", filterFreq: 1500, attack: 0.01, release: 0.5, volume: 0.7 },
          previewNote: "C4" },
        { id: "1-7.1-7-2.q3", type: "knob-tweak", prompt: "Long release (~2 s)",
          param: "release", target: 2.0, tolerance: 0.4,
          initialPatch: { waveform: "triangle", filterFreq: 1500, attack: 1.5, release: 0.2, volume: 0.7 },
          previewNote: "C4" },
        { id: "1-7.1-7-2.q4", type: "play-melody", prompt: "Play your pad: C-E-G",
          patch: { waveform: "triangle", filterFreq: 1500, attack: 1.5, release: 2.0, volume: 0.7, reverb: true },
          sequence: ["C4", "E4", "G4"] },
      ],
    },
    {
      slug: "1-7-3",
      title: "Recreate a Lead",
      exercises: [
        { id: "1-7.1-7-3.q1", type: "knob-tweak", prompt: "Cutoff ~4000 Hz",
          param: "filterFreq", target: 4000, tolerance: 700,
          initialPatch: { waveform: "square", filterFreq: 1000, attack: 0.05, release: 0.4, volume: 0.7 },
          previewNote: "C4" },
        { id: "1-7.1-7-3.q2", type: "knob-tweak", prompt: "Quick attack (0.05 s)",
          param: "attack", target: 0.05, tolerance: 0.05,
          initialPatch: { waveform: "square", filterFreq: 4000, attack: 1.0, release: 0.4, volume: 0.7 },
          previewNote: "C4" },
        { id: "1-7.1-7-3.q3", type: "knob-tweak", prompt: "Medium release (~0.4 s)",
          param: "release", target: 0.4, tolerance: 0.15,
          initialPatch: { waveform: "square", filterFreq: 4000, attack: 0.05, release: 1.5, volume: 0.7 },
          previewNote: "C4" },
        { id: "1-7.1-7-3.q4", type: "play-melody", prompt: "Play your lead: C-E-G-A",
          patch: { waveform: "square", filterFreq: 4000, attack: 0.05, release: 0.4, volume: 0.7 },
          sequence: ["C4", "E4", "G4", "A4"] },
      ],
    },
    {
      slug: "1-7-4",
      title: "Free Sound Design",
      exercises: [
        { id: "1-7.1-7-4.q1", type: "free-play", prompt: "Design any sound, then play a tune",
          durationS: 60, caption: "60 seconds. Try every knob." },
      ],
    },
    {
      slug: "1-7-5",
      title: "Free Play",
      exercises: [
        { id: "1-7.1-7-5.q1", type: "free-play", prompt: "Go wild — no timer, no goal",
          caption: "You've earned this." },
      ],
    },
  ],
};
```

- [ ] **Step 4: Final unit-1 registry**

```ts
// src/lib/course/content/unit-1/index.ts
import type { Unit } from "../../types";
import { subLesson_1_1 } from "./1-1-what-is-sound";
import { subLesson_1_2 } from "./1-2-pitch-and-notes";
import { subLesson_1_3 } from "./1-3-oscillator";
import { subLesson_1_4 } from "./1-4-amp-envelope";
import { subLesson_1_5 } from "./1-5-filter";
import { subLesson_1_6 } from "./1-6-polish";
import { subLesson_1_7 } from "./1-7-mastery";

export const unit1: Unit = {
  slug: "unit-1",
  title: "Sound Foundations",
  blurb: "Sound, pitch, oscillator, filter, amp — everything you need to play Synth 1 Pro.",
  subLessons: [
    subLesson_1_1, subLesson_1_2, subLesson_1_3, subLesson_1_4,
    subLesson_1_5, subLesson_1_6, subLesson_1_7,
  ],
};
```

- [ ] **Step 5: Type check + lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/lib/course/content/
git commit -m "feat(course): unit-1 content — 1-5 Filter, 1-6 Polish, 1-7 Mastery"
```

---

### Task 16: Cleanup legacy `/learn` artifacts

**Files (delete):**
- `src/app/(main)/learn/[synthSlug]/` (whole dir)
- `src/components/learn/pathway-map.tsx`
- `src/components/learn/exercise-player.tsx`
- `src/components/learn/xp-reward-modal.tsx`
- `src/components/learn/exercises/` (whole dir)
- `src/lib/lessons/` (whole dir)
- `src/app/api/progress/complete-lesson/route.ts`

- [ ] **Step 1: Search for stale imports**

```bash
grep -RIn --include="*.tsx" --include="*.ts" "from \"@/components/learn" src/ | grep -v "components/course"
grep -RIn --include="*.tsx" --include="*.ts" "from \"@/lib/lessons" src/
grep -RIn --include="*.tsx" --include="*.ts" "/api/progress/complete-lesson" src/
```

Expected: any matches must be inside the files about to be deleted (Step 2). If matches appear in unrelated files (sidebar, dashboard), update them to remove the dead reference.

- [ ] **Step 2: Delete legacy files**

```bash
rm -rf src/app/\(main\)/learn/\[synthSlug\]
rm src/components/learn/pathway-map.tsx
rm src/components/learn/exercise-player.tsx
rm src/components/learn/xp-reward-modal.tsx
rm -rf src/components/learn/exercises
rm -rf src/lib/lessons
rm -rf src/app/api/progress
```

If `src/components/learn/` is now empty, delete it too:

```bash
rmdir src/components/learn 2>/dev/null || true
```

- [ ] **Step 3: Mark legacy types in `src/lib/supabase/types.ts`**

Open `src/lib/supabase/types.ts`. Above the `Lesson`, `Exercise`, and `UserLessonProgress` row types, add:

```ts
// LEGACY: pre-static-content lesson schema. Not used by new course flow.
// Kept until DB migration drops these tables. Do NOT import in new code.
```

- [ ] **Step 4: Type check + lint**

```bash
npx tsc --noEmit && npm run lint
```

If failures appear, they will identify additional places (sidebar, dashboard, leaderboard) referencing removed XP / progress APIs. For each, replace the reference with `null` or remove the affected JSX block. Only add `// TODO: legacy XP removed` if the block must remain visually placeholder; otherwise delete the dead UI.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(learn): remove legacy XP/streak lesson flow"
```

---

### Task 17: Final smoke + verification

**Files:** none (verification only)

- [ ] **Step 1: Type + lint clean**

```bash
npx tsc --noEmit && npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 2: Dev server smoke**

```bash
npm run dev
```

In a phone-sized viewport (DevTools → 360×740 or 390×844):

1. Visit `/learn` → see "Sound Foundations" unit card.
2. Click → see 7 sub-lesson cards, sub-lesson 1-1 unlocked, others locked with "Complete previous sub-lesson".
3. Click sub-lesson 1-1 → see snake pathway with 5 nodes (4 lessons + 1 mixed test). First node available, others locked. Test node has crossed-swords icon.
4. Click first lesson → fullscreen player, progress bar 0/4 (or N), CONTINUE button bottom.
5. Walk all 4 exercises in 1-1-1; on the multi-choice intentionally pick a wrong option → red flash + explainer; CONTINUE advances.
6. Last exercise → "Lesson complete" panel → land on pathway with first node green.
7. Repeat for 1-1-2, 1-1-3, 1-1-4. After 1-1-4, the test node becomes available.
8. Tap test node → mixed test renders 8 active exercises drawn from 1-1.
9. Complete test → land back at sub-lesson page, all nodes green; sub-lesson 1-2 now unlocked on unit page.
10. Verify localStorage: open DevTools → Application → Local Storage → `osciscoops:progress` exists with completedLessons and (optionally) mistakes entries.
11. In sub-lesson 1-3, intentionally fail one waveform-pick. Walk on to sub-lesson 1-4. Tap 1-4 mixed test → confirm one of the 8 questions is the failed waveform-pick from 1-3.
12. In the test, answer that 1-3 question correctly. Continue to 1-5 mixed test → fail it again. The mistake should still be in pool. In 1-6 test, answer correctly twice — confirm in DevTools that `mistakes["..."]` was removed.
13. Visit `/learn/unit-1/1-7` → free-play lesson 1-7-5 embeds Synth 1 Pro inline; keyboard plays.
14. Touch targets: every button and pathway node ≥ 44×44 px on the phone viewport.
15. Reload the browser mid-pathway → progress survives.
16. Mid-lesson reload → progress for that lesson does NOT persist; lesson is replayed from exercise 0.
17. Open DevTools → Application → Local Storage → delete `osciscoops:progress` → reload `/learn/unit-1` → only sub-lesson 1-1 unlocked again.

- [ ] **Step 3: Existing routes still work**

Visit each:
- `/temp-synths/1-pro` — Synth 1 Pro standalone — keyboard + knobs work.
- `/temp-synths/2-pro`, `/temp-synths/3-pro` — unaffected.
- `/dashboard`, `/profile`, `/collection` — render without crashing (may show stale or empty XP fields; out of scope per spec).

- [ ] **Step 4: No new console errors**

In DevTools console, walking through `/learn` and one full sub-lesson should produce zero errors. Warnings about React DevTools are fine.

- [ ] **Step 5: Final commit (if any cleanup happened)**

```bash
git status   # should be clean
```

If clean, no commit needed. If you fixed any straggling issues during smoke testing, group them in a single `fix(course): smoke test cleanups` commit.

---

## Self-Review checklist (already applied)

- ✅ Spec coverage: every section in design spec maps to a task here. Routes (Tasks 11–12), data model (1), progress + mistakes (2), audio (3), concept visuals (4), exercises (5–7), lesson player (9), pathway (10), content (13–15), cleanup (16), acceptance (17).
- ✅ Type consistency: `Exercise`, `Lesson`, `SubLesson`, `Unit`, `MistakeStat`, `Progress`, `PatchPreset`, `ConceptVisualKey` named identically across files. `CourseAudioEngine` static methods match between definition (Task 3) and consumers (Tasks 5, 6, 7).
- ✅ No placeholders: every code step is complete.
- ✅ Lesson IDs: format `{subSlug}.{lessonSlug}` consistent in storage; mixed-test IDs use `{subSlug}.test`. Exercise IDs follow `{subSlug}.{lessonSlug}.q{n}`.
- ✅ Routes match Next.js 16 conventions: `params` is awaited.

## Out-of-scope flags

- DB migration to drop legacy tables — separate PR.
- Profile/dashboard/leaderboard pages reading `profiles.xp` — left untouched, may show empty values.
- Sound design "creative grading" in 1.7 free-play — not implemented, just times out.
- Cross-device progress sync.
