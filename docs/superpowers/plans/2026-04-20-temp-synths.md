# Synth Progression (/temp-synths) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/temp-synths` with 5 child pages — 3 fully functional Web Audio API synths and 2 high-fidelity UI-only pages — matching the app's existing styling and reusing its existing `Knob`, `Fader`, `PianoKeyboard`, and `WaveformSelect` components.

**Architecture:** Each synth page is a `"use client"` Next.js page with a class-based audio engine that wraps Web Audio API nodes. A shared singleton module (`audio-ctx.ts`) owns the `AudioContext` and provides helpers used by all three functional engines. Routing: `src/app/temp-synths/layout.tsx` provides a sticky nav; `src/app/temp-synths/page.tsx` redirects to `/temp-synths/1`.

**Tech Stack:** Next.js 16 App Router, Web Audio API (no Tone.js), React hooks, existing `Knob`/`Fader`/`PianoKeyboard`/`WaveformSelect` from `src/components/synth/`, CSS custom properties (`--background`, `--card`, `--border`, `--primary`, `--muted`, `--muted-foreground`, `--foreground`), Tailwind v4.

---

## File Map

```
src/app/temp-synths/
  layout.tsx              nav tabs + sticky header ("use client" for usePathname)
  page.tsx                server component, redirects to /temp-synths/1
  audio-ctx.ts            singleton AudioContext, noteNameToFreq(), buildReverb()
  waveform-canvas.tsx     local AnalyserNode canvas (same interface as temp-learning-path/visuals)
  1/
    engine.ts             Synth1Engine class (oscillator, filter, attack/release, reverb)
    page.tsx              Synth 1 UI ("use client")
  2/
    engine.ts             Synth2Engine class (osc + sub, filter cutoff/res, ADSR, reverb, delay)
    page.tsx              Synth 2 UI ("use client")
  3/
    engine.ts             Synth3Engine class (dual osc, filter, dual ADSR, LFO)
    page.tsx              Synth 3 UI ("use client")
  4/
    page.tsx              Synth 4 UI only ("use client")
  5/
    page.tsx              Synth 5 UI only ("use client")
```

**Existing components used (do not recreate):**
- `src/components/synth/knob.tsx` — `Knob` — drag-to-change SVG arc knob
- `src/components/synth/fader.tsx` — `Fader` — vertical range slider
- `src/components/synth/piano-keyboard.tsx` — `PianoKeyboard` — `onNoteOn(note: string, velocity: number)`, `onNoteOff(note: string)`
- `src/components/synth/waveform-select.tsx` — `WaveformSelect` — icon button group for waveform type

---

## Task 1: Routing skeleton + shared utilities

**Files:**
- Create: `src/app/temp-synths/layout.tsx`
- Create: `src/app/temp-synths/page.tsx`
- Create: `src/app/temp-synths/audio-ctx.ts`
- Create: `src/app/temp-synths/waveform-canvas.tsx`

- [ ] **Step 1: Create `audio-ctx.ts`**

```ts
// src/app/temp-synths/audio-ctx.ts
let _ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === "suspended") void _ctx.resume();
  return _ctx;
}

export function noteNameToFreq(note: string): number {
  const MAP: Record<string, number> = {
    C: 0, "C#": 1, D: 2, "D#": 3, E: 4,
    F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
  };
  const m = note.match(/^([A-G]#?)(\d+)$/);
  if (!m) return 440;
  return 440 * Math.pow(2, (parseInt(m[2]) - 4) + (MAP[m[1]] - 9) / 12);
}

export function buildReverb(ctx: AudioContext): { input: GainNode; output: GainNode } {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const times = [0.029, 0.037, 0.041, 0.043];
  const gains = [0.85, 0.83, 0.81, 0.79];
  times.forEach((t, i) => {
    const d = ctx.createDelay(1);
    d.delayTime.value = t;
    const fb = ctx.createGain();
    fb.gain.value = gains[i];
    input.connect(d);
    d.connect(fb);
    fb.connect(d);
    fb.connect(output);
  });
  return { input, output };
}
```

- [ ] **Step 2: Create `waveform-canvas.tsx`**

```tsx
// src/app/temp-synths/waveform-canvas.tsx
"use client";

import { useEffect, useRef } from "react";

interface WaveformCanvasProps {
  getWaveform: () => Float32Array;
  width?: number;
  height?: number;
}

export function WaveformCanvas({ getWaveform, width = 320, height = 80 }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const getRef = useRef(getWaveform);

  useEffect(() => { getRef.current = getWaveform; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx2 = canvas.getContext("2d");
    if (!ctx2) return;
    ctx2.scale(dpr, dpr);

    const draw = () => {
      const data = getRef.current();
      ctx2.clearRect(0, 0, width, height);
      ctx2.strokeStyle = "oklch(0.556 0 0 / 40%)";
      ctx2.lineWidth = 1;
      ctx2.beginPath();
      ctx2.moveTo(0, height / 2);
      ctx2.lineTo(width, height / 2);
      ctx2.stroke();

      ctx2.strokeStyle = "var(--primary)";
      ctx2.lineWidth = 2;
      ctx2.lineJoin = "round";
      ctx2.beginPath();
      const step = Math.max(1, Math.floor(data.length / width));
      for (let i = 0; i < width; i++) {
        const s = data[i * step] ?? 0;
        const y = height / 2 - s * (height / 2 - 4);
        i === 0 ? ctx2.moveTo(i, y) : ctx2.lineTo(i, y);
      }
      ctx2.stroke();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        background: "var(--muted)",
        borderRadius: 8,
        border: "1px solid var(--border)",
        display: "block",
      }}
    />
  );
}
```

- [ ] **Step 3: Create `layout.tsx`**

```tsx
// src/app/temp-synths/layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const SYNTHS = [
  { n: 1, label: "The Starter" },
  { n: 2, label: "The Learner" },
  { n: 3, label: "The Classic" },
  { n: 4, label: "The Producer" },
  { n: 5, label: "The Lab" },
];

export default function TempSynthsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: "100dvh", background: "var(--background)", color: "var(--foreground)" }}>
      {/* Sticky nav */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          height: 48,
          background: "var(--background)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
          overflowX: "auto",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--muted-foreground)",
            whiteSpace: "nowrap",
            marginRight: 4,
          }}
        >
          Synth Lab
        </span>
        {SYNTHS.map(({ n, label }) => {
          const href = `/temp-synths/${n}`;
          const active = pathname === href;
          return (
            <Link
              key={n}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                borderRadius: 8,
                border: "1px solid",
                borderColor: active ? "var(--primary)" : "var(--border)",
                background: active ? "oklch(from var(--primary) l c h / 8%)" : "var(--card)",
                color: active ? "var(--foreground)" : "var(--muted-foreground)",
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                textDecoration: "none",
                whiteSpace: "nowrap",
                transition: "all 150ms",
              }}
            >
              <span style={{ fontSize: 10, opacity: 0.6 }}>{n}</span>
              {label}
            </Link>
          );
        })}
      </div>

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Create redirect `page.tsx`**

```tsx
// src/app/temp-synths/page.tsx
import { redirect } from "next/navigation";

export default function TempSynthsRoot() {
  redirect("/temp-synths/1");
}
```

- [ ] **Step 5: Verify — run `npm run lint` and navigate to `/temp-synths` in browser**

Expected: redirects to `/temp-synths/1`, shows sticky nav with 5 synth tabs. Lint passes.

- [ ] **Step 6: Commit**

```bash
git add src/app/temp-synths/layout.tsx src/app/temp-synths/page.tsx \
        src/app/temp-synths/audio-ctx.ts src/app/temp-synths/waveform-canvas.tsx
git commit -m "feat: add /temp-synths routing skeleton, AudioContext manager, WaveformCanvas"
```

---

## Task 2: Synth 1 engine

**Files:**
- Create: `src/app/temp-synths/1/engine.ts`

Signal chain: `osc → envGain → filter(lowpass) → dryGain → analyser → dest`
                                                 `→ reverbWetGain → reverb → analyser`

- [ ] **Step 1: Create `1/engine.ts`**

```ts
// src/app/temp-synths/1/engine.ts
import { getAudioContext, noteNameToFreq, buildReverb } from "../audio-ctx";

