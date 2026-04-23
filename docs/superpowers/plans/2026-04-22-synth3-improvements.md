# Synth 3 Improvements + Hardware Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Synth 3 engine and page to match Synth 2 quality (FFT, QWERTY, vol, EnvelopeCurve), then build a hardware page at `/temp-synths/3-hardware` with a hot-magenta color scheme.

**Architecture:** Engine gains a compressor+masterGain tail and FFT buffer; page gains SpectrumCanvas, QWERTY keyboard, octave nav, volume knob, and animated EnvelopeCurve. Hardware page replicates the chassis layout pattern from `2-hardware/page.tsx` with a new `#e040fb` magenta accent.

**Tech Stack:** Next.js App Router (client component), Web Audio API, React hooks, inline CSS, `SpectrumCanvas` from `../spectrum-canvas`, `EnvelopeCurve` local component (copied + adapted from `2-hardware/page.tsx`).

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/app/temp-synths/3/engine.ts` | Modify | Add compressor, masterGain, fftBuf; rewire tail; add getFFT/sampleRate/fftSize/setVolume |
| `src/app/temp-synths/3/page.tsx` | Modify | Add SpectrumCanvas, QWERTY, octave nav, volume, activeNotes, noteOnMs/noteOffMs, EnvelopeCurve |
| `src/app/temp-synths/3-hardware/page.tsx` | Create | Full hardware chassis with magenta accent |

---

### Task 1: Engine — compressor, masterGain, FFT, setVolume

**Files:**
- Modify: `src/app/temp-synths/3/engine.ts`

- [ ] **Step 1: Add private fields and upgrade fftSize**

Replace the `private buf` line and `private analyser` block. The full updated constructor wiring and private fields:

```typescript
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
  private compressor: DynamicsCompressorNode;
  private masterGain: GainNode;
  private buf: Float32Array;
  private fftBuf: Float32Array;

  // LFO
  private lfo: OscillatorNode;
  private lfoDepthGain: GainNode;
  private lfoPitchGate: GainNode;
  private lfoFilterGate: GainNode;

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
    this.analyser.fftSize = 2048;
    this.buf = new Float32Array(this.analyser.fftSize);
    this.fftBuf = new Float32Array(this.analyser.frequencyBinCount);

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;

    // LFO setup
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = this.lfoType;
    this.lfo.frequency.value = this.lfoRate;

    this.lfoDepthGain = this.ctx.createGain();
    this.lfoDepthGain.gain.value = this.lfoDepth;

    this.lfoPitchGate = this.ctx.createGain();
    this.lfoPitchGate.gain.value = 1;

    this.lfoFilterGate = this.ctx.createGain();
    this.lfoFilterGate.gain.value = 0;

    this.lfo.connect(this.lfoDepthGain);
    this.lfoDepthGain.connect(this.lfoPitchGate);
    this.lfoDepthGain.connect(this.lfoFilterGate);
    this.lfoFilterGate.connect(this.filter.frequency);

    this.lfo.start();

    // Main signal chain: oscs → filter → ampEnv → master → analyser → compressor → masterGain → destination
    this.osc1Gain.connect(this.filter);
    this.osc2Gain.connect(this.filter);
    this.filter.connect(this.ampEnvGain);
    this.ampEnvGain.connect(this.master);
    this.master.connect(this.analyser);
    this.analyser.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }
```

- [ ] **Step 2: Add getFFT, sampleRate getter, fftSize getter, setVolume**

After the existing `getWaveform()` method, add:

```typescript
  getFFT(): Float32Array {
    this.analyser.getFloatFrequencyData(this.fftBuf as any);
    return this.fftBuf;
  }

  get sampleRate(): number { return this.ctx.sampleRate; }
  get fftSize(): number { return this.analyser.fftSize; }

  setVolume(v: number): void {
    this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01);
  }
```

- [ ] **Step 3: Update dispose() to include compressor and masterGain**

Replace existing `dispose()`:

```typescript
  dispose(): void {
    try { this.osc1?.stop(); } catch { /* ok */ }
    this.osc1?.disconnect();
    try { this.osc2?.stop(); } catch { /* ok */ }
    this.osc2?.disconnect();
    this.lfo.stop();
    this.lfo.disconnect();
    this.lfoDepthGain.disconnect();
    this.lfoPitchGate.disconnect();
    this.lfoFilterGate.disconnect();
    this.osc1Gain.disconnect();
    this.osc2Gain.disconnect();
    this.filter.disconnect();
    this.ampEnvGain.disconnect();
    this.master.disconnect();
    this.analyser.disconnect();
    this.compressor.disconnect();
    this.masterGain.disconnect();
  }
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `cd /home/steve/IdeaProjects/Osciscoops && npx tsc --noEmit 2>&1 | head -30`

Expected: No errors in `src/app/temp-synths/3/engine.ts`

- [ ] **Step 5: Commit**

```bash
git add src/app/temp-synths/3/engine.ts
git commit -m "feat: upgrade synth3 engine — compressor, masterGain, FFT, setVolume"
```

---

