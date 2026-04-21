# Synth 1 Hardware Redesign Spec

## Goal

Create a hardware-aesthetic variant of The Starter synth at `/temp-synths/1-hardware`. Identical audio engine and controls to synth 1. Visual redesign only: dark precision chassis (Elektron-inspired) with a 3D physical body using the "visible top face" technique.

## Route

- Path: `src/app/temp-synths/1-hardware/page.tsx`
- URL: `/temp-synths/1-hardware`
- Separate page — synth 1 at `/temp-synths/1` is unchanged

## Engine

Import and reuse `Synth1Engine` from `../1/engine.ts` with zero modifications. All audio functionality is identical: oscillator, lowpass filter, ADSR envelope, reverb, compressor, master gain.

## Color Palette

| Token | Value | Use |
|---|---|---|
| `--hw-bg` | `#0a0a0a` | Page background |
| `--hw-chassis` | `#181818` | Chassis gradient start |
| `--hw-chassis-dark` | `#0e0e0e` | Chassis gradient end |
| `--hw-face` | `#0f0f0f` | Faceplate surface |
| `--hw-panel` | `#0a0a0a` | Section panel background |
| `--hw-border` | `#1e1e1e` | Panel borders |
| `--hw-accent` | `#00d4ff` | Cyan — sole accent color |
| `--hw-text` | `#ffffff` | Primary text |
| `--hw-muted` | `#404040` | Muted labels |
| `--hw-key` | `#e0e0e0` | White piano key color |

All values are inline CSS on the page — no globals modified.

## Desktop Layout

### Outer wrapper
Full-viewport centering: `display:flex; align-items:center; justify-content:center; min-height:calc(100dvh - 48px); background:#0a0a0a`.

### Chassis — 3D body (Option C)

Three-layer stack that creates physical depth:

**1. Top face panel** (visible lid above faceplate)
```css
height: 18px;
background: linear-gradient(180deg, #2e2e2e, #1e1e1e);
border-radius: 12px 12px 0 0;
border: 1px solid #3a3a3a;
border-bottom: none;
box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
transform: perspective(500px) rotateX(-18deg) scaleY(0.55);
transform-origin: bottom center;
margin-bottom: -1px;
```

**2. Chassis body** (front face)
```css
background: linear-gradient(175deg, #1e1e1e 0%, #141414 60%, #0e0e0e 100%);
border-radius: 0 0 10px 10px;
border: 1px solid #282828;
border-top: 1px solid #3a3a3a;
box-shadow:
  inset 0 1px 0 rgba(255,255,255,0.04),
  -5px 0 0 #0c0c0c,
  5px 0 0 #0c0c0c,
  0 5px 0 #080808,
  0 7px 0 #060606,
  0 9px 0 #040404,
  0 18px 50px rgba(0,0,0,0.95);
width: 760px;
```

**3. Faceplate** (recessed inner panel)
```css
margin: 14px;
background: #0f0f0f;
border-radius: 6px;
border: 1px solid #1a1a1a;
box-shadow: inset 0 2px 10px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.02);
padding: 16px 18px;
```

### Header (inside faceplate)

Flex row, `justify-content: space-between`, `align-items: center`, `border-bottom: 1px solid #1a1a1a`, `padding-bottom: 14px`, `margin-bottom: 14px`.

Left side:
- `"THE STARTER"` — 13px, weight 900, letter-spacing 0.3em, white, `font-family: Arial`
- `"SYNTHESIZER · MK I"` — 7px, `#404040`, letter-spacing 0.25em

Center cluster (flex row, gap 10px):
- **OLED note display**: `background:#000; border:1px solid #1e1e1e; border-radius:3px; padding:5px 12px`. Text: `#00d4ff`, 16px monospace, letter-spacing 3px, `text-shadow: 0 0 8px rgba(0,212,255,0.5)`. Shows current note or `"---"` when silent.
- **Waveform canvas**: `WaveformCanvas` component, `width=200, height=48`. Same RAF loop.
- **Spectrum canvas**: `SpectrumCanvas` component, `width=200, height=48`. Same EQ curve.

