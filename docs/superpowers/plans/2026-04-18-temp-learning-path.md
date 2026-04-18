# Temp Learning Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `/temp-learning-path` route with a Duolingo-style vertical node path — Phase 1 (Oscillators) fully interactive, Phases 2–4 as locked placeholders.

**Architecture:** Seven co-located files under `src/app/temp-learning-path/`. All state lives in `page.tsx` and flows down as props. Reuses existing `useSynthEngine` hook, `WaveformSelect`, `Knob`, `PianoKeyboard` controls, and canvas/SVG visual components (copied into `visuals.tsx`). No Supabase, no auth, no persistence.

**Tech Stack:** Next.js 16 App Router (client component), Tone.js via existing `useSynthEngine`, Tailwind v4 CSS vars, Lucide icons, shadcn/ui Button/Progress/Badge.

---

## File Map

| File | Responsibility |
|------|----------------|
| `src/app/temp-learning-path/page.tsx` | `AudioProvider` wrapper, `MockState`, synth engine init, renders `PathMap` |
| `src/app/temp-learning-path/path-map.tsx` | Vertical node list, phase headers, connector lines, milestone animation, inline panel |
| `src/app/temp-learning-path/visuals.tsx` | `WaveformCanvas`, `AdsrGraph`, `FilterGraph` — standalone canvas/SVG components |
| `src/app/temp-learning-path/synth-module.tsx` | Restricted synth UI — `enabledParams[]` prop, reuses existing controls |
| `src/app/temp-learning-path/node-lesson.tsx` | Lesson flow: slide carousel → MC questions |
| `src/app/temp-learning-path/node-create.tsx` | Listen & Create: play target → user adjusts → tolerance check |
| `src/app/temp-learning-path/node-review.tsx` | Adaptive review: 40/40/20 question selection, 5 questions |

---

## Task 1: Visuals

**Files:**
- Create: `src/app/temp-learning-path/visuals.tsx`

These are copied/adapted from the unexported internals of the existing exercise components so the temp route is self-contained.

- [ ] **Step 1: Create `visuals.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import type { ParamValues } from "@/lib/synth-engine";

// ── WaveformCanvas ────────────────────────────────────────────────────────────
interface WaveformCanvasProps {
  getWaveform: () => Float32Array;
  width?: number;
  height?: number;
}

export function WaveformCanvas({ getWaveform, width = 320, height = 100 }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const data = getWaveform();
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = "oklch(1 0 0 / 6%)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();

      ctx.strokeStyle = "var(--primary)";
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      const step = Math.max(1, Math.floor(data.length / W));
      for (let i = 0; i < W; i++) {
        const sample = data[i * step] ?? 0;
        const y = H / 2 - sample * (H / 2 - 4);
        i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
      }
      ctx.stroke();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getWaveform]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: "block",
        borderRadius: 8,
        background: "var(--muted)",
        border: "1px solid var(--border)",
      }}
    />
  );
}

// ── AdsrGraph ─────────────────────────────────────────────────────────────────
interface AdsrGraphProps {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  width?: number;
  height?: number;
}

export function AdsrGraph({ attack, decay, sustain, release, width = 320, height = 90 }: AdsrGraphProps) {
  const W = width;
  const H = height;
  const pad = 8;
  const iW = W - pad * 2;
  const iH = H - pad * 2;

  const a = Math.max(attack, 0.01);
  const d = Math.max(decay, 0.01);
  const s = sustain;
  const r = Math.max(release, 0.01);
  const sustainDur = 0.35;
  const total = a + d + sustainDur + r;

  const toX = (t: number) => pad + (t / total) * iW;
  const toY = (amp: number) => pad + (1 - amp) * iH;

  const ax = toX(a);
  const dx = toX(a + d);
  const sx = toX(a + d + sustainDur);
  const rx = toX(total);
  const sy = toY(s);

  const pathD = [
    `M ${pad} ${toY(0)}`,
    `L ${ax} ${toY(1)}`,
    `L ${dx} ${sy}`,
    `L ${sx} ${sy}`,
    `L ${rx} ${toY(0)}`,
  ].join(" ");

  const labels = [
    { x: (pad + ax) / 2, label: "A" },
    { x: (ax + dx) / 2, label: "D" },
    { x: (dx + sx) / 2, label: "S" },
    { x: (sx + rx) / 2, label: "R" },
  ];

  return (
    <svg width={W} height={H + 18} viewBox={`0 0 ${W} ${H + 18}`} style={{ display: "block" }}>
      <path d={pathD + ` L ${rx} ${pad + iH} L ${pad} ${pad + iH} Z`} fill="var(--primary)" opacity={0.12} />
      <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {labels.map(({ x, label }) => (
        <text key={label} x={x} y={H + 14} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)" fontFamily="inherit">
          {label}
        </text>
      ))}
      <circle cx={dx} cy={sy} r={3} fill="var(--primary)" />
    </svg>
  );
}

// ── FilterGraph ───────────────────────────────────────────────────────────────
interface FilterGraphProps {
  cutoff: number;
  resonance: number;
  width?: number;
  height?: number;
}

export function FilterGraph({ cutoff, resonance, width = 320, height = 90 }: FilterGraphProps) {
  const W = width;
  const H = height;
  const pad = 8;
  const iW = W - pad * 2;
  const iH = H - pad * 2;

  const fc = Math.max(cutoff, 20);
  const Q = Math.max(resonance, 0.1);

  const fMin = Math.log10(20);
  const fMax = Math.log10(20000);
  const toX = (f: number) => pad + ((Math.log10(f) - fMin) / (fMax - fMin)) * iW;

  const magnitude = (f: number) => {
    const r = f / fc;
    return 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / Q, 2));
  };

  const points: string[] = [];
  for (let i = 0; i <= 200; i++) {
    const f = Math.pow(10, fMin + (i / 200) * (fMax - fMin));
    const mag = Math.min(magnitude(f), Q * 1.5 + 0.5);
    const dB = 20 * Math.log10(Math.max(mag, 0.001));
    const y = pad + ((20 - dB) / 60) * iH;
    points.push(`${i === 0 ? "M" : "L"} ${toX(f).toFixed(1)} ${Math.max(pad, Math.min(pad + iH, y)).toFixed(1)}`);
  }
  const pathD = points.join(" ");
  const cx = toX(fc);
  const freqLabels = [20, 200, 2000, 20000];

  return (
    <svg width={W} height={H + 18} viewBox={`0 0 ${W} ${H + 18}`} style={{ display: "block" }}>
      <path d={pathD + ` L ${pad + iW} ${pad + iH} L ${pad} ${pad + iH} Z`} fill="var(--primary)" opacity={0.12} />
      <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" />
      <line x1={cx} y1={pad} x2={cx} y2={pad + iH} stroke="var(--primary)" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
      {freqLabels.map(f => (
        <text key={f} x={toX(f)} y={H + 14} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)" fontFamily="inherit">
          {f >= 1000 ? `${f / 1000}k` : f}
        </text>
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/temp-learning-path/visuals.tsx
git commit -m "feat(temp-path): add WaveformCanvas, AdsrGraph, FilterGraph visuals"
```

