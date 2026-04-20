# Synth Layout Redesign

**Date:** 2026-04-21  
**Scope:** All 5 synth components (`osci-mono`, `osci-sub`, `osci-fm`, `osci-mod`, `osci-wave`)  
**Status:** Approved

---

## Problem

All 5 synths use `min-h-screen flex flex-col`. Controls stack vertically and push the keyboard below the viewport. Users must scroll down to reach the keyboard — breaking the play experience.

---

## Approved Design

### Desktop (≥ 1024px)

- Synth renders as a **centered fixed-width card** (520px) with page background visible above and below — hardware-on-desk feel.
- Outer page: `min-h-screen flex items-center justify-center` with page background showing.
- Card: `w-[520px] flex flex-col rounded-xl overflow-hidden shadow-2xl border`.
- Header: fixed height, contains synth name + visualizers (waveform/spectrum displays — untouched).
- Controls: `2-column CSS grid` of section panels, `overflow-y-auto flex-1`. Panels pack tightly.
- Keyboard: **pinned at bottom** of card, `flex-shrink-0`, 3 octaves, `whiteKeyWidth={24}` (fits 520px).
- No full-page scroll. If controls overflow the card height, only the controls panel scrolls internally.

### Mobile (< 768px) — CSS Rotation Trick

- Synth is designed at **landscape dimensions**: `100vh wide × 100vw tall`.
- A wrapper div applies `transform: rotate(-90deg)` with `transform-origin: center center`, positioned to fill the portrait viewport exactly.
- User holds phone in portrait → synth appears sideways. User tilts phone clockwise → reads as landscape. No OS rotation lock bypass, no prompt required.
- Layout inside the landscape canvas:
  - **Header**: slim bar across full landscape width, synth name + compact visualizer + audio toggle.
  - **Controls**: `flex-1 overflow-y-auto` middle section, 4-column grid of compact panels (same sections as desktop but smaller knobs).
  - **Keyboard**: `flex-shrink-0` pinned at landscape bottom (= right side of portrait), 2 octaves, `whiteKeyWidth` sized to fill landscape width minus padding.
- Keyboard always visible. Controls scroll internally if overflow.

### Tablet (768px–1023px)

Uses desktop layout at narrower card width: `w-[480px]`. Same 2-col control grid, 3-octave keyboard. Page background still visible on sides.

---

## What Does NOT Change

- All synth engine logic (`useSynthEngine`, `setParam`, `noteOn`, `noteOff`) — untouched.
- Visual graph components: `WaveformDisplay`, `SpectrumDisplay` — untouched, same props.
- `SynthKeyboard` component — untouched. Only `whiteKeyWidth`, `whiteKeyHeight`, `octaves` props change per breakpoint.
- Knob values, ranges, labels — untouched.
- Theme colors (`T.bg`, `T.accent`, etc.) — untouched.
- Section labels and panel structure — untouched, just rearranged into grid.

---

## Implementation Strategy

Each synth component gets:

1. **Breakpoint detection**: `useBreakpoint` hook (new, `src/hooks/use-breakpoint.ts`) returns `isMobile: boolean` (`window.innerWidth < 768`). Must be JS-driven — the rotation trick cannot be expressed in Tailwind alone. Tablet vs desktop distinction (`≥ 1024px`) can use Tailwind `lg:` prefix on card width.
2. **Desktop wrapper**: replaces `min-h-screen flex flex-col` with centered card pattern.
3. **Mobile wrapper**: `fixed inset-0 overflow-hidden` container + inner div at landscape dimensions + `rotate(-90deg)` transform.
4. **Shared layout shell**: new `SynthShell` component at `src/components/synths/shared/synth-shell.tsx`. API is named React props: `header: ReactNode`, `controls: ReactNode`, `keyboard: ReactNode`. Handles desktop/mobile layout branching internally. Each synth renders its own sections and passes them in — avoids duplicating layout logic across 5 files.
5. **Knob sizes on mobile**: pass `size={Math.round(originalSize * 0.85)}` to each `Knob` on mobile. Original sizes range 44–64px; mobile range becomes 37–54px.
6. **Keyboard props per breakpoint**:
   - Desktop/tablet: `octaves={3}`, `whiteKeyWidth={24}`, `whiteKeyHeight={72}`
   - Mobile: `octaves={2}`, `whiteKeyWidth={Math.floor((window.innerHeight - 16) / 14)}`, `whiteKeyHeight={80}` — uses `window.innerHeight` because landscape width = portrait height when rotated.

---

## CSS Rotation Math

Portrait viewport: `vw × vh` (e.g., 390 × 844).  
Landscape canvas target: `vh × vw` (e.g., 844 × 390).

```css
.mobile-rotated-inner {
  position: absolute;
  width: 100vh;   /* landscape width = portrait height */
  height: 100vw;  /* landscape height = portrait width */
  top: 50%;
  left: 50%;
  margin-top: calc(-50vw);   /* -height/2 */
  margin-left: calc(-50vh);  /* -width/2 */
  transform: rotate(-90deg);
  transform-origin: center center;
}
```

---

## Files Affected

| File | Change |
|------|--------|
| `src/components/synths/osci-mono.tsx` | Wrap in `SynthShell`, adjust keyboard props |
| `src/components/synths/osci-sub.tsx` | Same |
| `src/components/synths/osci-fm.tsx` | Same |
| `src/components/synths/osci-mod.tsx` | Same |
| `src/components/synths/osci-wave.tsx` | Same |
| `src/components/synths/shared/synth-shell.tsx` | **New** — layout shell component |
| `src/hooks/use-breakpoint.ts` | **New** — `isMobile` boolean hook (`< 768px`) |

No database changes. No API changes. No route changes.
