---
title: Synth 1 — Spectrum Analyzer, Keyboard Binding, Mobile Tabs
date: 2026-04-21
status: approved
---

# Synth 1 Upgrades

Applies to `src/app/temp-synths/1/page.tsx` and related files.

## 1. Spectrum Analyzer (both views)

**New component:** `src/app/temp-synths/spectrum-canvas.tsx`

- Renders FFT frequency data as vertical bars on a log-scaled x-axis (20Hz–18kHz)
- Overlays a computed lowpass filter response curve (orange) in real time
  - Flat at 0dB up to `filterFreq`, then -12dB/oct rolloff (2nd-order lowpass approximation)
  - Curve redraws every frame as `filterFreq` prop changes
- Uses `getFFT(): Float32Array` — new method on `Synth1Engine` using existing `AnalyserNode.getFloatFrequencyData()`
- Canvas sized to match `WaveformCanvas` (same height, same container slot)

**Engine change:** Add `getFFT()` to `Synth1Engine`:
```ts
getFFT(): Float32Array {
  const buf = new Float32Array(this.analyser.frequencyBinCount);
  this.analyser.getFloatFrequencyData(buf);
  return buf;
}
```
Expose `sampleRate` and `fftSize` as getters so `SpectrumCanvas` can map bin index → Hz.

**Both views:** Waveform + spectrum displayed side-by-side, equal width, same height.

## 2. Desktop — 2 octaves + octave navigation

- `startOctave` becomes React state (default 3, min 1, max 6)
- Keyboard renders exactly 2 octaves (down from 3)
- `−` / `+` buttons flank an octave label (e.g. `Oct 3–4`) rendered inline above the keyboard
- Buttons disabled at min/max bounds

## 3. Desktop — computer keyboard binding

- `useEffect` in `Synth1Page` with `keydown` / `keyup` listeners on `window`
- Key map derived from existing `QWERTY_LABELS` in `PianoKeyboard`, shifted by `(startOctave − 4)` octaves so binding tracks current octave navigation
- `activeNotes` state tracked in page, passed to `PianoKeyboard` so keys light up on keyboard press
- Prevent default on matched keys to avoid browser shortcuts

## 4. Mobile header — compact

- Title font-size: 13px (down from 16px), subtitle 9px (down from 11px)
- Waveform + spectrum height: 44px (down from 60px)
- Header padding reduced to 8px 12px

## 5. Mobile controls — tabs

- Tab bar: `OSC` / `FILTER` / `ENV` / `FX`
- Active tab: underline in `var(--primary)`, text `var(--foreground)`
- Inactive tab: `var(--muted-foreground)`
- Each tab renders its section content full-height, no scroll
- `activeTab` state (default `"osc"`) in `Synth1Page`
- Keyboard section: unchanged

## Files touched

| File | Change |
|------|--------|
| `src/app/temp-synths/1/engine.ts` | Add `getFFT()`, expose `sampleRate` + `fftSize` getters |
| `src/app/temp-synths/spectrum-canvas.tsx` | New component |
| `src/app/temp-synths/1/page.tsx` | All layout changes, keyboard binding, octave state, tab state |
| `src/components/synth/piano-keyboard.tsx` | Accept `whiteKeyWidth` + `whiteKeyHeight` props (already there), no other changes needed |

## Out of scope

- Other synths (2–5) — separate sessions
- Keyboard binding on mobile
- Persist octave preference across sessions