---

## Task 2: SynthModule

**Files:**
- Create: `src/app/temp-learning-path/synth-module.tsx`

- [ ] **Step 1: Create `synth-module.tsx`**

```tsx
"use client";

import { WaveformCanvas } from "./visuals";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import type { ParamValues } from "@/lib/synth-engine";

interface SynthModuleProps {
  enabledParams: string[];
  params: ParamValues;
  onChange: (key: string, value: number | string) => void;
  onNoteOn: (note: string, velocity: number) => void;
  onNoteOff: (note: string) => void;
  getWaveform: () => Float32Array;
}

const WAVEFORM_OPTIONS = ["sine", "square", "triangle", "sawtooth"];

export function SynthModule({
  enabledParams,
  params,
  onChange,
  onNoteOn,
  onNoteOff,
  getWaveform,
}: SynthModuleProps) {
  const waveEnabled = enabledParams.includes("oscillator.type");

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
        Synth Module
      </div>

      {/* Waveform selector */}
      <div style={{ opacity: waveEnabled ? 1 : 0.35, pointerEvents: waveEnabled ? "auto" : "none" }}>
        <WaveformSelect
          value={String(params["oscillator.type"] ?? "sine")}
          options={WAVEFORM_OPTIONS}
          onChange={(v) => onChange("oscillator.type", v)}
          label="Waveform"
          disabled={!waveEnabled}
        />
      </div>

      {/* Live waveform display */}
      <WaveformCanvas getWaveform={getWaveform} width={280} height={80} />

      {/* Keyboard */}
      <PianoKeyboard
        onNoteOn={onNoteOn}
        onNoteOff={onNoteOff}
        startOctave={3}
        octaves={2}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/temp-learning-path/synth-module.tsx
git commit -m "feat(temp-path): add SynthModule with enabledParams prop"
```

---

## Task 3: Lesson Node

**Files:**
- Create: `src/app/temp-learning-path/node-lesson.tsx`

The lesson node has two kinds of slides: `visual` (text + optional canvas) and `mc` (multiple-choice question). The caller passes the full slide array. Incorrect MC answers get a red flash but do not advance — user must pick the right answer.

