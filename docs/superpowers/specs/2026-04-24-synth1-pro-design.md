# Synth 1 Pro — AudioWorklet Engine Design

**Goal:** Rebuild the Synth 1 audio engine with sample-accurate DSP (AudioWorklet), a band-limited PolyBLEP oscillator, exponential A/H/R envelope, and a State Variable Filter — while reusing the existing 1-hardware UI shell verbatim.

**Route:** `/temp-synths/1-pro` (no nav changes; direct URL access only)

---

## Architecture

Three files, clean separation of concerns:

| File | Responsibility |
|------|---------------|
| `public/worklets/starter-pro-processor.js` | All synthesis DSP on the audio thread |
| `src/app/temp-synths/1-pro/engine.ts` | Main-thread wrapper: module loading, node wiring, public API |
| `src/app/temp-synths/1-pro/page.tsx` | UI: 1-hardware page with engine swap + async loading state |

---

## Section 1: AudioWorklet Processor

**File:** `public/worklets/starter-pro-processor.js`

Registered as `'starter-pro-processor'`. Runs every 128 samples on the dedicated audio thread.

### Voice

Single mono voice (no pool). Voice state:
- `osc`: PolyBLEP oscillator state `{ phase, tri, type }`
- `env`: A/H/R envelope state `{ state, value, coeff, target }`
- `freq`: current note frequency

### PolyBLEP Oscillator

Same algorithm as `classic-pro-processor`. Phase accumulator in `[0, 1)`. `phaseInc = frequency / sampleRate`.

```js
function polyBlep(phase, inc) {
  if (phase < inc) {
    const t = phase / inc;
    return t + t - t * t - 1.0;
  }
  if (phase > 1.0 - inc) {
    const t = (phase - 1.0) / inc;
    return t * t + t + t + 1.0;
  }
  return 0.0;
}

function oscNext(osc, inc) {
  const p = osc.phase;
  let s;
  if (osc.type === 'sine') {
    s = Math.sin(TWO_PI * p);
  } else if (osc.type === 'square') {
    s = (p < 0.5 ? 1.0 : -1.0) + polyBlep(p, inc) - polyBlep((p + 0.5) % 1.0, inc);
  } else if (osc.type === 'triangle') {
    const sq = (p < 0.5 ? 1.0 : -1.0) + polyBlep(p, inc) - polyBlep((p + 0.5) % 1.0, inc);
    osc.tri += 4.0 * inc * (sq - osc.tri);
    s = osc.tri;
  } else {
    s = p * 2.0 - 1.0 - polyBlep(p, inc); // sawtooth
  }
  osc.phase = (p + inc) % 1.0;
  return s;
}
```

### A/H/R Envelope

State machine: `IDLE(0) → ATTACK(1) → HOLD(2) → RELEASE(3) → IDLE`

Per-sample update:
```js
env.value += (env.target - env.value) * env.coeff;
```

`coeff = 1 - Math.exp(-1 / (timeConstant_s * sampleRate))`

State transitions:
- **ATTACK:** target = 1.0001, coeff from `attack`. When `value >= 1.0` → HOLD, set value = 1.0
- **HOLD:** value clamped to 1.0. Holds until noteOff
- **RELEASE:** target = 0.00001, coeff from `release`. When `value <= 0.0001` → IDLE, set value = 0

On `noteOn`: always restart envelope — set `value = 0`, enter ATTACK.
On `noteOff`: if ATTACK or HOLD, enter RELEASE.

### SVF Filter (Simper/Cytomic)

Lowpass output only. Resonance fixed at Q = 0.7071 (Butterworth — maximally flat, no resonance peak).

Coefficient computation (called when filterFreq changes):
```js
const g = Math.tan(Math.PI * cutoff / sampleRate);
const k = Math.SQRT2; // 1/0.7071 ≈ √2
const a1 = 1 / (1 + g * (g + k));
const a2 = g * a1;
const a3 = g * a2;
```

State: `ic1 = 0, ic2 = 0`.

Per-sample processing:
```js
const v3 = input - ic2;
const v1 = a1 * ic1 + a2 * v3;
const v2 = ic2 + a2 * ic1 + a3 * v3;
ic1 = 2 * v1 - ic1;
ic2 = 2 * v2 - ic2;
output = v2; // lowpass
```

SVF coefficients recomputed only when `|cutoff - prevCutoff| > 0.5` or `svfDirty` flag is set.

### Parameter Communication

Messages via `this.port.onmessage`, drained at top of `process()` using index loop + `length = 0`.

```js
const PARAM_KEYS = new Set(['waveform', 'filterFreq', 'attack', 'release']);
```

