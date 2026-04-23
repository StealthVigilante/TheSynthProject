# Synth 3 — Reverb & Delay FX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reverb and delay effects to Synth 3, each with an on/off toggle inline with its label and an amount knob, on both the soft page and hardware page.

**Architecture:** Both effects are parallel wet sends off `masterGain` — `masterGain` already feeds `ctx.destination` (dry). Reverb uses a `ConvolverNode` with an algorithmically generated impulse response. Delay uses a `DelayNode` with a fixed-feedback loop. Each has a `wetGain` node whose value is 0 when off and `amount` when on. The analyser/waveform display stays pre-effects (tapped from `master` before `masterGain`), so the spectrum reflects the synth sound, not the wet room.

**Tech Stack:** Web Audio API (`ConvolverNode`, `DelayNode`, `GainNode`), React hooks, TypeScript, inline CSS.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/app/temp-synths/3/engine.ts` | Modify | Add convolver, reverbWetGain, delayNode, delayFeedback, delayWetGain; createImpulseResponse helper; signal chain wiring; setReverbEnabled/Amount, setDelayEnabled/Amount; dispose cleanup |
| `src/app/temp-synths/3/page.tsx` | Modify | Add reverbEnabled/reverbAmount/delayEnabled/delayAmount state; FX section below LFO with inline toggles + Knobs |
| `src/app/temp-synths/3-hardware/page.tsx` | Modify | Same state + FX controls: desktop gets a new FX row between LFO and keyboard; mobile gets a new "FX" tab |

---

### Task 1: Engine — reverb and delay nodes

**Files:**
- Modify: `src/app/temp-synths/3/engine.ts`

The current tail of the signal chain is:
```
master → analyser → compressor → masterGain → ctx.destination
```

We add two parallel wet paths off `masterGain`. Both wet gains start at 0 (off by default):
```
masterGain → ctx.destination                    (dry, unchanged)
masterGain → reverbWetGain → convolver → ctx.destination
masterGain → delayNode ⇄ delayFeedback(0.4)
           → delayWetGain → ctx.destination
```

- [ ] **Step 1: Add private fields for FX nodes**

After `private lfoStartTime = 0;` (around line 24), add:

```typescript
  // FX
  private convolver: ConvolverNode = null!;
  private reverbWetGain: GainNode = null!;
  private delayNode: DelayNode = null!;
  private delayFeedback: GainNode = null!;
  private delayWetGain: GainNode = null!;
```

- [ ] **Step 2: Add public FX params**

After `polyEnabled = false;` (around line 65), add:

```typescript
  reverbEnabled = false;
  reverbAmount = 0.3;
  delayEnabled = false;
  delayAmount = 0.3;
  delayTime = 0.375;
```

- [ ] **Step 3: Add createImpulseResponse private method**

Add this private method anywhere before `dispose()`:

```typescript
  private createImpulseResponse(duration = 2.5, decay = 2.5): AudioBuffer {
    const sr = this.ctx.sampleRate;
    const length = Math.floor(sr * duration);
    const buf = this.ctx.createBuffer(2, length, sr);
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buf;
  }
```

- [ ] **Step 4: Wire FX nodes in constructor**

Replace the current last line of constructor signal chain:
```typescript
    this.masterGain.connect(this.ctx.destination);
```
With:
```typescript
    // Dry path
    this.masterGain.connect(this.ctx.destination);

    // Reverb (parallel wet send)
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.createImpulseResponse();
    this.reverbWetGain = this.ctx.createGain();
    this.reverbWetGain.gain.value = 0;
    this.masterGain.connect(this.reverbWetGain);
    this.reverbWetGain.connect(this.convolver);
    this.convolver.connect(this.ctx.destination);

    // Delay (parallel wet send with feedback loop)
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayNode.delayTime.value = this.delayTime;
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.4;
    this.delayWetGain = this.ctx.createGain();
    this.delayWetGain.gain.value = 0;
    this.masterGain.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayWetGain);
    this.delayWetGain.connect(this.ctx.destination);