### Task 2: Page — SpectrumCanvas, QWERTY, octave nav, vol, EnvelopeCurve

**Files:**
- Modify: `src/app/temp-synths/3/page.tsx`

The page currently has: SynthShell layout, dual OSC, filter with type selector, amp ADSR faders, filter ADSR faders, LFO. Missing: SpectrumCanvas, QWERTY keyboard QWERTY, octave nav, volume knob, activeNotes, noteOnMs/noteOffMs, EnvelopeCurve.

- [ ] **Step 1: Update imports and add local EnvelopeCurve component**

Replace the import block and add `EnvelopeCurve` above `Synth3Page`. Pattern from `2-hardware/page.tsx:43-99`:

```typescript
"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { WaveformCanvas } from "../waveform-canvas";
import { SpectrumCanvas } from "../spectrum-canvas";
import { SynthShell } from "@/components/synths/shared/synth-shell";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Synth3Engine } from "./engine";
```

Then add constants (after imports, before `FilterTypeSelect`):

```typescript
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const KEY_NOTE_MAP: Record<string, [string, number]> = {
  a: ["C", 0],  w: ["C#", 0], s: ["D", 0],  e: ["D#", 0],
  d: ["E", 0],  f: ["F", 0],  t: ["F#", 0], g: ["G", 0],
  y: ["G#", 0], h: ["A", 0],  u: ["A#", 0], j: ["B", 0],
  k: ["C", 1],  o: ["C#", 1], l: ["D", 1],  p: ["D#", 1],
  ";": ["E", 1],
};
```

Then add `EnvelopeCurve` component (before `FilterTypeSelect`):

```typescript
interface EnvCurveProps {
  attack: number; decay: number; sustainLevel: number; release: number;
  noteOnMs: number | null; noteOffMs: number | null;
  width?: number; height?: number;
}

function EnvelopeCurve({ attack, decay, sustainLevel, release, noteOnMs, noteOffMs, width = 210, height = 78 }: EnvCurveProps) {
  const W = width, H = height;
  const top = 5, bot = H - 5;
  const maxT = Math.max(attack + decay + release, 2);
  const aX   = (attack / maxT) * (W * 0.65);
  const dX   = aX + (decay / maxT) * (W * 0.65);
  const sX   = dX + W * 0.16;
  const rEnd = Math.min(sX + (release / maxT) * (W * 0.65), W - 4);
  const susY = top + (1 - sustainLevel) * (bot - top);
  const d    = `M 0 ${bot} L ${aX} ${top} L ${dX} ${susY} L ${sX} ${susY} L ${rEnd} ${bot}`;

  const [dot, setDot] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: bot, visible: false });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (noteOnMs === null) {
      setDot((p) => p.visible ? { ...p, visible: false } : p);
      return;
    }
    const aMs = attack * 1000, dMs = decay * 1000, rMs = release * 1000;
    const tick = () => {
      const el = performance.now() - noteOnMs;
      if (noteOffMs === null) {
        if (el < aMs) {
          const t = el / aMs;
          setDot({ x: lerp(0, aX, t), y: lerp(bot, top, t), visible: true });
        } else if (el < aMs + dMs) {
          const t = (el - aMs) / dMs;
          setDot({ x: lerp(aX, dX, t), y: lerp(top, susY, t), visible: true });
        } else {
          setDot({ x: sX, y: susY, visible: true });
        }
      } else {
        const re = performance.now() - noteOffMs;
        if (re < rMs) {
          const t = re / rMs;
          setDot({ x: lerp(sX, rEnd, t), y: lerp(susY, bot, t), visible: true });
        } else {
          setDot((p) => ({ ...p, visible: false }));
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [noteOnMs, noteOffMs, attack, decay, release, aX, dX, sX, rEnd, top, bot, susY]);

  return (
    <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="env3-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${rEnd} ${bot} Z`} fill="url(#env3-grad)" />
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth={1.5} strokeLinejoin="round" />
      {dot.visible && (
        <circle cx={dot.x} cy={dot.y} r={4} fill="var(--primary)" opacity={0.9} />
      )}
    </svg>
  );
}
```

- [ ] **Step 2: Add state for activeNotes, noteOnMs, noteOffMs, volume, octave**

Inside `Synth3Page`, after existing state declarations, add:

```typescript
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [noteOnMs, setNoteOnMs] = useState<number | null>(null);
  const [noteOffMs, setNoteOffMs] = useState<number | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [startOctave, setStartOctave] = useState(3);
  const startOctaveRef = useRef(startOctave);
  useEffect(() => { startOctaveRef.current = startOctave; }, [startOctave]);
```

- [ ] **Step 3: Update noteOn/noteOff callbacks and add getFFT callback**

Replace the existing `noteOn`, `noteOff`, `getWaveform` callbacks:

```typescript
  const noteOn = useCallback((note: string, vel: number) => {
    engineRef.current?.noteOn(note, vel);
    setActiveNotes((prev) => new Set(prev).add(note));
    setNoteOnMs(performance.now());
    setNoteOffMs(null);
  }, []);

  const noteOff = useCallback((note: string) => {
    engineRef.current?.noteOff(note);
    setActiveNotes((prev) => { const s = new Set(prev); s.delete(note); return s; });
    setNoteOffMs(performance.now());
  }, []);

  const getWaveform = useCallback((): Float32Array => engineRef.current?.getWaveform() ?? new Float32Array(2048), []);
  const getFFT = useCallback((): Float32Array => engineRef.current?.getFFT() ?? new Float32Array(1024), []);
