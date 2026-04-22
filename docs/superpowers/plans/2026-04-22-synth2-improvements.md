# Synth 2 Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade "The Learner" synth 2 with a compressor/masterGain tail chain, SpectrumCanvas, QWERTY keyboard, octave nav, volume knob, and an animated EnvelopeCurve dot that tracks attack/sustain/release in real time.

**Architecture:** Two in-place file modifications — engine.ts gets the new audio tail chain and getFFT/setVolume methods; page.tsx gets a full rewrite with split desktop/mobile layouts, animated EnvelopeCurve (RAF loop), and QWERTY bindings. No new files, no new shared components.

**Tech Stack:** TypeScript, React 19, Web Audio API, Next.js App Router

---

## Files

- Modify: `src/app/temp-synths/2/engine.ts`
- Modify: `src/app/temp-synths/2/page.tsx`

---

## Task 1: Engine upgrades

**Files:**
- Modify: `src/app/temp-synths/2/engine.ts`

The existing engine has `master → analyser → ctx.destination`. We insert `compressor → masterGain` between analyser and destination, bump fftSize to 2048, add `fftBuf` for FFT data, and expose `getFFT()`, `sampleRate`, `fftSize`, `setVolume()`.

- [ ] **Step 1: Verify baseline build**

Run: `npm run build`
Expected: build succeeds (or only pre-existing errors — note any).

- [ ] **Step 2: Write the complete updated engine.ts**

Replace the entire contents of `src/app/temp-synths/2/engine.ts` with:

```ts
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
  private compressor: DynamicsCompressorNode;
  private masterGain: GainNode;
  private buf: Float32Array;
  private fftBuf: Float32Array;

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
    this.subGain.gain.value = 0;

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

    // Wire
    this.oscGain.connect(this.envGain);
    this.subGain.connect(this.envGain);
    this.envGain.connect(this.filter);
    this.filter.connect(this.master);

    // Reverb send
    this.filter.connect(this.reverbSend);
    this.reverbSend.connect(this.reverb.input);
    this.reverb.output.connect(this.master);

    // Delay send with feedback loop
    this.filter.connect(this.delaySend);
    this.delaySend.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.master);

    this.master.connect(this.analyser);
    this.analyser.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  noteOn(note: string, velocity = 0.8): void {
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.osc?.stop();
    this.osc?.disconnect();
    this.osc = null;
    this.subOsc?.stop();
    this.subOsc?.disconnect();
    this.subOsc = null;

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
      this.subGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.01);
    }

    this.currentNote = note;
    const now = this.ctx.currentTime;
    this.envGain.gain.cancelScheduledValues(now);
    this.envGain.gain.setValueAtTime(0, now);
    this.envGain.gain.linearRampToValueAtTime(velocity, now + this.attack);
    if (!this.sustainOn) {
      this.envGain.gain.linearRampToValueAtTime(0, now + this.attack + this.release);
    }
  }

  noteOff(note: string): void {
    if (note !== this.currentNote) return;
    const now = this.ctx.currentTime;
    this.envGain.gain.cancelAndHoldAtTime(now);
    this.envGain.gain.linearRampToValueAtTime(0, now + this.release);
    const stopAt = now + this.release + 0.05;
    this.osc?.stop(stopAt);
    this.osc?.disconnect();
    this.osc = null;
    this.subOsc?.stop(stopAt);
    this.subOsc?.disconnect();
    this.subOsc = null;
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
    const now = this.ctx.currentTime;
    this.reverbSend.gain.setTargetAtTime(on ? 0.5 : 0, now, 0.02);
    this.master.gain.setTargetAtTime(on ? 0.7 : 0.8, now, 0.02);
  }

  setDelay(amount: number): void {
    this.delayAmount = amount;
    this.delaySend.gain.setTargetAtTime(amount * 0.6, this.ctx.currentTime, 0.02);
  }

  setVolume(v: number): void {
    this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01);
  }

  getWaveform(): Float32Array {
    this.analyser.getFloatTimeDomainData(this.buf as any);
    return this.buf;
  }

  getFFT(): Float32Array {
    this.analyser.getFloatFrequencyData(this.fftBuf as any);
    return this.fftBuf;
  }

  get sampleRate(): number { return this.ctx.sampleRate; }
  get fftSize(): number { return this.analyser.fftSize; }

  dispose(): void {
    this.osc?.stop();
    this.osc?.disconnect();
    this.subOsc?.stop();
    this.subOsc?.disconnect();
    this.oscGain.disconnect();
    this.subGain.disconnect();
    this.envGain.disconnect();
    this.filter.disconnect();
    this.master.disconnect();
    this.reverbSend.disconnect();
    this.reverb.input.disconnect();
    this.reverb.output.disconnect();
    this.delaySend.disconnect();
    this.delayNode.disconnect();
    this.delayFeedback.disconnect();
    this.analyser.disconnect();
    this.compressor.disconnect();
    this.masterGain.disconnect();
  }
}
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: build succeeds with no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/temp-synths/2/engine.ts
git commit -m "feat: synth2 engine — compressor, masterGain, getFFT, setVolume, fftSize 2048"
```

