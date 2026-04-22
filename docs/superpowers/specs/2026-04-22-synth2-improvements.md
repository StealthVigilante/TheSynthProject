# Synth 2 Improvements Spec

## Goal

Bring "The Learner" (`/temp-synths/2`) up to the same quality level as the improved synth 1: better audio (log filter, compressor, SpectrumCanvas), larger desktop layout, QWERTY keyboard, octave navigation, volume knob, and an animated EnvelopeCurve that tracks the live envelope state with a moving dot.

## Route

- Path: `src/app/temp-synths/2/page.tsx` (modified in-place)
- Engine: `src/app/temp-synths/2/engine.ts` (modified in-place)
- Synth 2 at `/temp-synths/2` — no new route

---

## Engine Changes (`src/app/temp-synths/2/engine.ts`)

### Signal chain

Current: `oscGain/subGain → envGain → filter → master → [reverb/delay splits] → ctx.destination`

New: `oscGain/subGain → envGain → filter → master → analyser → compressor → masterGain → ctx.destination`

Reverb and delay sends tap off **before** `master` (unchanged). `analyser`, `compressor`, and `masterGain` are the new nodes appended at the tail.

### New nodes

**AnalyserNode** (`this.analyser`): already exists at `fftSize = 1024`. Change it to `2048` and add `fftBuf`. Keep `this.buf` (used by `getWaveform()`).

**What to add:**

```ts
private compressor: DynamicsCompressorNode;
private masterGain: GainNode;
private fftBuf: Float32Array;
```

Compressor settings:
```ts
this.compressor = this.ctx.createDynamicsCompressor();
this.compressor.threshold.value = -18;
this.compressor.knee.value = 12;
this.compressor.ratio.value = 12;
this.compressor.attack.value = 0.003;
this.compressor.release.value = 0.25;
```

masterGain:
```ts
this.masterGain = this.ctx.createGain();
this.masterGain.gain.value = 0.8;
```

fftBuf:
```ts
this.fftBuf = new Float32Array(this.analyser.frequencyBinCount);
```

### Reconnect tail chain

The existing constructor ends with:
```ts
this.master.connect(this.analyser);
this.analyser.connect(this.ctx.destination);  // ← remove this line
```

Replace those two lines with:
```ts
this.master.connect(this.analyser);
this.analyser.connect(this.compressor);
this.compressor.connect(this.masterGain);
this.masterGain.connect(this.ctx.destination);
```

Change the existing `this.analyser.fftSize = 1024;` to `this.analyser.fftSize = 2048;`. Then add `this.fftBuf = new Float32Array(this.analyser.frequencyBinCount);` after the existing `this.buf` line.

The existing reverb/delay send taps are off `this.master` — those stay unchanged.

### New methods / getters

```ts
get sampleRate(): number { return this.ctx.sampleRate; }
get fftSize(): number { return this.analyser.fftSize; }

getFFT(): Float32Array {
  this.analyser.getFloatFrequencyData(this.fftBuf as any);
  return this.fftBuf;
}

setVolume(v: number): void {
  this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01);
}
```

### dispose()

Add cleanup:
```ts
this.compressor.disconnect();
this.masterGain.disconnect();
```

---

## Page Changes (`src/app/temp-synths/2/page.tsx`)

### New imports

```ts
import { SpectrumCanvas } from "../spectrum-canvas";
```

### New / updated state

```ts
const [analyserInfo, setAnalyserInfo] = useState({ sampleRate: 44100, fftSize: 2048 });
const [volume, setVolumeState] = useState(0.8);
const [startOctave, setStartOctave] = useState(3);
const startOctaveRef = useRef(startOctave);
useEffect(() => { startOctaveRef.current = startOctave; }, [startOctave]);
const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
const [noteOnMs, setNoteOnMs] = useState<number | null>(null);
const [noteOffMs, setNoteOffMs] = useState<number | null>(null);
```

Engine init useEffect becomes:
```ts
useEffect(() => {
  engineRef.current = new Synth2Engine();
  setAnalyserInfo({
    sampleRate: engineRef.current.sampleRate,
    fftSize: engineRef.current.fftSize,
  });
  return () => engineRef.current?.dispose();
}, []);
```

### Updated callbacks

`noteOn`:
```ts
const noteOn = useCallback((note: string, vel: number) => {
  engineRef.current?.noteOn(note, vel);
  setActiveNotes((prev) => new Set([...prev, note]));
  setNoteOnMs(performance.now());
  setNoteOffMs(null);
}, []);
```

`noteOff`:
```ts
const noteOff = useCallback((note: string) => {
  engineRef.current?.noteOff(note);
  setActiveNotes((prev) => { const n = new Set(prev); n.delete(note); return n; });
  setNoteOffMs(performance.now());
}, []);
```