```

- [ ] **Step 4: Add QWERTY keyboard useEffect**

After the callbacks, add:

```typescript
  useEffect(() => {
    const pressed = new Set<string>();
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement) return;
      const entry = KEY_NOTE_MAP[e.key.toLowerCase()];
      if (!entry) return;
      const [name, octOffset] = entry;
      const note = `${name}${startOctaveRef.current + octOffset}`;
      if (pressed.has(e.key)) return;
      pressed.add(e.key);
      noteOn(note, 0.8);
    };
    const onUp = (e: KeyboardEvent) => {
      const entry = KEY_NOTE_MAP[e.key.toLowerCase()];
      if (!entry) return;
      const [name, octOffset] = entry;
      const note = `${name}${startOctaveRef.current + octOffset}`;
      pressed.delete(e.key);
      noteOff(note);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [noteOn, noteOff]);
```

- [ ] **Step 5: Update header to include SpectrumCanvas**

Replace the existing `header` const (desktop: waveform + spectrum side by side; mobile: waveform only):

```typescript
  const header = (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
      <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>The Classic</p>
      <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 8px" }}>
        Dual Osc · Filter · Dual ADSR · LFO
      </p>
      {isMobile ? (
        <WaveformCanvas getWaveform={getWaveform} width={320} height={60} />
      ) : (
        <div style={{ display: "flex", gap: 12 }}>
          <WaveformCanvas getWaveform={getWaveform} width={300} height={60} />
          <SpectrumCanvas
            getFFT={getFFT}
            filterFreq={filterCutoff}
            resonance={filterRes}
            sampleRate={engineRef.current?.sampleRate ?? 44100}
            fftSize={engineRef.current?.fftSize ?? 2048}
            width={180}
            height={60}
          />
        </div>
      )}
    </div>
  );
```

- [ ] **Step 6: Update controls to add EnvelopeCurve in Amp Env section and volume knob**

In the controls const, update the "Amp Env" section (the third column) to show faders on the left and EnvelopeCurve on the right, with a volume knob at top:

```tsx
        <div style={SECTION}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ ...LABEL, marginBottom: 0 }}>Amp Env</p>
            <Knob value={volume} min={0} max={1} step={0.01} label="Vol" onChange={(v) => { setVolume(v); e?.setVolume(v); }} size="sm" />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              <Fader value={ampA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setAmpA(v); e?.setAmpAttack(v); }} />
              <Fader value={ampD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setAmpD(v); e?.setAmpDecay(v); }} />
              <Fader value={ampS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setAmpS(v); e?.setAmpSustain(v); }} />
              <Fader value={ampR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setAmpR(v); e?.setAmpRelease(v); }} />
            </div>
            <div style={{ background: "var(--background)", borderRadius: 6, padding: 4, border: "1px solid var(--border)" }}>
              <EnvelopeCurve
                attack={ampA} decay={ampD} sustainLevel={ampS} release={ampR}
                noteOnMs={noteOnMs} noteOffMs={noteOffMs}
                width={130} height={60}
              />
            </div>
          </div>
        </div>
```

- [ ] **Step 7: Update keyboard section to include octave nav**

Replace the existing `keyboard` const:

```tsx
  const keyboard = (
    <div style={{ padding: "8px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => setStartOctave((o) => Math.max(1, o - 1))}
            style={{ padding: "2px 10px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--card)", color: "var(--muted-foreground)", fontSize: 14, cursor: "pointer" }}
          >−</button>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", alignSelf: "center" }}>Oct {startOctave}</span>
          <button
            onClick={() => setStartOctave((o) => Math.min(6, o + 1))}
            style={{ padding: "2px 10px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--card)", color: "var(--muted-foreground)", fontSize: 14, cursor: "pointer" }}
          >+</button>
        </div>
        <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.6 }}>QWERTY</span>
      </div>
      <PianoKeyboard
        onNoteOn={noteOn}
        onNoteOff={noteOff}
        startOctave={startOctave}
        octaves={isMobile ? 2 : 3}
        whiteKeyWidth={isMobile ? mobileKeyWidth : 24}
        whiteKeyHeight={isMobile ? 80 : 72}
        activeNotes={activeNotes}
      />
    </div>
  );