export class Synth1Engine {
  private ctx: AudioContext;
  private osc: OscillatorNode | null = null;
  private envGain: GainNode;
  private filter: BiquadFilterNode;
  private dryGain: GainNode;
  private reverbWet: GainNode;
  private reverb: { input: GainNode; output: GainNode };
  private analyser: AnalyserNode;
  private buf: Float32Array;

  waveform: OscillatorType = "sine";
  filterFreq = 4000;
  attack = 0.02;
  release = 0.5;
  reverbOn = false;

  constructor() {
    this.ctx = getAudioContext();

    this.envGain = this.ctx.createGain();
    this.envGain.gain.value = 0;

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = this.filterFreq;

    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 1;

    this.reverbWet = this.ctx.createGain();
    this.reverbWet.gain.value = 0;

    this.reverb = buildReverb(this.ctx);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.buf = new Float32Array(this.analyser.fftSize);

    // Wire up
    this.envGain.connect(this.filter);
    this.filter.connect(this.dryGain);
    this.filter.connect(this.reverbWet);
    this.dryGain.connect(this.analyser);
    this.reverbWet.connect(this.reverb.input);
    this.reverb.output.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  noteOn(note: string, velocity = 0.8): void {
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.osc?.stop();
    const osc = this.ctx.createOscillator();
    osc.type = this.waveform;
    osc.frequency.value = noteNameToFreq(note);
    osc.connect(this.envGain);
    osc.start();
    this.osc = osc;

    const now = this.ctx.currentTime;
    this.envGain.gain.cancelScheduledValues(now);
    this.envGain.gain.setValueAtTime(0, now);
    this.envGain.gain.linearRampToValueAtTime(velocity, now + this.attack);
  }

  noteOff(_note: string): void {
    const now = this.ctx.currentTime;
    const held = this.envGain.gain.value;
    this.envGain.gain.cancelScheduledValues(now);
    this.envGain.gain.setValueAtTime(held, now);
    this.envGain.gain.linearRampToValueAtTime(0, now + this.release);
    this.osc?.stop(now + this.release + 0.05);
    this.osc = null;
  }

  setWaveform(t: OscillatorType): void {
    this.waveform = t;
    if (this.osc) this.osc.type = t;
  }

  setFilterFreq(hz: number): void {
    this.filterFreq = hz;
    this.filter.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.01);
  }

  setAttack(s: number): void { this.attack = s; }
  setRelease(s: number): void { this.release = s; }

  setReverb(on: boolean): void {
    this.reverbOn = on;
    const now = this.ctx.currentTime;
    this.dryGain.gain.setTargetAtTime(on ? 0.65 : 1, now, 0.02);
    this.reverbWet.gain.setTargetAtTime(on ? 0.5 : 0, now, 0.02);
  }

  getWaveform(): Float32Array {
    this.analyser.getFloatTimeDomainData(this.buf);
    return this.buf;
  }

  dispose(): void {
    this.osc?.stop();
    this.analyser.disconnect();
    this.envGain.disconnect();
  }
}
```

- [ ] **Step 2: Verify — `npm run lint`**

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/temp-synths/1/engine.ts
git commit -m "feat: add Synth1Engine (oscillator, filter, envelope, reverb)"
```

---

## Task 3: Synth 1 page UI

**Files:**
- Create: `src/app/temp-synths/1/page.tsx`

- [ ] **Step 1: Create `1/page.tsx`**

```tsx
// src/app/temp-synths/1/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { WaveformCanvas } from "../waveform-canvas";
import { Synth1Engine } from "./engine";

const SECTION: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 20px",
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "var(--muted-foreground)",
  marginBottom: 12,
};

export default function Synth1Page() {
  const engineRef = useRef<Synth1Engine | null>(null);

  const [waveform, setWaveformState] = useState<string>("sine");
  const [filterFreq, setFilterFreqState] = useState(4000);
  const [attack, setAttackState] = useState(0.02);
  const [release, setReleaseState] = useState(0.5);
  const [reverb, setReverbState] = useState(false);

  useEffect(() => {
    engineRef.current = new Synth1Engine();
    return () => engineRef.current?.dispose();
  }, []);

  const noteOn = useCallback((note: string, vel: number) => {
    engineRef.current?.noteOn(note, vel);
  }, []);

  const noteOff = useCallback((note: string) => {
    engineRef.current?.noteOff(note);
  }, []);

  const getWaveform = useCallback((): Float32Array => {
    return engineRef.current?.getWaveform() ?? new Float32Array(1024);
  }, []);

  const handleWaveform = (v: string) => {
    setWaveformState(v);
    engineRef.current?.setWaveform(v as OscillatorType);
  };

  const handleFilterFreq = (hz: number) => {
    setFilterFreqState(hz);
    engineRef.current?.setFilterFreq(hz);
  };

  const handleAttack = (s: number) => {
    setAttackState(s);
    engineRef.current?.setAttack(s);
  };

  const handleRelease = (s: number) => {
    setReleaseState(s);
    engineRef.current?.setRelease(s);
  };

  const handleReverb = () => {
    const next = !reverb;
    setReverbState(next);
    engineRef.current?.setReverb(next);
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 80px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>The Starter</p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
          Oscillator · Filter · Envelope · Reverb
        </p>
      </div>

      {/* Waveform display */}
      <div style={{ ...SECTION, display: "flex", justifyContent: "center" }}>
        <WaveformCanvas getWaveform={getWaveform} width={560} height={80} />
      </div>

      {/* Oscillator */}
      <div style={SECTION}>
        <p style={LABEL}>Oscillator</p>
        <WaveformSelect
          value={waveform}
          options={["sine", "square", "sawtooth", "triangle"]}
          onChange={handleWaveform}
          label="Waveform"
        />
      </div>

      {/* Filter */}
      <div style={SECTION}>
        <p style={LABEL}>Filter</p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Knob
            value={filterFreq}
            min={80}
            max={18000}
            step={10}
            label="Tone"
            unit="Hz"
            onChange={handleFilterFreq}
            size="lg"
          />
        </div>
      </div>

      {/* Envelope */}
      <div style={SECTION}>
        <p style={LABEL}>Envelope</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 32 }}>
          <Fader
            value={attack}
            min={0.001}
            max={2}
            step={0.001}
            label="Attack"
            unit="s"
            onChange={handleAttack}
          />
          <Fader
            value={release}
            min={0.05}
            max={4}
            step={0.01}
            label="Release"
            unit="s"
            onChange={handleRelease}
          />
        </div>
      </div>

      {/* FX */}
      <div style={SECTION}>
        <p style={LABEL}>FX</p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={handleReverb}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: reverb ? "var(--primary)" : "var(--border)",
              background: reverb ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
              color: reverb ? "var(--foreground)" : "var(--muted-foreground)",
              fontSize: 13,
              fontWeight: reverb ? 600 : 400,
              cursor: "pointer",
              transition: "all 150ms",
            }}
          >
            Reverb {reverb ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Keyboard */}
      <div style={SECTION}>
        <PianoKeyboard onNoteOn={noteOn} onNoteOff={noteOff} startOctave={3} octaves={2} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify — navigate to `/temp-synths/1`, play notes, tweak all controls**

Expected: waveform animates, filter tone knob audibly changes brightness, attack/release faders work, reverb toggle adds space.

- [ ] **Step 3: Commit**

```bash
git add src/app/temp-synths/1/page.tsx
git commit -m "feat: add Synth 1 (The Starter) — oscillator, filter, envelope, reverb"
```

---

## Task 4: Synth 2 engine

**Files:**
- Create: `src/app/temp-synths/2/engine.ts`

Signal chain: `[osc + subOsc] → envGain → filter → master → analyser → dest`
Reverb and delay are parallel sends from `master`.

- [ ] **Step 1: Create `2/engine.ts`**

```ts
// src/app/temp-synths/2/engine.ts
import { getAudioContext, noteNameToFreq, buildReverb } from "../audio-ctx";