`getFFT`:
```ts
const getFFT = useCallback((): Float32Array => {
  return engineRef.current?.getFFT() ?? new Float32Array(512);
}, []);
```

`handleVolume`:
```ts
const handleVolume = useCallback((v: number) => {
  setVolumeState(v);
  engineRef.current?.setVolume(v);
}, []);
```

### QWERTY keyboard bindings

Same `KEY_NOTE_MAP` as synth 1. Desktop-only useEffect guarded by `if (isMobile) return`. Uses `startOctaveRef` to avoid stale closure.

```ts
const KEY_NOTE_MAP: Record<string, [string, number]> = {
  a: ["C", 0],  w: ["C#", 0], s: ["D", 0],  e: ["D#", 0],
  d: ["E", 0],  f: ["F", 0],  t: ["F#", 0], g: ["G", 0],
  y: ["G#", 0], h: ["A", 0],  u: ["A#", 0], j: ["B", 0],
  k: ["C", 1],  o: ["C#", 1], l: ["D", 1],  p: ["D#", 1],
  ";": ["E", 1],
};
```

### Style constants

```ts
const SECTION: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "16px 20px",
};

const LABEL: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "var(--muted-foreground)",
  marginBottom: 14,
};
```

### vizW / vizH

```ts
const vizW = isMobile ? 100 : 280;
const vizH = isMobile ? 36 : 76;
```

---

## Desktop Layout

### Header

Flex row, `justifyContent: "space-between"`, `alignItems: "center"`, `borderBottom: "1px solid var(--border)"`, `padding: "16px 20px"`.

Left:
- `"The Learner"` — fontSize 22, fontWeight 700
- `"Osc + Sub · Filter · ADSR · Reverb + Delay"` — subtitle, fontSize 13, muted

Center: `display: "flex", gap: 6, alignItems: "center"`
- `WaveformCanvas` width=280 height=76
- `SpectrumCanvas` width=280 height=76

Right:
- `Knob` `size="sm"` `value={volume}` `min=0` `max=1` `step=0.01` `label="Vol"` `onChange={handleVolume}`

### Controls grid

```css
display: grid;
grid-template-columns: 1fr 1fr 1fr;
grid-template-rows: auto auto;
gap: 14px;
padding: 16px;
```

**Row 1 — OSC panel** (`grid-column: 1`):
```
<p style={LABEL}>Oscillator</p>
<WaveformSelect value={waveform} options={["sine","square","sawtooth","triangle"]} onChange={handleWaveform} size="md" label="Waveform" />
<div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
  <button onClick={handleSub} style={toggleStyle(subEnabled)}>Sub {subEnabled ? "ON" : "OFF"}</button>
</div>
```

**Row 1 — FILTER panel** (`grid-column: 2`):
```
<p style={LABEL}>Filter</p>
<div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
  <Knob value={cutoff} min={80} max={18000} step={10} label="Cutoff" unit="Hz" scale="log" onChange={handleCutoff} size="lg" />
  <Knob value={resonance} min={0.1} max={20} step={0.1} label="Res" unit="Q" onChange={handleRes} size="sm" />
</div>
```

**Row 1 — FX panel** (`grid-column: 3`):
```
<p style={LABEL}>FX</p>
<div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
  <button onClick={handleReverb} style={toggleStyle(reverbOn)}>Reverb {reverbOn ? "ON" : "OFF"}</button>
  <Knob value={delayAmount} min={0} max={1} step={0.01} label="Delay" onChange={handleDelay} size="sm" />
</div>
```

**Row 2 — ENV panel** (`grid-column: 1 / -1` — spans all 3 cols):
```
<p style={LABEL}>Envelope</p>
<div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
  {/* Left: faders */}
  <div style={{ display: "flex", gap: 28 }}>
    <Fader value={attack} min={0.001} max={2} step={0.001} label="Attack" unit="s" size="md" onChange={handleAttack} />
    <Fader value={release} min={0.05} max={4} step={0.01} label="Release" unit="s" size="md" onChange={handleRelease} />
  </div>
  {/* Right: sustain toggle + curve */}
  <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <button onClick={handleSustain} style={toggleStyle(sustainOn)}>Sustain {sustainOn ? "ON" : "OFF"}</button>
    </div>
    <EnvelopeCurve
      attack={attack}
      release={release}
      sustainOn={sustainOn}
      noteOnMs={noteOnMs}
      noteOffMs={noteOffMs}
    />
  </div>
</div>
```

### Keyboard section

Identical structure to synth 1 improved keyboard:
- Octave nav centered above keyboard (− / label / +)
- `PianoKeyboard` octaves=3, whiteKeyWidth=28, whiteKeyHeight=92, activeNotes={activeNotes}
- startOctave state (1–5)