```

- [ ] **Step 5: Add setReverbEnabled, setReverbAmount, setDelayEnabled, setDelayAmount**

After `setPolyEnabled()` and before `dispose()`, add:

```typescript
  setReverbEnabled(on: boolean): void {
    this.reverbEnabled = on;
    this.reverbWetGain.gain.setTargetAtTime(on ? this.reverbAmount : 0, this.ctx.currentTime, 0.02);
  }

  setReverbAmount(amount: number): void {
    this.reverbAmount = amount;
    if (this.reverbEnabled) {
      this.reverbWetGain.gain.setTargetAtTime(amount, this.ctx.currentTime, 0.01);
    }
  }

  setDelayEnabled(on: boolean): void {
    this.delayEnabled = on;
    this.delayWetGain.gain.setTargetAtTime(on ? this.delayAmount : 0, this.ctx.currentTime, 0.02);
  }

  setDelayAmount(amount: number): void {
    this.delayAmount = amount;
    if (this.delayEnabled) {
      this.delayWetGain.gain.setTargetAtTime(amount, this.ctx.currentTime, 0.01);
    }
  }
```

- [ ] **Step 6: Update dispose() to clean up FX nodes**

In `dispose()`, after `this.masterGain.disconnect();`, add:

```typescript
    this.reverbWetGain.disconnect();
    this.convolver.disconnect();
    this.delayNode.disconnect();
    this.delayFeedback.disconnect();
    this.delayWetGain.disconnect();
```

- [ ] **Step 7: TypeScript check**

```bash
cd /home/steve/IdeaProjects/Osciscoops && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/temp-synths/3/engine.ts
git commit -m "feat: synth3 engine — reverb and delay FX with wet gain controls"
```

---

### Task 2: page.tsx — FX section UI

**Files:**
- Modify: `src/app/temp-synths/3/page.tsx`

Add a new full-width FX section below the LFO row. It uses the same `SECTION` and `LABEL` styles as all other sections. Inside, a two-column flex layout: Reverb on the left, Delay on the right. Each sub-section has its label + ON/OFF toggle inline (matching the Filter Env pattern), and a Knob for Amount.

- [ ] **Step 1: Add 4 state variables**

After `const [lfoRoute, setLfoRoute]` (around line 179), there are already `lfoEnabled`, `filterEnvEnabled`, `polyEnabled`. Add after `polyEnabled`:

```typescript
  const [reverbEnabled, setReverbEnabled] = useState(false);
  const [reverbAmount, setReverbAmount] = useState(0.3);
  const [delayEnabled, setDelayEnabled] = useState(false);
  const [delayAmount, setDelayAmount] = useState(0.3);
```

- [ ] **Step 2: Add FX section below LFO in controls**

The `controls` const ends with the LFO `<div style={SECTION}>` block followed by `</div>` closing the outer column. After the closing `</div>` of the LFO section (the `</div>` that closes `<div style={SECTION}>` containing the LFO), but before the final `</div>` that closes the outer flex column, add:

```tsx
      <div style={SECTION}>
        <p style={LABEL}>FX</p>
        <div style={{ display: "flex", gap: 24 }}>
          {/* Reverb */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ ...SUBLABEL, marginBottom: 0 }}>Reverb</span>
              <button
                onClick={() => { const next = !reverbEnabled; setReverbEnabled(next); e?.setReverbEnabled(next); }}
                style={{
                  padding: "3px 8px", borderRadius: 6, border: "1px solid",
                  borderColor: reverbEnabled ? "var(--primary)" : "var(--border)",
                  background: reverbEnabled ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
                  color: reverbEnabled ? "var(--foreground)" : "var(--muted-foreground)",
                  fontSize: 10, fontWeight: 700, cursor: "pointer",
                }}
              >{reverbEnabled ? "ON" : "OFF"}</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Knob value={reverbAmount} min={0} max={1} step={0.01} label="Amount" onChange={(v) => { setReverbAmount(v); e?.setReverbAmount(v); }} size="sm" />
            </div>
          </div>
          {/* Divider */}
          <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />
          {/* Delay */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ ...SUBLABEL, marginBottom: 0 }}>Delay</span>
              <button
                onClick={() => { const next = !delayEnabled; setDelayEnabled(next); e?.setDelayEnabled(next); }}
                style={{
                  padding: "3px 8px", borderRadius: 6, border: "1px solid",
                  borderColor: delayEnabled ? "var(--primary)" : "var(--border)",
                  background: delayEnabled ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
                  color: delayEnabled ? "var(--foreground)" : "var(--muted-foreground)",
                  fontSize: 10, fontWeight: 700, cursor: "pointer",
                }}
              >{delayEnabled ? "ON" : "OFF"}</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Knob value={delayAmount} min={0} max={1} step={0.01} label="Amount" onChange={(v) => { setDelayAmount(v); e?.setDelayAmount(v); }} size="sm" />
            </div>
          </div>
        </div>
      </div>
