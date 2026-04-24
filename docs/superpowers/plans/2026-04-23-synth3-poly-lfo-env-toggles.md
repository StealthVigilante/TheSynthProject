# Synth 3 — Poly Mode, LFO Toggle, Filter Env Toggle, Live Filter EQ Line

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time filter freq to the spectrum EQ line, LFO on/off toggle, filter ADSR on/off toggle, and 4-voice polyphony toggle to Synth 3 (both soft and hardware pages).

**Architecture:** Engine gets `getFilterFreq()`, `lfoEnabled`/`setLfoEnabled()`, `filterEnvEnabled`/`setFilterEnvEnabled()`, and a `polyEnabled` flag backed by a 4-voice pool where each voice has its own osc1, osc2, mix gains, and ampEnvGain all feeding the shared filter. SpectrumCanvas gains an optional `getFilterFreq` function prop that, when provided, is called each draw frame so the EQ overlay reflects live envelope + LFO modulation. Both page.tsx and 3-hardware/page.tsx get toggle buttons for LFO, filter env, and poly.

**Tech Stack:** Web Audio API, React hooks, TypeScript, inline CSS.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/app/temp-synths/spectrum-canvas.tsx` | Modify | Add optional `getFilterFreq?: () => number` prop; call it each frame |
| `src/app/temp-synths/3/engine.ts` | Modify | Add `getFilterFreq()`, `setLfoEnabled()`, `setFilterEnvEnabled()`, poly voice pool + `setPolyEnabled()` |
| `src/app/temp-synths/3/page.tsx` | Modify | Wire `getFilterFreq` to SpectrumCanvas; add toggle buttons for LFO, filter env, poly |
| `src/app/temp-synths/3-hardware/page.tsx` | Modify | Same wiring + toggle buttons |

---

### Task 1: SpectrumCanvas — live filter frequency

**Files:**
- Modify: `src/app/temp-synths/spectrum-canvas.tsx`

The EQ overlay currently reads `filterFreqRef.current` which only updates when the React prop changes (via setState). We need it to read a live value every frame when a getter is provided.

- [ ] **Step 1: Add `getFilterFreq` prop and ref**

Replace the interface and component signature:

```typescript
interface SpectrumCanvasProps {
  getFFT: () => Float32Array;
  filterFreq: number;
  resonance?: number;
  sampleRate: number;
  fftSize: number;
  width?: number;
  height?: number;
  lineColor?: string;
  getFilterFreq?: () => number;   // ← new: if provided, read live each frame
}
```

Inside the component, add a ref for it after `lineColorRef`:

```typescript
const getFilterFreqRef = useRef(getFilterFreq);
useEffect(() => { getFilterFreqRef.current = getFilterFreq; }, [getFilterFreq]);
```

- [ ] **Step 2: Use live getter in the draw loop**

In the `draw` function, replace the single line:

```typescript
const db = biquadLowpassMagDb(freq, filterFreqRef.current, resonanceRef.current, sampleRate);
```

With:

```typescript
const fc = getFilterFreqRef.current ? getFilterFreqRef.current() : filterFreqRef.current;
const db = biquadLowpassMagDb(freq, fc, resonanceRef.current, sampleRate);
```

- [ ] **Step 3: TypeScript check**

```bash
cd /home/steve/IdeaProjects/Osciscoops && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/temp-synths/spectrum-canvas.tsx
git commit -m "feat: spectrum-canvas live filter freq via getFilterFreq prop"
```

---

### Task 2: Engine — getFilterFreq, LFO toggle, filter env toggle

**Files:**
- Modify: `src/app/temp-synths/3/engine.ts`

- [ ] **Step 1: Add `lfoEnabled`, `filterEnvEnabled` public fields**

After `lfoRoute: "pitch" | "filter" = "pitch";` (line 49), add:

```typescript
lfoEnabled = true;
filterEnvEnabled = true;
polyEnabled = false;
```

- [ ] **Step 2: Add `getFilterFreq()`, `setLfoEnabled()`, `setFilterEnvEnabled()`**

After the existing `setVolume()` method (before `dispose()`), add:

```typescript
getFilterFreq(): number {
  return this.filter.frequency.value;
}