export class Synth2Engine {
  private ctx: AudioContext;
  private osc: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private oscGain: GainNode;
  private subGain: GainNode;
  private envGain: GainNode;
  private filter: BiquadFilterNode;
  private master: GainNode;
  private reverbSend: GainNode;
  private reverb: { input: GainNode; output: GainNode };
  private delayNode: DelayNode;
  private delayFeedback: GainNode;
  private delaySend: GainNode;
  private analyser: AnalyserNode;
  private buf: Float32Array;

  waveform: OscillatorType = "sawtooth";
  subEnabled = false;
  cutoff = 3000;
  resonance = 1;
  attack = 0.05;
  sustainOn = true;
  release = 0.6;
  reverbOn = false;
  delayAmount = 0;

  private currentNote: string | null = null;

  constructor() {
    this.ctx = getAudioContext();

    this.oscGain = this.ctx.createGain();
    this.oscGain.gain.value = 0.8;

    this.subGain = this.ctx.createGain();
    this.subGain.gain.value = 0; // off by default

    this.envGain = this.ctx.createGain();
    this.envGain.gain.value = 0;

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = this.cutoff;
    this.filter.Q.value = this.resonance;

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;

    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = 0;
    this.reverb = buildReverb(this.ctx);

    this.delayNode = this.ctx.createDelay(1);
    this.delayNode.delayTime.value = 0.25;
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.35;
    this.delaySend = this.ctx.createGain();
    this.delaySend.gain.value = 0;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.buf = new Float32Array(this.analyser.fftSize);

    // Wire
    this.oscGain.connect(this.envGain);
    this.subGain.connect(this.envGain);
    this.envGain.connect(this.filter);
    this.filter.connect(this.master);

    // Reverb send
    this.filter.connect(this.reverbSend);
    this.reverbSend.connect(this.reverb.input);
    this.reverb.output.connect(this.master);

    // Delay send (with feedback loop)
    this.filter.connect(this.delaySend);
    this.delaySend.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.master);

    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  noteOn(note: string, velocity = 0.8): void {
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.osc?.stop();
    this.subOsc?.stop();

    const freq = noteNameToFreq(note);

    const osc = this.ctx.createOscillator();
    osc.type = this.waveform;
    osc.frequency.value = freq;
    osc.connect(this.oscGain);
    osc.start();
    this.osc = osc;

    if (this.subEnabled) {
      const sub = this.ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.value = freq / 2;
      sub.connect(this.subGain);
      sub.start();
      this.subOsc = sub;
      this.subGain.gain.value = 0.5;
    }

    this.currentNote = note;
    const now = this.ctx.currentTime;
    this.envGain.gain.cancelScheduledValues(now);
    this.envGain.gain.setValueAtTime(0, now);
    this.envGain.gain.linearRampToValueAtTime(velocity, now + this.attack);
    // If no sustain, ramp back down after attack
    if (!this.sustainOn) {
      this.envGain.gain.linearRampToValueAtTime(0, now + this.attack + this.release);
    }
  }

  noteOff(note: string): void {
    if (note !== this.currentNote) return;
    const now = this.ctx.currentTime;
    const held = this.envGain.gain.value;
    this.envGain.gain.cancelScheduledValues(now);
    this.envGain.gain.setValueAtTime(held, now);
    this.envGain.gain.linearRampToValueAtTime(0, now + this.release);
    const stopAt = now + this.release + 0.05;
    this.osc?.stop(stopAt);
    this.subOsc?.stop(stopAt);
    this.osc = null;
    this.subOsc = null;
    this.currentNote = null;
  }

  setWaveform(t: OscillatorType): void {
    this.waveform = t;
    if (this.osc) this.osc.type = t;
  }

  setSubEnabled(on: boolean): void {
    this.subEnabled = on;
    this.subGain.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.02);
  }

  setCutoff(hz: number): void {
    this.cutoff = hz;
    this.filter.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.01);
  }

  setResonance(q: number): void {
    this.resonance = q;
    this.filter.Q.setTargetAtTime(q, this.ctx.currentTime, 0.01);
  }

  setAttack(s: number): void { this.attack = s; }
  setSustain(on: boolean): void { this.sustainOn = on; }
  setRelease(s: number): void { this.release = s; }

  setReverb(on: boolean): void {
    this.reverbOn = on;
    this.reverbSend.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.02);
    this.master.gain.setTargetAtTime(on ? 0.7 : 0.8, this.ctx.currentTime, 0.02);
  }

  setDelay(amount: number): void {
    this.delayAmount = amount;
    this.delaySend.gain.setTargetAtTime(amount * 0.6, this.ctx.currentTime, 0.02);
  }

  getWaveform(): Float32Array {
    this.analyser.getFloatTimeDomainData(this.buf);
    return this.buf;
  }

  dispose(): void {
    this.osc?.stop();
    this.subOsc?.stop();
    this.analyser.disconnect();
    this.envGain.disconnect();
  }
}
```

- [ ] **Step 2: Verify — `npm run lint`**

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/temp-synths/2/engine.ts
git commit -m "feat: add Synth2Engine (sub osc, filter, ADSR, reverb, delay)"
```

---

## Task 5: Synth 2 page UI

**Files:**
- Create: `src/app/temp-synths/2/page.tsx`

The envelope curve visualizer is an SVG that renders the ADSR shape based on current parameter values.

- [ ] **Step 1: Create `2/page.tsx`**

