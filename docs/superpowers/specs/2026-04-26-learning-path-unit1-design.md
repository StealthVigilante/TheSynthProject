# Learning Path — Unit 1 Design

**Date:** 2026-04-26
**Status:** Approved (awaiting user spec review)
**Replaces:** existing `/learn` flow (XP/streak/DB-driven)

## Goal

Redesign the Osciscoops learning path with a Duolingo-style hierarchy, no XP/streak mechanic for now. Focus on course content: foundational sound concepts, oscillator/filter/amp triad, building toward full mastery of Synth 1 Pro by the end of Unit 1. Phone-first UI, animations to explain concepts, active learning + mixed-test sessions with mistake remixing.

This spec covers Unit 1 only. Future units follow the same pattern.

---

## 1. Architecture

### Hierarchy (4 levels)

```
Course
└── Unit (e.g., "Sound Foundations")
    └── Sub-lesson (e.g., "What is Sound")
        └── Pathway (visual snake of lesson nodes)
            └── Lesson (4–6 exercises)
```

Each sub-lesson ends with an auto-generated **Mixed Test** node that replays current sub-lesson content + earlier-sub-lesson mistakes.

### Routes

```
/learn                                              → unit list
/learn/[unitSlug]                                   → sub-lesson list for unit
/learn/[unitSlug]/[subLessonSlug]                   → snake pathway of lessons
/learn/[unitSlug]/[subLessonSlug]/[lessonSlug]      → fullscreen exercise player
```

Lesson player has its own minimal `layout.tsx` that overrides `(main)` and removes the sidebar (fullscreen takeover).

### File layout

```
src/app/(main)/learn/
├── page.tsx                                              # unit list
├── [unitSlug]/page.tsx                                   # sub-lesson grid
├── [unitSlug]/[subLessonSlug]/page.tsx                   # snake pathway
└── [unitSlug]/[subLessonSlug]/[lessonSlug]/
    ├── layout.tsx                                        # fullscreen, no sidebar
    └── page.tsx                                          # exercise player

src/lib/course/
├── content/
│   ├── unit-1/
│   │   ├── 1-1-what-is-sound.ts
│   │   ├── 1-2-pitch-and-notes.ts
│   │   ├── 1-3-oscillator.ts
│   │   ├── 1-4-amp-envelope.ts
│   │   ├── 1-5-filter.ts
│   │   ├── 1-6-polish.ts
│   │   └── 1-7-mastery.ts
│   └── index.ts                                          # unit registry
├── types.ts                                              # Unit/SubLesson/Lesson/Exercise
├── progress.ts                                           # localStorage read/write
├── mistake-pool.ts                                       # mistake tracking + test gen
└── audio.ts                                              # CourseAudioEngine

src/components/course/
├── snake-pathway.tsx                                     # SVG curved path + nodes
├── unit-card.tsx
├── sub-lesson-card.tsx
├── lesson-node.tsx
├── lesson-player.tsx                                     # fullscreen container, transitions
├── exercises/
│   ├── concept-slide.tsx
│   ├── tap-to-hear.tsx
│   ├── ab-compare.tsx
│   ├── waveform-pick.tsx
│   ├── knob-tweak.tsx
│   ├── multi-choice.tsx
│   ├── play-melody.tsx
│   └── free-play.tsx
└── concept-visuals/
    ├── vibrating-string.tsx
    ├── waveform-morph.tsx
    ├── filter-sweep.tsx
    ├── envelope-shape.tsx
    ├── octave-keyboard.tsx
    └── amplitude-vs-frequency.tsx
```

### Tech

- **Storage:** static TS content files; progress in `localStorage` under key `osciscoops:progress`.
- **Animation:** Framer Motion for screen/UI transitions; SVG (preferred) and Canvas for concept visuals.
- **Audio:** `CourseAudioEngine` thin wrapper over the existing `StarterProEngine` (AudioWorklet at `/worklets/starter-pro-processor.js`). Lazy worklet load on first user gesture, matching existing `AudioProvider` pattern.
- **Styling:** Tailwind v4 + existing CSS variables. Phone-first, dark theme, ≥44×44 tap targets.

