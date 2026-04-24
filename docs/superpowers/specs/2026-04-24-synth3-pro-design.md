# Synth 3 Pro — AudioWorklet Engine Design

**Goal:** Rebuild the Synth 3 audio engine with sample-accurate DSP (AudioWorklet), band-limited PolyBLEP oscillators, exponential ADSR envelopes, and a State Variable Filter — while reusing the existing 3-hardware UI shell verbatim.

**Route:** `/temp-synths/3-pro` (no nav changes; direct URL access only)

---

## Architecture

Three files, clean separation of concerns:

| File | Responsibility |
|------|---------------|
| `public/worklets/classic-pro-processor.js` | All synthesis DSP on the audio thread |
| `src/app/temp-synths/3-pro/engine.ts` | Main-thread wrapper: module loading, node wiring, public API |
| `src/app/temp-synths/3-pro/page.tsx` | UI: 3-hardware page with engine swap + async loading state |

---

## Section 1: AudioWorklet Processor

**File:** `public/worklets/classic-pro-processor.js`

Registered as `'classic-pro-processor'`. The `process(inputs, outputs)` method runs every 128 samples on the dedicated audio thread.

### Voice Pool

4 pre-allocated voice slots. Each voice holds:
- `osc1`, `osc2`: PolyBLEP oscillator state objects `{ phase, phaseInc, type }`
- `ampEnv`: ADSR state object `{ state, value, coeff, target }`
- `note`: active note string or `null`
- `startTime`: sample counter for voice stealing (steal oldest)

Voice allocation: find first slot where `note === null`; if all active, steal oldest by `startTime`.

### PolyBLEP Oscillators

Phase accumulator in range `[0, 1)`. `phaseInc = frequency / sampleRate`.

Per sample:
1. Advance `phase += phaseInc`; wrap at 1.0
2. Compute naive waveform value
3. Apply PolyBLEP correction at discontinuities

PolyBLEP correction function (applied at wrap point):
```js
function polyBlep(phase, phaseInc) {
  if (phase < phaseInc) {
    const t = phase / phaseInc;
    return t + t - t * t - 1.0;
  } else if (phase > 1.0 - phaseInc) {
    const t = (phase - 1.0) / phaseInc;
    return t * t + t + t + 1.0;
  }
  return 0.0;
}
```

Waveforms:
- **Sawtooth:** `naive = phase * 2 - 1`; subtract `polyBlep(phase, phaseInc)`
- **Square:** `naive = phase < pulseWidth ? 1 : -1`; add `polyBlep(phase, phaseInc)`, subtract `polyBlep((phase + 0.5) % 1, phaseInc)`
- **Triangle:** integrate PolyBLEP square output: `tri = tri + 4 * phaseInc * square - 4 * phaseInc * tri` (one-pole leaky integrator normalised to ±1 amplitude)
- **Sine:** `Math.sin(2π * phase)` (no aliasing issue)

Both osc1 and osc2 run per voice. `osc2.frequency = noteFreq * detuneFactor` where `detuneFactor = 2^(cents/1200)`. Output mixed: `(1 - oscMix) * osc1 + oscMix * osc2`.

### Exponential ADSR

State machine per voice: `IDLE(0) → ATTACK(1) → DECAY(2) → SUSTAIN(3) → RELEASE(4)`

Per-sample update:
```js
env.value += (env.target - env.value) * env.coeff;
```

`coeff = 1 - Math.exp(-1 / (timeConstant_s * sampleRate))`

State transitions:
- **ATTACK:** target = 1.0001, coeff from `ampAttack`. When `value >= 1.0` → DECAY
- **DECAY:** target = `sustain * 0.001 + 0.0001`, coeff from `ampDecay`. When `value <= sustain + 0.0001` → SUSTAIN, set value = sustain
- **SUSTAIN:** target = sustain, coeff = fast (0.001 timeConstant). Holds until noteOff
- **RELEASE:** target = 0.00001, coeff from `ampRelease`. When `value <= 0.0001` → IDLE, voice freed

### SVF Filter (Simper/Cytomic)

One shared filter for all voices (mono filter, same as existing synth 3 architecture).

Coefficient computation (called only when cutoff or Q changes):
```js
const g = Math.tan(Math.PI * cutoff / sampleRate);
const k = 1 / resonance;
const a1 = 1 / (1 + g * (g + k));
const a2 = g * a1;
const a3 = g * a2;
```

State: `ic1 = 0, ic2 = 0` (reset on init, persist across blocks).

Per-sample processing:
```js
const v3 = input - ic2;
const v1 = a1 * ic1 + a2 * v3;
const v2 = ic2 + a2 * ic1 + a3 * v3;
ic1 = 2 * v1 - ic1;
ic2 = 2 * v2 - ic2;
// outputs:
const lp = v2;
const hp = input - k * v1 - v2;
const bp = v1;
```

Select output by `filterType`: `'lowpass' → lp`, `'highpass' → hp`, `'bandpass' → bp`.

### Filter Envelope

Applied before SVF coefficient computation. When `filterEnvEnabled`:
- Per-voice filter env runs same exponential ADSR logic as amp env
- On noteOn: retrigger shared filter env (same shared-filter approach as existing synth 3)
- Filter effective cutoff = `filterCutoff + filterEnvValue * filterEnvAmount`
- Recompute SVF coefficients every sample when filter env is active (cheap — 4 multiplies + 1 tan)

### LFO