- [ ] **Step 1: Create `node-lesson.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WaveformCanvas } from "./visuals";
import { cn } from "@/lib/utils";

export interface VisualSlide {
  type: "visual";
  title: string;
  body: string;
  visual?: "waveform" | "static-sine" | "static-square" | "static-triangle" | "static-saw";
}

export interface McSlide {
  type: "mc";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type Slide = VisualSlide | McSlide;

interface NodeLessonProps {
  slides: Slide[];
  getWaveform: () => Float32Array;
  onConcept: (concept: string, correct: boolean) => void;
  onComplete: () => void;
}

export function NodeLesson({ slides, getWaveform, onConcept, onComplete }: NodeLessonProps) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  function handleAnswer(optionIndex: number) {
    if (slide.type !== "mc") return;
    const correct = optionIndex === slide.correctIndex;
    setFeedback(correct ? "correct" : "wrong");
    onConcept(slide.question, correct);
    if (correct) {
      setTimeout(() => {
        setFeedback(null);
        if (isLast) onComplete();
        else setIndex((i) => i + 1);
      }, 700);
    } else {
      setTimeout(() => setFeedback(null), 900);
    }
  }

  function handleNext() {
    if (isLast) onComplete();
    else setIndex((i) => i + 1);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Progress dots */}
      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
        {slides.map((_, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: i <= index ? "var(--primary)" : "var(--border)",
              transition: "background 200ms",
            }}
          />
        ))}
      </div>

      {/* Visual slide */}
      {slide.type === "visual" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 18, fontWeight: 700 }}>{slide.title}</p>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6 }}>{slide.body}</p>
          {slide.visual === "waveform" && (
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
              <WaveformCanvas getWaveform={getWaveform} width={280} height={80} />
            </div>
          )}
          {(slide.visual === "static-sine" || slide.visual === "static-square" || slide.visual === "static-triangle" || slide.visual === "static-saw") && (
            <StaticWaveform type={slide.visual.replace("static-", "") as "sine" | "square" | "triangle" | "saw"} />
          )}
          <Button onClick={handleNext} className="w-full">
            {isLast ? "Complete" : "Continue →"}
          </Button>
        </div>
      )}

      {/* MC slide */}
      {slide.type === "mc" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 600 }}>{slide.question}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {slide.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={feedback === "correct"}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor:
                    feedback === "correct" && i === slide.correctIndex
                      ? "var(--primary)"
                      : feedback === "wrong"
                      ? "var(--border)"
                      : "var(--border)",
                  background:
                    feedback === "correct" && i === slide.correctIndex
                      ? "oklch(0.45 0.15 142 / 20%)"
                      : "var(--card)",
                  color: "var(--foreground)",
                  fontSize: 14,
                  textAlign: "left",
                  cursor: feedback === "correct" ? "default" : "pointer",
                  transition: "all 150ms",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          {feedback === "wrong" && (
            <p style={{ fontSize: 12, color: "var(--destructive)", textAlign: "center" }}>
              Not quite — try again
            </p>
          )}
          {feedback === "correct" && (
            <p style={{ fontSize: 12, color: "oklch(0.65 0.15 142)", textAlign: "center" }}>
              Correct! ✓ &nbsp;{slide.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Static waveform SVGs for lesson illustrations
function StaticWaveform({ type }: { type: "sine" | "square" | "triangle" | "saw" }) {
  const W = 280;
  const H = 70;
  const mid = H / 2;
  const amp = H / 2 - 8;
  const cycles = 2.5;
  const N = 200;

  let pathD = "";
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * cycles * Math.PI * 2;
    let y: number;
    if (type === "sine") {
      y = mid - Math.sin(t) * amp;
    } else if (type === "square") {
      y = mid - (Math.sin(t) >= 0 ? 1 : -1) * amp;
    } else if (type === "triangle") {
      y = mid - (2 / Math.PI) * Math.asin(Math.sin(t)) * amp;
    } else {
      // sawtooth
      const phase = ((t / (Math.PI * 2)) % 1);
      y = mid - (1 - 2 * phase) * amp;
    }
    const x = (i / N) * W;
    pathD += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg width={W} height={H} style={{ background: "var(--muted)", borderRadius: 8, border: "1px solid var(--border)" }}>
        <line x1={0} y1={mid} x2={W} y2={mid} stroke="var(--border)" strokeWidth={1} />
        <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/temp-learning-path/node-lesson.tsx
git commit -m "feat(temp-path): add NodeLesson with slide carousel and MC questions"
```

---

## Task 4: Listen & Create Node

**Files:**
- Create: `src/app/temp-learning-path/node-create.tsx`

Target params are passed in. User adjusts the SynthModule, hits Check. Waveform type must match exactly; numeric params within ±15%.

- [ ] **Step 1: Create `node-create.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SynthModule } from "./synth-module";
import type { ParamValues } from "@/lib/synth-engine";

interface NodeCreateProps {
  instruction: string;
  targetParams: Partial<ParamValues>;
  enabledParams: string[];
  params: ParamValues;
  onChange: (key: string, value: number | string) => void;
  onNoteOn: (note: string, velocity: number) => void;
  onNoteOff: (note: string) => void;
  playNote: (note: string, duration?: string) => void;
  getWaveform: () => Float32Array;
  onConcept: (concept: string, correct: boolean) => void;
  onComplete: () => void;
}

export function NodeCreate({
  instruction,
  targetParams,
  enabledParams,
  params,
  onChange,
  onNoteOn,
  onNoteOff,
  playNote,
  getWaveform,
  onConcept,
  onComplete,
}: NodeCreateProps) {
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [attempts, setAttempts] = useState(0);

  function playTarget() {
    // Temporarily apply target params, play a note, restore
    const snapshot: Partial<ParamValues> = {};
    for (const key of Object.keys(targetParams)) {
      snapshot[key] = params[key];
      onChange(key, targetParams[key] as number | string);
    }
    playNote("C4", "2n");
    setTimeout(() => {
      for (const key of Object.keys(snapshot)) {
        onChange(key, snapshot[key] as number | string);
      }
    }, 1200);
  }

  function checkAnswer() {
    let allCorrect = true;
    for (const [key, target] of Object.entries(targetParams)) {
      const current = params[key];
      if (typeof target === "string") {
        if (current !== target) { allCorrect = false; break; }
      } else if (typeof target === "number") {
        const tolerance = Math.abs(target) * 0.15 || 1;
        if (Math.abs(Number(current) - target) > tolerance) { allCorrect = false; break; }
      }
    }
    setAttempts((a) => a + 1);
    onConcept("match-waveform", allCorrect);
    setFeedback(allCorrect ? "correct" : "wrong");
    if (allCorrect) {
      setTimeout(onComplete, 900);
    } else {
      setTimeout(() => setFeedback(null), 1200);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6 }}>{instruction}</p>

      <Button variant="outline" onClick={playTarget} style={{ width: "100%" }}>
        ▶ Play Target Sound
      </Button>

      <SynthModule
        enabledParams={enabledParams}
        params={params}
        onChange={onChange}
        onNoteOn={onNoteOn}
        onNoteOff={onNoteOff}
        getWaveform={getWaveform}
      />

      <Button
        onClick={checkAnswer}
        disabled={feedback === "correct"}
        style={{
          width: "100%",
          background: feedback === "correct" ? "oklch(0.45 0.15 142)" : feedback === "wrong" ? "var(--destructive)" : undefined,
          transition: "background 200ms",
        }}
      >
        {feedback === "correct" ? "Correct! ✓" : feedback === "wrong" ? "Not quite — try again" : "Check"}
      </Button>

      {attempts > 2 && feedback === "wrong" && (
        <p style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>
          Hint: listen to the target again and compare the waveform shape
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/temp-learning-path/node-create.tsx
git commit -m "feat(temp-path): add NodeCreate listen-and-match ear training"
```

