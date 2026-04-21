# Synth 1 — Spectrum Analyzer, Keyboard Binding, Mobile Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-time spectrum analyzer with EQ curve overlay, computer keyboard binding with octave navigation, and a tabs-based mobile layout to `src/app/temp-synths/1/` (The Starter synth).

**Architecture:** Three independent layers of change. (1) Engine gains FFT data access. (2) A new shared `SpectrumCanvas` component renders FFT bars + lowpass EQ curve. (3) `page.tsx` wires state, keyboard binding, octave nav, and splits mobile/desktop layouts using `isMobile`. No changes to `PianoKeyboard` — it already accepts `activeNotes?: Set<string>`.

**Tech Stack:** Web Audio API `AnalyserNode`, React `useState`/`useEffect`/`useCallback`/`useRef`, TypeScript, Tailwind v4 CSS variables (`var(--primary)`, `var(--border)`, etc.), no test suite (verify manually in browser at `http://localhost:3000/temp-synths/1`).

---

## File Map

| File | Action |
|------|--------|
| `src/app/temp-synths/1/engine.ts` | Modify — add `getFFT()`, `get sampleRate()`, `get fftSize()` |
| `src/app/temp-synths/spectrum-canvas.tsx` | Create — new shared visualizer component |
| `src/app/temp-synths/1/page.tsx` | Modify — all state, layout, keyboard binding, tabs |

---

## Task 1: Engine — FFT data access

**Files:**
- Modify: `src/app/temp-synths/1/engine.ts`

The `AnalyserNode` already exists. Add three public accessors so `page.tsx` can pass `sampleRate` and `fftSize` to `SpectrumCanvas`, and call `getFFT()` each animation frame.

- [ ] **Step 1: Add getters and getFFT() to engine**

In `src/app/temp-synths/1/engine.ts`, add after the `getWaveform()` method (line 100):

```ts
  getFFT(): Float32Array {
    const buf = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(buf);
    return buf;
  }

  get sampleRate(): number {
    return this.ctx.sampleRate;
  }

  get fftSize(): number {
    return this.analyser.fftSize;
  }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/steve/IdeaProjects/Osciscoops && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors relating to `engine.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/temp-synths/1/engine.ts
git commit -m "feat(synth1): add getFFT(), sampleRate and fftSize getters to engine"
```

---

## Task 2: Create SpectrumCanvas component

**Files:**
- Create: `src/app/temp-synths/spectrum-canvas.tsx`

Renders FFT frequency bars on a log-scaled x-axis (20Hz–18kHz, dBFS on y). Overlays an orange lowpass filter response curve that redraws live as `filterFreq` changes. Uses same canvas/RAF pattern as the existing `WaveformCanvas`.

The filter magnitude uses a 2nd-order Butterworth approximation: `|H(f)| = 1 / sqrt(1 + (f/cutoff)^4)`, giving -12dB/oct rolloff.

- [ ] **Step 1: Create the file**

Create `src/app/temp-synths/spectrum-canvas.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

interface SpectrumCanvasProps {
  getFFT: () => Float32Array;
  filterFreq: number;
  sampleRate: number;
  fftSize: number;
  width?: number;
  height?: number;
}

const MIN_FREQ = 20;
const MAX_FREQ = 18000;
const LOG_RANGE = Math.log10(MAX_FREQ / MIN_FREQ);
const MIN_DB = -100;
const DB_RANGE = 100;

export function SpectrumCanvas({
  getFFT,
  filterFreq,
  sampleRate,
  fftSize,
  width = 320,
  height = 80,
}: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const getRef = useRef(getFFT);
  const filterFreqRef = useRef(filterFreq);

  useEffect(() => { getRef.current = getFFT; });
  useEffect(() => { filterFreqRef.current = filterFreq; }, [filterFreq]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const draw = () => {
      const data = getRef.current();
      ctx.clearRect(0, 0, width, height);

      // FFT bars — one pixel column per x position, log-scaled frequency
      for (let x = 0; x < width; x++) {
        const freq = MIN_FREQ * Math.pow(10, (x / width) * LOG_RANGE);
        const bin = Math.round((freq * fftSize) / sampleRate);
        if (bin <= 0 || bin >= data.length) continue;
        const db = Math.max(data[bin], MIN_DB);
        const barH = ((db - MIN_DB) / DB_RANGE) * height;
        ctx.fillStyle = "var(--primary)";
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x, height - barH, 1, barH);
      }
      ctx.globalAlpha = 1;

      // Lowpass EQ curve overlay (2nd-order Butterworth: -12dB/oct)
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const freq = MIN_FREQ * Math.pow(10, (x / width) * LOG_RANGE);
        const ratio = freq / filterFreqRef.current;
        const mag = 1 / Math.sqrt(1 + Math.pow(ratio, 4));
        const db = 20 * Math.log10(Math.max(mag, 1e-10));
        const y = height - ((Math.max(db, MIN_DB) - MIN_DB) / DB_RANGE) * height;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height, sampleRate, fftSize]);

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

