# Synth Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 5 lab synths (osci-mono/sub/fm/mod/wave) so the keyboard is always visible without scrolling — desktop gets a centered hardware-feel card, mobile gets the synth CSS-rotated to fill a portrait viewport in landscape orientation.

**Architecture:** A new `SynthShell` component handles the layout branching — desktop card vs mobile rotation — so no layout logic is duplicated across the 5 synth files. Each synth assembles `header`, `controls`, and `keyboard` ReactNodes and hands them to `SynthShell`. A `useBreakpoint` hook provides `isMobile` (< 768px) and `mobileKeyWidth` computed from `window.innerHeight`.

**Tech Stack:** Next.js 16 (App Router), React, Tailwind v4, inline styles (synth theme colors come from `SYNTH_CONFIGS[...].theme`, not CSS variables), Tone.js (untouched), `SynthKeyboard` / `WaveformDisplay` / `SpectrumDisplay` (untouched except `height` and `octaves`/`whiteKeyWidth` props).

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/hooks/use-breakpoint.ts` | SSR-safe `isMobile` boolean + `mobileKeyWidth` number |
| Create | `src/components/synths/shared/synth-shell.tsx` | Desktop card layout + mobile rotation wrapper |
| Create | `src/app/lab/[synth]/page.tsx` | Minimal route for visual testing all 5 synths |
| Modify | `src/components/synths/osci-mono.tsx` | Wrap in SynthShell, mobile-responsive knobs/grid |
| Modify | `src/components/synths/osci-sub.tsx` | Same |
| Modify | `src/components/synths/osci-fm.tsx` | Same |
| Modify | `src/components/synths/osci-mod.tsx` | Same |
| Modify | `src/components/synths/osci-wave.tsx` | Same |

**Not touched:** `themed-synth-panel.tsx`, `synth-page-client.tsx`, engine files, `WaveformDisplay`, `SpectrumDisplay`, `SynthKeyboard` component internals, knob `onChange` handlers, theme configs.

---

## Task 1: `use-breakpoint` Hook

**Files:**
- Create: `src/hooks/use-breakpoint.ts`

- [ ] **Step 1: Create the hook**

```ts
"use client";

import { useEffect, useState } from "react";