Right side:
- Volume `Knob`: `size="sm"`, `min=0`, `max=1`, `step=0.01`, `label="VOL"`.

### Controls grid (inside faceplate)

`display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; margin-bottom:14px`

Each section panel:
```css
background: #0a0a0a;
border: 1px solid #1e1e1e;
border-top: 2px solid #00d4ff;
border-radius: 5px;
padding: 14px 12px;
text-align: center;
```

Section label (above each panel):
```css
font-size: 9px; font-weight: 700; letter-spacing: 0.3em;
color: #404040; font-family: Arial; text-transform: uppercase;
margin-bottom: 12px; border-bottom: 1px solid #1a1a1a; padding-bottom: 8px;
```

**OSC panel**: `WaveformSelect size="md"`, options `["sine","square","sawtooth","triangle"]`.

**FILTER panel**: `Knob size="lg"`, `min=80`, `max=18000`, `step=10`, `scale="log"`, `label="TONE"`, `unit="Hz"`.

**ENV panel**: Two `Fader size="md"` side by side — Attack (0.001–2s) and Release (0.05–4s). Gap 28px.

**FX panel**: Hardware toggle button for reverb. Styled as a physical backlit switch:
```css
width: 56px; height: 22px; border-radius: 3px;
border: 1px solid (active: #00d4ff, inactive: #2a2a2a);
background: (active: #001a22, inactive: #0a0a0a);
box-shadow: (active: inset 0 0 8px rgba(0,212,255,0.3));
```
Label below: `"REVERB"`, 8px, `#404040`.

### Keyboard section (inside faceplate)

Outer: `background: #050505; border-radius: 5px; border: 1px solid #111; padding: 10px 8px 8px; box-shadow: inset 0 2px 6px rgba(0,0,0,0.5)`.

Octave nav (desktop): centered flex row. Buttons styled: `border:1px solid #2a2a2a; background:#111; color:#888; border-radius:3px; font-size:16px; padding:3px 10px`. Octave label: `color:#404040; font-size:12px`.

`PianoKeyboard`: `octaves=3`, `whiteKeyWidth=28`, `whiteKeyHeight=88`. Active notes: cyan (`var(--primary)` already maps to cyan in context of this page — use `activeNotes` prop as-is, active key highlight comes from the component's `bg-primary/30` class which will use the app's primary color).

Bottom rubber strip: `height:6px; background:linear-gradient(90deg,#080808,#111 20%,#111 80%,#080808); border-top:1px solid #080808`.

## Mobile Layout

Reuse `SynthShell` mobile mode (rotated landscape) identically to synth 1. Apply hardware color palette via inline `theme` prop:

```ts
const THEME = { bg: "#0a0a0a", border: "#1e1e1e", panel: "#0f0f0f" }
```

Header: same flex-row structure as synth 1 mobile (title left, canvases + vol knob right). Canvas sizes: 100×36. Title font: 13px, white.

Tab panels: same OSC/FILTER/ENV/FX tabs as synth 1 mobile. Section background `#0a0a0a`, border `1px solid #1e1e1e`.

## State & Handlers

Identical to synth 1 page:
- `waveform`, `filterFreq`, `attack`, `release`, `reverb`, `volume`, `startOctave`, `activeNotes`, `activeTab`
- All handlers (`handleWaveform`, `handleFilterFreq`, `handleAttack`, `handleRelease`, `handleReverb`, `handleVolume`)
- QWERTY keyboard bindings (desktop only, same `KEY_NOTE_MAP`)
- `analyserInfo` state for canvas props

## Note Display

Add `const [currentNote, setCurrentNote] = useState<string | null>(null)` state. Update `noteOn` handler to call `setCurrentNote(note)`, `noteOff` to call `setCurrentNote(null)`. Display in OLED widget as `currentNote ?? "---"`.

## No New Shared Components

The hardware shell, chassis, and faceplate are all inline JSX in page.tsx. The page is self-contained. Existing `Knob`, `Fader`, `WaveformSelect`, `PianoKeyboard`, `WaveformCanvas`, `SpectrumCanvas`, and `SynthShell` (mobile only) are all reused.