- [ ] **Step 2: Check TypeScript**

```bash
cd /home/steve/IdeaProjects/Osciscoops && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors in `spectrum-canvas.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/temp-synths/spectrum-canvas.tsx
git commit -m "feat(synth1): add SpectrumCanvas with FFT bars and lowpass EQ curve overlay"
```

---

## Task 3: Wire analyserInfo + dual visualizers into page.tsx

**Files:**
- Modify: `src/app/temp-synths/1/page.tsx`

Add `analyserInfo` state, `getFFT` callback, and update the header to show waveform + spectrum side-by-side on both mobile and desktop. Use `isMobile` to vary sizes (44px height on mobile, 60px on desktop; each canvas ~160px mobile, ~220px desktop).

- [ ] **Step 1: Add imports and analyserInfo state**

At the top of `src/app/temp-synths/1/page.tsx`, add the `SpectrumCanvas` import after the `WaveformCanvas` import:

```ts
import { SpectrumCanvas } from "../spectrum-canvas";
```

Inside `Synth1Page`, add `analyserInfo` state after the existing `useState` declarations:

```ts
const [analyserInfo, setAnalyserInfo] = useState({ sampleRate: 44100, fftSize: 1024 });
```

- [ ] **Step 2: Capture analyserInfo after engine init**

In the existing engine `useEffect`, add the setAnalyserInfo call:

```ts
useEffect(() => {
  engineRef.current = new Synth1Engine();
  setAnalyserInfo({
    sampleRate: engineRef.current.sampleRate,
    fftSize: engineRef.current.fftSize,
  });
  return () => engineRef.current?.dispose();
}, []);
```

- [ ] **Step 3: Add getFFT callback**

After the `getWaveform` callback:

```ts
const getFFT = useCallback((): Float32Array => {
  return engineRef.current?.getFFT() ?? new Float32Array(512);
}, []);
```

- [ ] **Step 4: Update the header JSX to dual visualizers**

Replace the existing `header` constant with one that shows both canvases side-by-side. The sizes are based on whether we're mobile or desktop:

```tsx
const vizW = isMobile ? 152 : 220;
const vizH = isMobile ? 44 : 60;

const header = (
  <div
    style={{
      padding: isMobile ? "8px 12px" : "12px 16px",
      borderBottom: "1px solid var(--border)",
    }}
  >
    <p
      style={{
        fontSize: isMobile ? 13 : 16,
        fontWeight: 700,
        margin: 0,
      }}
    >
      The Starter
    </p>
    <p
      style={{
        fontSize: isMobile ? 9 : 11,
        color: "var(--muted-foreground)",
        margin: isMobile ? "1px 0 6px" : "2px 0 8px",
      }}
    >
      Oscillator · Filter · Envelope · Reverb
    </p>
    <div style={{ display: "flex", gap: 6 }}>
      <WaveformCanvas getWaveform={getWaveform} width={vizW} height={vizH} />
      <SpectrumCanvas
        getFFT={getFFT}
        filterFreq={filterFreq}
        sampleRate={analyserInfo.sampleRate}
        fftSize={analyserInfo.fftSize}
        width={vizW}
        height={vizH}
      />
    </div>
  </div>
);
```

- [ ] **Step 5: Verify in browser**

Open `http://localhost:3000/temp-synths/1`. Both desktop and mobile (resize to <768px) should show two side-by-side visualizers in the header. Play a note — waveform animates on left, spectrum bars animate on right with orange EQ curve.

- [ ] **Step 6: Commit**

```bash
git add src/app/temp-synths/1/page.tsx
git commit -m "feat(synth1): wire dual waveform+spectrum visualizers into header"
```

---

## Task 4: Desktop — 2 octaves + octave navigation buttons

**Files:**
- Modify: `src/app/temp-synths/1/page.tsx`

Add `startOctave` state. Replace the hardcoded `startOctave={3}` and `octaves={3}` on `PianoKeyboard`. Show `−` / `+` buttons with a label above the keyboard on desktop only.

- [ ] **Step 1: Add startOctave state**

Add after the other `useState` declarations:

```ts
const [startOctave, setStartOctave] = useState(3);
```