Runs at control rate: updated every 32 samples (effective rate ~1.4 kHz at 44.1 kHz, more than enough for <20 Hz LFO).

LFO types: sine (`Math.sin`), square (`Math.sign(Math.sin(...))`).

Routes:
- **Pitch:** add `lfoValue * lfoDepth` cents to all active voice frequencies (recalculate `phaseInc` for affected oscs)
- **Filter:** add `lfoValue * lfoDepth * 20` Hz to effective cutoff before SVF coefficient computation

### Parameter Communication

Messages arrive via `this.port.onmessage`. Drained at the top of each `process()` call before generating samples.

Message types:
```js
{ type: 'noteOn',   note: 'A4', velocity: 0.8 }
{ type: 'noteOff',  note: 'A4' }
{ type: 'setParam', key: string, value: number|string|boolean }
{ type: 'setPolyEnabled', value: boolean }
```

All synth parameters stored as worklet-local variables, updated immediately on message receipt.

### Output

Sums all active voice outputs → SVF filter → amplitude scale → stereo output (mono summed to both channels).

---

## Section 2: Engine (main thread)

**File:** `src/app/temp-synths/3-pro/engine.ts`

### Async Construction

`ClassicProEngine` cannot be constructed synchronously (must `await addModule`). Exposes a static factory:

```ts
static async create(): Promise<ClassicProEngine>
```

Called from `useEffect` in the page. Stores result in `engineRef.current`.

### Init sequence

```ts
const ctx = getAudioContext();
await ctx.audioWorklet.addModule('/worklets/classic-pro-processor.js');
const workletNode = new AudioWorkletNode(ctx, 'classic-pro-processor');
// wire: workletNode → analyser → compressor → masterGain → destination
// reverb and delay parallel sends off masterGain (same as synth3 engine)
```

### Signal Chain

```
workletNode → analyser → compressor → masterGain → destination (dry)
                                     masterGain → reverbWetGain → convolver → destination
                                     masterGain → delayNode ⇄ delayFeedback → delayWetGain → destination
```

Analyser tapped before effects — waveform and FFT display reflects the dry synth sound.

### Public API

Identical surface to `Synth3Engine`:

```ts
noteOn(note: string, velocity?: number): void
noteOff(note: string): void
setOsc1Type(t: OscillatorType): void
setOsc2Type(t: OscillatorType): void
setOsc2Detune(cents: number): void
setOscMix(mix: number): void
setFilterType(t: BiquadFilterType): void
setFilterCutoff(hz: number): void
setFilterResonance(q: number): void
setAmpAttack/Decay/Sustain/Release(v: number): void
setFilterEnvAmount/Attack/Decay/Sustain/Release(v: number): void
setFilterEnvEnabled(on: boolean): void
setLfoType(t: OscillatorType): void
setLfoRate(hz: number): void
setLfoDepth(depth: number): void
setLfoRoute(route: 'pitch' | 'filter'): void
setLfoEnabled(on: boolean): void
setPolyEnabled(on: boolean): void
setReverbEnabled/Amount(v): void
setDelayEnabled/Amount(v): void
setVolume(v: number): void
getFilterFreq(): number        // main-thread math, same as synth3
getWaveform(): Float32Array
getFFT(): Float32Array
get sampleRate(): number
get fftSize(): number
dispose(): void
```

All setters: store value locally + `this.workletNode.port.postMessage({ type: 'setParam', key, value })`.

`noteOn`/`noteOff`: `this.workletNode.port.postMessage({ type: 'noteOn'/'noteOff', note, velocity })`.

### dispose()

Disconnects all Web Audio nodes. Does not need to clean up worklet internals.

---

## Section 3: Page

**File:** `src/app/temp-synths/3-pro/page.tsx`

Copy of `src/app/temp-synths/3-hardware/page.tsx` with these changes only:

1. **Import:** `ClassicProEngine` from `'../3-pro/engine'`
2. **Engine init:**
   ```tsx
   useEffect(() => {
     let disposed = false;
     ClassicProEngine.create().then(eng => {
       if (!disposed) {
         engineRef.current = eng;
         setAnalyserInfo({ sampleRate: eng.sampleRate, fftSize: eng.fftSize });
         setReady(true);
       } else {
         eng.dispose();
       }
     });
     return () => { disposed = true; engineRef.current?.dispose(); engineRef.current = null; };
   }, []);
   ```
3. **Loading state:** `const [ready, setReady] = useState(false)`. While `!ready`, render a full-size dark overlay on the faceplate with centered text `INITIALIZING...` in ACCENT colour.
4. **Title:** "THE CLASSIC PRO" / subtitle "AudioWorklet · PolyBLEP · SVF"

All controls, tab structure, keyboard, waveform/spectrum display, knobs, faders — unchanged.

---

## Key Quality Properties

| Property | Synth 3 (current) | Synth 3 Pro |
|----------|------------------|-------------|
| Audio thread | Web Audio nodes (browser-managed) | AudioWorklet (custom, dedicated thread) |
| Oscillators | OscillatorNode (aliases at high freq) | PolyBLEP (band-limited, clean) |
| Envelopes | `linearRampToValueAtTime` (main thread scheduled) | Exponential per-sample (audio thread) |
| Filter | BiquadFilterNode | SVF (Simper) — stable at high Q |
| Timing | Scheduled from UI thread | All note events processed at block boundary |
| Parameter updates | `setTargetAtTime` (AudioParam) | Immediate message, applied next block (~3ms) |
