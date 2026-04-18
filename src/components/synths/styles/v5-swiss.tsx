"use client";

/**
 * V5 — SWISS INTERNATIONAL STYLE
 * Helvetica. Grid. Red. Black. White. Nothing else.
 * The design IS the typography. No decoration, only structure.
 * Inspired by Müller-Brockmann and Massimo Vignelli.
 */

import { useState } from "react";
import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { getParamDefs, groupParamDefs } from "@/lib/synth-engine";
import type { EngineType, ParamDef } from "@/lib/synth-engine";
import { SYNTH_CONFIGS, SYNTH_LIST, type SynthSlug } from "../configs";
import { SynthKeyboard } from "../shared/keyboard";
import { useDrag } from "./use-drag";

const WHITE = "#f8f7f5";
const BLACK = "#0d0d0d";
const RED = "#cc0000";
const GRAY = "#8a8a8a";
const RULE = "#d0cfc8";

// SVG arc helpers
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

// --- Swiss Knob ---
function SwissKnob({ def, value, onChange }: { def: ParamDef; value: number; onChange: (v: number) => void }) {
  const { dragging, bind } = useDrag({ value, min: def.min, max: def.max, step: def.step, onChange });
  const norm = Math.max(0, Math.min(1, (value - def.min) / (def.max - def.min)));
  const sz = 64;
  const cx = sz / 2;
  const cy = sz / 2;
  const r = sz / 2 - 6;

  const fmt = (v: number) =>
    Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);

  // Tick marks every 30° (9 ticks total across 270°)
  const ticks = Array.from({ length: 10 }, (_, i) => {
    const a = A0 + (i / 9) * (A1 - A0);
    const inner = polarToXY(cx, cy, r - 4, a);
    const outer = polarToXY(cx, cy, r + 2, a);
    return { inner, outer, active: i / 9 <= norm };
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <svg
        width={sz}
        height={sz}
        style={{ cursor: dragging ? "ns-resize" : "pointer", display: "block" }}
        {...(bind as React.SVGAttributes<SVGSVGElement>)}
      >
        {/* Track */}
        <path d={arc(cx, cy, r, A0, A1)} fill="none" stroke={RULE} strokeWidth={1.5} strokeLinecap="round" />

        {/* Value arc */}
        {norm > 0.01 && (
          <path d={arc(cx, cy, r, A0, A0 + norm * (A1 - A0))} fill="none" stroke={RED} strokeWidth={2} strokeLinecap="round" />
        )}

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.inner.x} y1={t.inner.y}
            x2={t.outer.x} y2={t.outer.y}
            stroke={t.active ? RED : RULE}
            strokeWidth={i % 3 === 0 ? 1.5 : 0.75}
          />
        ))}

        {/* Clean center circle */}
        <circle cx={cx} cy={cy} r={r * 0.72} fill={WHITE} stroke={RULE} strokeWidth={1} />

        {/* Value number in center */}
        <text
          x={cx} y={cy + 4}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fontFamily="system-ui, Helvetica Neue, sans-serif"
          fill={BLACK}
          style={{ letterSpacing: "-0.02em" }}
        >
          {fmt(value)}
        </text>
      </svg>

      {/* Label + unit below */}
      <div style={{ textAlign: "center", marginTop: 2 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: BLACK, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "system-ui, Helvetica Neue, sans-serif" }}>
          {def.label}
        </div>
        {def.unit && (
          <div style={{ fontSize: 8, color: GRAY, fontFamily: "monospace" }}>
            {def.unit}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Swiss Wave Select ---
function SwissWaveSelect({ def, value, onChange }: { def: ParamDef; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 8, fontWeight: 700, color: GRAY, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "system-ui, Helvetica Neue, sans-serif", marginBottom: 8 }}>
        {def.label}
      </div>
      <div style={{ display: "flex", gap: 0 }}>
        {(def.options ?? []).map((o, i) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              padding: "6px 10px",
              background: value === o ? BLACK : WHITE,
              color: value === o ? WHITE : GRAY,
              border: `1px solid ${RULE}`,
              borderLeft: i === 0 ? `1px solid ${RULE}` : "none",
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "system-ui, Helvetica Neue, sans-serif",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Swiss Fader ---
function SwissFader({ def, value, onChange }: { def: ParamDef; value: number; onChange: (v: number) => void }) {
  const norm = (value - def.min) / (def.max - def.min);
  return (
    <div style={{ width: "100%", fontFamily: "system-ui, Helvetica Neue, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: BLACK, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {def.label}
        </span>
        <span style={{ fontSize: 20, fontWeight: 900, color: BLACK, letterSpacing: "-0.04em" }}>
          {value.toFixed(0)}
          <span style={{ fontSize: 11, fontWeight: 400, color: GRAY, marginLeft: 2 }}>{def.unit}</span>
        </span>
      </div>
      <div style={{ position: "relative", height: 2, background: RULE }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: 2, width: `${norm * 100}%`, background: RED }} />
        {/* Thumb marker */}
        <div style={{
          position: "absolute",
          top: -5,
          left: `${norm * 100}%`,
          transform: "translateX(-50%)",
          width: 2,
          height: 12,
          background: BLACK,
        }} />
        <input
          type="range" min={def.min} max={def.max} step={def.step ?? 1} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: 20, top: -10 }}
        />
      </div>
    </div>
  );
}

// --- Rule line ---
function Rule() {
  return <div style={{ height: 1, background: RULE, margin: "0" }} />;
}

// --- Main Component ---
export function V5Swiss() {
  const [slug, setSlug] = useState<SynthSlug>("osci-mono");
  const config = SYNTH_CONFIGS[slug];
  const { params, setParam, noteOn, noteOff, isReady } = useSynthEngine({
    engineType: config.engineType,
    engineConfig: config.engineConfig,
    defaultParams: config.defaultParams,
    allParams: config.allParams,
  });
  const { isStarted, startAudio } = useAudioContext();
  const defs = getParamDefs(config.engineType as EngineType);
  const groups = groupParamDefs(defs);

  return (
    <div style={{ background: WHITE, minHeight: "100vh", fontFamily: "system-ui, Helvetica Neue, sans-serif" }}>
      {/* Top rule */}
      <div style={{ height: 4, background: RED }} />

      {/* Header */}
      <div style={{ padding: "20px 32px", borderBottom: `1px solid ${RULE}`, display: "flex", alignItems: "center", gap: 0 }}>
        {/* Left: wordmark */}
        <div style={{ borderRight: `1px solid ${RULE}`, paddingRight: 28, marginRight: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: RED, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 2 }}>
            Osciscoops
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: BLACK, lineHeight: 1, letterSpacing: "-0.04em" }}>
            Synth Lab
          </div>
        </div>

        {/* Center: synth tabs */}
        <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
          {SYNTH_LIST.map((s, i) => (
            <button
              key={s.slug}
              onClick={() => setSlug(s.slug)}
              style={{
                padding: "12px 20px",
                background: slug === s.slug ? BLACK : WHITE,
                color: slug === s.slug ? WHITE : GRAY,
                border: `1px solid ${RULE}`,
                borderLeft: i === 0 ? `1px solid ${RULE}` : "none",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {s.name}
              {slug === s.slug && (
                <div style={{ height: 2, background: RED, marginTop: 6, marginBottom: -12 }} />
              )}
            </button>
          ))}
        </div>

        {/* Right: audio + synth info */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 24 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: GRAY, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              {config.category}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: BLACK, letterSpacing: "0.02em" }}>
              {config.tagline}
            </div>
          </div>
          {!isStarted ? (
            <button
              onClick={startAudio}
              style={{
                padding: "10px 20px",
                background: RED,
                color: WHITE,
                border: "none",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Enable Audio
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: RED }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: RED, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                Live
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Controls — strict grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {[...groups.entries()].map(([group, groupDefs]) => (
          <div
            key={group}
            style={{
              borderRight: `1px solid ${RULE}`,
              borderBottom: `1px solid ${RULE}`,
              padding: "20px 24px",
            }}
          >
            <div style={{ fontSize: 8, fontWeight: 700, color: RED, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 2 }}>
              {group}
            </div>
            <Rule />
            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
              {groupDefs.map((def) => {
                const val = params[def.key];
                if (def.type === "select") {
                  return (
                    <div key={def.key} style={{ width: "100%" }}>
                      <SwissWaveSelect
                        def={def}
                        value={(val as string) ?? (def.defaultValue as string)}
                        onChange={(v) => setParam(def.key, v)}
                      />
                    </div>
                  );
                }
                if (def.type === "fader") {
                  return (
                    <div key={def.key} style={{ width: "100%", paddingTop: 8 }}>
                      <SwissFader def={def} value={(val as number) ?? (def.defaultValue as number)} onChange={(v) => setParam(def.key, v)} />
                    </div>
                  );
                }
                return (
                  <SwissKnob
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

      {/* Keyboard */}
      <div style={{
        borderTop: `1px solid ${RULE}`,
        padding: "24px 32px",
        display: "flex",
        justifyContent: "center",
        overflowX: "auto",
        background: WHITE,
      }}>
        <SynthKeyboard
          onNoteOn={noteOn}
          onNoteOff={noteOff}
          startOctave={3}
          octaves={3}
          whiteKeyWidth={36}
          whiteKeyHeight={100}
          whiteColor="#ffffff"
          blackColor={BLACK}
          activeColor={RED}
          borderColor={RULE}
          showKeyLabels
        />
      </div>

      {/* Bottom rule */}
      <div style={{ height: 2, background: RULE }} />

      {!isReady && isStarted && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(248,247,245,0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 4, background: RED, width: 80, marginBottom: 16 }} />
            <div style={{ fontSize: 20, fontWeight: 900, color: BLACK, letterSpacing: "-0.02em" }}>
              Loading Engine
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