export function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileKeyWidth, setMobileKeyWidth] = useState(40);

  useEffect(() => {
    function update() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        // landscape width = portrait height when phone is tilted
        setMobileKeyWidth(Math.floor((window.innerHeight - 16) / 14));
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return { isMobile, mobileKeyWidth };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors mentioning `use-breakpoint`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-breakpoint.ts
git commit -m "feat: add useBreakpoint hook for mobile layout detection"
```

---

## Task 2: `SynthShell` Component

**Files:**
- Create: `src/components/synths/shared/synth-shell.tsx`

**Desktop layout:** `min-h-screen` page centers a fixed-width card (`w-[480px] lg:w-[520px]`) with `max-h-[calc(100vh-4rem)]`. Controls area is `flex-1 min-h-0 overflow-y-auto`. Keyboard is `flex-shrink-0`.

**Mobile layout:** `fixed inset-0 overflow-hidden` outer container. Inner div is landscape-dimensioned (`width: 100dvh, height: 100dvw`) centered and rotated −90°. Same header/controls/keyboard slot structure inside.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import type { ReactNode } from "react";

interface SynthShellProps {
  isMobile: boolean;
  theme: { bg: string; border: string; panel: string };
  header: ReactNode;
  controls: ReactNode;
  keyboard: ReactNode;
}

export function SynthShell({ isMobile, theme, header, controls, keyboard }: SynthShellProps) {
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 overflow-hidden"
        style={{ background: theme.bg }}
      >
        <div
          style={{
            position: "absolute",
            width: "100dvh",
            height: "100dvw",
            top: "50%",
            left: "50%",
            marginTop: "calc(-50dvw)",
            marginLeft: "calc(-50dvh)",
            transform: "rotate(-90deg)",
            transformOrigin: "center center",
            display: "flex",
            flexDirection: "column",
            background: theme.panel,
            overflow: "hidden",
          }}
        >
          <div style={{ flexShrink: 0 }}>{header}</div>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>{controls}</div>
          <div
            style={{
              flexShrink: 0,
              borderTop: `1px solid ${theme.border}`,
              background: theme.panel,
            }}
          >
            {keyboard}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center py-8"
      style={{ background: theme.bg }}
    >
      <div
        className="w-[480px] lg:w-[520px] flex flex-col max-h-[calc(100vh-4rem)] rounded-xl overflow-hidden border shadow-2xl"
        style={{ background: theme.panel, borderColor: theme.border }}
      >
        <div className="flex-shrink-0">{header}</div>
        <div className="flex-1 min-h-0 overflow-y-auto">{controls}</div>
        <div
          className="flex-shrink-0 border-t"
          style={{ borderColor: theme.border, background: theme.panel }}
        >
          {keyboard}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/synths/shared/synth-shell.tsx
git commit -m "feat: add SynthShell layout wrapper (desktop card + mobile rotation)"
```

---

## Task 3: Test Route

**Files:**
- Create: `src/app/lab/[synth]/page.tsx`

This is a permanent route at `/lab/mono`, `/lab/sub`, `/lab/fm`, `/lab/mod`, `/lab/wave`. Used for visual verification now; stays as the public entry point for lab synths.

- [ ] **Step 1: Create the page**

```tsx
import { AudioProvider } from "@/providers/audio-provider";
import { OsciMono } from "@/components/synths/osci-mono";
import { OsciSub } from "@/components/synths/osci-sub";
import { OsciFM } from "@/components/synths/osci-fm";
import { OsciMod } from "@/components/synths/osci-mod";
import { OsciWave } from "@/components/synths/osci-wave";

const SYNTHS: Record<string, React.ComponentType> = {
  mono: OsciMono,
  sub: OsciSub,
  fm: OsciFM,
  mod: OsciMod,
  wave: OsciWave,
};

export default async function LabSynthPage({
  params,
}: {
  params: Promise<{ synth: string }>;
}) {
  const { synth } = await params;
  const SynthComponent = SYNTHS[synth];
  if (!SynthComponent) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Unknown synth: {synth}. Try: mono, sub, fm, mod, wave
      </div>
    );
  }
  return (
    <AudioProvider>
      <SynthComponent />
    </AudioProvider>
  );
}
```

- [ ] **Step 2: Start dev server and verify route loads**

```bash
npm run dev
```

Open `http://localhost:3000/lab/mono`. Expected: synth renders (current layout, before refactor).

- [ ] **Step 3: Commit**

```bash
git add src/app/lab/[synth]/page.tsx
git commit -m "feat: add /lab/[synth] route for lab synth access"
```

---

## Task 4: Refactor `osci-mono.tsx`

**Files:**
- Modify: `src/components/synths/osci-mono.tsx`

**Control layout:** 4 panels (Oscillator+Filter, Amp Env, Filter Env, Master) — `grid-cols-2` on both desktop and mobile (2×2 grid). Desktop: `p-4 gap-5`. Mobile: `p-3 gap-3`.

**Knob shorthand:** `const ks = (n: number) => isMobile ? Math.round(n * 0.85) : n` — produces mobile sizes (52→44, 56→48, 64→54).

**Visualizers in header:** WaveformDisplay height `isMobile ? 32 : 56`, SpectrumDisplay height `isMobile ? 32 : 56`.

- [ ] **Step 1: Replace the full file**

```tsx
"use client";

import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Knob } from "./shared/knob";
import { SynthKeyboard } from "./shared/keyboard";
import { WaveformDisplay } from "./shared/waveform-display";
import { SpectrumDisplay } from "./shared/spectrum-display";
import { SynthShell } from "./shared/synth-shell";
import { SYNTH_CONFIGS } from "./configs";

const C = SYNTH_CONFIGS["osci-mono"];
const T = C.theme;

const WAVEFORMS = ["sine", "square", "sawtooth", "triangle"] as const;
type Waveform = (typeof WAVEFORMS)[number];

const WAVE_ICONS: Record<Waveform, string> = {
  sine: "∿",
  square: "⊓",
  sawtooth: "⩘",
  triangle: "∧",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1" style={{ background: T.border }} />
      <span
        className="text-xs font-bold tracking-widest uppercase px-2"
        style={{ color: T.dim }}
      >
        {children}
      </span>
      <div className="h-px flex-1" style={{ background: T.border }} />
    </div>
  );
}

export function OsciMono() {
  const { params, isReady, setParam, noteOn, noteOff, getWaveform, getSpectrum } =
    useSynthEngine({
      engineType: C.engineType,
      engineConfig: C.engineConfig,
      defaultParams: C.defaultParams,
      allParams: C.allParams,
    });

  const { isStarted, startAudio } = useAudioContext();
  const { isMobile, mobileKeyWidth } = useBreakpoint();

  const wave = (params["oscillator.type"] as Waveform) ?? "sawtooth";
  const p = (key: string) => (params[key] as number) ?? 0;
  const ks = (n: number) => (isMobile ? Math.round(n * 0.85) : n);
  const vizH = isMobile ? 32 : 56;

  const header = (
    <div
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{ borderColor: T.border }}
    >
      <div>
        <div className="text-xs tracking-widest uppercase mb-0.5" style={{ color: T.dim }}>
          Osciscoops / Lab
        </div>
        <h1 className="text-xl font-black tracking-tight" style={{ color: T.accent }}>
          OSCI MONO
        </h1>
      </div>
      <div className="flex gap-2 items-center">
        <div className="rounded-lg overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <WaveformDisplay getData={getWaveform} width={isMobile ? 80 : 180} height={vizH} color={T.accent} />
        </div>
        <div className="rounded-lg overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <SpectrumDisplay getData={getSpectrum} width={isMobile ? 60 : 120} height={vizH} color={T.accent} barCount={32} />
        </div>
        {!isStarted ? (
          <button
            onClick={startAudio}
            className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide"
            style={{ background: T.accent, color: T.bg }}
          >
            Enable
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: T.dim }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: T.accent }} />
            On
          </div>
        )}
      </div>
    </div>
  );

  const controls = (
    <div className={`grid grid-cols-2 ${isMobile ? "p-3 gap-3" : "p-4 gap-5"}`}>
      {/* Oscillator + Filter */}
      <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <SectionLabel>Oscillator</SectionLabel>
        <div className="flex gap-1.5 mb-4">
          {WAVEFORMS.map((w) => (
            <button
              key={w}
              onClick={() => setParam("oscillator.type", w)}
              className="flex-1 py-1.5 rounded text-base font-bold transition-all"
              style={{
                background: wave === w ? T.accent : T.surface,
                color: wave === w ? T.bg : T.dim,
                border: `1px solid ${wave === w ? T.accent : T.border}`,
              }}
              title={w}
            >
              {WAVE_ICONS[w]}
            </button>
          ))}
        </div>
        <SectionLabel>Filter</SectionLabel>
        <div className="flex gap-4 justify-center">
          <Knob value={p("filter.frequency")} min={20} max={20000} step={1} label="Cutoff" unit="Hz"
            onChange={(v) => setParam("filter.frequency", v)} color={T.accent}
            trackColor={`${T.accent}25`} textColor={T.dim} size={ks(56)}
            formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString()} />
          <Knob value={p("filter.Q")} min={0.1} max={20} step={0.1} label="Reso"
            onChange={(v) => setParam("filter.Q", v)} color={T.accent2}
            trackColor={`${T.accent}25`} textColor={T.dim} size={ks(56)} />
        </div>
      </div>

      {/* Amp Envelope */}
      <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <SectionLabel>Amp Envelope</SectionLabel>
        <div className="flex gap-3 justify-center">
          {(["attack", "decay", "sustain", "release"] as const).map((stage) => {
            const key = `envelope.${stage}`;
            const max = stage === "release" ? 5 : stage === "attack" ? 2 : stage === "decay" ? 2 : 1;
            return (
              <Knob key={key} value={p(key)} min={stage === "attack" ? 0.001 : 0.01} max={max}
                step={stage === "attack" ? 0.001 : 0.01}
                label={stage.charAt(0).toUpperCase()} unit={stage !== "sustain" ? "s" : undefined}
                onChange={(v) => setParam(key, v)} color={T.accent}
                trackColor={`${T.accent}25`} textColor={T.dim} size={ks(52)} />
            );
          })}
        </div>
      </div>

      {/* Filter Envelope */}
      <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <SectionLabel>Filter Envelope</SectionLabel>
        <div className="flex gap-3 justify-center flex-wrap">
          {(["attack", "decay", "sustain", "release"] as const).map((stage) => {
            const key = `filterEnvelope.${stage}`;
            const max = stage === "release" ? 5 : stage === "attack" ? 2 : stage === "decay" ? 2 : 1;
            return (
              <Knob key={key} value={p(key)} min={stage === "attack" ? 0.001 : 0.01} max={max}
                step={stage === "attack" ? 0.001 : 0.01}
                label={`F·${stage.charAt(0).toUpperCase()}`} unit={stage !== "sustain" ? "s" : undefined}
                onChange={(v) => setParam(key, v)} color={T.accent2}
                trackColor={`${T.accent2}25`} textColor={T.dim} size={ks(52)} />
            );
          })}
          <Knob value={p("filterEnvelope.baseFrequency")} min={20} max={5000} step={1} label="Base" unit="Hz"
            onChange={(v) => setParam("filterEnvelope.baseFrequency", v)} color={T.accent2}
            trackColor={`${T.accent2}25`} textColor={T.dim} size={ks(52)}
            formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString()} />
          <Knob value={p("filterEnvelope.octaves")} min={0} max={8} step={0.1} label="Octaves"
            onChange={(v) => setParam("filterEnvelope.octaves", v)} color={T.accent2}
            trackColor={`${T.accent2}25`} textColor={T.dim} size={ks(52)} />
        </div>
      </div>

      {/* Master */}
      <div className="rounded-xl p-4 flex flex-col items-center justify-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <SectionLabel>Master</SectionLabel>
        <Knob value={p("volume")} min={-40} max={6} step={1} label="Volume" unit="dB"
          onChange={(v) => setParam("volume", v)} color={T.accent}
          trackColor={`${T.accent}25`} textColor={T.dim} size={ks(56)} />
      </div>
    </div>
  );

  const keyboard = (
    <div className="px-4 py-3 flex justify-center overflow-x-auto">
      <SynthKeyboard
        onNoteOn={noteOn} onNoteOff={noteOff}
        startOctave={3} octaves={isMobile ? 2 : 3}
        whiteKeyWidth={isMobile ? mobileKeyWidth : 24}
        whiteKeyHeight={isMobile ? 80 : 72}
        whiteColor="#f0e8d4" blackColor={T.surface}
        activeColor={T.accent} borderColor={T.border} showKeyLabels
      />
    </div>
  );

  return (
    <>
      <SynthShell isMobile={isMobile} theme={T} header={header} controls={controls} keyboard={keyboard} />
      {!isReady && isStarted && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="px-8 py-4 rounded-xl text-sm font-bold tracking-wide"
            style={{ background: T.panel, color: T.accent, border: `1px solid ${T.border}` }}>
            Loading engine…
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors.

- [ ] **Step 3: Visual check — desktop**

Start dev server. Open `http://localhost:3000/lab/mono` on a desktop browser (viewport ≥ 1024px).

Expected: centered card with page background visible above/below. Controls in 2-col grid. Keyboard at bottom, all visible without scrolling.

- [ ] **Step 4: Visual check — mobile**

In browser DevTools, switch to mobile preset (e.g., iPhone 14, 390×844). Reload.

Expected: synth fills viewport rotated −90°. Tilt your head clockwise or rotate device: controls on top, keyboard on bottom, reads as landscape.

- [ ] **Step 5: Commit**

```bash
git add src/components/synths/osci-mono.tsx
git commit -m "feat: refactor osci-mono to SynthShell layout"
```

---

## Task 5: Refactor `osci-sub.tsx`

**Files:**
- Modify: `src/components/synths/osci-sub.tsx`

**Control layout:** Big spectrum display at top of controls, then 3-col grid (Oscillator, Filter, Envelope), then volume slider row below. Desktop spectrum height 80px, mobile 48px.

- [ ] **Step 1: Replace the full file**

```tsx
"use client";

import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Knob } from "./shared/knob";
import { SynthKeyboard } from "./shared/keyboard";
import { SpectrumDisplay } from "./shared/spectrum-display";
import { SynthShell } from "./shared/synth-shell";
import { SYNTH_CONFIGS } from "./configs";

const C = SYNTH_CONFIGS["osci-sub"];
const T = C.theme;

const WAVEFORMS = ["sine", "square", "sawtooth", "triangle"] as const;
type Waveform = (typeof WAVEFORMS)[number];

const WAVE_PATHS: Record<Waveform, string> = {
  sine: "M2 12 Q8 2 14 12 Q20 22 26 12",
  square: "M2 6 L2 18 L14 18 L14 6 L26 6",
  sawtooth: "M2 18 L14 6 L14 18 L26 6",
  triangle: "M2 18 L8 6 L14 18 L20 6 L26 18",
};

export function OsciSub() {
  const { params, isReady, setParam, noteOn, noteOff, getSpectrum } =
    useSynthEngine({
      engineType: C.engineType,
      engineConfig: C.engineConfig,
      defaultParams: C.defaultParams,
      allParams: C.allParams,
    });

  const { isStarted, startAudio } = useAudioContext();
  const { isMobile, mobileKeyWidth } = useBreakpoint();

  const wave = (params["oscillator.type"] as Waveform) ?? "square";
  const p = (key: string) => (params[key] as number) ?? 0;
  const ks = (n: number) => (isMobile ? Math.round(n * 0.85) : n);

  const header = (
    <div
      className="flex items-center justify-between px-5 py-3 border-b"
      style={{ borderColor: T.border }}
    >
      <div>
        <div className="text-xs tracking-widest uppercase mb-0.5" style={{ color: T.dim }}>
          Osciscoops / Lab / Beginner
        </div>
        <h1 className="text-2xl font-black tracking-tighter" style={{ color: T.text }}>
          OSCI <span style={{ color: T.accent }}>SUB</span>
        </h1>
      </div>
      {!isStarted ? (
        <button
          onClick={startAudio}
          className="px-4 py-2 rounded-lg text-sm font-black tracking-widest uppercase transition-all"
          style={{ background: T.accent, color: "#fff", boxShadow: `0 0 20px ${T.glow}` }}
        >
          Power On
        </button>
      ) : (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: `${T.accent}20`, color: T.accent, border: `1px solid ${T.accent}40` }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: T.accent }} />
          LIVE
        </div>
      )}
    </div>
  );

  const controls = (
    <div className={isMobile ? "p-3" : "p-5"}>
      {/* Spectrum display */}
      <div className="rounded-2xl overflow-hidden w-full mb-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <SpectrumDisplay getData={getSpectrum} width={900} height={isMobile ? 48 : 80}
          color={T.accent} barCount={80} barGap={2} className="w-full" />
      </div>

      {/* 3-col control grid */}
      <div className={`grid grid-cols-3 ${isMobile ? "gap-3" : "gap-5"}`}>
        {/* Oscillator */}
        <div className="rounded-2xl p-4" style={{ background: T.panel, border: `1px solid ${T.border}` }}>
          <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: T.accent }}>Oscillator</p>
          <div className="grid grid-cols-2 gap-2">
            {WAVEFORMS.map((w) => (
              <button key={w} onClick={() => setParam("oscillator.type", w)}
                className="flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl transition-all"
                style={{
                  background: wave === w ? `${T.accent}20` : T.surface,
                  border: `1.5px solid ${wave === w ? T.accent : T.border}`,
                }}>
                <svg width="24" height="20" viewBox="0 0 28 24" fill="none">
                  <path d={WAVE_PATHS[w]} stroke={wave === w ? T.accent : T.dim}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: wave === w ? T.accent : T.dim, fontSize: 9 }}>{w}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter */}
        <div className="rounded-2xl p-4" style={{ background: T.panel, border: `1px solid ${T.border}` }}>
          <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: T.accent }}>Filter</p>
          <div className="flex justify-around">
            <Knob value={p("filter.frequency")} min={20} max={20000} step={1} label="Cutoff" unit="Hz"
              onChange={(v) => setParam("filter.frequency", v)} color={T.accent}
              trackColor={`${T.accent}20`} textColor={T.dim} size={ks(56)}
              formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString()} />
            <Knob value={p("filter.Q")} min={0.1} max={20} step={0.1} label="Reso"
              onChange={(v) => setParam("filter.Q", v)} color={T.accent2}
              trackColor={`${T.accent}20`} textColor={T.dim} size={ks(56)} />
          </div>
        </div>

        {/* Envelope */}
        <div className="rounded-2xl p-4" style={{ background: T.panel, border: `1px solid ${T.border}` }}>
          <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: T.accent }}>Envelope</p>
          <div className="flex justify-around">
            {(["attack", "decay", "sustain", "release"] as const).map((stage) => {
              const key = `envelope.${stage}`;
              const max = stage === "release" ? 5 : stage === "sustain" ? 1 : 2;
              return (
                <Knob key={key} value={p(key)} min={stage === "attack" ? 0.001 : 0.01} max={max}
                  step={stage === "attack" ? 0.001 : 0.01}
                  label={stage.charAt(0).toUpperCase()} unit={stage !== "sustain" ? "s" : undefined}
                  onChange={(v) => setParam(key, v)} color={T.accent}
                  trackColor={`${T.accent}20`} textColor={T.dim} size={ks(48)} />
              );
            })}
          </div>
        </div>
      </div>

      {/* Volume strip */}
      <div className="mt-4 flex items-center gap-4">
        <span className="text-xs font-black tracking-widest uppercase" style={{ color: T.dim }}>Vol</span>
        <div className="flex-1 relative h-8 flex items-center">
          <div className="absolute inset-x-0 h-1.5 rounded-full" style={{ background: T.surface, border: `1px solid ${T.border}` }} />
          <div className="absolute left-0 h-1.5 rounded-full transition-all"
            style={{ width: `${Math.max(0, ((p("volume") + 40) / 46) * 100)}%`, background: T.accent, boxShadow: `0 0 8px ${T.glow}` }} />
          <input type="range" min={-40} max={6} step={1} value={p("volume")}
            onChange={(e) => setParam("volume", parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-8" />
        </div>
        <span className="text-xs font-mono w-12 text-right" style={{ color: T.accent }}>
          {p("volume").toFixed(0)} dB
        </span>
      </div>
    </div>
  );

  const keyboard = (
    <div className="px-5 py-3 flex justify-center overflow-x-auto">
      <SynthKeyboard
        onNoteOn={noteOn} onNoteOff={noteOff}
        startOctave={2} octaves={isMobile ? 2 : 3}
        whiteKeyWidth={isMobile ? mobileKeyWidth : 24}
        whiteKeyHeight={isMobile ? 80 : 80}
        whiteColor="#e8e8ee" blackColor={T.surface}
        activeColor={T.accent} borderColor={T.border} showKeyLabels
      />
    </div>
  );

  return (
    <>
      <SynthShell isMobile={isMobile} theme={T} header={header} controls={controls} keyboard={keyboard} />
      {!isReady && isStarted && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70">
          <div className="px-8 py-4 rounded-xl text-sm font-black tracking-widest uppercase"
            style={{ background: T.panel, color: T.accent, border: `1px solid ${T.accent}` }}>
            Initializing…
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify build, visual check desktop + mobile**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Open `http://localhost:3000/lab/sub`. Desktop: card centered, spectrum at top, 3-col controls, keyboard pinned. Mobile DevTools: rotated layout, keyboard at bottom.

- [ ] **Step 3: Commit**

```bash
git add src/components/synths/osci-sub.tsx
git commit -m "feat: refactor osci-sub to SynthShell layout"
```

---

## Task 6: Refactor `osci-fm.tsx`

**Files:**
- Modify: `src/components/synths/osci-fm.tsx`

**Control layout:** Keeps existing 3-column flex layout (Carrier | Center column | Modulator) — already horizontal, works on both desktop and mobile. Knobs scaled on mobile.

- [ ] **Step 1: Replace the full file**

```tsx
"use client";

import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Knob } from "./shared/knob";
import { SynthKeyboard } from "./shared/keyboard";
import { WaveformDisplay } from "./shared/waveform-display";
import { SynthShell } from "./shared/synth-shell";
import { SYNTH_CONFIGS } from "./configs";

const C = SYNTH_CONFIGS["osci-fm"];
const T = C.theme;

const WAVEFORMS = ["sine", "square", "sawtooth", "triangle"] as const;
type Waveform = (typeof WAVEFORMS)[number];
const WAVE_SYMBOLS: Record<Waveform, string> = {
  sine: "∿", square: "⊓", sawtooth: "⩘", triangle: "∧",
};

function OperatorBlock({ label, badge, color, children }: {
  label: string; badge: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-4 flex-1" style={{
      background: T.surface,
      border: `1px solid ${color}50`,
      boxShadow: `inset 0 0 30px ${color}08`,
    }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-black"
          style={{ background: color, color: T.bg }}>{badge}</div>
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function WaveSelector({ value, onChange, color }: {
  value: Waveform; onChange: (v: string) => void; color: string;
}) {
  return (
    <div className="flex gap-1 mb-4">
      {WAVEFORMS.map((w) => (
        <button key={w} onClick={() => onChange(w)}
          className="flex-1 py-1.5 rounded text-sm font-bold transition-all"
          style={{
            background: value === w ? color : `${color}10`,
            color: value === w ? T.bg : color,
            border: `1px solid ${value === w ? color : `${color}30`}`,
          }}>
          {WAVE_SYMBOLS[w]}
        </button>
      ))}
    </div>
  );
}

export function OsciFM() {
  const { params, isReady, setParam, noteOn, noteOff, getWaveform } =
    useSynthEngine({
      engineType: C.engineType,
      engineConfig: C.engineConfig,
      defaultParams: C.defaultParams,
      allParams: C.allParams,
    });

  const { isStarted, startAudio } = useAudioContext();
  const { isMobile, mobileKeyWidth } = useBreakpoint();

  const carrierWave = (params["oscillator.type"] as Waveform) ?? "sine";
  const modWave = (params["modulation.type"] as Waveform) ?? "sine";
  const p = (key: string) => (params[key] as number) ?? 0;
  const ks = (n: number) => (isMobile ? Math.round(n * 0.85) : n);

  const header = (
    <div className="flex items-center gap-4 px-4 py-2 border-b"
      style={{ borderColor: T.border, background: T.panel, borderBottom: `1px solid ${T.accent}30` }}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full"
          style={{ background: isStarted ? T.accent : T.dim, boxShadow: isStarted ? `0 0 8px ${T.accent}` : "none" }} />
        <span className="text-xs font-bold tracking-widest uppercase"
          style={{ color: isStarted ? T.accent : T.dim }}>{isStarted ? "ONLINE" : "OFFLINE"}</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <h1 className="text-lg font-black tracking-[0.3em] uppercase" style={{ color: T.accent }}>OSCI FM</h1>
      </div>
      <div className="flex items-center gap-2 px-2 py-1 rounded text-xs font-bold"
        style={{ background: `${T.accent}10`, border: `1px solid ${T.accent}25`, color: T.dim }}>
        <span style={{ color: T.accent }}>CAR</span>
        <span>→</span>
        <span style={{ color: T.accent2 }}>MOD</span>
        <span>→</span>
        <span>OUT</span>
      </div>
      {!isStarted && (
        <button onClick={startAudio}
          className="px-3 py-1 rounded text-xs font-black tracking-widest uppercase transition-all"
          style={{ background: T.accent, color: T.bg }}>
          Start
        </button>
      )}
    </div>
  );

  const controls = (
    <div className={`flex gap-3 ${isMobile ? "p-3" : "p-4"}`} style={{ minHeight: 0 }}>
      <OperatorBlock label="Carrier" badge="C" color={T.accent}>
        <WaveSelector value={carrierWave} onChange={(v) => setParam("oscillator.type", v)} color={T.accent} />
        <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: T.dim }}>Envelope</p>
        <div className="flex gap-2 justify-around">
          {(["attack", "decay", "sustain", "release"] as const).map((stage) => {
            const key = `envelope.${stage}`;
            const max = stage === "release" ? 5 : stage === "sustain" ? 1 : 2;
            return (
              <Knob key={key} value={p(key)} min={stage === "attack" ? 0.001 : 0.01} max={max}
                step={stage === "attack" ? 0.001 : 0.01}
                label={stage.charAt(0).toUpperCase()} unit={stage !== "sustain" ? "s" : undefined}
                onChange={(v) => setParam(key, v)} color={T.accent}
                trackColor={`${T.accent}20`} textColor={T.dim} size={ks(44)} />
            );
          })}
        </div>
      </OperatorBlock>

      {/* Center column */}
      <div className="flex flex-col items-center justify-center gap-3 py-2 px-1">
        <div className="flex flex-col items-center gap-1">
          <div className="w-px flex-1 min-h-[16px]" style={{ background: T.border }} />
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black"
            style={{ background: T.border, color: T.dim }}>→</div>
          <div className="w-px flex-1 min-h-[16px]" style={{ background: T.border }} />
        </div>
        <div className="flex flex-col gap-2 items-center rounded-xl p-2"
          style={{ background: T.panel, border: `1px solid ${T.border}` }}>
          <Knob value={p("harmonicity")} min={0.1} max={20} step={0.1} label="Ratio"
            onChange={(v) => setParam("harmonicity", v)} color={T.accent}
            trackColor={`${T.accent}20`} textColor={T.dim} size={ks(44)} />
          <Knob value={p("modulationIndex")} min={0} max={100} step={0.1} label="Index"
            onChange={(v) => setParam("modulationIndex", v)} color={T.accent2}
            trackColor={`${T.accent}20`} textColor={T.dim} size={ks(44)} />
          <Knob value={p("volume")} min={-40} max={6} step={1} label="Vol" unit="dB"
            onChange={(v) => setParam("volume", v)} color={T.dim}
            trackColor={`${T.border}60`} textColor={T.dim} size={ks(38)} />
        </div>
      </div>

      <OperatorBlock label="Modulator" badge="M" color={T.accent2}>
        <WaveSelector value={modWave} onChange={(v) => setParam("modulation.type", v)} color={T.accent2} />
        <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: T.dim }}>Mod Envelope</p>
        <div className="flex gap-2 justify-around">
          {(["attack", "decay", "sustain", "release"] as const).map((stage) => {
            const key = `modulationEnvelope.${stage}`;
            const max = stage === "release" ? 5 : stage === "sustain" ? 1 : 2;
            return (
              <Knob key={key} value={p(key)} min={stage === "attack" ? 0.001 : 0.01} max={max}
                step={stage === "attack" ? 0.001 : 0.01}
                label={stage.charAt(0).toUpperCase()} unit={stage !== "sustain" ? "s" : undefined}
                onChange={(v) => setParam(key, v)} color={T.accent2}
                trackColor={`${T.accent2}20`} textColor={T.dim} size={ks(44)} />
            );
          })}
        </div>
      </OperatorBlock>
    </div>
  );

  const keyboard = (
    <div>
      <div className="px-4 pt-2" style={{ background: T.bg }}>
        <div className="rounded-lg overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <WaveformDisplay getData={getWaveform} width={900} height={isMobile ? 28 : 40}
            color={T.accent} lineWidth={1.5} className="w-full" />
        </div>
      </div>
      <div className="px-4 py-3 flex justify-center overflow-x-auto" style={{ background: T.panel }}>
        <SynthKeyboard
          onNoteOn={noteOn} onNoteOff={noteOff}
          startOctave={3} octaves={isMobile ? 2 : 3}
          whiteKeyWidth={isMobile ? mobileKeyWidth : 24}
          whiteKeyHeight={isMobile ? 80 : 72}
          whiteColor="#e8f4ff" blackColor={T.surface}
          activeColor={T.accent} borderColor={T.border} showKeyLabels
        />
      </div>
    </div>
  );

  return (
    <>
      <SynthShell isMobile={isMobile} theme={T} header={header} controls={controls} keyboard={keyboard} />
      {!isReady && isStarted && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70">
          <div className="px-8 py-4 rounded text-xs font-black tracking-widest uppercase"
            style={{ background: T.panel, color: T.accent, border: `1px solid ${T.accent}` }}>
            Loading FM Engine…
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify build and visual check**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Open `http://localhost:3000/lab/fm`. Desktop: carrier|center|mod layout in card. Mobile DevTools: same 3-col layout rotated, waveform display above keyboard.

- [ ] **Step 3: Commit**

```bash
git add src/components/synths/osci-fm.tsx
git commit -m "feat: refactor osci-fm to SynthShell layout"
```

---

## Task 7: Refactor `osci-mod.tsx`

**Files:**
- Modify: `src/components/synths/osci-mod.tsx`

**Control layout:** Keeps existing `flex` layout (Voice1 | Modulation center | Voice2) — already horizontal. Knobs scaled on mobile.

- [ ] **Step 1: Replace the full file**

```tsx
"use client";

import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Knob } from "./shared/knob";
import { SynthKeyboard } from "./shared/keyboard";
import { WaveformDisplay } from "./shared/waveform-display";
import { SynthShell } from "./shared/synth-shell";
import { SYNTH_CONFIGS } from "./configs";

const C = SYNTH_CONFIGS["osci-mod"];
const T = C.theme;

const WAVEFORMS = ["sine", "square", "sawtooth", "triangle"] as const;
type Waveform = (typeof WAVEFORMS)[number];
const WAVE_SYMBOLS: Record<Waveform, string> = {
  sine: "∿", square: "⊓", sawtooth: "⩘", triangle: "∧",
};

const V1_COLOR = T.accent;
const V2_COLOR = T.accent2;

function VoicePanel({ label, color, waveKey, envKey, wave, p, setParam, ks }: {
  label: string; color: string; waveKey: string; envKey: string;
  wave: Waveform; p: (k: string) => number;
  setParam: (k: string, v: number | string) => void;
  ks: (n: number) => number;
}) {
  return (
    <div className="flex-1 rounded-xl p-4" style={{ background: T.surface, border: `1.5px solid ${color}40` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-6 rounded-full" style={{ background: color }} />
        <span className="text-sm font-black tracking-widest uppercase" style={{ color }}>{label}</span>
      </div>
      <div className="grid grid-cols-4 gap-1 mb-4">
        {WAVEFORMS.map((w) => (
          <button key={w} onClick={() => setParam(waveKey, w)}
            className="py-2 rounded-lg text-base font-bold transition-all"
            style={{
              background: wave === w ? `${color}25` : T.panel,
              color: wave === w ? color : T.dim,
              border: `1px solid ${wave === w ? color : T.border}`,
            }}>
            {WAVE_SYMBOLS[w]}
          </button>
        ))}
      </div>
      <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: T.dim }}>Envelope</p>
      <div className="flex gap-2 justify-around">
        {(["attack", "decay", "sustain", "release"] as const).map((stage) => {
          const key = `${envKey}.${stage}`;
          const max = stage === "release" ? 5 : stage === "sustain" ? 1 : 2;
          return (
            <Knob key={key} value={p(key)} min={stage === "attack" ? 0.001 : 0.01} max={max}
              step={stage === "attack" ? 0.001 : 0.01}
              label={stage.charAt(0).toUpperCase()} unit={stage !== "sustain" ? "s" : undefined}
              onChange={(v) => setParam(key, v)} color={color}
              trackColor={`${color}15`} textColor={T.dim} size={ks(44)} />
          );
        })}
      </div>
    </div>
  );
}

export function OsciMod() {
  const { params, isReady, setParam, noteOn, noteOff, getWaveform } =
    useSynthEngine({
      engineType: C.engineType,
      engineConfig: C.engineConfig,
      defaultParams: C.defaultParams,
      allParams: C.allParams,
    });

  const { isStarted, startAudio } = useAudioContext();
  const { isMobile, mobileKeyWidth } = useBreakpoint();

  const v1Wave = (params["voice0.oscillator.type"] as Waveform) ?? "sawtooth";
  const v2Wave = (params["voice1.oscillator.type"] as Waveform) ?? "square";
  const p = (key: string) => (params[key] as number) ?? 0;
  const ks = (n: number) => (isMobile ? Math.round(n * 0.85) : n);

  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: T.border }}>
      <div>
        <h1 className="text-xl font-black tracking-tight" style={{ color: T.text }}>
          OSCI{" "}
          <span style={{
            background: `linear-gradient(90deg, ${V1_COLOR}, ${V2_COLOR})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>MOD</span>
        </h1>
        <p className="text-xs mt-0.5" style={{ color: T.dim }}>Dual-Voice Modular Synthesizer</p>
      </div>
      {!isStarted ? (
        <button onClick={startAudio} className="px-4 py-2 rounded text-sm font-bold"
          style={{ background: T.text, color: T.bg }}>Enable Audio</button>
      ) : (
        <div className="flex items-center gap-2 text-xs" style={{ color: T.dim }}>
          <span className="w-2 h-2 rounded-full" style={{ background: T.accent }} />
          <span>Active</span>
        </div>
      )}
    </div>
  );

  const controls = (
    <div className={`flex gap-3 ${isMobile ? "p-3" : "p-4"}`}>
      <VoicePanel label="Voice 1" color={V1_COLOR}
        waveKey="voice0.oscillator.type" envKey="voice0.envelope"
        wave={v1Wave} p={p} setParam={setParam} ks={ks} />

      {/* Modulation center */}
      <div className="rounded-xl p-3 w-40 flex-shrink-0" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-xs font-black tracking-widest uppercase mb-3 text-center" style={{ color: T.dim }}>Modulation</p>
        <div className="flex flex-col items-center gap-3">
          <Knob value={p("harmonicity")} min={0.1} max={10} step={0.1} label="Harmony"
            onChange={(v) => setParam("harmonicity", v)} color={T.text}
            trackColor={`${T.text}15`} textColor={T.dim} size={ks(48)} />
          <div className="w-full h-px" style={{ background: T.border }} />
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: T.dim }}>Vibrato</p>
          <Knob value={p("vibratoAmount")} min={0} max={1} step={0.01} label="Amount"
            onChange={(v) => setParam("vibratoAmount", v)} color={`${V1_COLOR}cc`}
            trackColor={`${T.text}15`} textColor={T.dim} size={ks(44)} />
          <Knob value={p("vibratoRate")} min={0.1} max={20} step={0.1} label="Rate" unit="Hz"
            onChange={(v) => setParam("vibratoRate", v)} color={`${V2_COLOR}cc`}
            trackColor={`${T.text}15`} textColor={T.dim} size={ks(44)} />
          <div className="w-full h-px" style={{ background: T.border }} />
          <Knob value={p("volume")} min={-40} max={6} step={1} label="Vol" unit="dB"
            onChange={(v) => setParam("volume", v)} color={T.dim}
            trackColor={`${T.border}60`} textColor={T.dim} size={ks(38)} />
        </div>
      </div>

      <VoicePanel label="Voice 2" color={V2_COLOR}
        waveKey="voice1.oscillator.type" envKey="voice1.envelope"
        wave={v2Wave} p={p} setParam={setParam} ks={ks} />
    </div>
  );

  const keyboard = (
    <div>
      <div className="overflow-hidden mx-4 mt-2 mb-0 rounded-lg" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <WaveformDisplay getData={getWaveform} width={900} height={isMobile ? 28 : 40}
          color={T.text} lineWidth={1.5} className="w-full" />
      </div>
      <div className="px-4 py-3 flex justify-center overflow-x-auto">
        <SynthKeyboard
          onNoteOn={noteOn} onNoteOff={noteOff}
          startOctave={3} octaves={isMobile ? 2 : 3}
          whiteKeyWidth={isMobile ? mobileKeyWidth : 24}
          whiteKeyHeight={isMobile ? 80 : 72}
          whiteColor="#f5f5f5" blackColor={T.surface}
          activeColor={T.accent} borderColor={T.border} showKeyLabels
        />
      </div>
    </div>
  );

  return (
    <>
      <SynthShell isMobile={isMobile} theme={T} header={header} controls={controls} keyboard={keyboard} />
      {!isReady && isStarted && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80">
          <div className="px-8 py-4 rounded text-sm font-bold tracking-wide"
            style={{ background: T.panel, color: T.text, border: `1px solid ${T.border}` }}>
            Initializing dual voice engine…
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify build and visual check**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Open `http://localhost:3000/lab/mod`. Desktop: Voice1|Mod|Voice2 horizontal in card. Mobile: same layout rotated.

- [ ] **Step 3: Commit**

```bash
git add src/components/synths/osci-mod.tsx
git commit -m "feat: refactor osci-mod to SynthShell layout"
```

---

## Task 8: Refactor `osci-wave.tsx`

**Files:**
- Modify: `src/components/synths/osci-wave.tsx`

**Control layout:** Waveform display at top of controls (height 80px desktop, 44px mobile), then 8-button waveform selector grid below, then a row of panels (Unison, Envelope, Master). On mobile this row becomes a 3-col grid.

- [ ] **Step 1: Replace the full file**

```tsx
"use client";

import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Knob } from "./shared/knob";
import { SynthKeyboard } from "./shared/keyboard";
import { WaveformDisplay } from "./shared/waveform-display";
import { SynthShell } from "./shared/synth-shell";
import { SYNTH_CONFIGS } from "./configs";

const C = SYNTH_CONFIGS["osci-wave"];
const T = C.theme;

const WAVEFORMS = [
  { id: "sine", label: "Sine", path: "M0 20 Q12 2 24 20 Q36 38 48 20" },
  { id: "square", label: "Square", path: "M0 8 L0 32 L24 32 L24 8 L48 8" },
  { id: "sawtooth", label: "Saw", path: "M0 32 L24 8 L24 32 L48 8" },
  { id: "triangle", label: "Tri", path: "M0 32 L12 8 L24 32 L36 8 L48 32" },
  { id: "fatsine", label: "FatSin", path: "M0 20 Q6 4 12 20 Q18 36 24 20 Q30 4 36 20 Q42 36 48 20" },
  { id: "fatsquare", label: "FatSq", path: "M0 10 L0 30 L20 30 L20 10 L28 10 L28 30 L48 30 L48 10" },
  { id: "fatsawtooth", label: "FatSaw", path: "M0 30 L16 8 L16 30 L32 8 L32 30 L48 8" },
  { id: "fattriangle", label: "FatTri", path: "M0 30 L8 8 L16 30 L24 8 L32 30 L40 8 L48 30" },
] as const;

export function OsciWave() {
  const { params, isReady, setParam, noteOn, noteOff, getWaveform } =
    useSynthEngine({
      engineType: C.engineType,
      engineConfig: C.engineConfig,
      defaultParams: C.defaultParams,
      allParams: C.allParams,
    });

  const { isStarted, startAudio } = useAudioContext();
  const { isMobile, mobileKeyWidth } = useBreakpoint();

  const wave = (params["oscillator.type"] as string) ?? "fatsawtooth";
  const p = (key: string) => (params[key] as number) ?? 0;
  const ks = (n: number) => (isMobile ? Math.round(n * 0.85) : n);

  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: T.border }}>
      <div>
        <h1 className="text-xl font-black tracking-tight" style={{ color: T.accent }}>OSCI WAVE</h1>
        <p className="text-xs mt-0.5 font-medium" style={{ color: T.dim }}>Wavetable-Style Synthesizer</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono" style={{ color: T.dim }}>
          voices: <span style={{ color: T.accent }}>{Math.round(p("oscillator.count"))}</span>
          {" "}· spread: <span style={{ color: T.accent }}>{Math.round(p("oscillator.spread"))} ct</span>
        </span>
        {!isStarted ? (
          <button onClick={startAudio} className="px-3 py-1.5 rounded-lg text-sm font-bold"
            style={{ background: T.accent, color: T.bg }}>Enable</button>
        ) : (
          <div className="w-2.5 h-2.5 rounded-full"
            style={{ background: T.accent, boxShadow: `0 0 10px ${T.accent}` }} />
        )}
      </div>
    </div>
  );

  const controls = (
    <div className={isMobile ? "p-3" : "p-4"}>
      {/* Waveform display */}
      <div className="rounded-2xl overflow-hidden mb-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <WaveformDisplay getData={getWaveform} width={900} height={isMobile ? 44 : 80}
          color={T.accent} lineWidth={2} className="w-full" />
      </div>

      {/* 8-button waveform selector */}
      <div className={`grid gap-2 mb-3 ${isMobile ? "grid-cols-8" : "grid-cols-4 sm:grid-cols-8"}`}>
        {WAVEFORMS.map((w) => {
          const active = wave === w.id;
          return (
            <button key={w.id} onClick={() => setParam("oscillator.type", w.id)}
              className="flex flex-col items-center gap-1 py-2 rounded-xl transition-all"
              style={{
                background: active ? `${T.accent}18` : T.panel,
                border: `1.5px solid ${active ? T.accent : T.border}`,
              }}>
              <svg width={isMobile ? 28 : 36} height={isMobile ? 24 : 30} viewBox="0 0 48 40" fill="none">
                <path d={w.path} stroke={active ? T.accent : T.dim}
                  strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              {!isMobile && (
                <span className="text-xs font-bold" style={{ color: active ? T.accent : T.dim, fontSize: 9 }}>{w.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Unison + Envelope + Volume row */}
      <div className={`flex gap-3 flex-wrap`}>
        <div className="rounded-xl p-3" style={{ background: T.panel, border: `1px solid ${T.border}` }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: T.dim }}>Unison</p>
          <div className="flex gap-3">
            <Knob value={p("oscillator.spread")} min={0} max={100} step={1} label="Spread" unit="ct"
              onChange={(v) => setParam("oscillator.spread", v)} color={T.accent}
              trackColor={`${T.accent}20`} textColor={T.dim} size={ks(48)} />
            <Knob value={p("oscillator.count")} min={1} max={8} step={1} label="Voices"
              onChange={(v) => setParam("oscillator.count", Math.round(v))} color={T.accent2}
              trackColor={`${T.accent}20`} textColor={T.dim} size={ks(48)}
              formatValue={(v) => Math.round(v).toString()} />
          </div>
        </div>

        <div className="rounded-xl p-3 flex-1" style={{ background: T.panel, border: `1px solid ${T.border}` }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: T.dim }}>Envelope</p>
          <div className="flex gap-4 justify-around">
            {(["attack", "decay", "sustain", "release"] as const).map((stage) => {
              const key = `envelope.${stage}`;
              const max = stage === "release" ? 5 : stage === "sustain" ? 1 : 2;
              return (
                <Knob key={key} value={p(key)} min={stage === "attack" ? 0.001 : 0.01} max={max}
                  step={stage === "attack" ? 0.001 : 0.01}
                  label={stage.slice(0, 3).toUpperCase()} unit={stage !== "sustain" ? "s" : undefined}
                  onChange={(v) => setParam(key, v)} color={T.accent}
                  trackColor={`${T.accent}20`} textColor={T.dim} size={ks(48)} />
              );
            })}
          </div>
        </div>

        <div className="rounded-xl p-3 flex flex-col items-center justify-center" style={{ background: T.panel, border: `1px solid ${T.border}` }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: T.dim }}>Master</p>
          <Knob value={p("volume")} min={-40} max={6} step={1} label="Vol" unit="dB"
            onChange={(v) => setParam("volume", v)} color={T.accent}
            trackColor={`${T.accent}20`} textColor={T.dim} size={ks(48)} />
        </div>
      </div>
    </div>
  );

  const keyboard = (
    <div className="px-4 py-3 flex justify-center overflow-x-auto">
      <SynthKeyboard
        onNoteOn={noteOn} onNoteOff={noteOff}
        startOctave={3} octaves={isMobile ? 2 : 3}
        whiteKeyWidth={isMobile ? mobileKeyWidth : 24}
        whiteKeyHeight={isMobile ? 80 : 72}
        whiteColor="#f0fff4" blackColor={T.surface}
        activeColor={T.accent} borderColor={T.border} showKeyLabels
      />
    </div>
  );

  return (
    <>
      <SynthShell isMobile={isMobile} theme={T} header={header} controls={controls} keyboard={keyboard} />
      {!isReady && isStarted && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70">
          <div className="px-8 py-4 rounded-xl text-sm font-bold"
            style={{ background: T.panel, color: T.accent, border: `1px solid ${T.border}` }}>
            Loading…
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify build and visual check**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Open `http://localhost:3000/lab/wave`. Desktop: waveform display, 8-col wave selector, controls row in card. Mobile: all rotated, 8 wave buttons in single row.

- [ ] **Step 3: Commit**

```bash
git add src/components/synths/osci-wave.tsx
git commit -m "feat: refactor osci-wave to SynthShell layout"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Full lint check**

```bash
npm run lint
```

Expected: no errors. Fix any lint issues before continuing.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: ✓ Compiled successfully. No TypeScript errors.

- [ ] **Step 3: Test each synth in dev — desktop**

```bash
npm run dev
```

For each URL, verify on a 1280px+ wide viewport:
- `http://localhost:3000/lab/mono` — card centered, page bg visible, keyboard at bottom
- `http://localhost:3000/lab/sub` — card centered, spectrum visible in controls, keyboard at bottom
- `http://localhost:3000/lab/fm` — card centered, carrier|center|mod layout
- `http://localhost:3000/lab/mod` — card centered, voice1|mod|voice2 layout
- `http://localhost:3000/lab/wave` — card centered, waveform + 8 selectors + controls row

- [ ] **Step 4: Test each synth — mobile (DevTools)**

In Chrome DevTools: set device to iPhone 14 (390×844). For each `/lab/*` URL:
- Synth fills portrait viewport rotated (controls visible, keyboard at bottom of landscape)
- No scroll needed to reach keyboard
- Tilt head clockwise → reads correctly as landscape

- [ ] **Step 5: Verify audio works on mobile layout**

In mobile DevTools: tap the "Enable Audio" button. Play notes on the keyboard. Confirm `noteOn`/`noteOff` fire (sound or console confirm).

- [ ] **Step 6: Add `.superpowers/` to `.gitignore`**

```bash
echo ".superpowers/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore .superpowers/ brainstorm artifacts"
```