---

## Task 5: Adaptive Review Node

**Files:**
- Create: `src/app/temp-learning-path/node-review.tsx`

5 questions. Pool built from all Phase 1 concepts. 40% recent, 40% high-mistake, 20% random. Wrong answer increments `mistakeLog`. Three consecutive correct answers on a concept removes it from the priority queue.

- [ ] **Step 1: Create `node-review.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";

interface ReviewQuestion {
  concept: string;
  question: string;
  options: string[];
  correctIndex: number;
}

interface NodeReviewProps {
  questions: ReviewQuestion[];
  mistakeLog: Record<string, number>;
  masteryLevel: Record<string, number>;
  onConcept: (concept: string, correct: boolean) => void;
  onComplete: () => void;
}

function selectQuestions(
  questions: ReviewQuestion[],
  mistakeLog: Record<string, number>,
  count = 5
): ReviewQuestion[] {
  const recent = questions.slice(-Math.ceil(count * 0.4));
  const highMistake = [...questions]
    .filter((q) => (mistakeLog[q.concept] ?? 0) > 0)
    .sort((a, b) => (mistakeLog[b.concept] ?? 0) - (mistakeLog[a.concept] ?? 0))
    .slice(0, Math.ceil(count * 0.4));
  const used = new Set([...recent, ...highMistake].map((q) => q.question));
  const random = questions
    .filter((q) => !used.has(q.question))
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.ceil(count * 0.2));

  const pool = [...recent, ...highMistake, ...random];
  // Deduplicate by question text, fill to `count` from full list if short
  const seen = new Set<string>();
  const deduped: ReviewQuestion[] = [];
  for (const q of pool) {
    if (!seen.has(q.question)) { seen.add(q.question); deduped.push(q); }
  }
  while (deduped.length < count) {
    const fallback = questions.find((q) => !seen.has(q.question));
    if (!fallback) break;
    seen.add(fallback.question);
    deduped.push(fallback);
  }
  return deduped.slice(0, count);
}

export function NodeReview({ questions, mistakeLog, onConcept, onComplete }: NodeReviewProps) {
  const selected = useMemo(() => selectQuestions(questions, mistakeLog), [questions, mistakeLog]);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);

  const q = selected[index];

  function handleAnswer(optionIndex: number) {
    const correct = optionIndex === q.correctIndex;
    onConcept(q.concept, correct);
    setFeedback(correct ? "correct" : "wrong");
    if (correct) setScore((s) => s + 1);
    setTimeout(() => {
      setFeedback(null);
      if (index === selected.length - 1) onComplete();
      else setIndex((i) => i + 1);
    }, correct ? 700 : 1100);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Review
        </span>
        <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
          {index + 1} / {selected.length}
        </span>
      </div>

      <div style={{ height: 3, background: "var(--muted)", borderRadius: 2 }}>
        <div
          style={{
            height: "100%",
            width: `${((index) / selected.length) * 100}%`,
            background: "var(--primary)",
            borderRadius: 2,
            transition: "width 300ms ease",
          }}
        />
      </div>

      <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{q.question}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            disabled={feedback !== null}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid",
              borderColor:
                feedback && i === q.correctIndex
                  ? "oklch(0.65 0.15 142)"
                  : feedback === "wrong" && i !== q.correctIndex
                  ? "var(--border)"
                  : "var(--border)",
              background:
                feedback && i === q.correctIndex
                  ? "oklch(0.45 0.15 142 / 15%)"
                  : "var(--card)",
              color: "var(--foreground)",
              fontSize: 14,
              textAlign: "left",
              cursor: feedback ? "default" : "pointer",
              transition: "all 150ms",
              opacity: feedback && i !== q.correctIndex ? 0.5 : 1,
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {feedback === "wrong" && (
        <p style={{ fontSize: 12, color: "var(--destructive)", textAlign: "center" }}>
          Incorrect — the right answer is highlighted
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/temp-learning-path/node-review.tsx
git commit -m "feat(temp-path): add NodeReview with 40/40/20 adaptive selection"
```

---

## Task 6: Path Map

**Files:**
- Create: `src/app/temp-learning-path/path-map.tsx`

Vertical list of phase groups. Each group has a header and nodes. Active node expands an inline panel below. Milestone shows when a phase is fully complete.

- [ ] **Step 1: Create `path-map.tsx`**