```tsx
// src/app/temp-synths/2/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { WaveformCanvas } from "../waveform-canvas";
import { Synth2Engine } from "./engine";

const SECTION: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 20px",
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "var(--muted-foreground)",
  marginBottom: 12,
};

function EnvelopeCurve({ attack, release, sustainOn }: { attack: number; release: number; sustainOn: boolean }) {
  const W = 260;
  const H = 60;
  const maxT = 3;

  const aX = (Math.min(attack, maxT) / maxT) * (W * 0.3);
  const sX = W * 0.55;
  const rEnd = W * 0.85 + (Math.min(release, maxT) / maxT) * (W * 0.15);
  const top = 8;
  const bot = H - 8;
  const mid = sustainOn ? top + (bot - top) * 0.3 : bot;

  const d = `M 0 ${bot} L ${aX} ${top} L ${sX} ${mid} L ${rEnd} ${bot}`;

  return (
    <svg width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={aX} cy={top} r={3} fill="var(--primary)" />
      <circle cx={sX} cy={mid} r={3} fill="var(--primary)" />
      <circle cx={rEnd} cy={bot} r={3} fill="var(--primary)" />
    </svg>
  );
}

export default function Synth2Page() {
  const engineRef = useRef<Synth2Engine | null>(null);

  const [waveform, setWaveformState] = useState<string>("sawtooth");
  const [subEnabled, setSubState] = useState(false);
  const [cutoff, setCutoffState] = useState(3000);
  const [resonance, setResState] = useState(1);
  const [attack, setAttackState] = useState(0.05);
  const [sustainOn, setSustainState] = useState(true);
  const [release, setReleaseState] = useState(0.6);
  const [reverbOn, setReverbState] = useState(false);
  const [delayAmount, setDelayState] = useState(0);

  useEffect(() => {
    engineRef.current = new Synth2Engine();
    return () => engineRef.current?.dispose();
  }, []);

  const noteOn = useCallback((note: string, vel: number) => engineRef.current?.noteOn(note, vel), []);
  const noteOff = useCallback((note: string) => engineRef.current?.noteOff(note), []);
  const getWaveform = useCallback((): Float32Array => engineRef.current?.getWaveform() ?? new Float32Array(1024), []);

  const handleWaveform = (v: string) => { setWaveformState(v); engineRef.current?.setWaveform(v as OscillatorType); };
  const handleSub = () => { const n = !subEnabled; setSubState(n); engineRef.current?.setSubEnabled(n); };
  const handleCutoff = (hz: number) => { setCutoffState(hz); engineRef.current?.setCutoff(hz); };
  const handleRes = (q: number) => { setResState(q); engineRef.current?.setResonance(q); };
  const handleAttack = (s: number) => { setAttackState(s); engineRef.current?.setAttack(s); };
  const handleSustain = () => { const n = !sustainOn; setSustainState(n); engineRef.current?.setSustain(n); };
  const handleRelease = (s: number) => { setReleaseState(s); engineRef.current?.setRelease(s); };
  const handleReverb = () => { const n = !reverbOn; setReverbState(n); engineRef.current?.setReverb(n); };
  const handleDelay = (v: number) => { setDelayState(v); engineRef.current?.setDelay(v); };

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    padding: "6px 14px",
    borderRadius: 8,
    border: "1px solid",
    borderColor: on ? "var(--primary)" : "var(--border)",
    background: on ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
    color: on ? "var(--foreground)" : "var(--muted-foreground)",
    fontSize: 12,
    fontWeight: on ? 600 : 400,
    cursor: "pointer",
    transition: "all 150ms",
  });

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 80px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>The Learner</p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
          Osc + Sub · Filter · ADSR · Reverb + Delay
        </p>
      </div>

      {/* Waveform display */}
      <div style={{ ...SECTION, display: "flex", justifyContent: "center" }}>
        <WaveformCanvas getWaveform={getWaveform} width={560} height={80} />
      </div>

      {/* Oscillator */}
      <div style={SECTION}>
        <p style={LABEL}>Oscillator</p>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <WaveformSelect value={waveform} options={["sine", "square", "sawtooth", "triangle"]} onChange={handleWaveform} label="Waveform" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--muted-foreground)", textAlign: "center" }}>Sub Osc</span>
            <button onClick={handleSub} style={toggleStyle(subEnabled)}>
              Sub {subEnabled ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={SECTION}>
        <p style={LABEL}>Filter</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 32 }}>
          <Knob value={cutoff} min={80} max={18000} step={10} label="Cutoff" unit="Hz" onChange={handleCutoff} size="md" />
          <Knob value={resonance} min={0.1} max={20} step={0.1} label="Resonance" unit="Q" onChange={handleRes} size="md" />
        </div>
      </div>

      {/* Envelope */}
      <div style={SECTION}>
        <p style={LABEL}>Envelope</p>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 24 }}>
            <Fader value={attack} min={0.001} max={2} step={0.001} label="Attack" unit="s" onChange={handleAttack} />
            <Fader value={release} min={0.05} max={4} step={0.01} label="Release" unit="s" onChange={handleRelease} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 16 }}>
            <button onClick={handleSustain} style={toggleStyle(sustainOn)}>
              Sustain {sustainOn ? "ON" : "OFF"}
            </button>
            <EnvelopeCurve attack={attack} release={release} sustainOn={sustainOn} />
          </div>
        </div>
      </div>

      {/* FX */}
      <div style={SECTION}>
        <p style={LABEL}>FX</p>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={handleReverb} style={toggleStyle(reverbOn)}>
            Reverb {reverbOn ? "ON" : "OFF"}
          </button>
          <Knob value={delayAmount} min={0} max={1} step={0.01} label="Delay" onChange={handleDelay} size="md" />
        </div>
      </div>

      {/* Keyboard */}
      <div style={SECTION}>
        <PianoKeyboard onNoteOn={noteOn} onNoteOff={noteOff} startOctave={3} octaves={2} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify — navigate to `/temp-synths/2`, play notes, test sub osc toggle, cutoff/resonance, envelope**

Expected: sub toggle adds low-frequency bass layer; envelope curve SVG updates live as sliders move; delay knob adds echo.

- [ ] **Step 3: Commit**

```bash
git add src/app/temp-synths/2/page.tsx
git commit -m "feat: add Synth 2 (The Learner) — sub osc, filter, ADSR, reverb, delay"
```

---

## Task 6: Synth 3 engine

**Files:**
- Create: `src/app/temp-synths/3/engine.ts`

Signal chain: `[osc1Gain + osc2Gain] → filter → ampEnvGain → analyser → dest`
LFO routes to either `osc.detune` (pitch) or `filter.frequency` (filter).
Filter envelope modulates `filter.frequency` using AudioParam scheduling.

- [ ] **Step 1: Create `3/engine.ts`**

```ts
// src/app/temp-synths/3/engine.ts
import { getAudioContext, noteNameToFreq } from "../audio-ctx";

export class Synth3Engine {
  private ctx: AudioContext;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private osc1Gain: GainNode;
  private osc2Gain: GainNode;
  private filter: BiquadFilterNode;
  private ampEnvGain: GainNode;
  private master: GainNode;
  private analyser: AnalyserNode;
  private buf: Float32Array;

  // LFO
  private lfo: OscillatorNode;
  private lfoDepthGain: GainNode;
  private lfoPitchGate: GainNode;  // → osc.detune
  private lfoFilterGate: GainNode; // → filter.frequency

  // Params
  osc1Type: OscillatorType = "sawtooth";
  osc2Type: OscillatorType = "sawtooth";
  osc2Detune = 7;
  oscMix = 0.5;

  filterType: BiquadFilterType = "lowpass";
  filterCutoff = 3000;
  filterResonance = 2;

  ampAttack = 0.05;
  ampDecay = 0.2;
  ampSustain = 0.7;
  ampRelease = 0.5;

  filterEnvAmount = 2000;
  filterEnvAttack = 0.1;
  filterEnvDecay = 0.3;
  filterEnvSustain = 0.3;
  filterEnvRelease = 0.4;

  lfoType: OscillatorType = "sine";
  lfoRate = 4;
  lfoDepth = 30;
  lfoRoute: "pitch" | "filter" = "pitch";

  private currentStopTime = 0;