```

- [ ] **Step 3: TypeScript check**

```bash
cd /home/steve/IdeaProjects/Osciscoops && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/temp-synths/3/page.tsx
git commit -m "feat: synth3 page — reverb and delay FX section"
```

---

### Task 3: 3-hardware/page.tsx — FX section desktop + FX mobile tab

**Files:**
- Modify: `src/app/temp-synths/3-hardware/page.tsx`

Desktop: A new FX row (`sectionPanel` style) between the LFO row and the keyboard. Two panels side by side: Reverb (label + toggle inline, Amount knob) and Delay (same). Mobile: A new "FX" tab added to `TABS`. The FX tab panel has Reverb and Delay stacked with the same toggle-inline-with-label + knob pattern.

- [ ] **Step 1: Add 4 state variables**

After `const [lfoRoute, setLfoRoute]` (around line 156), there are already `lfoEnabled`, `filterEnvEnabled`, `polyEnabled`. After those, add:

```typescript
  const [reverbEnabled, setReverbEnabled] = useState(false);
  const [reverbAmount, setReverbAmount] = useState(0.3);
  const [delayEnabled, setDelayEnabled] = useState(false);
  const [delayAmount, setDelayAmount] = useState(0.3);
```

- [ ] **Step 2: Add "FX" tab to TABS array**

Change `TABS` from:
```typescript
const TABS = [
  { id: "osc"    as const, label: "OSC"    },
  { id: "filter" as const, label: "FILTER" },
  { id: "env"    as const, label: "ENV"    },
  { id: "lfo"    as const, label: "LFO"    },
];
```
To:
```typescript
const TABS = [
  { id: "osc"    as const, label: "OSC"    },
  { id: "filter" as const, label: "FILTER" },
  { id: "env"    as const, label: "ENV"    },
  { id: "lfo"    as const, label: "LFO"    },
  { id: "fx"     as const, label: "FX"     },
];
```

Also update the `activeTab` state type from `"osc" | "filter" | "env" | "lfo"` to `"osc" | "filter" | "env" | "lfo" | "fx"`:
```typescript
  const [activeTab, setActiveTab] = useState<"osc" | "filter" | "env" | "lfo" | "fx">("osc");