```tsx
"use client";

import { BookOpen, Star, Ear, Lock, Check, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export type NodeType = "lesson" | "review" | "create";
export type NodeStatus = "locked" | "available" | "completed";

export interface PathNode {
  id: string;
  type: NodeType;
  title: string;
  subtitle?: string;
  status: NodeStatus;
}

export interface Phase {
  id: string;
  label: string;
  nodes: PathNode[];
  milestone: string;
}

interface PathMapProps {
  phases: Phase[];
  activeNodeId: string | null;
  completedNodes: Set<string>;
  onNodeClick: (id: string) => void;
  renderPanel: (nodeId: string) => ReactNode;
}

const NODE_ICONS: Record<NodeType, typeof BookOpen> = {
  lesson: BookOpen,
  review: Star,
  create: Ear,
};

export function PathMap({ phases, activeNodeId, completedNodes, onNodeClick, renderPanel }: PathMapProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, paddingBottom: 80 }}>
      {phases.map((phase, pi) => {
        const allDone = phase.nodes.every((n) => completedNodes.has(n.id));
        return (
          <div key={phase.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 400 }}>
            {/* Phase header */}
            <div
              style={{
                margin: pi === 0 ? "8px 0 20px" : "32px 0 20px",
                padding: "4px 14px",
                borderRadius: 20,
                background: "var(--muted)",
                border: "1px solid var(--border)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--muted-foreground)",
              }}
            >
              Phase {pi + 1} — {phase.label}
            </div>

            {/* Nodes */}
            {phase.nodes.map((node, ni) => {
              const isFirst = ni === 0;
              const isActive = activeNodeId === node.id;
              const isDone = completedNodes.has(node.id);

              return (
                <div key={node.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                  {/* Connector above */}
                  {!isFirst && (
                    <div
                      style={{
                        width: 2,
                        height: 24,
                        background: isDone || completedNodes.has(phase.nodes[ni - 1].id) ? "var(--primary)" : "var(--border)",
                        transition: "background 400ms",
                      }}
                    />
                  )}

                  {/* Node card */}
                  <NodeCard
                    node={node}
                    isActive={isActive}
                    isDone={isDone}
                    onClick={() => node.status !== "locked" && onNodeClick(node.id)}
                  />

                  {/* Inline panel */}
                  {isActive && (
                    <div
                      style={{
                        width: "100%",
                        maxWidth: 380,
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: 20,
                        marginTop: 8,
                      }}
                    >
                      {renderPanel(node.id)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Milestone */}
            {allDone && (
              <div
                style={{
                  marginTop: 20,
                  padding: "10px 20px",
                  borderRadius: 20,
                  background: "oklch(0.45 0.15 142 / 12%)",
                  border: "1px solid oklch(0.65 0.15 142 / 40%)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "oklch(0.75 0.15 142)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  animation: "fadeIn 600ms ease",
                }}
              >
                <Check size={14} />
                {phase.milestone}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function NodeCard({
  node,
  isActive,
  isDone,
  onClick,
}: {
  node: PathNode;
  isActive: boolean;
  isDone: boolean;
  onClick: () => void;
}) {
  const Icon = NODE_ICONS[node.type];
  const locked = node.status === "locked";

  return (
    <button
      onClick={onClick}
      disabled={locked}
      style={{
        width: "100%",
        maxWidth: 360,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 12,
        border: "1px solid",
        borderColor: isActive
          ? "var(--primary)"
          : isDone
          ? "oklch(0.65 0.15 142 / 35%)"
          : locked
          ? "var(--border)"
          : "var(--border)",
        background: isActive
          ? "var(--primary) / 5%"
          : isDone
          ? "oklch(0.45 0.15 142 / 8%)"
          : "var(--card)",
        opacity: locked ? 0.45 : 1,
        cursor: locked ? "not-allowed" : "pointer",
        transition: "all 200ms",
        textAlign: "left",
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isDone
            ? "oklch(0.45 0.15 142 / 20%)"
            : isActive
            ? "oklch(var(--primary) / 12%)"
            : "var(--muted)",
          color: isDone ? "oklch(0.65 0.15 142)" : isActive ? "var(--primary)" : "var(--muted-foreground)",
        }}
      >
        {isDone ? <Check size={16} /> : locked ? <Lock size={14} /> : <Icon size={16} />}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{node.title}</p>
        {node.subtitle && (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "2px 0 0" }}>{node.subtitle}</p>
        )}
      </div>

      {!locked && !isDone && (
        <ChevronRight size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
      )}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/temp-learning-path/path-map.tsx
git commit -m "feat(temp-path): add PathMap vertical node layout with inline panels"
```

---

## Task 7: Page — State, Content, Wiring

**Files:**
- Create: `src/app/temp-learning-path/page.tsx`

This is the largest file. It defines all Phase 1 lesson content as data, initialises the synth engine, owns `MockState`, and wires all nodes together.

- [ ] **Step 1: Create `page.tsx`**