- [ ] **Step 2: Update the keyboard JSX**

Replace the existing `keyboard` constant:

```tsx
const octaveNavStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--foreground)",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1,
  padding: "2px 8px",
};

const keyboard = (
  <div style={{ padding: "8px 12px" }}>
    {!isMobile && (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
          justifyContent: "flex-end",
        }}
      >
        <button
          style={octaveNavStyle}
          onClick={() => setStartOctave((o) => Math.max(1, o - 1))}
          disabled={startOctave <= 1}
          aria-label="Octave down"
        >
          −
        </button>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)", minWidth: 52, textAlign: "center" }}>
          Oct {startOctave}–{startOctave + 1}
        </span>
        <button
          style={octaveNavStyle}
          onClick={() => setStartOctave((o) => Math.min(6, o + 1))}
          disabled={startOctave >= 6}
          aria-label="Octave up"
        >
          +
        </button>
      </div>
    )}
    <PianoKeyboard
      onNoteOn={noteOn}
      onNoteOff={noteOff}
      startOctave={startOctave}
      octaves={2}
      activeNotes={activeNotes}
      whiteKeyWidth={isMobile ? mobileKeyWidth : 24}
      whiteKeyHeight={isMobile ? 80 : 72}
    />
  </div>
);
```

Note: `activeNotes` is new state added in Task 5. Declare it early as an empty set to avoid a compile error now:

```ts
const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
```

Add this alongside the other `useState` declarations.

- [ ] **Step 3: Verify in browser (desktop)**

Open `http://localhost:3000/temp-synths/1` in a wide window. Should see 2-octave keyboard with `−  Oct 3–4  +` controls above it. Click `+` → label updates to `Oct 4–5`, keyboard note labels shift. Click at max (6) → `+` is disabled.

- [ ] **Step 4: Commit**

```bash
git add src/app/temp-synths/1/page.tsx
git commit -m "feat(synth1): desktop 2-octave keyboard with octave navigation buttons"
```

---

## Task 5: Desktop — computer keyboard binding

**Files:**
- Modify: `src/app/temp-synths/1/page.tsx`

Map QWERTY keys to notes at `startOctave`. Use a `useRef` for `startOctave` inside the effect so listeners don't need re-registration on octave change. Track held keys by key name (not note) to prevent repeat events.

The key layout maps two octaves starting at `startOctave`:
- Home row: `A`=C, `S`=D, `D`=E, `F`=F, `G`=G, `H`=A, `J`=B, `K`=C+1, `L`=D+1, `;`=E+1
- Upper row: `W`=C#, `E`=D#, `T`=F#, `Y`=G#, `U`=A#, `O`=C#+1, `P`=D#+1

- [ ] **Step 1: Add constant key map above the component**

Add this constant outside the `Synth1Page` function (e.g. after the `THEME` constant at the top of the file):

```ts
const KEY_NOTE_MAP: Record<string, [string, number]> = {
  a: ["C", 0],  w: ["C#", 0], s: ["D", 0],  e: ["D#", 0],
  d: ["E", 0],  f: ["F", 0],  t: ["F#", 0], g: ["G", 0],
  y: ["G#", 0], h: ["A", 0],  u: ["A#", 0], j: ["B", 0],
  k: ["C", 1],  o: ["C#", 1], l: ["D", 1],  p: ["D#", 1],
  ";": ["E", 1],
};
```

- [ ] **Step 2: Add startOctaveRef**

Inside `Synth1Page`, after the `startOctave` state declaration:

```ts
const startOctaveRef = useRef(startOctave);
useEffect(() => { startOctaveRef.current = startOctave; }, [startOctave]);
```

- [ ] **Step 3: Add keyboard binding useEffect**

Add this effect after the other `useEffect` blocks inside `Synth1Page`:

```ts
useEffect(() => {
  if (isMobile) return;

  const heldKeys = new Set<string>();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const entry = KEY_NOTE_MAP[e.key.toLowerCase()];
    if (!entry) return;
    e.preventDefault();
    if (heldKeys.has(e.key.toLowerCase())) return;
    heldKeys.add(e.key.toLowerCase());
    const [name, offset] = entry;
    const note = `${name}${startOctaveRef.current + offset}`;
    noteOn(note, 0.8);
    setActiveNotes((prev) => new Set([...prev, note]));
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    const entry = KEY_NOTE_MAP[e.key.toLowerCase()];
    if (!entry) return;
    heldKeys.delete(e.key.toLowerCase());
    const [name, offset] = entry;
    const note = `${name}${startOctaveRef.current + offset}`;
    noteOff(note);
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  };
}, [isMobile, noteOn, noteOff]);
```

