"use client";

/**
 * Korg Volca Keys — front-end recreation.
 * All controls are interactive (drag knobs, click buttons) but no audio yet.
 * Colors entirely via CSS variables → adapts to all 4 themes automatically.
 *
 * Controls (matching real hardware):
 *   VCO   — Detune, Portamento
 *   VCF   — Cutoff, Peak, EG Int, LFO Int
 *   VCA   — Attack, Decay/Release
 *   LFO   — Rate, Pitch Int
 *   DELAY — Time, Feedback, Level
 *   VOICE — Poly / Unison / Octave
 *   RING  — Ring Modulator on/off
 *   16-step sequencer LED bar
 *   27-key mini keyboard (C3 – D5)
 */

import { useState, useCallback, useRef } from "react";

// ─── Drag hook (inline, no audio deps) ───────────────────────────────────────

function useKnobDrag(
  value: number,
  min: number,
  max: number,
  onChange: (v: number) => void
) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef({ startY: 0, startVal: value });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);
      ref.current = { startY: e.clientY, startVal: value };
      setDragging(true);
    },
    [value]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const dy = ref.current.startY - e.clientY;
      const factor = e.shiftKey ? 0.1 : 1;
      const raw = ref.current.startVal + (dy / 120) * (max - min) * factor;
      onChange(Math.round(Math.max(min, Math.min(max, raw))));
    },
    [dragging, min, max, onChange]
  );

  const onPointerUp = useCallback(() => setDragging(false), []);

  return { dragging, onPointerDown, onPointerMove, onPointerUp };
}

// ─── Arc geometry ─────────────────────────────────────────────────────────────