---

## Task 2: Page rewrite

**Files:**
- Modify: `src/app/temp-synths/2/page.tsx`

Full replacement of the page. Key additions over the current page:
- `SpectrumCanvas` import
- Animated `EnvelopeCurve` (RAF loop, dot tracking attack/sustain/release phases)
- `analyserInfo`, `volume`, `startOctave` + mirror ref, `activeNotes`, `noteOnMs`, `noteOffMs`, `activeTab` state
- `getFFT`, `handleVolume` callbacks
- `noteOn`/`noteOff` track active notes + timestamps
- QWERTY keyboard bindings useEffect (desktop-only, uses `startOctaveRef`)
- Separate `desktopHeader` / `mobileHeader` / `desktopControls` / `mobileControls` variables
- Desktop: 3-col top [OSC|FILTER|FX] + full-width ENV grid, header with dual canvases
- Mobile: SynthShell tab layout (OSC/FILTER/ENV/FX), no envelope curve
- Keyboard: octave nav strip above piano (desktop), 3 octaves desktop / 2 mobile
- `desktopClassName="w-[760px] lg:w-[840px]"`

- [ ] **Step 1: Write the complete updated page.tsx**

Replace the entire contents of `src/app/temp-synths/2/page.tsx` with:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { WaveformCanvas } from "../waveform-canvas";
import { SpectrumCanvas } from "../spectrum-canvas";
import { SynthShell } from "@/components/synths/shared/synth-shell";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Synth2Engine } from "./engine";

const THEME = { bg: "var(--background)", border: "var(--border)", panel: "var(--card)" };

const KEY_NOTE_MAP: Record<string, [string, number]> = {
  a: ["C", 0],  w: ["C#", 0], s: ["D", 0],  e: ["D#", 0],
  d: ["E", 0],  f: ["F", 0],  t: ["F#", 0], g: ["G", 0],
  y: ["G#", 0], h: ["A", 0],  u: ["A#", 0], j: ["B", 0],
  k: ["C", 1],  o: ["C#", 1], l: ["D", 1],  p: ["D#", 1],
  ";": ["E", 1],
};

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

const lerp = (a: number, b: number, t: number) =>
  a + (b - a) * Math.min(1, Math.max(0, t));

interface EnvelopeCurveProps {
  attack: number;
  release: number;
  sustainOn: boolean;
  noteOnMs: number | null;
  noteOffMs: number | null;
}