setLfoEnabled(on: boolean): void {
  this.lfoEnabled = on;
  if (on) {
    // setLfoDepth restores the correct scaled gain value
    this.setLfoDepth(this.lfoDepth);
    // Re-open whichever gate is active
    const now = this.ctx.currentTime;
    if (this.lfoRoute === "pitch") {
      this.lfoPitchGate.gain.setTargetAtTime(1, now, 0.02);
    } else {
      this.lfoFilterGate.gain.setTargetAtTime(1, now, 0.02);
    }
  } else {
    // Zero out the depth gain so both gates output silence
    this.lfoDepthGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
  }
}

setFilterEnvEnabled(on: boolean): void {
  this.filterEnvEnabled = on;
  if (!on) {
    // Return filter to static cutoff immediately
    const now = this.ctx.currentTime;
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setTargetAtTime(this.filterCutoff, now, 0.01);
  }
}
```

- [ ] **Step 3: Guard filter envelope in `noteOn` and `noteOff`**

In `noteOn`, the filter envelope block currently looks like:

```typescript
    // Filter envelope
    const base = this.filterCutoff;
    const peak = base + this.filterEnvAmount;
    const sus = base + this.filterEnvAmount * this.filterEnvSustain;
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(base, now);
    this.filter.frequency.linearRampToValueAtTime(peak, now + this.filterEnvAttack);
    this.filter.frequency.linearRampToValueAtTime(sus, now + this.filterEnvAttack + this.filterEnvDecay);
```

Wrap it:

```typescript
    // Filter envelope
    if (this.filterEnvEnabled) {
      const base = this.filterCutoff;
      const peak = base + this.filterEnvAmount;
      const sus = base + this.filterEnvAmount * this.filterEnvSustain;
      this.filter.frequency.cancelScheduledValues(now);
      this.filter.frequency.setValueAtTime(base, now);
      this.filter.frequency.linearRampToValueAtTime(peak, now + this.filterEnvAttack);
      this.filter.frequency.linearRampToValueAtTime(sus, now + this.filterEnvAttack + this.filterEnvDecay);
    }
```

In `noteOff`, the filter release block currently looks like:

```typescript
    // Filter release
    this.filter.frequency.cancelAndHoldAtTime(now);
    this.filter.frequency.linearRampToValueAtTime(this.filterCutoff, now + this.filterEnvRelease);
```

Wrap it:

```typescript
    // Filter release
    if (this.filterEnvEnabled) {
      this.filter.frequency.cancelAndHoldAtTime(now);
      this.filter.frequency.linearRampToValueAtTime(this.filterCutoff, now + this.filterEnvRelease);
    }
```

Also update the `stopAt` line in `noteOff` — when filter env is disabled, use only ampRelease:

```typescript
    const stopAt = now + this.ampRelease + (this.filterEnvEnabled ? Math.max(0, this.filterEnvRelease - this.ampRelease) : 0) + 0.05;
```

- [ ] **Step 4: TypeScript check**

```bash
cd /home/steve/IdeaProjects/Osciscoops && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/temp-synths/3/engine.ts
git commit -m "feat: synth3 engine — getFilterFreq, LFO toggle, filter env toggle"
```

---

### Task 3: Engine — 4-voice polyphony

**Files:**
- Modify: `src/app/temp-synths/3/engine.ts`

The current mono signal chain routes all oscs through shared `osc1Gain`/`osc2Gain` into the filter, with one shared `ampEnvGain`. Poly needs N independent amp envelopes feeding the same filter. Each voice maintains its own osc1, osc2, per-voice mix gains, and ampEnvGain. All voices' ampEnvGains connect to the shared filter at construction time.

- [ ] **Step 1: Add Voice interface and polyVoices array**

After the `// LFO` private fields block and before `// Params`, add:

```typescript
  // Poly voices (pre-created; always connected to filter)
  private readonly MAX_VOICES = 4;
  private polyVoices: Array<{
    osc1: OscillatorNode | null;
    osc2: OscillatorNode | null;
    osc1Mix: GainNode;
    osc2Mix: GainNode;
    ampEnv: GainNode;
    note: string | null;
    startTime: number;
  }> = [];
```

- [ ] **Step 2: Initialize poly voices in the constructor**

After `this.lfo.start();` and before `// Main signal chain`, add:

```typescript
    // Pre-create poly voice nodes; all ampEnv → filter
    for (let i = 0; i < this.MAX_VOICES; i++) {
      const osc1Mix = this.ctx.createGain();
      osc1Mix.gain.value = 1 - this.oscMix;
      const osc2Mix = this.ctx.createGain();
      osc2Mix.gain.value = this.oscMix;
      const ampEnv = this.ctx.createGain();
      ampEnv.gain.value = 0;
      osc1Mix.connect(ampEnv);
      osc2Mix.connect(ampEnv);
      ampEnv.connect(this.filter);
      this.polyVoices.push({ osc1: null, osc2: null, osc1Mix, osc2Mix, ampEnv, note: null, startTime: 0 });
    }
```

- [ ] **Step 3: Add poly noteOn / noteOff helpers**

Add these two private methods before `getFilterFreq()`:

```typescript
  private polyNoteOn(note: string, velocity: number): void {
    const now = this.ctx.currentTime;
    const freq = noteNameToFreq(note);

    // Find free voice, or steal oldest
    let voice = this.polyVoices.find(v => v.note === null);
    if (!voice) {
      voice = this.polyVoices.reduce((a, b) => a.startTime < b.startTime ? a : b);
      // Release stolen voice
      voice.ampEnv.gain.cancelAndHoldAtTime(now);
      voice.ampEnv.gain.linearRampToValueAtTime(0, now + 0.02);
      try { voice.osc1?.stop(now + 0.02); } catch { /* ok */ }
      try { voice.osc2?.stop(now + 0.02); } catch { /* ok */ }
      voice.osc1 = null;
      voice.osc2 = null;
    }

    const osc1 = this.ctx.createOscillator();
    osc1.type = this.osc1Type;
    osc1.frequency.value = freq;
    osc1.connect(voice.osc1Mix);

    const osc2 = this.ctx.createOscillator();
    osc2.type = this.osc2Type;
    osc2.frequency.value = freq;
    osc2.detune.value = this.osc2Detune;
    osc2.connect(voice.osc2Mix);

    if (this.lfoEnabled && this.lfoRoute === "pitch") {
      this.lfoPitchGate.connect(osc1.detune);
      this.lfoPitchGate.connect(osc2.detune);
    }

    osc1.start(now);
    osc2.start(now);
    voice.osc1 = osc1;
    voice.osc2 = osc2;
    voice.note = note;
    voice.startTime = now;

    // Amp envelope
    voice.ampEnv.gain.cancelScheduledValues(now);
    voice.ampEnv.gain.setValueAtTime(0, now);
    voice.ampEnv.gain.linearRampToValueAtTime(velocity, now + this.ampAttack);
    voice.ampEnv.gain.linearRampToValueAtTime(velocity * this.ampSustain, now + this.ampAttack + this.ampDecay);

    // Filter envelope (shared — only trigger once per chord via first voice)
    if (this.filterEnvEnabled) {
      const base = this.filterCutoff;
      const peak = base + this.filterEnvAmount;
      const sus = base + this.filterEnvAmount * this.filterEnvSustain;
      this.filter.frequency.cancelScheduledValues(now);
      this.filter.frequency.setValueAtTime(base, now);
      this.filter.frequency.linearRampToValueAtTime(peak, now + this.filterEnvAttack);
      this.filter.frequency.linearRampToValueAtTime(sus, now + this.filterEnvAttack + this.filterEnvDecay);
    }
  }

  private polyNoteOff(note: string): void {
    const voice = this.polyVoices.find(v => v.note === note);
    if (!voice) return;
    const now = this.ctx.currentTime;

    voice.ampEnv.gain.cancelAndHoldAtTime(now);
    voice.ampEnv.gain.linearRampToValueAtTime(0, now + this.ampRelease);

    if (this.filterEnvEnabled) {
      this.filter.frequency.cancelAndHoldAtTime(now);
      this.filter.frequency.linearRampToValueAtTime(this.filterCutoff, now + this.filterEnvRelease);
    }

    const stopAt = now + this.ampRelease + 0.05;
    try { voice.osc1?.stop(stopAt); } catch { /* ok */ }
    try { voice.osc2?.stop(stopAt); } catch { /* ok */ }
    voice.osc1 = null;
    voice.osc2 = null;
    voice.note = null;
  }
```

- [ ] **Step 4: Update `noteOn` and `noteOff` to dispatch by mode**

In `noteOn`, before the existing body, add the poly dispatch at the top:

```typescript
  noteOn(note: string, velocity = 0.8): void {
    if (this.ctx.state === "suspended") void this.ctx.resume();
    if (this.polyEnabled) { this.polyNoteOn(note, velocity); return; }
    // ... rest of existing mono code unchanged ...
```