```

- [ ] **Step 8: Verify no TypeScript errors**

Run: `cd /home/steve/IdeaProjects/Osciscoops && npx tsc --noEmit 2>&1 | head -40`

Expected: No errors in `src/app/temp-synths/3/page.tsx`

- [ ] **Step 9: Commit**

```bash
git add src/app/temp-synths/3/page.tsx
git commit -m "feat: upgrade synth3 page — SpectrumCanvas, QWERTY, octave nav, vol, EnvelopeCurve"
```

---

### Task 3: Hardware page at /temp-synths/3-hardware

**Files:**
- Create: `src/app/temp-synths/3-hardware/page.tsx`

Color scheme: **Hot Magenta** — `#e040fb` accent on dark `#0d0010` background.
- `ACCENT = "#e040fb"` (electric magenta)
- `FACEPLATE = "#0d0010"` (deep violet-black)
- `SEC_BG = "#070009"`
- `SEC_BDR = "#1a0025"`
- `CHB = "#2a003d"` (chassis border)

The `themeVars` override: `{ "--primary": "#e040fb", "--color-primary": "#e040fb", "--primary-foreground": "#0d0010" }` — this makes all Tailwind `text-primary`, WaveformSelect buttons, Knobs, Faders, etc. use magenta instead of orange.

Hardware layout (same chassis pattern as `2-hardware/page.tsx`):

**Desktop chassis:**
- 3D lid: `perspective(600px) rotateX(-8deg)` with gradient from `ACCENT` tints
- Chassis body: flex column
- Faceplate (inset panel): contains all sections in a grid
- Section panels: dark background with magenta `borderTop`

**Section layout on faceplate (3 columns top row + 1 LFO row):**
- Col 1: OSC (dual osc type selectors + detune + mix knobs)
- Col 2: Filter (type selector + cutoff + res knobs + filter env faders)
- Col 3: Amp Env (faders + EnvelopeCurve with phosphor glow + volume knob)
- Row 2: LFO (shape + rate + depth + route)
- Row 3 (display row): WaveformCanvas + SpectrumCanvas side by side

**Local EnvelopeCurve with phosphor glow:**
Same as Task 2's version but with explicit magenta glow (shadow filter on SVG path) and `fill="url(#env3h-grad)"`.

- [ ] **Step 1: Write the full hardware page**

Create `src/app/temp-synths/3-hardware/page.tsx`:

```typescript
"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { WaveformCanvas } from "../waveform-canvas";
import { SpectrumCanvas } from "../spectrum-canvas";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Synth3Engine } from "../3/engine";

// ── Hot Magenta palette ─────────────────────────────────────────
const ACCENT      = "#e040fb";
const ACCENT_DIM  = "#9a00c0";
const CHB         = "#2a003d";
const FACEPLATE   = "#0d0010";
const SEC_BG      = "#070009";
const SEC_BDR     = "#1a0025";
const SCREEN_BG   = "#0a0012";
// ────────────────────────────────────────────────────────────────

const themeVars = {
  "--primary":            ACCENT,
  "--color-primary":      ACCENT,
  "--primary-foreground": "#0d0010",
} as CSSProperties;

const MOBILE_THEME = { bg: "#070009", border: "#1a0025", panel: "#0d0010" };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const KEY_NOTE_MAP: Record<string, [string, number]> = {
  a: ["C", 0],  w: ["C#", 0], s: ["D", 0],  e: ["D#", 0],
  d: ["E", 0],  f: ["F", 0],  t: ["F#", 0], g: ["G", 0],
  y: ["G#", 0], h: ["A", 0],  u: ["A#", 0], j: ["B", 0],
  k: ["C", 1],  o: ["C#", 1], l: ["D", 1],  p: ["D#", 1],
  ";": ["E", 1],
};

const TABS = [
  { id: "osc"    as const, label: "OSC"    },
  { id: "filter" as const, label: "FILTER" },
  { id: "env"    as const, label: "ENV"    },
  { id: "lfo"    as const, label: "LFO"    },
];

// ── Filter type selector ─────────────────────────────────────────
function FilterTypeSelect({ value, onChange }: { value: BiquadFilterType; onChange: (v: BiquadFilterType) => void }) {
  const options: BiquadFilterType[] = ["lowpass", "highpass", "bandpass"];
  const labels: Record<string, string> = { lowpass: "LP", highpass: "HP", bandpass: "BP" };
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} style={{
          padding: "3px 7px", borderRadius: 4, border: "1px solid",
          borderColor: value === o ? ACCENT : SEC_BDR,
          background: value === o ? `${ACCENT}22` : SEC_BG,
          color: value === o ? ACCENT : "#555",
          fontSize: 10, fontWeight: value === o ? 700 : 400, cursor: "pointer",
          letterSpacing: "0.08em", transition: "all 150ms",
        }}>{labels[o]}</button>
      ))}
    </div>
  );
}

// ── Animated ADSR curve ──────────────────────────────────────────
interface EnvCurveProps {
  attack: number; decay: number; sustainLevel: number; release: number;
  noteOnMs: number | null; noteOffMs: number | null;
  width?: number; height?: number;
}

function EnvelopeCurve({ attack, decay, sustainLevel, release, noteOnMs, noteOffMs, width = 200, height = 70 }: EnvCurveProps) {
  const W = width, H = height;
  const top = 5, bot = H - 5;
  const maxT = Math.max(attack + decay + release, 2);
  const aX   = (attack / maxT) * (W * 0.65);
  const dX   = aX + (decay / maxT) * (W * 0.65);
  const sX   = dX + W * 0.16;
  const rEnd = Math.min(sX + (release / maxT) * (W * 0.65), W - 4);
  const susY = top + (1 - sustainLevel) * (bot - top);
  const d    = `M 0 ${bot} L ${aX} ${top} L ${dX} ${susY} L ${sX} ${susY} L ${rEnd} ${bot}`;

  const [dot, setDot] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: bot, visible: false });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (noteOnMs === null) {
      setDot((p) => p.visible ? { ...p, visible: false } : p);
      return;
    }
    const aMs = attack * 1000, dMs = decay * 1000, rMs = release * 1000;
    const tick = () => {
      const el = performance.now() - noteOnMs;
      if (noteOffMs === null) {
        if (el < aMs) {
          const t = el / aMs;
          setDot({ x: lerp(0, aX, t), y: lerp(bot, top, t), visible: true });
        } else if (el < aMs + dMs) {
          const t = (el - aMs) / dMs;
          setDot({ x: lerp(aX, dX, t), y: lerp(top, susY, t), visible: true });
        } else {
          setDot({ x: sX, y: susY, visible: true });
        }
      } else {
        const re = performance.now() - noteOffMs;
        if (re < rMs) {
          const t = re / rMs;
          setDot({ x: lerp(sX, rEnd, t), y: lerp(susY, bot, t), visible: true });
        } else {
          setDot((p) => ({ ...p, visible: false }));
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [noteOnMs, noteOffMs, attack, decay, release, aX, dX, sX, rEnd, top, bot, susY]);

  return (
    <svg width={W} height={H} style={{ display: "block", overflow: "visible", filter: `drop-shadow(0 0 4px ${ACCENT}88)` }}>
      <defs>
        <linearGradient id="env3h-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.3" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${rEnd} ${bot} Z`} fill="url(#env3h-grad)" />
      <path d={d} fill="none" stroke={ACCENT} strokeWidth={1.5} strokeLinejoin="round" />
      {dot.visible && (
        <circle cx={dot.x} cy={dot.y} r={4} fill={ACCENT}
          style={{ filter: `drop-shadow(0 0 6px ${ACCENT})` }} />
      )}
    </svg>
  );
}