function EnvelopeCurve({ attack, release, sustainOn, noteOnMs, noteOffMs }: EnvelopeCurveProps) {
  const W = 280;
  const H = 80;
  const maxT = 3;

  const aX = (Math.min(attack, maxT) / maxT) * (W * 0.3);
  const sX = W * 0.55;
  const rEnd = W * 0.85 + (Math.min(release, maxT) / maxT) * (W * 0.15);
  const top = 6;
  const bot = H - 6;
  const mid = sustainOn ? top + (bot - top) * 0.3 : bot;

  const d = `M 0 ${bot} L ${aX} ${top} L ${sX} ${mid} L ${rEnd} ${bot}`;

  const [dot, setDot] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: bot,
    visible: false,
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (noteOnMs === null) {
      setDot((prev) => ({ ...prev, visible: false }));
      return;
    }

    const tick = () => {
      const elapsed = performance.now() - noteOnMs;

      if (noteOffMs === null) {
        if (elapsed < attack * 1000) {
          const t = elapsed / (attack * 1000);
          setDot({ x: lerp(0, aX, t), y: lerp(bot, top, t), visible: true });
        } else {
          setDot({ x: sX, y: mid, visible: true });
        }
      } else {
        const releaseElapsed = performance.now() - noteOffMs;
        if (releaseElapsed < release * 1000) {
          const t = releaseElapsed / (release * 1000);
          setDot({ x: lerp(sX, rEnd, t), y: lerp(mid, bot, t), visible: true });
        } else {
          setDot((prev) => ({ ...prev, visible: false }));
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [noteOnMs, noteOffMs, attack, release, aX, sX, rEnd, top, bot, mid]);

  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <path
        d={d}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={aX} cy={top} r={3} fill="var(--primary)" />
      <circle cx={sX} cy={mid} r={3} fill="var(--primary)" />
      <circle cx={Math.min(rEnd, W - 3)} cy={bot} r={3} fill="var(--primary)" />
      {dot.visible && (
        <circle
          cx={dot.x}
          cy={dot.y}
          r={4}
          fill="var(--primary)"
          style={{ filter: "drop-shadow(0 0 4px var(--primary))" }}
        />
      )}
    </svg>
  );
}

export default function Synth2Page() {
  const engineRef = useRef<Synth2Engine | null>(null);
  const { isMobile, mobileKeyWidth } = useBreakpoint();

  const [analyserInfo, setAnalyserInfo] = useState({ sampleRate: 44100, fftSize: 2048 });
  const [waveform, setWaveformState] = useState<string>("sawtooth");
  const [subEnabled, setSubState] = useState(false);
  const [cutoff, setCutoffState] = useState(3000);
  const [resonance, setResState] = useState(1);
  const [attack, setAttackState] = useState(0.05);
  const [sustainOn, setSustainState] = useState(true);
  const [release, setReleaseState] = useState(0.6);
  const [reverbOn, setReverbState] = useState(false);
  const [delayAmount, setDelayState] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [startOctave, setStartOctave] = useState(3);
  const startOctaveRef = useRef(startOctave);
  useEffect(() => { startOctaveRef.current = startOctave; }, [startOctave]);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [noteOnMs, setNoteOnMs] = useState<number | null>(null);
  const [noteOffMs, setNoteOffMs] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"osc" | "filter" | "env" | "fx">("osc");

  useEffect(() => {
    engineRef.current = new Synth2Engine();
    setAnalyserInfo({
      sampleRate: engineRef.current.sampleRate,
      fftSize: engineRef.current.fftSize,
    });
    return () => engineRef.current?.dispose();
  }, []);

  const noteOn = useCallback((note: string, vel: number) => {
    engineRef.current?.noteOn(note, vel);
    setActiveNotes((prev) => new Set([...prev, note]));
    setNoteOnMs(performance.now());
    setNoteOffMs(null);
  }, []);

  const noteOff = useCallback((note: string) => {
    engineRef.current?.noteOff(note);
    setActiveNotes((prev) => { const n = new Set(prev); n.delete(note); return n; });
    setNoteOffMs(performance.now());
  }, []);

  const getWaveform = useCallback((): Float32Array => {
    return engineRef.current?.getWaveform() ?? new Float32Array(2048);
  }, []);

  const getFFT = useCallback((): Float32Array => {
    return engineRef.current?.getFFT() ?? new Float32Array(512);
  }, []);

  const handleWaveform = useCallback((v: string) => {
    setWaveformState(v);
    engineRef.current?.setWaveform(v as OscillatorType);
  }, []);

  const handleSub = useCallback(() => {
    setSubState((prev) => {
      const next = !prev;
      engineRef.current?.setSubEnabled(next);
      return next;
    });
  }, []);

  const handleCutoff = useCallback((hz: number) => {
    setCutoffState(hz);
    engineRef.current?.setCutoff(hz);
  }, []);

  const handleRes = useCallback((q: number) => {
    setResState(q);
    engineRef.current?.setResonance(q);
  }, []);

  const handleAttack = useCallback((s: number) => {
    setAttackState(s);
    engineRef.current?.setAttack(s);
  }, []);

  const handleSustain = useCallback(() => {
    setSustainState((prev) => {
      const next = !prev;
      engineRef.current?.setSustain(next);
      return next;
    });
  }, []);

  const handleRelease = useCallback((s: number) => {
    setReleaseState(s);
    engineRef.current?.setRelease(s);
  }, []);

  const handleReverb = useCallback(() => {
    setReverbState((prev) => {
      const next = !prev;
      engineRef.current?.setReverb(next);
      return next;
    });
  }, []);

  const handleDelay = useCallback((v: number) => {
    setDelayState(v);
    engineRef.current?.setDelay(v);
  }, []);

  const handleVolume = useCallback((v: number) => {
    setVolumeState(v);
    engineRef.current?.setVolume(v);
  }, []);

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    padding: "6px 12px",
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
      engineRef.current?.noteOn(note, 0.8);
      setActiveNotes((prev) => new Set([...prev, note]));
      setNoteOnMs(performance.now());
      setNoteOffMs(null);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const entry = KEY_NOTE_MAP[e.key.toLowerCase()];
      if (!entry) return;
      heldKeys.delete(e.key.toLowerCase());
      const [name, offset] = entry;
      const note = `${name}${startOctaveRef.current + offset}`;
      engineRef.current?.noteOff(note);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      setNoteOffMs(performance.now());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isMobile]);

  const vizW = isMobile ? 100 : 280;
  const vizH = isMobile ? 36 : 76;

  const octaveNavStyle: React.CSSProperties = {
    background: "none",
    border: "1px solid var(--border)",
    borderRadius: 7,
    color: "var(--foreground)",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1,
    padding: "4px 12px",
  };

  const desktopHeader = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--border)",
        padding: "16px 20px",
      }}
    >
      <div>
        <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>The Learner</p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "3px 0 0" }}>
          Osc + Sub · Filter · ADSR · Reverb + Delay
        </p>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <WaveformCanvas getWaveform={getWaveform} width={vizW} height={vizH} />
        <SpectrumCanvas
          getFFT={getFFT}
          filterFreq={cutoff}
          sampleRate={analyserInfo.sampleRate}
          fftSize={analyserInfo.fftSize}
          width={vizW}
          height={vizH}
        />
      </div>
      <Knob value={volume} min={0} max={1} step={0.01} label="Vol" onChange={handleVolume} size="sm" />
    </div>
  );

  const mobileHeader = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>The Learner</p>
        <p style={{ fontSize: 9, color: "var(--muted-foreground)", margin: "1px 0 0" }}>
          Osc + Sub · Filter · ADSR · Reverb + Delay
        </p>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <WaveformCanvas getWaveform={getWaveform} width={vizW} height={vizH} />
        <SpectrumCanvas
          getFFT={getFFT}
          filterFreq={cutoff}
          sampleRate={analyserInfo.sampleRate}
          fftSize={analyserInfo.fftSize}
          width={vizW}
          height={vizH}
        />
        <div style={{ marginLeft: 4 }}>
          <Knob value={volume} min={0} max={1} step={0.01} label="Vol" onChange={handleVolume} size="sm" />
        </div>
      </div>
    </div>
  );

  const desktopControls = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateRows: "auto auto",
        gap: 14,
        padding: 16,
      }}
    >
      <div style={SECTION}>
        <p style={LABEL}>Oscillator</p>
        <WaveformSelect
          value={waveform}
          options={["sine", "square", "sawtooth", "triangle"]}
          onChange={handleWaveform}
          size="md"
          label="Waveform"
        />
        <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
          <button onClick={handleSub} style={toggleStyle(subEnabled)}>
            Sub {subEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      <div style={SECTION}>
        <p style={LABEL}>Filter</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
          <Knob
            value={cutoff}
            min={80}
            max={18000}
            step={10}
            label="Cutoff"
            unit="Hz"
            scale="log"
            onChange={handleCutoff}
            size="lg"
          />
          <Knob
            value={resonance}
            min={0.1}
            max={20}
            step={0.1}
            label="Res"
            unit="Q"
            onChange={handleRes}
            size="sm"
          />
        </div>
      </div>

      <div style={SECTION}>
        <p style={LABEL}>FX</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
          <button
            onClick={handleReverb}
            style={toggleStyle(reverbOn)}
            aria-label={reverbOn ? "Reverb on" : "Reverb off"}
          >
            Reverb {reverbOn ? "ON" : "OFF"}
          </button>
          <Knob
            value={delayAmount}
            min={0}
            max={1}
            step={0.01}
            label="Delay"
            onChange={handleDelay}
            size="sm"
          />
        </div>
      </div>

      <div style={{ ...SECTION, gridColumn: "1 / -1" }}>
        <p style={LABEL}>Envelope</p>
        <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 28 }}>
            <Fader
              value={attack}
              min={0.001}
              max={2}
              step={0.001}
              label="Attack"
              unit="s"
              size="md"
              onChange={handleAttack}
            />
            <Fader
              value={release}
              min={0.05}
              max={4}
              step={0.01}
              label="Release"
              unit="s"
              size="md"
              onChange={handleRelease}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleSustain} style={toggleStyle(sustainOn)}>
                Sustain {sustainOn ? "ON" : "OFF"}
              </button>
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
      </div>
    </div>
  );

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
            <WaveformSelect
              value={waveform}
              options={["sine", "square", "sawtooth", "triangle"]}
              onChange={handleWaveform}
              label="Waveform"
            />
            <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
              <button onClick={handleSub} style={toggleStyle(subEnabled)}>
                Sub {subEnabled ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        )}
        {activeTab === "filter" && (
          <div style={SECTION}>
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              <Knob
                value={cutoff}
                min={80}
                max={18000}
                step={10}
                label="Cutoff"
                unit="Hz"
                scale="log"
                onChange={handleCutoff}
                size="sm"
              />
              <Knob
                value={resonance}
                min={0.1}
                max={20}
                step={0.1}
                label="Res"
                unit="Q"
                onChange={handleRes}
                size="sm"
              />
            </div>
          </div>
        )}
        {activeTab === "env" && (
          <div style={SECTION}>
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
            <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
              <button onClick={handleSustain} style={toggleStyle(sustainOn)}>
                Sustain {sustainOn ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        )}
        {activeTab === "fx" && (
          <div style={SECTION}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <button
                onClick={handleReverb}
                style={toggleStyle(reverbOn)}
                aria-label={reverbOn ? "Reverb on" : "Reverb off"}
              >
                Reverb {reverbOn ? "ON" : "OFF"}
              </button>
              <Knob
                value={delayAmount}
                min={0}
                max={1}
                step={0.01}
                label="Delay"
                onChange={handleDelay}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const keyboard = (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {!isMobile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
            justifyContent: "center",
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
          <span style={{ fontSize: 14, color: "var(--muted-foreground)", minWidth: 74, textAlign: "center" }}>
            Oct {startOctave}–{startOctave + 2}
          </span>
          <button
            style={octaveNavStyle}
            onClick={() => setStartOctave((o) => Math.min(5, o + 1))}
            disabled={startOctave >= 5}
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
        octaves={isMobile ? 2 : 3}
        activeNotes={activeNotes}
        whiteKeyWidth={isMobile ? mobileKeyWidth : 28}
        whiteKeyHeight={isMobile ? 80 : 92}
      />
    </div>
  );

  return (
    <SynthShell
      isMobile={isMobile}
      theme={THEME}
      header={isMobile ? mobileHeader : desktopHeader}
      controls={isMobile ? mobileControls : desktopControls}
      keyboard={keyboard}
      navHeight={48}
      desktopClassName="w-[760px] lg:w-[840px]"
    />
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: build succeeds with no new errors.

- [ ] **Step 3: Visual verification (dev server)**

Run: `npm run dev`

Open `http://localhost:3000/temp-synths/2` in browser.

Check desktop:
- Header: title left | waveform + spectrum canvases center | vol knob right
- Controls: 3-col top (OSC, FILTER, FX) + full-width ENV row below
- Oscillator panel: waveform selector + Sub toggle
- Filter panel: large Cutoff knob (log scale) + Res knob
- FX panel: Reverb toggle + Delay knob
- Envelope panel: Attack + Release faders left, Sustain toggle + EnvelopeCurve right
- Press a piano key: dot appears on curve, moves along attack phase, holds at sustain, then release phase on key-up
- QWERTY: `a s d f g h j` plays C D E F G A B in current octave; `− +` buttons change octave
- Keyboard: 3 octaves, octave nav strip above
- WaveformCanvas and SpectrumCanvas animate while playing

Check mobile (resize < 1024px or use DevTools):
- Landscape rotation applied
- Header: title + canvases + vol knob in flex row
- Tabs: OSC / FILTER / ENV / FX
- ENV tab: faders + Sustain toggle (no envelope curve)
- Keyboard: 2 octaves, no octave nav

- [ ] **Step 4: Commit**

```bash
git add src/app/temp-synths/2/page.tsx
git commit -m "feat: synth2 page — spectrum, QWERTY, octave nav, animated EnvelopeCurve, volume knob"
```