In `noteOff`, same pattern:

```typescript
  noteOff(_note: string): void {
    if (this.polyEnabled) { this.polyNoteOff(_note); return; }
    // ... rest of existing mono code unchanged ...
```

- [ ] **Step 5: Add `setPolyEnabled()` and update `setOscMix()`**

Add after `setFilterEnvEnabled()`:

```typescript
setPolyEnabled(on: boolean): void {
  this.polyEnabled = on;
  if (!on) {
    // Kill all poly voices
    const now = this.ctx.currentTime;
    for (const v of this.polyVoices) {
      if (v.note === null) continue;
      v.ampEnv.gain.cancelAndHoldAtTime(now);
      v.ampEnv.gain.linearRampToValueAtTime(0, now + 0.05);
      try { v.osc1?.stop(now + 0.05); } catch { /* ok */ }
      try { v.osc2?.stop(now + 0.05); } catch { /* ok */ }
      v.osc1 = null;
      v.osc2 = null;
      v.note = null;
    }
  }
}
```

Update `setOscMix` to also sync poly voice mix gains:

```typescript
setOscMix(mix: number): void {
  this.oscMix = mix;
  this.osc1Gain.gain.setTargetAtTime(1 - mix, this.ctx.currentTime, 0.01);
  this.osc2Gain.gain.setTargetAtTime(mix, this.ctx.currentTime, 0.01);
  for (const v of this.polyVoices) {
    v.osc1Mix.gain.setTargetAtTime(1 - mix, this.ctx.currentTime, 0.01);
    v.osc2Mix.gain.setTargetAtTime(mix, this.ctx.currentTime, 0.01);
  }
}
```

- [ ] **Step 6: Update `dispose()` to clean up poly voices**

After `this.masterGain.disconnect();` at the end of dispose, add:

```typescript
    for (const v of this.polyVoices) {
      try { v.osc1?.stop(); } catch { /* ok */ }
      v.osc1?.disconnect();
      try { v.osc2?.stop(); } catch { /* ok */ }
      v.osc2?.disconnect();
      v.osc1Mix.disconnect();
      v.osc2Mix.disconnect();
      v.ampEnv.disconnect();
    }
```

- [ ] **Step 7: TypeScript check**

```bash
cd /home/steve/IdeaProjects/Osciscoops && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/temp-synths/3/engine.ts
git commit -m "feat: synth3 engine — 4-voice poly mode"
```

---

### Task 4: page.tsx — wire live filter freq + toggle buttons

**Files:**
- Modify: `src/app/temp-synths/3/page.tsx`

- [ ] **Step 1: Add toggle state variables**

Inside `Synth3Page`, after `const [lfoRoute, setLfoRoute]` state, add:

```typescript
  const [lfoEnabled, setLfoEnabled] = useState(true);
  const [filterEnvEnabled, setFilterEnvEnabled] = useState(true);
  const [polyEnabled, setPolyEnabled] = useState(false);
```

- [ ] **Step 2: Add `getFilterFreq` callback**

After `getFFT`:

```typescript
  const getFilterFreq = useCallback((): number => engineRef.current?.getFilterFreq() ?? filterCutoff, [filterCutoff]);
```

- [ ] **Step 3: Pass `getFilterFreq` to SpectrumCanvas in header**

Find the `<SpectrumCanvas` in the `header` const and add the prop:

```tsx
          <SpectrumCanvas
            getFFT={getFFT}
            filterFreq={filterCutoff}
            resonance={filterRes}
            sampleRate={engineRef.current?.sampleRate ?? 44100}
            fftSize={engineRef.current?.fftSize ?? 2048}
            width={180}
            height={60}
            getFilterFreq={getFilterFreq}
          />
```

- [ ] **Step 4: Add LFO on/off toggle to LFO section**

In the LFO section inside the `controls` const, after the route buttons `</div></div>`, add a toggle button at the end of the flex row:

```tsx
          <button
            onClick={() => { const next = !lfoEnabled; setLfoEnabled(next); e?.setLfoEnabled(next); }}
            style={{
              padding: "4px 10px", borderRadius: 6, border: "1px solid",
              borderColor: lfoEnabled ? "var(--primary)" : "var(--border)",
              background: lfoEnabled ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
              color: lfoEnabled ? "var(--foreground)" : "var(--muted-foreground)",
              fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: "0.1em",
            }}
          >{lfoEnabled ? "ON" : "OFF"}</button>
```