- [ ] **Step 4: Verify in browser (desktop)**

Open `http://localhost:3000/temp-synths/1`. Press `A` — C3 key lights up and note plays. Press `W` — C#3 lights up. Press `+` octave button, then `A` — now C4 plays. Release key — note decays. Hold multiple keys — polyphony via rapid retriggering.

- [ ] **Step 5: Commit**

```bash
git add src/app/temp-synths/1/page.tsx
git commit -m "feat(synth1): computer keyboard binding with octave-tracking for desktop"
```

---

## Task 6: Mobile controls — tabs

**Files:**
- Modify: `src/app/temp-synths/1/page.tsx`

Replace the 2×2 grid `controls` with a split: desktop keeps the grid, mobile gets tabs (OSC / FILTER / ENV / FX). The `controls` prop passed to `SynthShell` becomes `isMobile ? mobileControls : desktopControls`.

- [ ] **Step 1: Add activeTab state**

Add alongside the other state declarations:

```ts
const [activeTab, setActiveTab] = useState<"osc" | "filter" | "env" | "fx">("osc");
```

- [ ] **Step 2: Extract desktop controls**

Rename the existing `controls` constant to `desktopControls` (it's the current 2×2 grid — keep it exactly as-is):

```tsx
const desktopControls = (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 12 }}>
    {/* ... existing oscillator, filter, envelope, FX sections unchanged ... */}
  </div>
);
```

- [ ] **Step 3: Add mobileControls with tabs**

```tsx
const TAB_BAR_STYLE: React.CSSProperties = {
  display: "flex",
  borderBottom: "1px solid var(--border)",
  flexShrink: 0,
};

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "8px 4px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  background: "none",
  border: "none",
  borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
  color: active ? "var(--foreground)" : "var(--muted-foreground)",
  cursor: "pointer",
});

const TABS = [
  { id: "osc" as const, label: "OSC" },
  { id: "filter" as const, label: "FILTER" },
  { id: "env" as const, label: "ENV" },
  { id: "fx" as const, label: "FX" },
];

const mobileControls = (
  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
    <div style={TAB_BAR_STYLE}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          style={tabBtnStyle(activeTab === tab.id)}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
    <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto" }}>
      {activeTab === "osc" && (
        <div style={SECTION}>
          <p style={LABEL}>Oscillator</p>
          <WaveformSelect
            value={waveform}
            options={["sine", "square", "sawtooth", "triangle"]}
            onChange={handleWaveform}
            label="Waveform"
          />
        </div>
      )}
      {activeTab === "filter" && (
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
              size="sm"
            />
          </div>
        </div>
      )}
      {activeTab === "env" && (
        <div style={SECTION}>
          <p style={LABEL}>Envelope</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
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
      )}
      {activeTab === "fx" && (
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
      )}
    </div>
  </div>
);
```

- [ ] **Step 4: Wire controls to SynthShell**

Update the `controls` prop in the `SynthShell` return:

```tsx
return (
  <SynthShell
    isMobile={isMobile}
    theme={THEME}
    header={header}
    controls={isMobile ? mobileControls : desktopControls}
    keyboard={keyboard}
    navHeight={48}
  />
);
```

- [ ] **Step 5: Verify in browser (mobile)**

Resize browser to <768px. Should see compact header (title 13px, dual visualizers at 44px). Tab bar shows OSC / FILTER / ENV / FX. Tap each tab — correct controls appear. Keyboard at bottom unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/app/temp-synths/1/page.tsx
git commit -m "feat(synth1): mobile tabs layout for controls (OSC/FILTER/ENV/FX)"
```

---

## Self-Review Checklist

Run before claiming the plan is complete:

- Spec §1 (SpectrumCanvas + getFFT): covered by Tasks 1, 2, 3 ✓
- Spec §2 (2 octaves + nav): covered by Task 4 ✓
- Spec §3 (keyboard binding): covered by Task 5 ✓
- Spec §4 (compact mobile header): covered by Task 3 (vizH=44 + smaller font on mobile) ✓
- Spec §5 (mobile tabs): covered by Task 6 ✓
- `activeNotes` state declared in Task 4, used in Tasks 5 and 4 — consistent ✓
- `startOctaveRef` declared in Task 5, used in Task 5's effect — consistent ✓
- `analyserInfo` state declared in Task 3, used in Task 3's header — consistent ✓
- `KEY_NOTE_MAP` declared outside component in Task 5, referenced inside effect in Task 5 — consistent ✓
- No TBDs, no placeholder steps ✓