```

- [ ] **Step 3: Add FX tab panel in mobileControls**

After the `{activeTab === "lfo" && ...}` block (and before the final closing `</div>` of the tab content area), add:

```tsx
        {activeTab === "fx" && (
          <div style={mobilePanelStyle}>
            {/* Reverb */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 9, color: "#404040", fontFamily: "Arial", letterSpacing: "0.2em" }}>REVERB</span>
              <button
                onClick={() => { const next = !reverbEnabled; setReverbEnabled(next); e?.setReverbEnabled(next); }}
                style={{
                  padding: "3px 12px", borderRadius: 3, border: "1px solid",
                  borderColor: reverbEnabled ? ACCENT : "#2a2a2a",
                  background: reverbEnabled ? "#001a22" : "#0a0a0a",
                  color: reverbEnabled ? ACCENT : "#404040",
                  fontSize: 10, cursor: "pointer",
                  boxShadow: reverbEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                }}
              >{reverbEnabled ? "ON" : "OFF"}</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <Knob value={reverbAmount} min={0} max={1} step={0.01} label="Amount" onChange={(v) => { setReverbAmount(v); e?.setReverbAmount(v); }} size="sm" />
            </div>
            {/* Delay */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 9, color: "#404040", fontFamily: "Arial", letterSpacing: "0.2em" }}>DELAY</span>
              <button
                onClick={() => { const next = !delayEnabled; setDelayEnabled(next); e?.setDelayEnabled(next); }}
                style={{
                  padding: "3px 12px", borderRadius: 3, border: "1px solid",
                  borderColor: delayEnabled ? ACCENT : "#2a2a2a",
                  background: delayEnabled ? "#001a22" : "#0a0a0a",
                  color: delayEnabled ? ACCENT : "#404040",
                  fontSize: 10, cursor: "pointer",
                  boxShadow: delayEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                }}
              >{delayEnabled ? "ON" : "OFF"}</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Knob value={delayAmount} min={0} max={1} step={0.01} label="Amount" onChange={(v) => { setDelayAmount(v); e?.setDelayAmount(v); }} size="sm" />
            </div>
          </div>
        )}
```

- [ ] **Step 4: Add desktop FX row**

In the desktop faceplate, between the LFO row and the keyboard section. The LFO row ends with `</div>` then the next `{/* Keyboard */}` block. Insert a new FX row:

```tsx
            {/* FX row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              {/* REVERB */}
              <div style={sectionPanel}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, borderBottom: "1px solid #1a1a1a", paddingBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", color: "#404040", fontFamily: "Arial", textTransform: "uppercase" }}>Reverb</span>
                  <button
                    onClick={() => { const next = !reverbEnabled; setReverbEnabled(next); e?.setReverbEnabled(next); }}
                    style={{
                      padding: "2px 8px", borderRadius: 3, border: "1px solid",
                      borderColor: reverbEnabled ? ACCENT : "#2a2a2a",
                      background: reverbEnabled ? "#001a22" : "#0a0a0a",
                      color: reverbEnabled ? ACCENT : "#404040",
                      fontSize: 9, cursor: "pointer", fontFamily: "Arial", letterSpacing: "0.1em",
                      boxShadow: reverbEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                    }}
                  >{reverbEnabled ? "ON" : "OFF"}</button>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Knob value={reverbAmount} min={0} max={1} step={0.01} label="Amount" onChange={(v) => { setReverbAmount(v); e?.setReverbAmount(v); }} size="sm" />
                </div>
              </div>
              {/* DELAY */}
              <div style={sectionPanel}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, borderBottom: "1px solid #1a1a1a", paddingBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", color: "#404040", fontFamily: "Arial", textTransform: "uppercase" }}>Delay</span>
                  <button
                    onClick={() => { const next = !delayEnabled; setDelayEnabled(next); e?.setDelayEnabled(next); }}
                    style={{
                      padding: "2px 8px", borderRadius: 3, border: "1px solid",
                      borderColor: delayEnabled ? ACCENT : "#2a2a2a",
                      background: delayEnabled ? "#001a22" : "#0a0a0a",
                      color: delayEnabled ? ACCENT : "#404040",
                      fontSize: 9, cursor: "pointer", fontFamily: "Arial", letterSpacing: "0.1em",
                      boxShadow: delayEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                    }}
                  >{delayEnabled ? "ON" : "OFF"}</button>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Knob value={delayAmount} min={0} max={1} step={0.01} label="Amount" onChange={(v) => { setDelayAmount(v); e?.setDelayAmount(v); }} size="sm" />
                </div>
              </div>
            </div>
```

- [ ] **Step 5: TypeScript check**

```bash
cd /home/steve/IdeaProjects/Osciscoops && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/temp-synths/3-hardware/page.tsx
git commit -m "feat: synth3 hardware — reverb and delay FX section (desktop + mobile tab)"
```