- [ ] **Step 5: Add filter env on/off toggle to Filter section**

In the Filter section, after the `</div>` closing the filter env faders row, add:

```tsx
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 9, color: "var(--muted-foreground)", letterSpacing: "0.12em" }}>FILTER ENV</span>
            <button
              onClick={() => { const next = !filterEnvEnabled; setFilterEnvEnabled(next); e?.setFilterEnvEnabled(next); }}
              style={{
                padding: "3px 8px", borderRadius: 6, border: "1px solid",
                borderColor: filterEnvEnabled ? "var(--primary)" : "var(--border)",
                background: filterEnvEnabled ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
                color: filterEnvEnabled ? "var(--foreground)" : "var(--muted-foreground)",
                fontSize: 10, fontWeight: 700, cursor: "pointer",
              }}
            >{filterEnvEnabled ? "ON" : "OFF"}</button>
          </div>
```

- [ ] **Step 6: Add poly toggle button in the header**

In the `header` const, after the subtitle `<p>` but before the canvas row, add:

```tsx
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => { const next = !polyEnabled; setPolyEnabled(next); e?.setPolyEnabled(next); }}
          style={{
            padding: "3px 10px", borderRadius: 6, border: "1px solid",
            borderColor: polyEnabled ? "var(--primary)" : "var(--border)",
            background: polyEnabled ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
            color: polyEnabled ? "var(--foreground)" : "var(--muted-foreground)",
            fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: "0.1em",
          }}
        >{polyEnabled ? "POLY" : "MONO"}</button>
      </div>
```

- [ ] **Step 7: TypeScript check**

```bash
cd /home/steve/IdeaProjects/Osciscoops && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/temp-synths/3/page.tsx
git commit -m "feat: synth3 page — live filter EQ line, LFO/filter env/poly toggles"
```

---

### Task 5: 3-hardware/page.tsx — same wiring + toggle buttons

**Files:**
- Modify: `src/app/temp-synths/3-hardware/page.tsx`

Same three changes as Task 4 but applied to the hardware page. The hardware page uses hardcoded hex colors instead of CSS vars for buttons.

- [ ] **Step 1: Add toggle state variables**

Inside `Synth3HardwarePage`, after `const [lfoRoute, setLfoRoute]` state, add:

```typescript
  const [lfoEnabled, setLfoEnabled] = useState(true);
  const [filterEnvEnabled, setFilterEnvEnabled] = useState(true);
  const [polyEnabled, setPolyEnabled] = useState(false);
```

- [ ] **Step 2: Add `getFilterFreq` callback**

After the `getFFT` callback:

```typescript
  const getFilterFreq = useCallback((): number => engineRef.current?.getFilterFreq() ?? filterCutoff, [filterCutoff]);
```

- [ ] **Step 3: Pass `getFilterFreq` to both SpectrumCanvas usages**

Find the two `<SpectrumCanvas` in the file (one in `mobileHeader`, one in the desktop display row) and add `getFilterFreq={getFilterFreq}` to each.

- [ ] **Step 4: Add LFO toggle button in desktop LFO section**

In the desktop LFO section (the `<HSection label="LFO">` block), after the route buttons row `</div></div>`, add:

```tsx
              <button
                onClick={() => { const next = !lfoEnabled; setLfoEnabled(next); e?.setLfoEnabled(next); }}
                style={{
                  padding: "3px 10px", borderRadius: 3, border: "1px solid",
                  borderColor: lfoEnabled ? ACCENT : "#2a2a2a",
                  background: lfoEnabled ? "#001a22" : "#0a0a0a",
                  color: lfoEnabled ? ACCENT : "#404040",
                  fontSize: 9, cursor: "pointer", fontFamily: "Arial", letterSpacing: "0.15em",
                  boxShadow: lfoEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                }}
              >{lfoEnabled ? "ON" : "OFF"}</button>
```

- [ ] **Step 5: Add filter env toggle in desktop Filter Env section**

In the desktop `{/* FILTER ENV */}` section panel, after the faders row `</div>`, before the closing `</div>` of sectionPanel, add:

```tsx
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 8, color: "#404040", fontFamily: "Arial", letterSpacing: "0.15em" }}>ENV</span>
                  <button
                    onClick={() => { const next = !filterEnvEnabled; setFilterEnvEnabled(next); e?.setFilterEnvEnabled(next); }}
                    style={{
                      padding: "2px 8px", borderRadius: 3, border: "1px solid",
                      borderColor: filterEnvEnabled ? ACCENT : "#2a2a2a",
                      background: filterEnvEnabled ? "#001a22" : "#0a0a0a",
                      color: filterEnvEnabled ? ACCENT : "#404040",
                      fontSize: 9, cursor: "pointer", fontFamily: "Arial", letterSpacing: "0.1em",
                      boxShadow: filterEnvEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                    }}
                  >{filterEnvEnabled ? "ON" : "OFF"}</button>
                </div>
```

- [ ] **Step 6: Add poly toggle in desktop header**

In the desktop faceplate header, after the subtitle `<p style={{ fontSize: 7 ...` line, add a MONO/POLY button:

```tsx
              <button
                onClick={() => { const next = !polyEnabled; setPolyEnabled(next); e?.setPolyEnabled(next); }}
                style={{
                  marginTop: 6, padding: "2px 8px", borderRadius: 3, border: "1px solid",
                  borderColor: polyEnabled ? ACCENT : "#2a2a2a",
                  background: polyEnabled ? "#001a22" : "#0a0a0a",
                  color: polyEnabled ? ACCENT : "#404040",
                  fontSize: 8, cursor: "pointer", fontFamily: "Arial", letterSpacing: "0.15em",
                  boxShadow: polyEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                }}
              >{polyEnabled ? "POLY" : "MONO"}</button>
```

- [ ] **Step 7: Add toggles to mobile tabs**

In the mobile `{activeTab === "lfo"}` block, after the route buttons section, add the LFO toggle:

```tsx
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
              <span style={{ fontSize: 9, color: "#404040", fontFamily: "Arial", letterSpacing: "0.15em" }}>LFO</span>
              <button
                onClick={() => { const next = !lfoEnabled; setLfoEnabled(next); e?.setLfoEnabled(next); }}
                style={{
                  padding: "3px 12px", borderRadius: 3, border: "1px solid",
                  borderColor: lfoEnabled ? ACCENT : "#2a2a2a",
                  background: lfoEnabled ? "#001a22" : "#0a0a0a",
                  color: lfoEnabled ? ACCENT : "#404040",
                  fontSize: 10, cursor: "pointer",
                }}
              >{lfoEnabled ? "ON" : "OFF"}</button>
            </div>
```

In the mobile `{activeTab === "filter"}` block, after the filter env faders, add the filter env toggle:

```tsx
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
              <span style={{ fontSize: 9, color: "#404040", fontFamily: "Arial", letterSpacing: "0.15em" }}>FILTER ENV</span>
              <button
                onClick={() => { const next = !filterEnvEnabled; setFilterEnvEnabled(next); e?.setFilterEnvEnabled(next); }}
                style={{
                  padding: "3px 12px", borderRadius: 3, border: "1px solid",
                  borderColor: filterEnvEnabled ? ACCENT : "#2a2a2a",
                  background: filterEnvEnabled ? "#001a22" : "#0a0a0a",
                  color: filterEnvEnabled ? ACCENT : "#404040",
                  fontSize: 10, cursor: "pointer",
                }}
              >{filterEnvEnabled ? "ON" : "OFF"}</button>
            </div>
```

Add MONO/POLY toggle to the mobile header (mobileHeader const), after the `<p style={{ fontSize: 9...` subtitle:

```tsx
        <button
          onClick={() => { const next = !polyEnabled; setPolyEnabled(next); e?.setPolyEnabled(next); }}
          style={{
            marginTop: 4, padding: "2px 8px", borderRadius: 3, border: "1px solid",
            borderColor: polyEnabled ? ACCENT : "#2a2a2a",
            background: polyEnabled ? "#001a22" : "#0a0a0a",
            color: polyEnabled ? ACCENT : "#404040",
            fontSize: 8, cursor: "pointer", fontFamily: "Arial", letterSpacing: "0.15em",
          }}
        >{polyEnabled ? "POLY" : "MONO"}</button>
```

- [ ] **Step 8: TypeScript check**

```bash
cd /home/steve/IdeaProjects/Osciscoops && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/temp-synths/3-hardware/page.tsx
git commit -m "feat: synth3 hardware — live filter EQ line, LFO/filter env/poly toggles"
```