const A0 = (-145 * Math.PI) / 180;
const A1 = (145 * Math.PI) / 180;

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  return `M${s.x.toFixed(2)} ${s.y.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

// ─── Knob ─────────────────────────────────────────────────────────────────────

interface KnobProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  size?: number;
  /** display value as +/- centered on 64 */
  bipolar?: boolean;
}

function Knob({ label, value, min = 0, max = 127, onChange, size = 44, bipolar }: KnobProps) {
  const { dragging, onPointerDown, onPointerMove, onPointerUp } = useKnobDrag(value, min, max, onChange);
  const norm = (value - min) / (max - min);
  const cx = size / 2, cy = size / 2;
  const rOuter = size / 2 - 2;
  const rInner = rOuter * 0.68;

  // indicator line endpoint (on the outer edge of inner circle)
  const indicatorAngle = A0 + norm * (A1 - A0);
  const tip = polar(cx, cy, rInner - 1, indicatorAngle);

  const displayVal = bipolar ? String(value - 64) : String(value);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        userSelect: "none", touchAction: "none", cursor: dragging ? "ns-resize" : "ns-resize" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <svg width={size} height={size} style={{ display: "block", overflow: "visible" }}>
        {/* Track */}
        <path d={arc(cx, cy, rOuter, A0, A1)} fill="none" stroke="var(--border)" strokeWidth={1.5} strokeLinecap="round" />
        {/* Value fill */}
        {norm > 0.01 && (
          <path
            d={arc(cx, cy, rOuter, A0, A0 + norm * (A1 - A0))}
            fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinecap="round"
          />
        )}
        {/* Knob body */}
        <circle cx={cx} cy={cy} r={rInner} fill="var(--card)" stroke="var(--border)" strokeWidth={1.5} />
        {/* Indicator dot */}
        <circle cx={tip.x} cy={tip.y} r={2.5}
          fill={dragging ? "var(--primary)" : "var(--foreground)"} />
      </svg>
      {/* Value readout */}
      <span style={{ fontSize: 9, fontWeight: 700, color: dragging ? "var(--primary)" : "var(--foreground)",
        fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em", minWidth: 24, textAlign: "center" }}>
        {displayVal}
      </span>
      {/* Label */}
      <span style={{ fontSize: 7.5, fontWeight: 700, color: "var(--muted-foreground)",
        letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center",
        lineHeight: 1.2, maxWidth: size + 12 }}>
        {label}
      </span>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Section label */}
      <div style={{ fontSize: 7, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.3em",
        textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Voice mode button ────────────────────────────────────────────────────────

function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        background: active ? "var(--primary)" : "var(--muted)",
        color: active ? "var(--primary-foreground)" : "var(--muted-foreground)",
        border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
        fontSize: 9, fontWeight: 700, cursor: "pointer",
        letterSpacing: "0.12em", textTransform: "uppercase",
        fontFamily: "inherit",
        transition: "all 0.1s",
      }}
    >
      {label}
    </button>
  );
}

// ─── Mini keyboard ────────────────────────────────────────────────────────────

// C3 to D5 = 27 chromatic notes
// White keys: C3 D3 E3 F3 G3 A3 B3 | C4 D4 E4 F4 G4 A4 B4 | C5 D5  = 16
// Black keys at white-index positions: 0.5,1.5, 3.5,4.5,5.5 per octave + 0.5 in last partial
const WHITE_NOTES = [
  "C3","D3","E3","F3","G3","A3","B3",
  "C4","D4","E4","F4","G4","A4","B4",
  "C5","D5",
];
// [whiteIndex offset from octave start, label]
const BLACK_OFFSETS = [0.5,1.5,3.5,4.5,5.5]; // within each 7-white-key octave

function MiniKeyboard() {
  const [active, setActive] = useState<string | null>(null);
  const WW = 22, WH = 64, BW = 13, BH = 40;
  const totalWidth = WHITE_NOTES.length * WW;

  // Build black key positions
  const blackKeys: { x: number; note: string }[] = [];
  const blackNames = ["C#","D#","F#","G#","A#"];
  [0, 7].forEach((octaveWhiteStart, octaveIdx) => {
    const octaveNum = 3 + octaveIdx;
    BLACK_OFFSETS.forEach((offset, bi) => {
      const whiteIdx = octaveWhiteStart + offset;
      // only include if within the 16 white keys range
      if (whiteIdx < WHITE_NOTES.length - 0.5) {
        blackKeys.push({
          x: whiteIdx * WW - BW / 2,
          note: `${blackNames[bi]}${octaveNum}`,
        });
      }
    });
  });
  // Last partial octave (C5 D5): only C#5
  blackKeys.push({ x: 14.5 * WW - BW / 2, note: "C#5" });

  return (
    <div style={{ position: "relative", width: totalWidth, height: WH, flexShrink: 0 }}>
      {/* White keys */}
      {WHITE_NOTES.map((note, i) => (
        <div
          key={note}
          onMouseDown={() => setActive(note)}
          onMouseUp={() => setActive(null)}
          onMouseLeave={() => active === note && setActive(null)}
          style={{
            position: "absolute",
            left: i * WW,
            top: 0,
            width: WW - 1,
            height: WH,
            background: active === note ? "var(--primary)" : "var(--card)",
            border: "1px solid var(--border)",
            borderTop: "2px solid var(--border)",
            cursor: "pointer",
            transition: "background 0.05s",
          }}
        />
      ))}
      {/* Black keys */}
      {blackKeys.map(({ x, note }) => (
        <div
          key={note}
          onMouseDown={(e) => { e.stopPropagation(); setActive(note); }}
          onMouseUp={() => setActive(null)}
          style={{
            position: "absolute",
            left: x,
            top: 0,
            width: BW,
            height: BH,
            background: active === note ? "var(--primary)" : "var(--foreground)",
            border: "1px solid var(--border)",
            cursor: "pointer",
            zIndex: 2,
            transition: "background 0.05s",
          }}
        />
      ))}
    </div>
  );
}

// ─── Step sequencer LED bar ───────────────────────────────────────────────────

// 16 steps — a few lit for visual flavour
const DEFAULT_PATTERN = [true,false,false,false, true,false,true,false, false,false,true,false, true,false,false,true];

function StepLEDs() {
  const [steps, setSteps] = useState(DEFAULT_PATTERN);
  const toggle = (i: number) => setSteps(s => s.map((v, j) => j === i ? !v : v));

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {steps.map((on, i) => (
        <button
          key={i}
          onClick={() => toggle(i)}
          style={{
            width: 14, height: 10,
            background: on ? "var(--primary)" : "var(--muted)",
            border: "1px solid var(--border)",
            cursor: "pointer",
            padding: 0,
            opacity: on ? 1 : 0.4,
            transition: "all 0.1s",
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const INIT = {
  vco_detune: 64, vco_portamento: 0,
  vcf_cutoff: 80, vcf_peak: 10, vcf_eg_int: 64, vcf_lfo_int: 0,
  vca_attack: 20, vca_decay: 64,
  lfo_rate: 40, lfo_pitch_int: 0,
  delay_time: 0, delay_feedback: 0, delay_level: 0,
};

type ParamKey = keyof typeof INIT;

export function VolcaKeys() {
  const [params, setParams] = useState(INIT);
  const [voiceMode, setVoiceMode] = useState<"poly" | "unison" | "octave">("poly");
  const [ringMod, setRingMod] = useState(false);

  const set = (key: ParamKey) => (v: number) =>
    setParams(p => ({ ...p, [key]: v }));

  return (
    <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>

      {/* ── Chassis ── */}
      <div style={{
        width: "100%", maxWidth: 920,
        background: "var(--card)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}>

        {/* Top accent bar */}
        <div style={{ height: 4, background: "var(--primary)" }} />

        {/* Brand strip */}
        <div style={{
          padding: "10px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: "var(--foreground)", letterSpacing: "0.1em" }}>
              KORG
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.2em", textTransform: "lowercase" }}>
              volca keys
            </span>
          </div>

          {/* Step sequencer */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <StepLEDs />
            <span style={{ fontSize: 7, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.25em", textTransform: "uppercase" }}>
              16 Step Sequencer
            </span>
          </div>

          {/* MIDI channel display */}
          <div style={{
            background: "var(--muted)", border: "1px solid var(--border)",
            padding: "4px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2
          }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: "var(--primary)", fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em" }}>
              01
            </span>
            <span style={{ fontSize: 7, color: "var(--muted-foreground)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              MIDI CH
            </span>
          </div>
        </div>

        {/* ── Control panel ── */}
        <div style={{
          padding: "20px 24px 16px",
          display: "flex",
          alignItems: "flex-start",
          gap: 0,
          borderBottom: "1px solid var(--border)",
          overflowX: "auto",
        }}>

          {/* Divider helper */}
          {([
            // VCO
            <Section key="vco" label="VCO">
              <Knob label="Detune"     value={params.vco_detune}    onChange={set("vco_detune")}    bipolar />
              <Knob label="Porta"      value={params.vco_portamento} onChange={set("vco_portamento")} />
            </Section>,

            <div key="d1" style={{ width: 1, background: "var(--border)", alignSelf: "stretch", margin: "0 16px" }} />,

            // VCF
            <Section key="vcf" label="VCF">
              <Knob label="Cutoff"  value={params.vcf_cutoff}   onChange={set("vcf_cutoff")} />
              <Knob label="Peak"    value={params.vcf_peak}     onChange={set("vcf_peak")} />
              <Knob label="EG Int"  value={params.vcf_eg_int}   onChange={set("vcf_eg_int")}   bipolar />
              <Knob label="LFO Int" value={params.vcf_lfo_int}  onChange={set("vcf_lfo_int")} />
            </Section>,

            <div key="d2" style={{ width: 1, background: "var(--border)", alignSelf: "stretch", margin: "0 16px" }} />,

            // VCA
            <Section key="vca" label="VCA">
              <Knob label="Attack"       value={params.vca_attack}  onChange={set("vca_attack")} />
              <Knob label="Decay / Rel"  value={params.vca_decay}   onChange={set("vca_decay")} />
            </Section>,

            <div key="d3" style={{ width: 1, background: "var(--border)", alignSelf: "stretch", margin: "0 16px" }} />,

            // LFO
            <Section key="lfo" label="LFO">
              <Knob label="Rate"      value={params.lfo_rate}       onChange={set("lfo_rate")} />
              <Knob label="Pitch Int" value={params.lfo_pitch_int}  onChange={set("lfo_pitch_int")} />
            </Section>,

            <div key="d4" style={{ width: 1, background: "var(--border)", alignSelf: "stretch", margin: "0 16px" }} />,

            // DELAY
            <Section key="delay" label="Delay">
              <Knob label="Time"     value={params.delay_time}      onChange={set("delay_time")} />
              <Knob label="Feedback" value={params.delay_feedback}  onChange={set("delay_feedback")} />
              <Knob label="Level"    value={params.delay_level}     onChange={set("delay_level")} />
            </Section>,
          ])}

        </div>

        {/* ── Voice mode + Ring mod strip ── */}
        <div style={{
          padding: "10px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <span style={{ fontSize: 7, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.25em", textTransform: "uppercase", marginRight: 4 }}>
            Voice
          </span>
          <ModeButton label="Poly"   active={voiceMode === "poly"}   onClick={() => setVoiceMode("poly")} />
          <ModeButton label="Unison" active={voiceMode === "unison"} onClick={() => setVoiceMode("unison")} />
          <ModeButton label="Octave" active={voiceMode === "octave"} onClick={() => setVoiceMode("octave")} />

          <div style={{ width: 1, background: "var(--border)", height: 24, margin: "0 8px" }} />

          <button
            onClick={() => setRingMod(r => !r)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px",
              background: ringMod ? "var(--primary)" : "var(--muted)",
              color: ringMod ? "var(--primary-foreground)" : "var(--muted-foreground)",
              border: `1px solid ${ringMod ? "var(--primary)" : "var(--border)"}`,
              fontSize: 9, fontWeight: 700, cursor: "pointer",
              letterSpacing: "0.12em", textTransform: "uppercase",
              fontFamily: "inherit",
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: ringMod ? "var(--primary-foreground)" : "var(--muted-foreground)",
            }} />
            Ring Mod
          </button>

          {/* Current mode readout */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 24 }}>
            {Object.entries(params).map(([k, v]) => null)}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: "var(--muted-foreground)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Voice Mode
              </div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--primary)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {voiceMode}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: "var(--muted-foreground)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Ring Mod
              </div>
              <div style={{ fontSize: 11, fontWeight: 900, color: ringMod ? "var(--primary)" : "var(--muted-foreground)", letterSpacing: "0.08em" }}>
                {ringMod ? "On" : "Off"}
              </div>
            </div>
          </div>
        </div>

        {/* ── Keyboard ── */}
        <div style={{
          padding: "16px 24px 20px",
          display: "flex",
          justifyContent: "center",
          background: "var(--background)",
          overflowX: "auto",
        }}>
          <MiniKeyboard />
        </div>

      </div>

      {/* Shift+drag tip */}
      <p style={{ marginTop: 16, fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.08em" }}>
        Drag knobs up/down to adjust · Hold <kbd style={{ padding: "1px 5px", border: "1px solid var(--border)", background: "var(--muted)", fontSize: 9 }}>Shift</kbd> for fine control
      </p>
    </div>
  );
}