### SynthShell

```tsx
<SynthShell
  isMobile={isMobile}
  theme={THEME}
  header={isMobile ? mobileHeader : desktopHeader}
  controls={isMobile ? mobileControls : desktopControls}
  keyboard={keyboard}
  navHeight={48}
  desktopClassName="w-[760px] lg:w-[840px]"
/>
```

---

## Animated EnvelopeCurve Component

Replace the existing `EnvelopeCurve` function in `page.tsx` with an updated version.

### Props

```ts
interface EnvelopeCurveProps {
  attack: number;       // seconds
  release: number;      // seconds
  sustainOn: boolean;
  noteOnMs: number | null;    // performance.now() when note pressed
  noteOffMs: number | null;   // performance.now() when note released (null = key still held)
}
```

### Animation logic

The SVG path has 4 key points (same as before):
- P0 = (0, bot) — silence
- P1 = (aX, top) — peak after attack
- P2 = (sX, mid) — sustain level (or bot if sustainOn=false)
- P3 = (rEnd, bot) — back to silence after release

The dot (cyan `<circle r={4}>`) uses `requestAnimationFrame` inside a `useEffect` to track position:

```
if noteOnMs === null:
  dot hidden

else:
  elapsed = performance.now() - noteOnMs
  
  if noteOffMs === null (key held):
    if elapsed < attack * 1000:
      // Attack phase — interpolate P0 → P1
      t = elapsed / (attack * 1000)
      dot.x = lerp(0, aX, t)
      dot.y = lerp(bot, top, t)
    else:
      // Sustain phase — hold at P2
      dot.x = sX
      dot.y = mid
  
  else (key released):
    releaseElapsed = performance.now() - noteOffMs
    if releaseElapsed < release * 1000:
      // Release phase — interpolate P2 → P3
      t = releaseElapsed / (release * 1000)
      dot.x = lerp(sX, rEnd, t)
      dot.y = lerp(mid, bot, t)
    else:
      dot hidden (release complete)
```

The dot is rendered as:
```tsx
<circle cx={dotX} cy={dotY} r={4} fill="var(--primary)" style={{ filter: "drop-shadow(0 0 4px var(--primary))" }} />
```

The RAF loop runs only when `noteOnMs !== null`. It cancels on cleanup.

Use `useRef` for RAF id and dot position state (use `useState` for dot coords so it triggers re-render — or use a canvas for performance, but SVG is fine at 60fps for a single dot).

Actually: use `useState` for `{ x, y, visible }` updated inside RAF. This keeps it simple and React-idiomatic. The RAF runs while `noteOnMs !== null`, and stops when release completes.

### Full component signature

```tsx
function EnvelopeCurve({ attack, release, sustainOn, noteOnMs, noteOffMs }: EnvelopeCurveProps) {
  const W = 280;   // wider in desktop layout
  const H = 80;
  // ... geometry + RAF animation
}
```

Width: 280px (desktop), height: 80px. The component width is always desktop-sized here since it only appears in the desktop ENV panel.

---

## Mobile Layout

Same `SynthShell` mobile pattern as synth 1. Hardware theme not applied (uses existing `THEME` CSS vars).

Tabs: OSC, FILTER, ENV, FX (same 4 tabs).

Mobile tab panels use `SECTION` style (with CSS vars — theme-aware).

**OSC tab:** WaveformSelect (no size prop) + Sub toggle

**FILTER tab:** Cutoff Knob `size="sm"` `scale="log"` + Res Knob `size="sm"`

**ENV tab:** Faders (no size) side by side + Sustain toggle. No envelope curve on mobile (too small to be useful).

**FX tab:** Reverb toggle + Delay Knob `size="sm"`

Mobile header: flex row — title+subtitle left | WaveformCanvas(100×36) + SpectrumCanvas(100×36) + vol Knob sm right.

Mobile keyboard: 2 octaves, `mobileKeyWidth`, `whiteKeyHeight=80`. No octave nav on mobile.

---

## TABS constant

```ts
const TABS = [
  { id: "osc" as const, label: "OSC" },
  { id: "filter" as const, label: "FILTER" },
  { id: "env" as const, label: "ENV" },
  { id: "fx" as const, label: "FX" },
];
```

`activeTab` state: `"osc" | "filter" | "env" | "fx"`, default `"osc"`.

---

## toggleStyle helper

Keep existing `toggleStyle(on: boolean)` helper (desktop + mobile reverb/sub/sustain buttons).

---

## No new shared components

All changes are in `engine.ts` and `page.tsx`. `EnvelopeCurve` stays in `page.tsx` as a local component.