Message types:
```js
{ type: 'noteOn',   note: 'A4', velocity: 0.8 }
{ type: 'noteOff',  note: 'A4' }
{ type: 'setParam', key: string, value: number | string }
```

On `noteOn`: set `voice.freq = noteToFreq(note)`, reset osc phase, reset envelope to ATTACK.
On `noteOff`: trigger RELEASE if voice is in ATTACK or HOLD.

### Output

Single voice output → SVF → stereo output (mono summed to both channels). `process()` returns `true`.

---

## Section 2: Engine (main thread)

**File:** `src/app/temp-synths/1-pro/engine.ts`

### Async Construction

```ts
static async create(): Promise<StarterProEngine>
```

### Init sequence

```ts
const ctx = getAudioContext();
await ctx.audioWorklet.addModule('/worklets/starter-pro-processor.js');
const workletNode = new AudioWorkletNode(ctx, 'starter-pro-processor');
// wire: workletNode → analyser → compressor → masterGain → destination
// reverb parallel send off masterGain
```

### Signal Chain

```
workletNode → analyser → compressor → masterGain → destination (dry)
                                      masterGain → reverbWetGain → convolver → destination
```

Analyser tapped before effects. Convolver impulse response built via `_buildIR(ctx, duration=2.5, decay=2.5)` — same algorithmic reverb as the classic-pro engine.

### Public API

Identical surface to `Synth1Engine`:

```ts
noteOn(note: string, velocity?: number): void
noteOff(note: string): void
setWaveform(t: OscillatorType): void
setFilterFreq(hz: number): void
setAttack(s: number): void
setRelease(s: number): void
setReverb(on: boolean): void   // reverbWetGain→0.5 (on) or 0 (off); masterGain stays at 0.8
setVolume(v: number): void
getWaveform(): Float32Array
getFFT(): Float32Array
get sampleRate(): number
get fftSize(): number
dispose(): void
```

All setters: store locally + `postMessage({ type: 'setParam', key, value })`.
`noteOn`/`noteOff`: `postMessage({ type: 'noteOn'/'noteOff', note, velocity })`.

### dispose()

Disconnects workletNode, analyser, compressor, masterGain, reverbWetGain, convolver.

---

## Section 3: Page

**File:** `src/app/temp-synths/1-pro/page.tsx`

Copy of `src/app/temp-synths/1-hardware/page.tsx` with these changes only:

1. **Import:** `StarterProEngine` from `'./engine'` (replace `Synth1Engine` from `'../1/engine'`)
2. **engineRef type:** `useRef<StarterProEngine | null>`
3. **Ready state:** `const [ready, setReady] = useState(false)` after existing `useState` declarations
4. **Engine init:**
   ```tsx
   useEffect(() => {
     let disposed = false;
     StarterProEngine.create().then((eng) => {
       if (!disposed) {
         engineRef.current = eng;
         setAnalyserInfo({ sampleRate: eng.sampleRate, fftSize: eng.fftSize });
         setReady(true);
       } else {
         eng.dispose();
       }
     }).catch((err) => {
       if (!disposed) console.error('StarterProEngine init failed:', err);
     });
     return () => {
       disposed = true;
       engineRef.current?.dispose();
       engineRef.current = null;
     };
   }, []);
   ```
5. **Desktop title:** `THE STARTER PRO` / `AudioWorklet · PolyBLEP · SVF`
6. **Mobile title:** `The Starter Pro` / `AudioWorklet Edition`
7. **Loading overlay + position:relative:** Add `position: "relative" as const` to the faceplate inner div style. Insert overlay as last child before faceplate closing tag:
   ```tsx
   {!ready && (
     <div style={{
       position: "absolute", inset: 0, borderRadius: 6,
       background: "rgba(10,10,10,0.85)",
       display: "flex", alignItems: "center", justifyContent: "center",
       zIndex: 10,
     }}>
       <span style={{
         fontSize: 11, fontWeight: 700, letterSpacing: "0.3em",
         color: "#00d4ff", fontFamily: "Arial",
       }}>INITIALIZING...</span>
     </div>
   )}
   ```

All controls, keyboard, waveform/spectrum display — unchanged.

---

## Quality Properties

| Property | Synth 1 (current) | Synth 1 Pro |
|----------|------------------|-------------|
| Audio thread | Web Audio nodes | AudioWorklet (dedicated thread) |
| Oscillator | OscillatorNode (aliases) | PolyBLEP (band-limited) |
| Envelope | `linearRampToValueAtTime` | Exponential per-sample |
| Filter | BiquadFilterNode | SVF (Simper) — stable, no resonance overshoot |
| Timing | Scheduled from UI thread | All events processed at block boundary |