  constructor() {
    this.ctx = getAudioContext();

    this.osc1Gain = this.ctx.createGain();
    this.osc1Gain.gain.value = 1 - this.oscMix;

    this.osc2Gain = this.ctx.createGain();
    this.osc2Gain.gain.value = this.oscMix;

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = this.filterType;
    this.filter.frequency.value = this.filterCutoff;
    this.filter.Q.value = this.filterResonance;

    this.ampEnvGain = this.ctx.createGain();
    this.ampEnvGain.gain.value = 0;

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.buf = new Float32Array(this.analyser.fftSize);

    // LFO setup
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = this.lfoType;
    this.lfo.frequency.value = this.lfoRate;

    this.lfoDepthGain = this.ctx.createGain();
    this.lfoDepthGain.gain.value = this.lfoDepth;

    this.lfoPitchGate = this.ctx.createGain();
    this.lfoPitchGate.gain.value = 1; // active (pitch route by default)

    this.lfoFilterGate = this.ctx.createGain();
    this.lfoFilterGate.gain.value = 0; // inactive

    this.lfo.connect(this.lfoDepthGain);
    this.lfoDepthGain.connect(this.lfoPitchGate);
    this.lfoDepthGain.connect(this.lfoFilterGate);
    this.lfoFilterGate.connect(this.filter.frequency);

    this.lfo.start();

    // Main signal chain
    this.osc1Gain.connect(this.filter);
    this.osc2Gain.connect(this.filter);
    this.filter.connect(this.ampEnvGain);
    this.ampEnvGain.connect(this.master);
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  noteOn(note: string, velocity = 0.8): void {
    if (this.ctx.state === "suspended") void this.ctx.resume();
    // Stop previous oscs cleanly
    this.osc1?.stop();
    this.osc2?.stop();

    const freq = noteNameToFreq(note);
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    osc1.type = this.osc1Type;
    osc1.frequency.value = freq;
    osc1.connect(this.osc1Gain);

    const osc2 = this.ctx.createOscillator();
    osc2.type = this.osc2Type;
    osc2.frequency.value = freq;
    osc2.detune.value = this.osc2Detune;
    osc2.connect(this.osc2Gain);

    // Connect LFO pitch gate to new oscs
    if (this.lfoRoute === "pitch") {
      try { this.lfoPitchGate.disconnect(); } catch { /* no prior connection */ }
      this.lfoPitchGate.connect(osc1.detune);
      this.lfoPitchGate.connect(osc2.detune);
    }

    osc1.start(now);
    osc2.start(now);
    this.osc1 = osc1;
    this.osc2 = osc2;

    // Amp envelope
    this.ampEnvGain.gain.cancelScheduledValues(now);
    this.ampEnvGain.gain.setValueAtTime(0, now);
    this.ampEnvGain.gain.linearRampToValueAtTime(velocity, now + this.ampAttack);
    this.ampEnvGain.gain.linearRampToValueAtTime(
      velocity * this.ampSustain,
      now + this.ampAttack + this.ampDecay
    );

    // Filter envelope
    const base = this.filterCutoff;
    const peak = base + this.filterEnvAmount;
    const sus = base + this.filterEnvAmount * this.filterEnvSustain;
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(base, now);
    this.filter.frequency.linearRampToValueAtTime(peak, now + this.filterEnvAttack);
    this.filter.frequency.linearRampToValueAtTime(sus, now + this.filterEnvAttack + this.filterEnvDecay);
  }

  noteOff(_note: string): void {
    const now = this.ctx.currentTime;

    // Amp release
    const heldAmp = this.ampEnvGain.gain.value;
    this.ampEnvGain.gain.cancelScheduledValues(now);
    this.ampEnvGain.gain.setValueAtTime(heldAmp, now);
    this.ampEnvGain.gain.linearRampToValueAtTime(0, now + this.ampRelease);

    // Filter release
    const heldFreq = this.filter.frequency.value;
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(heldFreq, now);
    this.filter.frequency.linearRampToValueAtTime(this.filterCutoff, now + this.filterEnvRelease);

    const stopAt = now + Math.max(this.ampRelease, this.filterEnvRelease) + 0.05;
    this.currentStopTime = stopAt;
    this.osc1?.stop(stopAt);
    this.osc2?.stop(stopAt);
    this.osc1 = null;
    this.osc2 = null;
  }

  setOsc1Type(t: OscillatorType): void {
    this.osc1Type = t;
    if (this.osc1) this.osc1.type = t;
  }

  setOsc2Type(t: OscillatorType): void {
    this.osc2Type = t;
    if (this.osc2) this.osc2.type = t;
  }

  setOsc2Detune(cents: number): void {
    this.osc2Detune = cents;
    if (this.osc2) this.osc2.detune.setTargetAtTime(cents, this.ctx.currentTime, 0.01);
  }

  setOscMix(mix: number): void {
    this.oscMix = mix;
    this.osc1Gain.gain.setTargetAtTime(1 - mix, this.ctx.currentTime, 0.01);
    this.osc2Gain.gain.setTargetAtTime(mix, this.ctx.currentTime, 0.01);
  }

  setFilterType(t: BiquadFilterType): void {
    this.filterType = t;
    this.filter.type = t;
  }

  setFilterCutoff(hz: number): void {
    this.filterCutoff = hz;
    this.filter.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.01);
  }

  setFilterResonance(q: number): void {
    this.filterResonance = q;
    this.filter.Q.setTargetAtTime(q, this.ctx.currentTime, 0.01);
  }

  setAmpAttack(s: number): void { this.ampAttack = s; }
  setAmpDecay(s: number): void { this.ampDecay = s; }
  setAmpSustain(v: number): void { this.ampSustain = v; }
  setAmpRelease(s: number): void { this.ampRelease = s; }

  setFilterEnvAmount(hz: number): void { this.filterEnvAmount = hz; }
  setFilterEnvAttack(s: number): void { this.filterEnvAttack = s; }
  setFilterEnvDecay(s: number): void { this.filterEnvDecay = s; }
  setFilterEnvSustain(v: number): void { this.filterEnvSustain = v; }
  setFilterEnvRelease(s: number): void { this.filterEnvRelease = s; }

  setLfoType(t: OscillatorType): void {
    this.lfoType = t;
    this.lfo.type = t;
  }

  setLfoRate(hz: number): void {
    this.lfoRate = hz;
    this.lfo.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.01);
  }

  setLfoDepth(depth: number): void {
    this.lfoDepth = depth;
    // Scale: pitch → cents (0-200), filter → Hz (0-2000)
    const scale = this.lfoRoute === "pitch" ? 2 : 20;
    this.lfoDepthGain.gain.setTargetAtTime(depth * scale, this.ctx.currentTime, 0.01);
  }

  setLfoRoute(route: "pitch" | "filter"): void {
    this.lfoRoute = route;
    const now = this.ctx.currentTime;
    if (route === "pitch") {
      this.lfoFilterGate.gain.setTargetAtTime(0, now, 0.02);
      this.lfoPitchGate.gain.setTargetAtTime(1, now, 0.02);
      // Reconnect to current oscs if playing
      if (this.osc1 && this.osc2) {
        try { this.lfoPitchGate.disconnect(); } catch { /* ok */ }
        this.lfoPitchGate.connect(this.osc1.detune);
        this.lfoPitchGate.connect(this.osc2.detune);
        // Reconnect filter gate to filter (was disconnected)
        this.lfoFilterGate.connect(this.filter.frequency);
      }
    } else {
      this.lfoPitchGate.gain.setTargetAtTime(0, now, 0.02);
      this.lfoFilterGate.gain.setTargetAtTime(1, now, 0.02);
    }
    // Update depth scaling
    this.setLfoDepth(this.lfoDepth);
  }

  getWaveform(): Float32Array {
    this.analyser.getFloatTimeDomainData(this.buf);
    return this.buf;
  }

  dispose(): void {
    this.osc1?.stop();
    this.osc2?.stop();
    this.lfo.stop();
    this.analyser.disconnect();
  }
}
```

- [ ] **Step 2: Verify — `npm run lint`**

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/temp-synths/3/engine.ts
git commit -m "feat: add Synth3Engine (dual osc, filter, dual ADSR, LFO pitch/filter route)"
```

---

## Task 7: Synth 3 page UI

**Files:**
- Create: `src/app/temp-synths/3/page.tsx`

Layout: three-column signal flow (OSC → FILTER → AMP), then LFO row, then waveform + keyboard.

- [ ] **Step 1: Create `3/page.tsx`**

