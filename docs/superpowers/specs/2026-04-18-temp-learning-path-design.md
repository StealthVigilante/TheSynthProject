# Temp Learning Path — Design Spec
_2026-04-18_

## Overview

Standalone route `/temp-learning-path` — a Duolingo-style, node-based synthesizer learning pathway prototype. Phase 1 (Oscillators) fully interactive. Client-side mock state only; no Supabase calls. Easy to delete when superseded by the real implementation.

---

## File Structure

```
src/app/temp-learning-path/
├── page.tsx          # AudioProvider wrapper + top-level MockState
├── path-map.tsx      # Vertical node list, phase headers, connector lines, milestone animation
├── node-lesson.tsx   # Lesson flow: visual slide → audio example → MC questions
├── node-review.tsx   # Adaptive review: 5 questions, 40/40/20 selection logic
├── node-create.tsx   # Listen & Create: play target → restrict SynthModule → Check
├── synth-module.tsx  # Restricted synth: enabledParams[] prop, reuses existing controls
└── visuals.tsx       # Re-exports WaveformCanvas, AdsrGraph, FilterGraph (extracted from exercise components)
```

---

## State Model

All state lives in `page.tsx`. No context — passed as props.

```ts
type NodeStatus = "locked" | "available" | "completed";

interface MockState {
  nodeStatuses: Record<string, NodeStatus>;  // keyed by node id
  mistakeLog: Record<string, number>;        // concept → miss count
  masteryLevel: Record<string, number>;      // concept → consecutive correct count
  unlockedSections: string[];                // e.g. ['oscillators']
  activeNodeId: string | null;
}
```

**Unlock logic:** Node N+1 becomes `available` when node N reaches `completed`.  
**Mastery removal:** concept removed from high-priority queue when `masteryLevel[concept] >= 3`.  
**Reset:** State resets on page refresh (intentional — temp mockup).

---

## Path Map UI

- Vertical centred column, max-width ~400px
- Phase header badge above each phase group (e.g. "PHASE 1 — OSCILLATORS")
- Nodes connected by vertical lines: `bg-primary` if previous completed, `bg-muted` if locked
- Node icons: Book (Lesson), Star (Review), Ear (Listen & Create)
- Locked nodes: `opacity-50`, no click
- Active node: highlighted card, opens inline panel below it (no separate route)
- Milestone: after phase completion, animated glow badge "Oscillators Mastered ✓"

---

## Phase 1 Nodes (Oscillators) — Fully Interactive

| # | Type | ID | Content |
|---|------|----|---------|
| 1 | Lesson | `what-is-sound` | Animated sine canvas intro + 2 MC questions |
| 2 | Lesson | `sine-wave` | Live WaveformCanvas, description of pure tone, 2 questions |
| 3 | Lesson | `square-triangle-saw` | 3-tab waveform comparison (click to switch, canvas updates), 3 questions |
| 4 | Listen & Create | `match-waveform` | Play target sound → user picks waveform via SynthModule → Check |
| 5 | Review | `phase-1-review` | 5 adaptive questions from concepts: sine / square / triangle / sawtooth / harmonics |

After node 5 completes: milestone animation, `unlockedSections` gains `'oscillators'`.

---

## Node Types

### A. Lesson Node

Flow: **Visual slide → (optional) Audio example → 1–3 MC questions**

- Slides rendered as a step carousel (prev/next buttons)
- MC question: 4 options, green/red flash on answer, must get right to advance (retry on wrong)
- XP badge shown on completion

### B. Adaptive Review Node

5–7 questions per review node.

**Selection algorithm:**
```
pool = all concepts seen so far
40% → most recent phase concepts
40% → high-mistake concepts (mistakeLog[c] > 0, sorted desc)
20% → random from remaining pool
```
After 3 consecutive correct answers for a concept: `delete mistakeLog[concept]`, `masteryLevel[concept] = 0`.

Each question is a MC question (4 options). Wrong answer increments `mistakeLog[concept]`.

### C. Listen & Create Node

1. "Target Sound" plays automatically (pre-configured params, hidden from user)
2. `SynthModule` renders with only `enabledParams` active
3. User adjusts controls, clicks **Check**
4. Tolerance check per param (±10% of target value for knobs, exact match for waveform type)
5. Correct: green flash, XP, complete. Wrong: red flash, "Try again" — params reset to user's last attempt

---

## SynthModule Component

```tsx
interface SynthModuleProps {
  enabledParams: string[];          // e.g. ["oscillator.type"]
  params: ParamValues;
  onChange: (key: string, value: number | string) => void;
  playNote: (note: string) => void;
}
```

**Phase 1:** renders `WaveformSelect` (enabled) + mini `PianoKeyboard` + `WaveformCanvas` (live).  
All other controls rendered but `disabled={true}` and `opacity-40`.  
Uses existing: `WaveformSelect`, `Knob`, `Fader`, `PianoKeyboard` from `src/components/synth/`.

---

## Visuals

Extracted/re-used from existing exercise components (no duplication — import directly):

| Visual | Source | Used in |
|--------|--------|---------|
| `WaveformCanvas` | `exercise-waveform-display.tsx` | Lessons 2, 3; SynthModule |
| `AdsrGraph` | `exercise-adsr-display.tsx` | Phase 3 (future) |
| `FilterGraph` | `exercise-filter-display.tsx` | Phase 2 (future) |

`visuals.tsx` re-exports these for clean imports inside the temp-learning-path directory.

---

## Styling

- Standalone route — no sidebar, no topbar, no auth check
- Uses all site CSS variables (`--background`, `--primary`, `--border`, etc.)
- Dark mode via existing `dark` class on `<html>` (ThemeProvider handles it)
- Wraps in `<AudioProvider>` for Tone.js lazy init (same pattern as sandbox)
- Max-width container, centred, with `overflow-y-auto` scroll

---

## Out of Scope (this spec)

- Phases 2–4 content (nodes defined as locked placeholders only)
- Persistence / Supabase integration
- XP actually saved to DB
- Real unlock of synth params in Collection page
- Auth requirement