```tsx
"use client";

import { useCallback, useState } from "react";
import { AudioProvider, useAudioContext } from "@/providers/audio-provider";
import { useSynthEngine } from "@/hooks/use-synth-engine";
import { SYNTH_CONFIGS } from "@/components/synths/configs";
import { PathMap } from "./path-map";
import { NodeLesson } from "./node-lesson";
import { NodeCreate } from "./node-create";
import { NodeReview } from "./node-review";
import type { Phase, NodeStatus } from "./path-map";
import type { Slide } from "./node-lesson";

const CONFIG = SYNTH_CONFIGS["osci-mono"];

// ── Phase 1 lesson content ────────────────────────────────────────────────────

const WHAT_IS_SOUND_SLIDES: Slide[] = [
  {
    type: "visual",
    title: "What is Sound?",
    body: "Sound is created by vibration. When an object vibrates, it pushes air molecules back and forth, creating pressure waves that travel to your ears. A synthesizer creates these vibrations electronically.",
    visual: "static-sine",
  },
  {
    type: "visual",
    title: "The Waveform",
    body: "A waveform is a visual snapshot of how air pressure changes over time. The x-axis is time, the y-axis is pressure (amplitude). The shape of the waveform determines the timbre — the character — of the sound.",
    visual: "waveform",
  },
  {
    type: "mc",
    question: "What physically creates sound?",
    options: ["Vibration of air molecules", "Light waves", "Magnetic fields", "Electric current alone"],
    correctIndex: 0,
    explanation: "Vibration moves air molecules, creating pressure waves our ears detect as sound.",
  },
  {
    type: "mc",
    question: "What does the shape of a waveform tell us?",
    options: ["The timbre (tonal character) of the sound", "The volume only", "The pitch only", "Nothing useful"],
    correctIndex: 0,
    explanation: "Waveform shape = timbre. Same pitch, different shape = different sound character.",
  },
];

const SINE_SLIDES: Slide[] = [
  {
    type: "visual",
    title: "The Sine Wave",
    body: "The sine wave is the purest sound possible. It contains only a single frequency — the fundamental — with no harmonics. It sounds smooth, clean, and flute-like. Play a note to hear it.",
    visual: "static-sine",
  },
  {
    type: "visual",
    title: "Play It Live",
    body: "The waveform below animates in real time as you play. Notice the smooth, rounded curve — no sharp edges, no harmonics.",
    visual: "waveform",
  },
  {
    type: "mc",
    question: "How does a sine wave sound compared to other waveforms?",
    options: ["Pure and smooth", "Buzzy and hollow", "Bright and harsh", "Nasal and reedy"],
    correctIndex: 0,
    explanation: "No harmonics = pure tone. All other waveforms have harmonics that add colour/texture.",
  },
  {
    type: "mc",
    question: "How many harmonics does a pure sine wave contain?",
    options: ["Zero — only the fundamental frequency", "Two", "Many odd harmonics", "Infinite harmonics"],
    correctIndex: 0,
    explanation: "Sine = fundamental only. That's what makes it the 'building block' of all sounds.",
  },
];

const SQUARE_TRI_SAW_SLIDES: Slide[] = [
  {
    type: "visual",
    title: "Square Wave",
    body: "The square wave flips instantly between maximum and minimum. It contains only odd harmonics (1st, 3rd, 5th…). This gives it a hollow, woody, clarinet-like tone.",
    visual: "static-square",
  },
  {
    type: "visual",
    title: "Triangle Wave",
    body: "The triangle wave has linear slopes, like a mountain peak. Like the square, it contains only odd harmonics — but they fall off much faster, making it softer and more muted than the square.",
    visual: "static-triangle",
  },
  {
    type: "visual",
    title: "Sawtooth Wave",
    body: "The sawtooth ramps up then drops instantly. It contains ALL harmonics — both odd and even. This makes it the brightest, richest, harshest wave. It's the go-to for leads and basses.",
    visual: "static-saw",
  },
  {
    type: "mc",
    question: "Which waveform sounds most hollow and woody (like a clarinet)?",
    options: ["Square", "Sine", "Sawtooth", "Triangle"],
    correctIndex: 0,
    explanation: "Square wave contains only odd harmonics, giving it that hollow, reedy character.",
  },
  {
    type: "mc",
    question: "Which waveform contains both odd AND even harmonics?",
    options: ["Sawtooth", "Sine", "Square", "Triangle"],
    correctIndex: 0,
    explanation: "Sawtooth has all harmonics — that's why it sounds the richest and brightest.",
  },
  {
    type: "mc",
    question: "Triangle vs Square: the triangle sounds ___",
    options: ["Softer — harmonics roll off faster", "Harsher — more harmonics", "Identical — same shape", "Brighter — more highs"],
    correctIndex: 0,
    explanation: "Both have only odd harmonics, but triangle's decrease in amplitude much faster → softer.",
  },
];

const REVIEW_QUESTIONS = [
  { concept: "sine", question: "The sine wave sounds…", options: ["Pure and smooth", "Buzzy and hollow", "Bright and harsh", "Nasal"], correctIndex: 0 },
  { concept: "sine", question: "How many harmonics does a sine wave have?", options: ["Zero (fundamental only)", "Odd harmonics only", "Even harmonics only", "All harmonics"], correctIndex: 0 },
  { concept: "square", question: "The square wave contains which harmonics?", options: ["Odd only", "Even only", "All", "None"], correctIndex: 0 },
  { concept: "square", question: "Which waveform sounds hollow like a clarinet?", options: ["Square", "Sawtooth", "Sine", "Triangle"], correctIndex: 0 },
  { concept: "triangle", question: "How does triangle compare to square in brightness?", options: ["Softer — harmonics fall off faster", "Brighter — more harmonics", "Same brightness", "No difference"], correctIndex: 0 },
  { concept: "sawtooth", question: "The sawtooth wave contains…", options: ["All harmonics (odd + even)", "Odd harmonics only", "Only the fundamental", "Even harmonics only"], correctIndex: 0 },
  { concept: "sawtooth", question: "Which waveform is best for bright leads and basses?", options: ["Sawtooth", "Sine", "Triangle", "Square"], correctIndex: 0 },
  { concept: "harmonics", question: "What are harmonics?", options: ["Multiples of the fundamental frequency", "Types of filters", "Volume settings", "Waveform colours"], correctIndex: 0 },
];

// ── Phase definitions ─────────────────────────────────────────────────────────

const PHASES: Phase[] = [
  {
    id: "oscillators",
    label: "Oscillators",
    milestone: "Oscillators Mastered",
    nodes: [
      { id: "what-is-sound", type: "lesson", title: "What is Sound?", subtitle: "Vibration & waveforms", status: "available" },
      { id: "sine-wave", type: "lesson", title: "Sine Wave", subtitle: "The pure tone", status: "locked" },
      { id: "square-tri-saw", type: "lesson", title: "Square, Triangle & Saw", subtitle: "Harmonics & character", status: "locked" },
      { id: "match-waveform", type: "create", title: "Listen & Match", subtitle: "Ear training", status: "locked" },
      { id: "phase-1-review", type: "review", title: "Phase 1 Review", subtitle: "5 questions", status: "locked" },
    ],
  },
  {
    id: "filters",
    label: "Filters",
    milestone: "Filters Mastered",
    nodes: [
      { id: "lpf", type: "lesson", title: "Low-Pass Filter", subtitle: "Coming soon", status: "locked" },
      { id: "resonance", type: "lesson", title: "Resonance", subtitle: "Coming soon", status: "locked" },
      { id: "filter-create", type: "create", title: "Sculpt the Sound", subtitle: "Coming soon", status: "locked" },
      { id: "phase-2-review", type: "review", title: "Phase 2 Review", subtitle: "Coming soon", status: "locked" },
    ],
  },
  {
    id: "adsr-amp",
    label: "ADSR Amplitude",
    milestone: "Amplitude Envelope Mastered",
    nodes: [
      { id: "adsr-intro", type: "lesson", title: "The Envelope", subtitle: "Coming soon", status: "locked" },
      { id: "attack", type: "lesson", title: "Attack", subtitle: "Coming soon", status: "locked" },
      { id: "decay-sustain", type: "lesson", title: "Decay & Sustain", subtitle: "Coming soon", status: "locked" },
      { id: "release", type: "lesson", title: "Release", subtitle: "Coming soon", status: "locked" },
      { id: "adsr-create", type: "create", title: "Shape the Sound", subtitle: "Coming soon", status: "locked" },
    ],
  },
  {
    id: "adsr-filter",
    label: "Filter Envelope",
    milestone: "Filter Envelope Mastered",
    nodes: [
      { id: "filter-env", type: "lesson", title: "Filter Envelope", subtitle: "Coming soon", status: "locked" },
      { id: "filter-env-create", type: "create", title: "Wah & Zap", subtitle: "Coming soon", status: "locked" },
    ],
  },
];

// ── Phase 1 node order for sequential unlock ──────────────────────────────────
const PHASE1_ORDER = ["what-is-sound", "sine-wave", "square-tri-saw", "match-waveform", "phase-1-review"];

// ── Main component ────────────────────────────────────────────────────────────

function LearningPath() {
  const { startAudio } = useAudioContext();

  const { params, setParam, noteOn, noteOff, playNote, getWaveform } = useSynthEngine({
    engineType: CONFIG.engineType,
    engineConfig: CONFIG.engineConfig,
    defaultParams: CONFIG.defaultParams,
    allParams: CONFIG.allParams,
  });

  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());
  const [activeNodeId, setActiveNodeId] = useState<string | null>("what-is-sound");
  const [mistakeLog, setMistakeLog] = useState<Record<string, number>>({});
  const [masteryLevel, setMasteryLevel] = useState<Record<string, number>>({});

  // Derive node statuses from completedNodes
  const phases = PHASES.map((phase) => ({
    ...phase,
    nodes: phase.nodes.map((node) => {
      if (completedNodes.has(node.id)) return { ...node, status: "completed" as NodeStatus };
      // Phase 1 sequential unlock
      if (PHASE1_ORDER.includes(node.id)) {
        const idx = PHASE1_ORDER.indexOf(node.id);
        if (idx === 0) return { ...node, status: "available" as NodeStatus };
        const prev = PHASE1_ORDER[idx - 1];
        return { ...node, status: completedNodes.has(prev) ? ("available" as NodeStatus) : ("locked" as NodeStatus) };
      }
      return node;
    }),
  }));

  const handleNodeClick = useCallback(
    (id: string) => {
      startAudio();
      setActiveNodeId((prev) => (prev === id ? null : id));
    },
    [startAudio]
  );

  const handleConcept = useCallback((concept: string, correct: boolean) => {
    if (correct) {
      setMasteryLevel((prev) => {
        const streak = (prev[concept] ?? 0) + 1;
        if (streak >= 3) {
          setMistakeLog((m) => { const next = { ...m }; delete next[concept]; return next; });
          return { ...prev, [concept]: 0 };
        }
        return { ...prev, [concept]: streak };
      });
    } else {
      setMasteryLevel((prev) => ({ ...prev, [concept]: 0 }));
      setMistakeLog((prev) => ({ ...prev, [concept]: (prev[concept] ?? 0) + 1 }));
    }
  }, []);

  const handleComplete = useCallback((nodeId: string) => {
    setCompletedNodes((prev) => new Set([...prev, nodeId]));
    setActiveNodeId(null);
  }, []);

  function renderPanel(nodeId: string) {
    switch (nodeId) {
      case "what-is-sound":
        return (
          <NodeLesson
            slides={WHAT_IS_SOUND_SLIDES}
            getWaveform={getWaveform}
            onConcept={handleConcept}
            onComplete={() => handleComplete("what-is-sound")}
          />
        );
      case "sine-wave":
        return (
          <NodeLesson
            slides={SINE_SLIDES}
            getWaveform={getWaveform}
            onConcept={handleConcept}
            onComplete={() => handleComplete("sine-wave")}
          />
        );
      case "square-tri-saw":
        return (
          <NodeLesson
            slides={SQUARE_TRI_SAW_SLIDES}
            getWaveform={getWaveform}
            onConcept={handleConcept}
            onComplete={() => handleComplete("square-tri-saw")}
          />
        );
      case "match-waveform":
        return (
          <NodeCreate
            instruction="Listen to the target sound, then select the matching waveform on the synth below and play a note to compare. Click Check when you're happy."
            targetParams={{ "oscillator.type": "square" }}
            enabledParams={["oscillator.type"]}
            params={params}
            onChange={setParam}
            onNoteOn={(note, vel) => noteOn(note, vel)}
            onNoteOff={noteOff}
            playNote={playNote}
            getWaveform={getWaveform}
            onConcept={handleConcept}
            onComplete={() => handleComplete("match-waveform")}
          />
        );
      case "phase-1-review":
        return (
          <NodeReview
            questions={REVIEW_QUESTIONS}
            mistakeLog={mistakeLog}
            masteryLevel={masteryLevel}
            onConcept={handleConcept}
            onComplete={() => handleComplete("phase-1-review")}
          />
        );
      default:
        return (
          <div style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>
            Coming soon — this phase is not yet implemented.
          </div>
        );
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--background)",
        color: "var(--foreground)",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 48,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 12,
          position: "sticky",
          top: 0,
          background: "var(--background)",
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
          Learning Path
        </span>
        <span style={{ color: "var(--border)" }}>·</span>
        <span style={{ fontSize: 13 }}>Osci Mono</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted-foreground)" }}>
          {completedNodes.size} / {PHASE1_ORDER.length} Phase 1
        </span>
      </div>

      {/* Path */}
      <div style={{ padding: "24px 16px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <PathMap
            phases={phases}
            activeNodeId={activeNodeId}
            completedNodes={completedNodes}
            onNodeClick={handleNodeClick}
            renderPanel={renderPanel}
          />
        </div>
      </div>
    </div>
  );
}

export default function TempLearningPathPage() {
  return (
    <AudioProvider>
      <LearningPath />
    </AudioProvider>
  );
}
```