```tsx
// src/app/temp-synths/3/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { WaveformCanvas } from "../waveform-canvas";
import { Synth3Engine } from "./engine";

const SECTION: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 20px",
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "var(--muted-foreground)",
  marginBottom: 12,
};

const SUBLABEL: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--muted-foreground)",
  marginBottom: 8,
};

function FilterTypeSelect({ value, onChange }: { value: BiquadFilterType; onChange: (v: BiquadFilterType) => void }) {
  const options: BiquadFilterType[] = ["lowpass", "highpass", "bandpass"];
  const labels: Record<string, string> = { lowpass: "LP", highpass: "HP", bandpass: "BP" };
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: "1px solid",
            borderColor: value === o ? "var(--primary)" : "var(--border)",
            background: value === o ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
            color: value === o ? "var(--foreground)" : "var(--muted-foreground)",
            fontSize: 11,
            fontWeight: value === o ? 600 : 400,
            cursor: "pointer",
            transition: "all 150ms",
          }}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

export default function Synth3Page() {
  const engineRef = useRef<Synth3Engine | null>(null);

  const [osc1Type, setOsc1Type] = useState<string>("sawtooth");
  const [osc2Type, setOsc2Type] = useState<string>("sawtooth");
  const [osc2Detune, setOsc2Detune] = useState(7);
  const [oscMix, setOscMix] = useState(0.5);

  const [filterType, setFilterTypeState] = useState<BiquadFilterType>("lowpass");
  const [filterCutoff, setFilterCutoff] = useState(3000);
  const [filterRes, setFilterRes] = useState(2);

  const [ampA, setAmpA] = useState(0.05);
  const [ampD, setAmpD] = useState(0.2);
  const [ampS, setAmpS] = useState(0.7);
  const [ampR, setAmpR] = useState(0.5);

  const [fEnvAmt, setFEnvAmt] = useState(2000);
  const [fEnvA, setFEnvA] = useState(0.1);
  const [fEnvD, setFEnvD] = useState(0.3);
  const [fEnvS, setFEnvS] = useState(0.3);
  const [fEnvR, setFEnvR] = useState(0.4);

  const [lfoType, setLfoType] = useState<string>("sine");
  const [lfoRate, setLfoRate] = useState(4);
  const [lfoDepth, setLfoDepth] = useState(30);
  const [lfoRoute, setLfoRoute] = useState<"pitch" | "filter">("pitch");

  useEffect(() => {
    engineRef.current = new Synth3Engine();
    return () => engineRef.current?.dispose();
  }, []);

  const noteOn = useCallback((note: string, vel: number) => engineRef.current?.noteOn(note, vel), []);
  const noteOff = useCallback((note: string) => engineRef.current?.noteOff(note), []);
  const getWaveform = useCallback((): Float32Array => engineRef.current?.getWaveform() ?? new Float32Array(1024), []);

  const e = engineRef.current;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 80px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>The Classic</p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
          Dual Osc · Filter · Dual ADSR · LFO
        </p>
      </div>

      {/* Signal flow: 3 columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {/* OSC */}
        <div style={SECTION}>
          <p style={LABEL}>Oscillators</p>

          <p style={SUBLABEL}>OSC 1</p>
          <WaveformSelect value={osc1Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc1Type(v); e?.setOsc1Type(v as OscillatorType); }} label="" />

          <div style={{ height: 12 }} />

          <p style={SUBLABEL}>OSC 2</p>
          <WaveformSelect value={osc2Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc2Type(v); e?.setOsc2Type(v as OscillatorType); }} label="" />

          <div style={{ height: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16 }}>
            <Knob value={osc2Detune} min={-100} max={100} step={1} label="Detune" unit="¢" onChange={(v) => { setOsc2Detune(v); e?.setOsc2Detune(v); }} size="sm" />
            <Knob value={oscMix} min={0} max={1} step={0.01} label="Mix" onChange={(v) => { setOscMix(v); e?.setOscMix(v); }} size="sm" />
          </div>
        </div>

        {/* FILTER */}
        <div style={SECTION}>
          <p style={LABEL}>Filter</p>
          <FilterTypeSelect value={filterType} onChange={(v) => { setFilterTypeState(v); e?.setFilterType(v); }} />
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12 }}>
            <Knob value={filterCutoff} min={80} max={18000} step={10} label="Cutoff" unit="Hz" onChange={(v) => { setFilterCutoff(v); e?.setFilterCutoff(v); }} size="sm" />
            <Knob value={filterRes} min={0.1} max={20} step={0.1} label="Res" unit="Q" onChange={(v) => { setFilterRes(v); e?.setFilterResonance(v); }} size="sm" />
          </div>

          <p style={{ ...SUBLABEL, marginTop: 14 }}>Filter Env</p>
          <Knob value={fEnvAmt} min={0} max={10000} step={50} label="Amount" unit="Hz" onChange={(v) => { setFEnvAmt(v); e?.setFilterEnvAmount(v); }} size="sm" />
          <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "center" }}>
            <Fader value={fEnvA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setFEnvA(v); e?.setFilterEnvAttack(v); }} />
            <Fader value={fEnvD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setFEnvD(v); e?.setFilterEnvDecay(v); }} />
            <Fader value={fEnvS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setFEnvS(v); e?.setFilterEnvSustain(v); }} />
            <Fader value={fEnvR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setFEnvR(v); e?.setFilterEnvRelease(v); }} />
          </div>
        </div>

        {/* AMP */}
        <div style={SECTION}>
          <p style={LABEL}>Amp Env</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Fader value={ampA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setAmpA(v); e?.setAmpAttack(v); }} />
            <Fader value={ampD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setAmpD(v); e?.setAmpDecay(v); }} />
            <Fader value={ampS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setAmpS(v); e?.setAmpSustain(v); }} />
            <Fader value={ampR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setAmpR(v); e?.setAmpRelease(v); }} />
          </div>
        </div>
      </div>

      {/* LFO */}
      <div style={SECTION}>
        <p style={LABEL}>LFO</p>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <WaveformSelect value={lfoType} options={["sine", "square"]} onChange={(v) => { setLfoType(v); e?.setLfoType(v as OscillatorType); }} label="Shape" />
          <Knob value={lfoRate} min={0.1} max={20} step={0.1} label="Rate" unit="Hz" onChange={(v) => { setLfoRate(v); e?.setLfoRate(v); }} size="md" />
          <Knob value={lfoDepth} min={0} max={100} step={1} label="Depth" onChange={(v) => { setLfoDepth(v); e?.setLfoDepth(v); }} size="md" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Route</span>
            <div style={{ display: "flex", gap: 4 }}>
              {(["pitch", "filter"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => { setLfoRoute(r); e?.setLfoRoute(r); }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid",
                    borderColor: lfoRoute === r ? "var(--primary)" : "var(--border)",
                    background: lfoRoute === r ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
                    color: lfoRoute === r ? "var(--foreground)" : "var(--muted-foreground)",
                    fontSize: 11,
                    cursor: "pointer",
                    transition: "all 150ms",
                    textTransform: "capitalize",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Waveform display */}
      <div style={{ ...SECTION, display: "flex", justifyContent: "center" }}>
        <WaveformCanvas getWaveform={getWaveform} width={680} height={80} />
      </div>

      {/* Keyboard */}
      <div style={SECTION}>
        <PianoKeyboard onNoteOn={noteOn} onNoteOff={noteOff} startOctave={3} octaves={2} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify — navigate to `/temp-synths/3`, play notes, test:**
  - Osc type selectors for both oscs
  - Detune knob causes beating
  - LP/HP/BP filter type toggle
  - Filter envelope: high Amount + fast Attack = filter sweep on notes
  - Amp ADSR: long release fades out note
  - LFO rate + depth in pitch mode causes vibrato; in filter mode causes wah

- [ ] **Step 3: Commit**

```bash
git add src/app/temp-synths/3/page.tsx
git commit -m "feat: add Synth 3 (The Classic) — dual osc, filter, dual ADSR, LFO, signal flow layout"
```

---

## Task 8: Synth 4 page (UI only)

**Files:**
- Create: `src/app/temp-synths/4/page.tsx`

All handlers are stubs (`() => {}`). Controls are fully rendered but wired to no audio.

- [ ] **Step 1: Create `4/page.tsx`**

```tsx
// src/app/temp-synths/4/page.tsx
"use client";

import { useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";

const SECTION: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 20px",
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "var(--muted-foreground)",
  marginBottom: 12,
};

const SUBLABEL: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "var(--muted-foreground)",
  marginBottom: 8,
};

function ToggleButton({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: "6px 14px",
        borderRadius: 8,
        border: "1px solid",
        borderColor: on ? "var(--primary)" : "var(--border)",
        background: on ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
        color: on ? "var(--foreground)" : "var(--muted-foreground)",
        fontSize: 12,
        fontWeight: on ? 600 : 400,
        cursor: "pointer",
        transition: "all 150ms",
      }}
    >
      {label}
    </button>
  );
}