// ── Section label style ──────────────────────────────────────────
const SEC_LABEL: CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: "0.2em",
  textTransform: "uppercase", color: ACCENT_DIM, marginBottom: 10,
};
const SUBLABEL: CSSProperties = {
  fontSize: 8, fontWeight: 700, letterSpacing: "0.15em",
  textTransform: "uppercase", color: "#444", marginBottom: 6,
};

// ── Hardware section panel ───────────────────────────────────────
function HSection({ label, children, style }: { label: string; children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      background: SEC_BG, borderTop: `2px solid ${ACCENT}`,
      borderRadius: "0 0 6px 6px", padding: "10px 14px",
      ...style,
    }}>
      <p style={SEC_LABEL}>{label}</p>
      {children}
    </div>
  );
}

export default function Synth3HardwarePage() {
  const engineRef = useRef<Synth3Engine | null>(null);
  const { isMobile, mobileKeyWidth } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<"osc" | "filter" | "env" | "lfo">("osc");

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

  const [volume, setVolume] = useState(0.8);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [noteOnMs, setNoteOnMs] = useState<number | null>(null);
  const [noteOffMs, setNoteOffMs] = useState<number | null>(null);
  const [startOctave, setStartOctave] = useState(3);
  const startOctaveRef = useRef(startOctave);
  useEffect(() => { startOctaveRef.current = startOctave; }, [startOctave]);

  useEffect(() => {
    engineRef.current = new Synth3Engine();
    return () => engineRef.current?.dispose();
  }, []);

  const noteOn = useCallback((note: string, vel: number) => {
    engineRef.current?.noteOn(note, vel);
    setActiveNotes((prev) => new Set(prev).add(note));
    setNoteOnMs(performance.now());
    setNoteOffMs(null);
  }, []);

  const noteOff = useCallback((note: string) => {
    engineRef.current?.noteOff(note);
    setActiveNotes((prev) => { const s = new Set(prev); s.delete(note); return s; });
    setNoteOffMs(performance.now());
  }, []);

  const getWaveform = useCallback((): Float32Array => engineRef.current?.getWaveform() ?? new Float32Array(2048), []);
  const getFFT = useCallback((): Float32Array => engineRef.current?.getFFT() ?? new Float32Array(1024), []);

  const e = engineRef.current;

  useEffect(() => {
    const pressed = new Set<string>();
    const onDown = (ev: KeyboardEvent) => {
      if (ev.repeat || ev.target instanceof HTMLInputElement) return;
      const entry = KEY_NOTE_MAP[ev.key.toLowerCase()];
      if (!entry) return;
      const [name, octOffset] = entry;
      const note = `${name}${startOctaveRef.current + octOffset}`;
      if (pressed.has(ev.key)) return;
      pressed.add(ev.key);
      noteOn(note, 0.8);
    };
    const onUp = (ev: KeyboardEvent) => {
      const entry = KEY_NOTE_MAP[ev.key.toLowerCase()];
      if (!entry) return;
      const [name, octOffset] = entry;
      const note = `${name}${startOctaveRef.current + octOffset}`;
      pressed.delete(ev.key);
      noteOff(note);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [noteOn, noteOff]);

  // ── Desktop chassis ──────────────────────────────────────────
  const desktopView = (
    <div style={{ ...themeVars, minHeight: "100vh", background: "#050008", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {/* 3D lid */}
      <div style={{
        width: "100%", maxWidth: 900,
        background: `linear-gradient(160deg, #1a0028 0%, #0d0010 40%, #070009 100%)`,
        borderRadius: 18,
        boxShadow: `0 32px 80px #00000088, 0 0 0 1px ${CHB}, inset 0 1px 0 #3a005560`,
        transform: "perspective(900px) rotateX(-3deg)",
        transformOrigin: "bottom center",
        overflow: "hidden",
      }}>
        {/* Brand strip */}
        <div style={{
          background: `linear-gradient(90deg, #0d0010 0%, #1a0025 50%, #0d0010 100%)`,
          borderBottom: `1px solid ${CHB}`,
          padding: "10px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 900, letterSpacing: "0.3em", color: ACCENT, textTransform: "uppercase" }}>OSCISCOOPS</span>
            <span style={{ marginLeft: 16, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "#444", textTransform: "uppercase" }}>Model 3 · The Classic</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a0025", border: `1px solid ${CHB}` }} />
          </div>
        </div>

        {/* Faceplate */}
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Display row */}
          <div style={{
            background: SCREEN_BG, borderRadius: 8, padding: 12,
            border: `1px solid ${SEC_BDR}`,
            display: "flex", gap: 12, alignItems: "center",
          }}>
            <WaveformCanvas getWaveform={getWaveform} width={300} height={56} />
            <SpectrumCanvas
              getFFT={getFFT}
              filterFreq={filterCutoff}
              resonance={filterRes}
              sampleRate={engineRef.current?.sampleRate ?? 44100}
              fftSize={engineRef.current?.fftSize ?? 2048}
              lineColor={ACCENT}
              width={220}
              height={56}
            />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, alignSelf: "center" }}>
              <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "#444" }}>DUAL OSC · FILTER · DUAL ADSR · LFO</span>
              <span style={{ fontSize: 9, color: ACCENT_DIM, fontFamily: "monospace" }}>SR: {engineRef.current?.sampleRate ?? "–"} Hz</span>
            </div>
          </div>

          {/* Controls row: 3 columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {/* OSC */}
            <HSection label="Oscillators">
              <p style={SUBLABEL}>OSC 1</p>
              <WaveformSelect value={osc1Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc1Type(v); e?.setOsc1Type(v as OscillatorType); }} label="" />
              <div style={{ height: 8 }} />
              <p style={SUBLABEL}>OSC 2</p>
              <WaveformSelect value={osc2Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc2Type(v); e?.setOsc2Type(v as OscillatorType); }} label="" />
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
                <Knob value={osc2Detune} min={-100} max={100} step={1} label="Detune" unit="¢" onChange={(v) => { setOsc2Detune(v); e?.setOsc2Detune(v); }} size="sm" />
                <Knob value={oscMix} min={0} max={1} step={0.01} label="Mix" onChange={(v) => { setOscMix(v); e?.setOscMix(v); }} size="sm" />
              </div>
            </HSection>

            {/* Filter */}
            <HSection label="Filter">
              <FilterTypeSelect value={filterType} onChange={(v) => { setFilterTypeState(v); e?.setFilterType(v); }} />
              <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10 }}>
                <Knob value={filterCutoff} min={80} max={18000} step={10} label="Cutoff" unit="Hz" onChange={(v) => { setFilterCutoff(v); e?.setFilterCutoff(v); }} size="sm" />
                <Knob value={filterRes} min={0.1} max={20} step={0.1} label="Res" unit="Q" onChange={(v) => { setFilterRes(v); e?.setFilterResonance(v); }} size="sm" />
              </div>
              <p style={{ ...SUBLABEL, marginTop: 10 }}>Filter Env</p>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                <Knob value={fEnvAmt} min={0} max={10000} step={50} label="Amount" unit="Hz" onChange={(v) => { setFEnvAmt(v); e?.setFilterEnvAmount(v); }} size="sm" />
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                <Fader value={fEnvA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setFEnvA(v); e?.setFilterEnvAttack(v); }} />
                <Fader value={fEnvD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setFEnvD(v); e?.setFilterEnvDecay(v); }} />
                <Fader value={fEnvS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setFEnvS(v); e?.setFilterEnvSustain(v); }} />
                <Fader value={fEnvR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setFEnvR(v); e?.setFilterEnvRelease(v); }} />
              </div>
            </HSection>

            {/* Amp Env */}
            <HSection label="Amp Env">
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <Knob value={volume} min={0} max={1} step={0.01} label="Vol" onChange={(v) => { setVolume(v); e?.setVolume(v); }} size="sm" />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <Fader value={ampA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setAmpA(v); e?.setAmpAttack(v); }} />
                  <Fader value={ampD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setAmpD(v); e?.setAmpDecay(v); }} />
                  <Fader value={ampS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setAmpS(v); e?.setAmpSustain(v); }} />
                  <Fader value={ampR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setAmpR(v); e?.setAmpRelease(v); }} />
                </div>
                <div style={{ background: SCREEN_BG, borderRadius: 6, padding: "4px 6px", border: `1px solid ${SEC_BDR}` }}>
                  <EnvelopeCurve
                    attack={ampA} decay={ampD} sustainLevel={ampS} release={ampR}
                    noteOnMs={noteOnMs} noteOffMs={noteOffMs}
                    width={130} height={70}
                  />
                </div>
              </div>
            </HSection>
          </div>

          {/* LFO row */}
          <HSection label="LFO">
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <WaveformSelect value={lfoType} options={["sine", "square"]} onChange={(v) => { setLfoType(v); e?.setLfoType(v as OscillatorType); }} label="Shape" />
              <Knob value={lfoRate} min={0.1} max={20} step={0.1} label="Rate" unit="Hz" onChange={(v) => { setLfoRate(v); e?.setLfoRate(v); }} size="sm" />
              <Knob value={lfoDepth} min={0} max={100} step={1} label="Depth" onChange={(v) => { setLfoDepth(v); e?.setLfoDepth(v); }} size="sm" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 9, color: "#444", letterSpacing: "0.15em" }}>ROUTE</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["pitch", "filter"] as const).map((r) => (
                    <button key={r} onClick={() => { setLfoRoute(r); e?.setLfoRoute(r); }} style={{
                      padding: "3px 10px", borderRadius: 4, border: "1px solid",
                      borderColor: lfoRoute === r ? ACCENT : SEC_BDR,
                      background: lfoRoute === r ? `${ACCENT}22` : SEC_BG,
                      color: lfoRoute === r ? ACCENT : "#555",
                      fontSize: 10, cursor: "pointer", letterSpacing: "0.08em",
                      textTransform: "capitalize", transition: "all 150ms",
                    }}>{r}</button>
                  ))}
                </div>
              </div>
            </div>
          </HSection>

          {/* Keyboard */}
          <div style={{ background: SCREEN_BG, borderRadius: 8, padding: "10px 14px", border: `1px solid ${SEC_BDR}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setStartOctave((o) => Math.max(1, o - 1))} style={{ padding: "2px 10px", borderRadius: 4, border: `1px solid ${SEC_BDR}`, background: SEC_BG, color: "#555", fontSize: 14, cursor: "pointer" }}>−</button>
                <span style={{ fontSize: 11, color: "#555", alignSelf: "center" }}>Oct {startOctave}</span>
                <button onClick={() => setStartOctave((o) => Math.min(6, o + 1))} style={{ padding: "2px 10px", borderRadius: 4, border: `1px solid ${SEC_BDR}`, background: SEC_BG, color: "#555", fontSize: 14, cursor: "pointer" }}>+</button>
              </div>
              <span style={{ fontSize: 9, color: "#333", letterSpacing: "0.15em" }}>QWERTY</span>
            </div>
            <PianoKeyboard
              onNoteOn={noteOn}
              onNoteOff={noteOff}
              startOctave={startOctave}
              octaves={3}
              whiteKeyWidth={24}
              whiteKeyHeight={72}
              activeNotes={activeNotes}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ── Mobile view ──────────────────────────────────────────────
  const mobileView = (
    <div style={{ ...themeVars, minHeight: "100vh", background: MOBILE_THEME.bg, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${SEC_BDR}` }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: ACCENT }}>The Classic</p>
        <p style={{ margin: "2px 0 8px", fontSize: 10, color: "#444" }}>Dual Osc · Filter · Dual ADSR · LFO</p>
        <WaveformCanvas getWaveform={getWaveform} width={320} height={50} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${SEC_BDR}` }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: "8px 0", background: "transparent", border: "none",
            borderBottom: `2px solid ${activeTab === t.id ? ACCENT : "transparent"}`,
            color: activeTab === t.id ? ACCENT : "#444",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
        {activeTab === "osc" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <p style={SUBLABEL}>OSC 1</p>
              <WaveformSelect value={osc1Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc1Type(v); e?.setOsc1Type(v as OscillatorType); }} label="" />
            </div>
            <div>
              <p style={SUBLABEL}>OSC 2</p>
              <WaveformSelect value={osc2Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc2Type(v); e?.setOsc2Type(v as OscillatorType); }} label="" />
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              <Knob value={osc2Detune} min={-100} max={100} step={1} label="Detune" unit="¢" onChange={(v) => { setOsc2Detune(v); e?.setOsc2Detune(v); }} size="sm" />
              <Knob value={oscMix} min={0} max={1} step={0.01} label="Mix" onChange={(v) => { setOscMix(v); e?.setOscMix(v); }} size="sm" />
            </div>
          </div>
        )}
        {activeTab === "filter" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FilterTypeSelect value={filterType} onChange={(v) => { setFilterTypeState(v); e?.setFilterType(v); }} />
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              <Knob value={filterCutoff} min={80} max={18000} step={10} label="Cutoff" unit="Hz" onChange={(v) => { setFilterCutoff(v); e?.setFilterCutoff(v); }} size="sm" />
              <Knob value={filterRes} min={0.1} max={20} step={0.1} label="Res" unit="Q" onChange={(v) => { setFilterRes(v); e?.setFilterResonance(v); }} size="sm" />
            </div>
            <p style={{ ...SUBLABEL, marginTop: 8 }}>Filter Env</p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
              <Knob value={fEnvAmt} min={0} max={10000} step={50} label="Amount" unit="Hz" onChange={(v) => { setFEnvAmt(v); e?.setFilterEnvAmount(v); }} size="sm" />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Fader value={fEnvA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setFEnvA(v); e?.setFilterEnvAttack(v); }} />
              <Fader value={fEnvD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setFEnvD(v); e?.setFilterEnvDecay(v); }} />
              <Fader value={fEnvS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setFEnvS(v); e?.setFilterEnvSustain(v); }} />
              <Fader value={fEnvR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setFEnvR(v); e?.setFilterEnvRelease(v); }} />
            </div>
          </div>
        )}
        {activeTab === "env" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Knob value={volume} min={0} max={1} step={0.01} label="Vol" onChange={(v) => { setVolume(v); e?.setVolume(v); }} size="sm" />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <Fader value={ampA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setAmpA(v); e?.setAmpAttack(v); }} />
                <Fader value={ampD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setAmpD(v); e?.setAmpDecay(v); }} />
                <Fader value={ampS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setAmpS(v); e?.setAmpSustain(v); }} />
                <Fader value={ampR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setAmpR(v); e?.setAmpRelease(v); }} />
              </div>
              <div style={{ background: SCREEN_BG, borderRadius: 6, padding: "4px 6px", border: `1px solid ${SEC_BDR}` }}>
                <EnvelopeCurve
                  attack={ampA} decay={ampD} sustainLevel={ampS} release={ampR}
                  noteOnMs={noteOnMs} noteOffMs={noteOffMs}
                  width={130} height={60}
                />
              </div>
            </div>
          </div>
        )}
        {activeTab === "lfo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <WaveformSelect value={lfoType} options={["sine", "square"]} onChange={(v) => { setLfoType(v); e?.setLfoType(v as OscillatorType); }} label="Shape" />
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              <Knob value={lfoRate} min={0.1} max={20} step={0.1} label="Rate" unit="Hz" onChange={(v) => { setLfoRate(v); e?.setLfoRate(v); }} size="sm" />
              <Knob value={lfoDepth} min={0} max={100} step={1} label="Depth" onChange={(v) => { setLfoDepth(v); e?.setLfoDepth(v); }} size="sm" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 10, color: "#444" }}>Route</span>
              <div style={{ display: "flex", gap: 4 }}>
                {(["pitch", "filter"] as const).map((r) => (
                  <button key={r} onClick={() => { setLfoRoute(r); e?.setLfoRoute(r); }} style={{
                    padding: "5px 14px", borderRadius: 4, border: "1px solid",
                    borderColor: lfoRoute === r ? ACCENT : SEC_BDR,
                    background: lfoRoute === r ? `${ACCENT}22` : SEC_BG,
                    color: lfoRoute === r ? ACCENT : "#555",
                    fontSize: 11, cursor: "pointer", textTransform: "capitalize",
                  }}>{r}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard */}
      <div style={{ borderTop: `1px solid ${SEC_BDR}`, padding: "8px 10px", background: SEC_BG }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setStartOctave((o) => Math.max(1, o - 1))} style={{ padding: "2px 10px", borderRadius: 4, border: `1px solid ${SEC_BDR}`, background: SCREEN_BG, color: "#555", fontSize: 14, cursor: "pointer" }}>−</button>
            <span style={{ fontSize: 11, color: "#555", alignSelf: "center" }}>Oct {startOctave}</span>
            <button onClick={() => setStartOctave((o) => Math.min(6, o + 1))} style={{ padding: "2px 10px", borderRadius: 4, border: `1px solid ${SEC_BDR}`, background: SCREEN_BG, color: "#555", fontSize: 14, cursor: "pointer" }}>+</button>
          </div>
        </div>
        <PianoKeyboard
          onNoteOn={noteOn}
          onNoteOff={noteOff}
          startOctave={startOctave}
          octaves={2}
          whiteKeyWidth={mobileKeyWidth}
          whiteKeyHeight={80}
          activeNotes={activeNotes}
        />
      </div>
    </div>
  );

  return isMobile ? mobileView : desktopView;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /home/steve/IdeaProjects/Osciscoops && npx tsc --noEmit 2>&1 | head -40`

Expected: No errors in `src/app/temp-synths/3-hardware/page.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/app/temp-synths/3-hardware/page.tsx
git commit -m "feat: add synth3 hardware page with hot magenta chassis"
```