- [ ] **Step 2: Run dev server and verify the route loads**

```bash
npm run dev
```

Open `http://localhost:3000/temp-learning-path`. Expected: page loads, sticky header visible, 4 phases shown, first node ("What is Sound?") active and expanded with lesson slides.

- [ ] **Step 3: Verify Phase 1 full flow**

Walk through manually:
1. Complete "What is Sound?" — click through slides, answer both MC questions correctly → node shows green check, "Sine Wave" unlocks
2. Complete "Sine Wave" → "Square Triangle Saw" unlocks
3. Complete "Square Triangle Saw" → "Listen & Match" unlocks
4. "Listen & Match" → click "Play Target Sound", select square waveform, click Check → completes
5. "Phase 1 Review" → 5 questions appear, answer them → milestone "Oscillators Mastered ✓" appears

- [ ] **Step 4: Commit**

```bash
git add src/app/temp-learning-path/page.tsx
git commit -m "feat(temp-path): wire page — MockState, synth engine, Phase 1 content, all nodes connected"
```

---

## Self-Review

**Spec coverage:**
- ✅ Standalone route, no auth
- ✅ Three node types: Lesson (visual → audio → MC), Review (40/40/20), Listen & Create
- ✅ SynthModule with `enabledParams` prop
- ✅ WaveformCanvas, AdsrGraph, FilterGraph visuals
- ✅ Static waveform illustrations (sine, square, triangle, saw)
- ✅ Sequential unlock logic
- ✅ mistakeLog + masteryLevel state (3 consecutive correct = removed from priority queue)
- ✅ Phase 1 fully interactive, Phases 2–4 locked placeholders
- ✅ Milestone animation after Phase 1 complete
- ✅ CSS vars / dark mode (var(--primary), var(--background), etc.)
- ✅ AudioProvider wrapper (same pattern as sandbox)

**Placeholder scan:** None found. All code blocks are complete implementations.

**Type consistency:**
- `NodeStatus` defined in `path-map.tsx`, used in `page.tsx` — imported correctly
- `Slide` / `VisualSlide` / `McSlide` defined in `node-lesson.tsx`, content arrays in `page.tsx` typed as `Slide[]`
- `useSynthEngine` returns `{ params, setParam, noteOn, noteOff, playNote, getWaveform }` — all destructured correctly in `page.tsx`
- `NodeCreate` receives `playNote: (note: string, duration?: string) => void` — matches `useSynthEngine` signature
- `NodeReview` receives `masteryLevel` prop — defined in component signature ✅