export default function Synth4Page() {
  // OSC state
  const [osc1Type, setOsc1Type] = useState("square");
  const [osc1Pwm, setOsc1Pwm] = useState(50);
  const [osc2Type, setOsc2Type] = useState("square");
  const [osc2Pwm, setOsc2Pwm] = useState(50);
  const [oscMix, setOscMix] = useState(50);

  // Filter
  const [filterCutoff, setFilterCutoff] = useState(3000);
  const [filterRes, setFilterRes] = useState(2);
  const [filterEnvAmt, setFilterEnvAmt] = useState(50);

  // LFO 1
  const [lfo1Rate, setLfo1Rate] = useState(4);
  const [lfo1Depth, setLfo1Depth] = useState(30);
  const [lfo1Type, setLfo1Type] = useState("sine");

  // LFO 2
  const [lfo2Rate, setLfo2Rate] = useState(0.5);
  const [lfo2Depth, setLfo2Depth] = useState(20);
  const [lfo2Type, setLfo2Type] = useState("sine");

  // Amp env
  const [ampA, setAmpA] = useState(0.05);
  const [ampD, setAmpD] = useState(0.2);
  const [ampS, setAmpS] = useState(0.7);
  const [ampR, setAmpR] = useState(0.5);

  // FX
  const [chorusOn, setChorusOn] = useState(false);
  const [chorusDepth, setChorusDepth] = useState(30);
  const [phaserOn, setPhaserOn] = useState(false);
  const [phaserRate, setPhaserRate] = useState(0.5);

  // Mode
  const [poly, setPoly] = useState(false);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px 80px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <div>
          <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>The Producer</p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            Dual Osc + PWM · Filter Env · Dual LFO · Chorus + Phaser
          </p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <ToggleButton label={poly ? "Poly" : "Mono"} on={poly} onToggle={() => setPoly(!poly)} />
        </div>
      </div>

      {/* Oscillators */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={SECTION}>
          <p style={LABEL}>OSC 1</p>
          <WaveformSelect value={osc1Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={setOsc1Type} label="Shape" />
          <div style={{ marginTop: 12 }}>
            <p style={SUBLABEL}>Pulse Width</p>
            <Fader value={osc1Pwm} min={1} max={99} step={1} label="PWM" unit="%" onChange={setOsc1Pwm} />
          </div>
        </div>
        <div style={SECTION}>
          <p style={LABEL}>OSC 2</p>
          <WaveformSelect value={osc2Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={setOsc2Type} label="Shape" />
          <div style={{ marginTop: 12 }}>
            <p style={SUBLABEL}>Pulse Width</p>
            <Fader value={osc2Pwm} min={1} max={99} step={1} label="PWM" unit="%" onChange={setOsc2Pwm} />
          </div>
        </div>
      </div>

      {/* Mix + Filter */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
        <div style={SECTION}>
          <p style={LABEL}>Mix</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Knob value={oscMix} min={0} max={100} step={1} label="OSC Mix" unit="%" onChange={setOscMix} size="lg" />
          </div>
        </div>
        <div style={SECTION}>
          <p style={LABEL}>Filter</p>
          <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
            <Knob value={filterCutoff} min={80} max={18000} step={10} label="Cutoff" unit="Hz" onChange={setFilterCutoff} size="md" />
            <Knob value={filterRes} min={0.1} max={20} step={0.1} label="Res" unit="Q" onChange={setFilterRes} size="md" />
            <Knob value={filterEnvAmt} min={0} max={100} step={1} label="Env Amt" unit="%" onChange={setFilterEnvAmt} size="md" />
          </div>
        </div>
      </div>

      {/* LFOs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={SECTION}>
          <p style={LABEL}>LFO 1 → Pitch</p>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <WaveformSelect value={lfo1Type} options={["sine", "square"]} onChange={setLfo1Type} label="Shape" />
            <Knob value={lfo1Rate} min={0.1} max={20} step={0.1} label="Rate" unit="Hz" onChange={setLfo1Rate} size="sm" />
            <Knob value={lfo1Depth} min={0} max={100} step={1} label="Depth" onChange={setLfo1Depth} size="sm" />
          </div>
        </div>
        <div style={SECTION}>
          <p style={LABEL}>LFO 2 → Filter</p>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <WaveformSelect value={lfo2Type} options={["sine", "square"]} onChange={setLfo2Type} label="Shape" />
            <Knob value={lfo2Rate} min={0.1} max={20} step={0.1} label="Rate" unit="Hz" onChange={setLfo2Rate} size="sm" />
            <Knob value={lfo2Depth} min={0} max={100} step={1} label="Depth" onChange={setLfo2Depth} size="sm" />
          </div>
        </div>
      </div>

      {/* Amp Env */}
      <div style={SECTION}>
        <p style={LABEL}>Amp Envelope</p>
        <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
          <Fader value={ampA} min={0.001} max={2} step={0.001} label="Attack" unit="s" onChange={setAmpA} />
          <Fader value={ampD} min={0.01} max={3} step={0.01} label="Decay" unit="s" onChange={setAmpD} />
          <Fader value={ampS} min={0} max={1} step={0.01} label="Sustain" onChange={setAmpS} />
          <Fader value={ampR} min={0.01} max={4} step={0.01} label="Release" unit="s" onChange={setAmpR} />
        </div>
      </div>

      {/* FX Slots */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={SECTION}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <p style={{ ...LABEL, margin: 0 }}>Chorus</p>
            <ToggleButton label={chorusOn ? "ON" : "OFF"} on={chorusOn} onToggle={() => setChorusOn(!chorusOn)} />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Knob value={chorusDepth} min={0} max={100} step={1} label="Depth" unit="%" onChange={setChorusDepth} size="md" />
          </div>
        </div>
        <div style={SECTION}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <p style={{ ...LABEL, margin: 0 }}>Phaser</p>
            <ToggleButton label={phaserOn ? "ON" : "OFF"} on={phaserOn} onToggle={() => setPhaserOn(!phaserOn)} />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Knob value={phaserRate} min={0.1} max={10} step={0.1} label="Rate" unit="Hz" onChange={setPhaserRate} size="md" />
          </div>
        </div>
      </div>

      {/* Keyboard */}
      <div style={SECTION}>
        <PianoKeyboard onNoteOn={() => {}} onNoteOff={() => {}} startOctave={3} octaves={2} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify — navigate to `/temp-synths/4`, confirm all controls render and respond to interaction (state updates, no audio)**

- [ ] **Step 3: Commit**

```bash
git add src/app/temp-synths/4/page.tsx
git commit -m "feat: add Synth 4 (The Producer) — UI-only, dual osc PWM, dual LFO, chorus, phaser"
```

---

## Task 9: Synth 5 page (UI only)

**Files:**
- Create: `src/app/temp-synths/5/page.tsx`

Modulation Matrix is a grid of Source × Destination cells, each togglable. All handlers are stubs.

- [ ] **Step 1: Create `5/page.tsx`**

```tsx
// src/app/temp-synths/5/page.tsx
"use client";

import { useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";

const SECTION: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 20px",
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "var(--muted-foreground)",
  marginBottom: 12,
};

const WAVES = ["Sine", "Triangle", "Square", "Saw", "Noise", "PWM", "Wavetable"];
const MOD_SOURCES = ["LFO 1", "LFO 2", "Env 1", "Env 2", "Vel", "MW"];
const MOD_DESTS = ["Pitch", "Cutoff", "Amp", "Pan", "PW", "Res"];

function ToggleButton({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: "5px 12px",
        borderRadius: 7,
        border: "1px solid",
        borderColor: on ? "var(--primary)" : "var(--border)",
        background: on ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
        color: on ? "var(--foreground)" : "var(--muted-foreground)",
        fontSize: 11,
        fontWeight: on ? 600 : 400,
        cursor: "pointer",
        transition: "all 150ms",
      }}
    >
      {label}
    </button>
  );
}

export default function Synth5Page() {
  const [wavePos, setWavePos] = useState(0);
  const [selectedWave, setSelectedWave] = useState(0);

  const [fmFreq, setFmFreq] = useState(2);
  const [fmIndex, setFmIndex] = useState(3);

  const [modMatrix, setModMatrix] = useState<boolean[][]>(
    Array.from({ length: MOD_SOURCES.length }, () => new Array(MOD_DESTS.length).fill(false))
  );

  const [distOn, setDistOn] = useState(false);
  const [distAmt, setDistAmt] = useState(50);
  const [bitOn, setBitOn] = useState(false);
  const [bitDepth, setBitDepth] = useState(8);
  const [delayOn, setDelayOn] = useState(false);
  const [delayTime, setDelayTime] = useState(0.3);
  const [delayFeedback, setDelayFeedback] = useState(0.4);
  const [delaySpread, setDelaySpread] = useState(0.5);

  const [voices, setVoices] = useState(4);
  const [unisonOn, setUnisonOn] = useState(false);
  const [unisonCount, setUnisonCount] = useState(4);
  const [unisonDetune, setUnisonDetune] = useState(15);
  const [unisonSpread, setUnisonSpread] = useState(0.7);

  const toggleMatrix = (row: number, col: number) => {
    setModMatrix((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = !next[row][col];
      return next;
    });
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 80px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>The Lab</p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
          Wavetable · FM · Mod Matrix · Advanced FX · Unison
        </p>
      </div>

      {/* Wavetable + FM */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div style={SECTION}>
          <p style={LABEL}>Wavetable</p>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
            {WAVES.map((w, i) => (
              <button
                key={w}
                onClick={() => setSelectedWave(i)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid",
                  borderColor: selectedWave === i ? "var(--primary)" : "var(--border)",
                  background: selectedWave === i ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
                  color: selectedWave === i ? "var(--foreground)" : "var(--muted-foreground)",
                  fontSize: 11,
                  cursor: "pointer",
                  transition: "all 150ms",
                }}
              >
                {w}
              </button>
            ))}
          </div>
          <div>
            <p style={{ ...LABEL, marginBottom: 6 }}>Wave Position</p>
            <input
              type="range"
              min={0}
              max={100}
              value={wavePos}
              onChange={(e) => setWavePos(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--primary)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>0</span>
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{wavePos}%</span>
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>100</span>
            </div>
          </div>
        </div>

        <div style={SECTION}>
          <p style={LABEL}>FM Synthesis</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
            <Knob value={fmFreq} min={0.5} max={16} step={0.5} label="Mod Freq" unit="×" onChange={setFmFreq} size="md" />
            <Knob value={fmIndex} min={0} max={20} step={0.1} label="Mod Index" onChange={setFmIndex} size="md" />
          </div>
        </div>
      </div>

      {/* Modulation Matrix */}
      <div style={SECTION}>
        <p style={LABEL}>Modulation Matrix</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ padding: "4px 8px", color: "var(--muted-foreground)", textAlign: "left", fontWeight: 600, fontSize: 9, letterSpacing: "0.08em" }}>
                  SOURCE ↓ / DEST →
                </th>
                {MOD_DESTS.map((d) => (
                  <th key={d} style={{ padding: "4px 10px", color: "var(--muted-foreground)", fontWeight: 600, fontSize: 9, letterSpacing: "0.08em" }}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOD_SOURCES.map((src, row) => (
                <tr key={src}>
                  <td style={{ padding: "4px 8px", color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 }}>{src}</td>
                  {MOD_DESTS.map((_, col) => {
                    const on = modMatrix[row][col];
                    return (
                      <td key={col} style={{ padding: "3px 10px", textAlign: "center" }}>
                        <button
                          onClick={() => toggleMatrix(row, col)}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 5,
                            border: "1px solid",
                            borderColor: on ? "var(--primary)" : "var(--border)",
                            background: on ? "oklch(from var(--primary) l c h / 20%)" : "var(--muted)",
                            cursor: "pointer",
                            transition: "all 120ms",
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced FX Rack */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div style={SECTION}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <p style={{ ...LABEL, margin: 0 }}>Distortion</p>
            <ToggleButton label={distOn ? "ON" : "OFF"} on={distOn} onToggle={() => setDistOn(!distOn)} />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Knob value={distAmt} min={0} max={100} step={1} label="Amount" unit="%" onChange={setDistAmt} size="md" />
          </div>
        </div>

        <div style={SECTION}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <p style={{ ...LABEL, margin: 0 }}>Bitcrusher</p>
            <ToggleButton label={bitOn ? "ON" : "OFF"} on={bitOn} onToggle={() => setBitOn(!bitOn)} />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Knob value={bitDepth} min={1} max={16} step={1} label="Bit Depth" unit="bit" onChange={setBitDepth} size="md" />
          </div>
        </div>

        <div style={SECTION}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <p style={{ ...LABEL, margin: 0 }}>Stereo Delay</p>
            <ToggleButton label={delayOn ? "ON" : "OFF"} on={delayOn} onToggle={() => setDelayOn(!delayOn)} />
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Knob value={delayTime} min={0.01} max={1} step={0.01} label="Time" unit="s" onChange={setDelayTime} size="sm" />
            <Knob value={delayFeedback} min={0} max={0.95} step={0.01} label="FB" onChange={setDelayFeedback} size="sm" />
            <Knob value={delaySpread} min={0} max={1} step={0.01} label="Spread" onChange={setDelaySpread} size="sm" />
          </div>
        </div>
      </div>

      {/* Polyphony + Unison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
        <div style={SECTION}>
          <p style={LABEL}>Polyphony</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Knob value={voices} min={1} max={16} step={1} label="Voices" onChange={setVoices} size="lg" />
          </div>
        </div>

        <div style={SECTION}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <p style={{ ...LABEL, margin: 0 }}>Unison</p>
            <ToggleButton label={unisonOn ? "ON" : "OFF"} on={unisonOn} onToggle={() => setUnisonOn(!unisonOn)} />
          </div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
            <Knob value={unisonCount} min={2} max={8} step={1} label="Voices" onChange={setUnisonCount} size="sm" />
            <Knob value={unisonDetune} min={0} max={100} step={1} label="Detune" unit="¢" onChange={setUnisonDetune} size="sm" />
            <Knob value={unisonSpread} min={0} max={1} step={0.01} label="Spread" onChange={setUnisonSpread} size="sm" />
          </div>
        </div>
      </div>

      {/* Keyboard */}
      <div style={SECTION}>
        <PianoKeyboard onNoteOn={() => {}} onNoteOff={() => {}} startOctave={3} octaves={2} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify — navigate to `/temp-synths/5`, confirm:**
  - Wavetable selector highlights selected wave
  - Wave position slider moves
  - Mod matrix cells toggle on/off
  - All FX toggles and knobs respond

- [ ] **Step 3: Commit**

```bash
git add src/app/temp-synths/5/page.tsx
git commit -m "feat: add Synth 5 (The Lab) — UI-only, wavetable, FM, mod matrix, advanced FX, unison"
```

---

## Self-Review

**Spec coverage:**
- ✅ Synth 1: oscillator toggle (sine/square/saw), tone knob (LP filter), attack/release faders, reverb toggle, waveform display
- ✅ Synth 2: main osc + sub toggle, cutoff + resonance knobs, attack/release faders + sustain toggle, reverb toggle + delay knob, envelope curve visualizer
- ✅ Synth 3: dual oscillators + detune, LP/HP/BP selector + cutoff + resonance, dual ADSR (amp + filter), LFO (sine/square) with pitch/filter route, signal flow layout
- ✅ Synth 4: dual osc + PWM sliders, filter env amount knob, two LFO sections (pitch + filter), mono/poly toggle, chorus + phaser effect slots
- ✅ Synth 5: wavetable selector + wave position scrub, FM (mod freq/index), modulation matrix grid, distortion + bitcrusher + stereo delay, polyphony + unison
- ✅ Shared AudioContext singleton in `audio-ctx.ts`
- ✅ Existing `Knob` and `Fader` components reused throughout (no duplicate `SynthKnob`/`SynthSlider` needed)
- ✅ Navigation layout with active state
- ✅ Styling matches app: CSS vars, same card/border/muted patterns as temp-learning-path

**Placeholder scan:** None — all code blocks are complete.

**Type consistency:** `OscillatorType`, `BiquadFilterType` used consistently. `noteNameToFreq` and `buildReverb` defined once in `audio-ctx.ts`, imported by all engines.