---

## 2. Content data model

```ts
// src/lib/course/types.ts

export type Waveform = "sine" | "square" | "triangle" | "sawtooth";
export type Note = string; // e.g. "C4", "F#3"

export interface PatchPreset {
  waveform?: Waveform;
  filterFreq?: number;   // Hz
  attack?: number;       // s
  release?: number;      // s
  reverb?: boolean;
  volume?: number;       // 0..1
}

interface ExerciseBase {
  id: string;            // stable id, e.g. "1.3.1.q2" — used for mistake tracking
  prompt: string;
}

export type Exercise =
  | (ExerciseBase & {
      type: "concept-slide";
      visual: ConceptVisualKey;
      caption: string;
      audio?: { patch: PatchPreset; notes?: Note[] };
    })
  | (ExerciseBase & {
      type: "tap-to-hear";
      patch: PatchPreset;
      notes: Note[];
      caption?: string;
    })
  | (ExerciseBase & {
      type: "ab-compare";
      a: { patch: PatchPreset; notes: Note[]; label?: string };
      b: { patch: PatchPreset; notes: Note[]; label?: string };
      correct: "a" | "b";
      explainer?: string;
    })
  | (ExerciseBase & {
      type: "waveform-pick";
      shape: Waveform;
      options: Waveform[];
    })
  | (ExerciseBase & {
      type: "knob-tweak";
      param: "filterFreq" | "attack" | "release" | "volume";
      target: number;
      tolerance: number;
      initialPatch: PatchPreset;
      previewNote?: Note;
    })
  | (ExerciseBase & {
      type: "multi-choice";
      question: string;
      options: string[];
      correctIndex: number;
      explainer?: string;
    })
  | (ExerciseBase & {
      type: "play-melody";
      patch: PatchPreset;
      sequence: Note[];
      hint?: string;
    })
  | (ExerciseBase & {
      type: "free-play";
      patch?: PatchPreset;
      durationS?: number;
      caption?: string;
    });

export type ConceptVisualKey =
  | "vibrating-string"
  | "waveform-morph"
  | "filter-sweep"
  | "envelope-shape"
  | "octave-keyboard"
  | "amplitude-vs-frequency";

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

The mixed-test node is **synthesized at runtime** by `mistake-pool.ts` — never authored as static content. Test node `slug` = `"{subSlug}.test"`.

### Progress shape (localStorage)

```ts
interface Progress {
  completedLessons: string[];                  // e.g., ["1.1.1", "1.1.test"]
  mistakes: Record<string, MistakeStat>;       // keyed by exercise id
  lastUpdatedAt: number;
}
interface MistakeStat {
  wrongCount: number;
  correctSinceWrong: number;
  subLessonSlug: string;
  exerciseSnapshot: Exercise;                  // pinned copy in case content changes
}
```

---

## 3. Unit 1 content map

7 sub-lessons. Each lesson is 4–6 exercises mixing concept slides + active types. Final lesson per sub-lesson is the auto-generated Mixed Test (8 questions; 10 for the unit-1 capstone).

### 1.1 What is Sound (4 lessons + test)
- **1.1.1 Sound is Vibration** — concept(vibrating-string) → tap-to-hear(440 Hz sine) → ab-compare(silence vs tone) → multi-choice("what makes sound?")
- **1.1.2 Frequency = Pitch** — concept(amplitude-vs-frequency) → ab-compare(220 Hz vs 880 Hz) → multi-choice → tap-to-hear(slow sweep)
- **1.1.3 Amplitude = Loudness** — concept(amplitude-vs-frequency, focus amp) → ab-compare(quiet vs loud) → knob-tweak(volume → 0.7) → multi-choice
- **1.1.4 Timbre Tease** — ab-compare(sine vs saw, same pitch) → concept(waveform-morph preview) → multi-choice
- **1.1.test Mixed test**

### 1.2 Pitch & Notes (4 lessons + test)
- **1.2.1 Notes on a Keyboard** — concept(octave-keyboard) → tap-to-hear(C major scale) → multi-choice("which key is C?")
- **1.2.2 Octaves** — concept(octave doubling) → ab-compare(C3 vs C4) → play-melody([C3,C4]) → multi-choice
- **1.2.3 Sharps & Flats** — concept(black keys) → multi-choice → ab-compare(C vs C#)
- **1.2.4 Play a Tune** — play-melody([C,D,E,F,G]) → play-melody([G,F,E,D,C]) → free-play(30 s, "find your own pattern")
- **1.2.test Mixed test**

### 1.3 Oscillator (5 lessons + test)
- **1.3.1 Sine = Pure** — concept(waveform-morph→sine) → tap-to-hear → waveform-pick(sine) → multi-choice
- **1.3.2 Sawtooth = Bright/Buzzy** — concept(waveform-morph→saw) → tap-to-hear → ab-compare(sine vs saw) → waveform-pick(saw)
- **1.3.3 Square = Hollow** — concept(waveform-morph→square) → tap-to-hear → ab-compare(saw vs square) → waveform-pick(square) → multi-choice
- **1.3.4 Triangle = Mellow** — concept → tap-to-hear → 4-way ab-compare → waveform-pick(triangle)
- **1.3.5 Pick the Wave** — waveform-pick × 3 → ab-compare → multi-choice
- **1.3.test Mixed test**

### 1.4 Amp Envelope (5 lessons + test)
- **1.4.1 Notes Have Shape** — concept(envelope-shape) → tap-to-hear(plucky vs pad) → multi-choice
- **1.4.2 Attack** — concept(focus on attack) → ab-compare(fast vs slow attack) → knob-tweak(attack=0.01) → knob-tweak(attack=2.0)
- **1.4.3 Release** — concept(focus on release) → ab-compare(short vs long release) → knob-tweak(release=0.1) → knob-tweak(release=2.5)
- **1.4.4 Pluck vs Pad** — knob-tweak("make a pluck": attack=0.01, release=0.2) → knob-tweak("make a pad": attack=1.5, release=2.0) → ab-compare → multi-choice
- **1.4.5 Envelope Ear** — ab-compare × 3 → play-melody(slow attack, holds) → multi-choice
- **1.4.test Mixed test**

### 1.5 Filter (5 lessons + test)
- **1.5.1 Filter = Tone Control** — concept(filter-sweep) → tap-to-hear(saw with auto cutoff sweep) → multi-choice
- **1.5.2 Cutoff = Brightness** — concept(filter-sweep, freeze frames) → ab-compare(low cutoff vs high) → knob-tweak(filterFreq=400) → knob-tweak(filterFreq=8000)
- **1.5.3 Lowpass on Each Wave** — tap-to-hear(saw filtered) → ab-compare(saw open vs filtered) → ab-compare(square open vs filtered) → multi-choice
- **1.5.4 Make it Dark / Bright** — knob-tweak("dark": 300 Hz) → knob-tweak("bright": 6000 Hz) → ab-compare → play-melody(filtered)
- **1.5.5 Filter Ear** — ab-compare × 3 → multi-choice × 2
- **1.5.test Mixed test**

### 1.6 Polish (4 lessons + test)
- **1.6.1 Volume** — concept(amplitude-vs-frequency revisit) → knob-tweak(volume=0.5) → knob-tweak(volume=0.9) → multi-choice
- **1.6.2 Reverb On/Off** — concept-slide(reverb intro) → ab-compare(dry vs wet) → multi-choice
- **1.6.3 Sustain Pedal** — concept-slide(sustain explained) → play-melody(sustain on) → play-melody(staccato, sustain off) → multi-choice
- **1.6.4 Octave Shift** — concept-slide(octave shift) → ab-compare(low oct vs high oct) → play-melody(across octaves)
- **1.6.test Mixed test**

### 1.7 Synth 1 Pro Mastery (5 lessons + final test)
- **1.7.1 Recreate a Pluck** — chained knob-tweak: waveform=saw, filterFreq=2000, attack=0.01, release=0.3 → play-melody
- **1.7.2 Recreate a Pad** — chained knob-tweak: waveform=triangle, filterFreq=1500, attack=1.5, release=2.0, reverb=on → play-melody
- **1.7.3 Recreate a Lead** — chained knob-tweak: waveform=square, filterFreq=4000, attack=0.05, release=0.4 → play-melody
- **1.7.4 Free Sound Design** — free-play(60 s, "design any sound, then play a tune")
- **1.7.5 Free Play** — free-play(unlimited)
- **1.7.test Final mixed test** (10 q's: 50% from 1.7 + 50% from all earlier mistakes, capped at 6)

**Totals:** 7 sub-lessons, ~32 authored lessons + 7 generated tests = ~39 lesson nodes; ~150 authored exercises.

---

## 4. Concept visuals + animations

### Concept components

| Key | What it shows | Tech | Sound? |
|---|---|---|---|
| `vibrating-string` | Horizontal string oscillates; faster = higher pitch | SVG path morph (`motion.path` `d` interpolation) | tap → 220 Hz sweep to 880 Hz |
| `amplitude-vs-frequency` | Two side-by-side waves; one tall/short, one fast/slow | SVG, animated `pathLength` + scale | tap each individually |
| `waveform-morph` | One waveform morphing sine→tri→sq→saw on cycle (or focused) | Canvas, ~30 fps procedural | tap → hear current shape |
| `octave-keyboard` | Mini keyboard with octave highlighting + doubling viz | SVG keys + Framer Motion | tap to hear notes |
| `envelope-shape` | A/H/R curve drawn live; ball traces position as note triggers | Canvas + `requestAnimationFrame` | tap to trigger |
| `filter-sweep` | FFT-style spectrum bars chopped by moving cutoff line | Canvas reading `getFFT()` | continuous saw, sweep cutoff |

### Framer Motion patterns

- **Lesson screen transitions:** `AnimatePresence` + `motion.div` x-slide on Continue/Check.
- **Progress bar:** `motion.div` width with `spring` stiffness 200.
- **Correct/wrong feedback:** answer card scales 1 → 1.03 → 1, color flip green/red.
- **Continue button:** disabled state pulses when answer locked in.
- **Pathway entrance:** nodes stagger-fade-in (`whileInView`, delay = i × 0.05).
- **Active node:** subtle floating loop (`animate y: [-4, 4, -4]`, repeat).

### `CourseAudioEngine` API

```ts
class CourseAudioEngine {
  static start(): Promise<void>      // lazy worklet init on first gesture
  setPatch(patch: PatchPreset): void
  playNote(note: Note, durationMs?: number): void
  playSequence(notes: Note[], gapMs: number): void
  stopAll(): void
  getFFT(): Float32Array
  getWaveform(): Float32Array
}
```

Wraps `StarterProEngine` from `src/app/temp-synths/1-pro/engine.ts`; exposes a small higher-level API for exercises.

---

## 5. Progress + mistake pool

### `progress.ts`

```ts
loadProgress(): Progress
saveProgress(p: Progress): void
markLessonComplete(lessonId: string): void
recordExerciseAttempt(ex: Exercise, subLessonSlug: string, correct: boolean): void
isLessonAvailable(lessonId: string): boolean      // sequential gate within sub-lesson
isSubLessonAvailable(subSlug: string): boolean    // gated by prior sub-lesson's test
resetProgress(): void
```

**Sequential gating:** lesson N inside a sub-lesson unlocks when lesson N-1 is complete. Sub-lesson N+1 unlocks when sub-lesson N's test (`{N}.test`) is complete. Completed lessons remain replayable.

### `mistake-pool.ts`

```ts
generateMixedTest(currentSubSlug: string, allUnitSubLessons: SubLesson[]): Lesson
```

Algorithm:

1. **Current pool:** flatten all exercises in current sub-lesson's lessons. Filter to active types (drop `concept-slide`, `tap-to-hear`, `free-play`).
2. **Past mistake pool:** all entries in `Progress.mistakes` where `subLessonSlug !== currentSubSlug` (entries are auto-removed at 2 correct in a row, so anything still in `mistakes` is "active"). Cap at 6, sorted by recency-of-last-wrong.
3. **Pick:** `floor(0.6 × 8) = 5` from current (random shuffle), `min(3, pastPool.length)` from past mistakes. If past < 3, top up from current.
4. Shuffle final list.
5. Return as a virtual `Lesson` with `slug = "{subSlug}.test"`, `title = "Mixed Test"`, exercises = picked items.

**On test attempt:**
- Past-mistake item answered correctly → `correctSinceWrong++`. At 2 → drop entry from `mistakes`.
- Past-mistake item answered wrong → `correctSinceWrong = 0`, `wrongCount++`.
- Current-pool item answered wrong during test → adds new entry to `mistakes` keyed by current sub-lesson.

**Pass criteria:** complete all questions. No correctness threshold for unit 1. Test completion marks `lessonId = "{subSlug}.test"` complete → unlocks next sub-lesson.

### Final unit-1 test (1.7.test)

Same algorithm with overrides: `currentSubSlug = "1.7"`, past pool draws from **all of unit 1** (no recency filter), cap raised to 6, ratio 50/50, total = 10 questions.

---

## 6. UX flow + edge cases

### Lesson player flow

```
[Enter lesson]
  → exercise[0] renders
  → user interacts → CHECK (active) or CONTINUE (passive)
  → if active + wrong: red flash + explainer + secondary CONTINUE
  → if active + right: green flash, auto-advance after 600 ms (or CONTINUE)
  → progress bar updates
  → motion x-slide to exercise[1]
  …
  → after last exercise: full-screen "Lesson complete" panel (1.5 s) → push back to pathway
