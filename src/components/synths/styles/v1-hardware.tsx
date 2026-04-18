"use client";

/**
 * V1 — HARDWARE SKEUOMORPHIC
 * Looks and feels like a physical synthesizer panel.
 * Brushed metal, physical knobs with depth, screw details, LED indicators.
 */

import { useState } from "react";
import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { getParamDefs, groupParamDefs } from "@/lib/synth-engine";
import type { EngineType, ParamDef } from "@/lib/synth-engine";
import { SYNTH_CONFIGS, SYNTH_LIST, type SynthSlug } from "../configs";
import { SynthKeyboard } from "../shared/keyboard";
import { WaveformDisplay } from "../shared/waveform-display";
import { useDrag } from "./use-drag";

// --- SVG arc helpers ---
function polarToXY(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) };
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const s = polarToXY(cx, cy, r, a0);
  const e = polarToXY(cx, cy, r, a1);
  return `M${s.x.toFixed(2)} ${s.y.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}
const A0 = (-135 * Math.PI) / 180;
const A1 = (135 * Math.PI) / 180;

// --- Hardware Knob ---
function HwKnob({ def, value, onChange }: { def: ParamDef; value: number; onChange: (v: number) => void }) {
  const { dragging, bind } = useDrag({ value, min: def.min, max: def.max, step: def.step, onChange });
  const norm = Math.max(0, Math.min(1, (value - def.min) / (def.max - def.min)));
  const angle = -135 + norm * 270;
  const sz = 54;
  const cx = sz / 2 + 6;
  const cy = sz / 2 + 6;
  const r = sz / 2 + 2;

  const fmt = (v: number) =>
    Math.abs(v) >= 1000
      ? `${(v / 1000).toFixed(1)}k`
      : Math.abs(v) >= 10
        ? v.toFixed(1)
        : v.toFixed(2);

  return (
    <div
      className="flex flex-col items-center gap-1 select-none"
      style={{ touchAction: "none" }}
    >
      <div style={{ position: "relative", width: sz + 12, height: sz + 12 }}>
        {/* Range arc (outer ring) */}
        <svg
          style={{ position: "absolute", inset: 0 }}
          width={sz + 12}
          height={sz + 12}
        >
          <path d={arc(cx, cy, r, A0, A1)} fill="none" stroke="#333" strokeWidth={3} strokeLinecap="round" />
          {norm > 0.01 && (
            <path d={arc(cx, cy, r, A0, A0 + norm * (A1 - A0))} fill="none" stroke="#cc6600" strokeWidth={3} strokeLinecap="round" />
          )}
          {/* Tick marks */}
          {[0, 0.25, 0.5, 0.75, 1].map((n) => {
            const a = A0 + n * (A1 - A0);
            const inner = polarToXY(cx, cy, r - 5, a);
            const outer = polarToXY(cx, cy, r + 4, a);
            return (
              <line key={n} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#555" strokeWidth={1.5} />
            );
          })}
        </svg>

        {/* Knob body */}
        <div
          style={{
            position: "absolute",
            left: 6, top: 6,
            width: sz, height: sz,
            borderRadius: "50%",
            background: "radial-gradient(circle at 38% 32%, #666, #1a1a1a)",
            boxShadow: "0 4px 10px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.08) inset, 0 -2px 4px rgba(0,0,0,0.5) inset",
            cursor: dragging ? "ns-resize" : "pointer",
          }}
          {...(bind as React.HTMLAttributes<HTMLDivElement>)}
        >
          {/* Rotating pointer */}
          <div
            style={{
              position: "absolute",
              width: 3,
              height: sz * 0.38,
              background: "linear-gradient(to top, #cc6600, #ff9a00)",
              left: "50%",
              top: "50%",
              transformOrigin: "50% 100%",
              transform: `translateX(-50%) translateY(-100%) rotate(${angle}deg)`,
              borderRadius: "2px 2px 0 0",
              boxShadow: "0 0 4px #cc660080",
            }}
          />
          {/* Center dot */}
          <div
            style={{
              position: "absolute",
              width: 8, height: 8,
              borderRadius: "50%",
              background: "#333",
              border: "1px solid #555",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      </div>
      <span style={{ fontSize: 9, color: "#aa8866", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif" }}>
        {def.label}
      </span>
      <span style={{ fontSize: 8, color: "#777", fontFamily: "monospace" }}>
        {fmt(value)}{def.unit ? ` ${def.unit}` : ""}
      </span>
    </div>
  );
}

// --- Hardware Wave Selector ---
function HwWaveSelect({ def, value, onChange }: { def: ParamDef; value: string; onChange: (v: string) => void }) {
  const opts = def.options ?? [];
  const symbols: Record<string, string> = { sine: "∿", square: "⊓", sawtooth: "⩘", triangle: "∧", fatsine: "∿∿", fatsquare: "⊓⊓", fatsawtooth: "⩘⩘", fattriangle: "∧∧" };
  return (
    <div className="flex flex-col gap-1">
      <span style={{ fontSize: 9, color: "#aa8866", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif" }}>{def.label}</span>
      <div className="flex gap-1 flex-wrap">
        {opts.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              padding: "4px 7px",
              background: value === o ? "linear-gradient(to bottom, #cc7700, #994400)" : "linear-gradient(to bottom, #3a3a3a, #222)",
              color: value === o ? "#fff" : "#888",
              border: value === o ? "1px solid #cc7700" : "1px solid #333",
              borderRadius: 3,
              fontSize: 12,
              cursor: "pointer",
              boxShadow: value === o ? "0 0 6px #cc770040, inset 0 1px 0 rgba(255,255,255,0.1)" : "inset 0 1px 0 rgba(255,255,255,0.05)",
              fontFamily: "sans-serif",
            }}
          >
            {symbols[o] ?? o}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Hardware Fader (volume) ---
function HwFader({ def, value, onChange }: { def: ParamDef; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span style={{ fontSize: 9, color: "#aa8866", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif" }}>{def.label}</span>
      <div className="flex items-center gap-2">
        <div style={{ position: "relative", flex: 1, height: 14, background: "#111", borderRadius: 3, border: "1px solid #333", overflow: "hidden" }}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: `${Math.max(0, ((value - def.min) / (def.max - def.min)) * 100)}%`,
            background: "linear-gradient(to right, #663300, #cc7700)",
          }} />
          <input
            type="range" min={def.min} max={def.max} step={def.step} value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
          />
        </div>
        <span style={{ fontSize: 9, fontFamily: "monospace", color: "#888", whiteSpace: "nowrap" }}>
          {value.toFixed(0)}{def.unit ? def.unit : ""}
        </span>
      </div>
    </div>
  );
}

// --- Screw decoration ---
function Screw({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      width: 10, height: 10,
      borderRadius: "50%",
      background: "radial-gradient(circle at 40% 35%, #666, #2a2a2a)",
      border: "1px solid #1a1a1a",
      boxShadow: "0 1px 2px rgba(0,0,0,0.5)",
      position: "absolute",
      ...style,
    }}>
      <div style={{ position: "absolute", top: "50%", left: 2, right: 2, height: 1, background: "#444", transform: "translateY(-50%)" }} />
    </div>
  );
}

// --- Main Component ---
export function V1Hardware() {
  const [slug, setSlug] = useState<SynthSlug>("osci-mono");
  const config = SYNTH_CONFIGS[slug];
  const { params, setParam, noteOn, noteOff, getWaveform, isReady } = useSynthEngine({
    engineType: config.engineType,
    engineConfig: config.engineConfig,
    defaultParams: config.defaultParams,
    allParams: config.allParams,
  });
  const { isStarted, startAudio } = useAudioContext();

  const defs = getParamDefs(config.engineType as EngineType);
  const groups = groupParamDefs(defs);

  return (
    <div style={{ background: "#1c1814", minHeight: "100vh", fontFamily: "sans-serif" }}>
      {/* Top panel — brand + synth selector */}
      <div style={{
        background: "linear-gradient(to bottom, #2e2820, #221e18)",
        borderBottom: "3px solid #0a0806",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        gap: 20,
      }}>
        {/* Logo */}
        <div style={{
          background: "linear-gradient(to bottom, #3a3028, #221e18)",
          border: "1px solid #4a3820",
          borderRadius: 4,
          padding: "6px 14px",
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#cc7700", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            OSCISCOOPS
          </div>
          <div style={{ fontSize: 8, color: "#665544", letterSpacing: "0.3em", textTransform: "uppercase" }}>
            Synthesizer Lab v1
          </div>
        </div>

        {/* LED + audio */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 12, height: 12, borderRadius: "50%",
            background: isStarted ? "#cc2200" : "#330800",
            boxShadow: isStarted ? "0 0 10px #cc2200, 0 0 4px #ff4400" : "none",
            border: "1px solid #440000",
          }} />
          <span style={{ fontSize: 9, color: "#665544", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            {isStarted ? "POWER" : "STANDBY"}
          </span>
        </div>

        {/* Synth selector */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {SYNTH_LIST.map((s) => (
            <button
              key={s.slug}
              onClick={() => setSlug(s.slug)}
              style={{
                padding: "5px 10px",
                background: slug === s.slug
                  ? "linear-gradient(to bottom, #884400, #552200)"
                  : "linear-gradient(to bottom, #2e2820, #1e1a14)",
                color: slug === s.slug ? "#ffcc88" : "#665544",
                border: slug === s.slug ? "1px solid #aa5500" : "1px solid #2a2418",
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto" }}>
          {!isStarted ? (
            <button
              onClick={startAudio}
              style={{
                padding: "8px 16px",
                background: "linear-gradient(to bottom, #556633, #334422)",
                color: "#aaccaa",
                border: "1px solid #778844",
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.15em",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              POWER ON
            </button>
          ) : (
            <WaveformDisplay getData={getWaveform} width={140} height={32} color="#cc7700" />
          )}
        </div>
      </div>

      {/* Main control panel */}
      <div style={{ padding: "16px 20px", display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[...groups.entries()].map(([group, defs]) => (
          <div
            key={group}
            style={{
              position: "relative",
              background: "linear-gradient(to bottom, #28221c, #1e1a14)",
              border: "1px solid #3a3026",
              borderTop: "2px solid #4a3c2e",
              borderRadius: 4,
              padding: "20px 16px 14px",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.4)",
              minWidth: 120,
            }}
          >
            {/* Screws */}
            <Screw style={{ top: 4, left: 4 }} />
            <Screw style={{ top: 4, right: 4 }} />

            {/* Section label */}
            <div style={{
              position: "absolute",
              top: -9,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#28221c",
              padding: "0 8px",
              fontSize: 8,
              color: "#7a6040",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}>
              {group}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start", marginTop: 4 }}>
              {defs.map((def) => {
                const val = params[def.key];
                if (def.type === "select") {
                  return (
                    <HwWaveSelect
                      key={def.key}
                      def={def}
                      value={(val as string) ?? (def.defaultValue as string)}
                      onChange={(v) => setParam(def.key, v)}
                    />
                  );
                }
                if (def.type === "fader") {
                  return (
                    <div key={def.key} style={{ width: 160 }}>
                      <HwFader def={def} value={(val as number) ?? (def.defaultValue as number)} onChange={(v) => setParam(def.key, v)} />
                    </div>
                  );
                }
                return (
                  <HwKnob
                    key={def.key}
                    def={def}
                    value={(val as number) ?? (def.defaultValue as number)}
                    onChange={(v) => setParam(def.key, v)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Keyboard section */}
      <div style={{
        borderTop: "3px solid #0a0806",
        background: "linear-gradient(to bottom, #221e18, #1a1610)",
        padding: "12px 20px 16px",
        display: "flex",
        justifyContent: "center",
        overflowX: "auto",
      }}>
        <SynthKeyboard
          onNoteOn={noteOn}
          onNoteOff={noteOff}
          startOctave={3}
          octaves={3}
          whiteKeyWidth={34}
          whiteKeyHeight={96}
          whiteColor="#f5ede0"
          blackColor="#111108"
          activeColor="#cc7700"
          borderColor="#8a7050"
          showKeyLabels
        />
      </div>

      {!isReady && isStarted && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#1e1a14", border: "1px solid #4a3820", padding: "16px 32px", color: "#cc7700", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            INITIALIZING ENGINE...
          </div>
        </div>
      )}
    </div>
  );
}