```

Per-exercise state machine: `idle → answered(correct|wrong) → revealed → next`. Passive types: `idle → next`.

### Audio init

- First user gesture in any lesson triggers `CourseAudioEngine.start()`.
- Until ready: passive types render but show "Tap to hear" disabled; active sound types show "Loading…".
- Lesson 1.7.5 free-play: embed Synth 1 Pro UI inline. Refactor `Synth1ProPage` (currently default-exporting from `src/app/temp-synths/1-pro/page.tsx`) to extract the synth component (`<Synth1Pro embedded />`) and reuse it in the lesson player. Original temp route keeps working by rendering `<Synth1Pro />`.

### Mid-lesson exit

Top-left × button → confirm modal "Quit lesson? Progress in this lesson resets." → back to pathway. Sub-lesson-level progress is unaffected (only completed lessons stick).

### Edge cases

- **Empty mistake pool** (first sub-lesson): test = 8 from current sub-lesson only.
- **localStorage unavailable / cleared:** progress resets silently; lesson 1.1.1 available.
- **Browser back during lesson:** treat as exit (no save mid-lesson).
- **Engine init failure:** lesson player shows fallback "Audio unavailable" overlay; concept-slide-only lessons still work.
- **Knob-tweak tolerance:** ±15% relative for cutoff/freq, ±0.05 absolute for volume/attack/release.
- **Play-melody timing:** order matters; timing forgiving (no rhythm grading); accept any note-on within sequence within 8 s.

---

## 7. Deletion + migration

### Files removed

```
src/app/(main)/learn/[synthSlug]/page.tsx
src/app/(main)/learn/[synthSlug]/[lessonSlug]/page.tsx     (if exists)
src/components/learn/pathway-map.tsx
src/components/learn/exercise-player.tsx
src/components/learn/xp-reward-modal.tsx
src/components/learn/exercises/                            (whole dir)
src/lib/lessons/                                           (whole dir)
src/app/api/progress/complete-lesson/route.ts
```

### Files replaced

```
src/app/(main)/learn/page.tsx        # was: synth picker by category — now: unit list
```

### Supabase

- No DB migration this PR. Tables `lessons`, `exercises`, `user_lesson_progress`, `user_synths`, RPC `complete_lesson` left in place but unused by new code. Future PR can drop them once content is stable.
- Existing migrations untouched.

### TS types

- `src/lib/supabase/types.ts` — keep `Lesson`, `Exercise`, `UserLessonProgress`, etc. Mark legacy in a brief comment block. Do not import them in new course code.

### Sidebar / nav

- `(main)` layout's "Learn" link continues to point to `/learn` — works.
- Audit `(main)` layout for any "Synths" link pointing to old per-synth lessons; update if needed.
- Profile / dashboard / leaderboard pages reading `profiles.xp` or `user_lesson_progress` are explicitly out of scope. They may render stale/empty values; acceptable per user direction.

### Risks

- Components importing `xp-reward-modal` / `pathway-map` / `exercise-player` would break compile. Grep before deleting; expected to be lesson-only.
- Other route groups (`(auth)`, `/hardware`, `/temp-synths`) untouched.

---

## 8. Acceptance + testing

No test suite exists in repo. Validation = types + lint + manual smoke.

### Acceptance criteria

- [ ] `/learn` shows unit list with Unit 1 card. Click → unit page.
- [ ] Unit page shows 7 sub-lesson cards. Sub-lesson 1.1 unlocked, others locked. Locked card shows "Complete previous sub-lesson".
- [ ] Sub-lesson page renders snake pathway with N nodes (lessons + 1 mixed-test boss). First lesson active, rest locked.
- [ ] Lesson player: fullscreen takeover (no sidebar). Top: × close + progress bar. Body: current exercise. Bottom: CONTINUE / CHECK button.
- [ ] All 8 exercise types render and score correctly (concept-slide, tap-to-hear, ab-compare, waveform-pick, knob-tweak, multi-choice, play-melody, free-play).
- [ ] Wrong-on-first-try records mistake to localStorage with sub-lesson tag.
- [ ] Right-on-first-try does NOT record mistake.
- [ ] Lesson complete → 1.5 s panel → back to pathway with that node `completed`. Next node `available`.
- [ ] Sub-lesson final test (`*.test`) auto-generates 8 mixed exercises (60% current + 40% past mistakes, capped at 6).
- [ ] Past-mistake item answered correctly twice → drops from mistake pool.
- [ ] Test complete → sub-lesson marked done → next sub-lesson unlocks.
- [ ] All 6 concept visuals render and animate.
- [ ] Audio plays in all sound exercises after first user gesture; doesn't auto-play.
- [ ] Mobile (≤640 px): all targets ≥44×44, no horizontal scroll, lesson player full-bleed.
- [ ] localStorage clear → app gracefully resets to lesson 1.1.1 available.

### Manual smoke tests

1. Fresh load → walk all of 1.1 → enter 1.1.test → 8 questions, mostly current sub-lesson (no past pool).
2. Intentionally fail one 1.2 question → enter 1.2.test → past-mistake item from 1.1 should NOT appear (got 1.1 right).
3. Intentionally fail one 1.3 question → progress to 1.4 → 1.4.test should include that 1.3 mistake.
4. Answer that 1.3 mistake correctly twice (across 1.4.test and 1.5.test) → 1.6.test no longer surfaces it.
5. Resize to 360×740 viewport → all UIs usable.
6. Refresh mid-pathway → progress survives. Refresh mid-lesson → returns to pathway, that lesson not marked complete.

### Lint / types

- `npm run lint` clean.
- `npx tsc --noEmit` clean (TS strict per existing config).

### Out of scope (this PR)

- XP, streaks, leaderboards
- Synth 2-Pro / 3-Pro lesson content (Units 2+)
- Cross-device sync
- DB migrations to drop legacy tables
- Accessibility polish beyond tap-target sizes
- Internationalization
- Sound design "creative" grading (lesson 1.7 free-play just times out)

---

## Open questions / follow-ups

- Profile / dashboard / leaderboard pages still rely on legacy XP/streak data. Decide their fate in a follow-up.
- Resetting progress: add a hidden / settings affordance for `resetProgress()` once user testing reveals need.
- Persisting partial mid-lesson state across reloads — explicitly deferred.
