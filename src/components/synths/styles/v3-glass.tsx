"use client";

/**
 * V3 — PREMIUM GLASS
 * Dark space with floating frosted-glass panels.
 * Luminous gradient blobs behind everything.
 * The kind of UI that makes a synth feel like it costs $500.
 */

import { useState } from "react";
import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { getParamDefs, groupParamDefs } from "@/lib/synth-engine";
import type { EngineType, ParamDef } from "@/lib/synth-engine";
import { SYNTH_CONFIGS, SYNTH_LIST, type SynthSlug } from "../configs";
import { SynthKeyboard } from "../shared/keyboard";
import { WaveformDisplay } from "../shared/waveform-display";
import { SpectrumDisplay } from "../shared/spectrum-display";
import { useDrag } from "./use-drag";

// Accent colors per synth
const SYNTH_ACCENT: Record<SynthSlug, string> = {
  "osci-mono": "#e879f9",
  "osci-sub": "#a78bfa",
  "osci-fm": "#38bdf8",
  "osci-wave": "#34d399",
  "osci-mod": "#fbbf24",
  "osci-grain": "#818cf8",
};

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

// --- Glass Knob ---
function GlassKnob({ def, value, onChange, accent }: { def: ParamDef; value: number; onChange: (v: number) => void; accent: string }) {
  const { dragging, bind } = useDrag({ value, min: def.min, max: def.max, step: def.step, onChange });
  const norm = Math.max(0, Math.min(1, (value - def.min) / (def.max - def.min)));
  const sz = 58;
  const cx = sz / 2 + 6;
  const cy = sz / 2 + 6;
  const r = sz / 2 + 1;

  const fmt = (v: number) =>
    Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);

  const valueAngle = A0 + norm * (A1 - A0);
  const tip = polarToXY(cx, cy, r * 0.6, valueAngle);
  const tipInner = polarToXY(cx, cy, r * 0.15, valueAngle);

  return (
    <div
      className="flex flex-col items-center gap-1 select-none"
      style={{ touchAction: "none" }}
    >
      <svg
        width={sz + 12}
        height={sz + 12}
        style={{ cursor: dragging ? "ns-resize" : "pointer", display: "block" }}
        {...(bind as React.SVGAttributes<SVGSVGElement>)}
      >
        <defs>
          <radialGradient id={`glassGrad-${def.key}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.15" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
          </radialGradient>
          <filter id={`glassGlow-${def.key}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer glow ring when active */}
        {norm > 0.05 && (
          <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={accent} strokeWidth={8} opacity={0.08} />
        )}

        {/* Track */}
        <path d={arc(cx, cy, r, A0, A1)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} strokeLinecap="round" />

        {/* Value arc — gradient via multiple segments approximation */}
        {norm > 0.01 && (
          <>
            <path d={arc(cx, cy, r, A0, valueAngle)} fill="none" stroke={accent} strokeWidth={4} strokeLinecap="round" opacity={0.4} filter={`url(#glassGlow-${def.key})`} />
            <path d={arc(cx, cy, r, A0, valueAngle)} fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" />
          </>
        )}

        {/* Glass body */}
        <circle cx={cx} cy={cy} r={r * 0.75} fill={`url(#glassGrad-${def.key})`} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />

        {/* Indicator */}
        <line x1={tipInner.x} y1={tipInner.y} x2={tip.x} y2={tip.y} stroke={accent} strokeWidth={1.5} strokeLinecap="round" />
        <circle cx={tip.x} cy={tip.y} r={2} fill={accent} />
      </svg>

      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "sans-serif" }}>
        {def.label}
      </span>
      <span style={{ fontSize: 9, fontFamily: "monospace", color: accent, opacity: 0.8 }}>
        {fmt(value)}{def.unit ? <span style={{ opacity: 0.5, marginLeft: 2 }}>{def.unit}</span> : null}
      </span>
    </div>
  );
}

// --- Glass Wave Select ---
function GlassWaveSelect({ def, value, onChange, accent }: { def: ParamDef; value: string; onChange: (v: string) => void; accent: string }) {
  const symbols: Record<string, string> = { sine: "∿", square: "⊓", sawtooth: "⩘", triangle: "∧", fatsine: "∿∿", fatsquare: "⊓⊓", fatsawtooth: "⩘⩘", fattriangle: "∧∧" };
  return (
    <div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>
        {def.label}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {(def.options ?? []).map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              padding: "6px 10px",
              background: value === o ? `${accent}20` : "rgba(255,255,255,0.04)",
              color: value === o ? accent : "rgba(255,255,255,0.4)",
              border: `1px solid ${value === o ? accent : "rgba(255,255,255,0.08)"}`,
              borderRadius: 6,
              fontSize: 14,
              cursor: "pointer",
              backdropFilter: "blur(4px)",
              boxShadow: value === o ? `0 0 12px ${accent}30` : "none",
              transition: "all 0.15s",
            }}
          >
            {symbols[o] ?? o}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Glass Fader ---
function GlassFader({ def, value, onChange, accent }: { def: ParamDef; value: number; onChange: (v: number) => void; accent: string }) {
  const norm = (value - def.min) / (def.max - def.min);
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase" }}>{def.label}</span>
        <span style={{ fontSize: 10, fontFamily: "monospace", color: accent }}>{value.toFixed(0)} {def.unit}</span>
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${norm * 100}%`,
          borderRadius: 3,
          background: `linear-gradient(to right, ${accent}40, ${accent})`,
          boxShadow: `0 0 8px ${accent}50`,
        }} />
        <input type="range" min={def.min} max={def.max} step={def.step ?? 1} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
        />
      </div>
    </div>
  );
}

// --- Glass panel ---
function GlassPanel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: "16px 18px",
      ...style,
    }}>
      {children}
    </div>
  );
}

// --- Main Component ---
export function V3Glass() {
  const [slug, setSlug] = useState<SynthSlug>("osci-mono");
  const config = SYNTH_CONFIGS[slug];
  const accent = SYNTH_ACCENT[slug];
  const { params, setParam, noteOn, noteOff, getWaveform, getSpectrum, isReady } = useSynthEngine({
    engineType: config.engineType,
    engineConfig: config.engineConfig,
    defaultParams: config.defaultParams,
    allParams: config.allParams,
  });
  const { isStarted, startAudio } = useAudioContext();
  const defs = getParamDefs(config.engineType as EngineType);
  const groups = groupParamDefs(defs);

  return (
    <div style={{ background: "#04030f", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Gradient blobs */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${accent}18, transparent)`, top: -200, left: -100, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #0ea5e918, transparent)", bottom: 100, right: -50, filter: "blur(60px)" }} />
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${accent}10, transparent)`, top: "40%", right: "30%", filter: "blur(50px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "20px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              Osciscoops
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Synthesizer Lab
            </div>
          </div>

          {/* Synth selector */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginLeft: 8 }}>
            {SYNTH_LIST.map((s) => {
              const a = SYNTH_ACCENT[s.slug];
              const active = slug === s.slug;
              return (
                <button
                  key={s.slug}
                  onClick={() => setSlug(s.slug)}
                  style={{
                    padding: "6px 14px",
                    background: active ? `${a}20` : "rgba(255,255,255,0.04)",
                    color: active ? a : "rgba(255,255,255,0.4)",
                    border: `1px solid ${active ? a : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    backdropFilter: "blur(8px)",
                    boxShadow: active ? `0 0 16px ${a}30` : "none",
                    letterSpacing: "0.05em",
                    transition: "all 0.15s",
                  }}
                >
                  {s.name}
                </button>
              );
            })}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            {isStarted ? (
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <WaveformDisplay getData={getWaveform} width={140} height={36} color={accent} />
                </div>
                <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <SpectrumDisplay getData={getSpectrum} width={80} height={36} color={accent} barCount={24} />
                </div>
              </div>
            ) : (
              <button
                onClick={startAudio}
                style={{
                  padding: "10px 20px",
                  background: `${accent}20`,
                  color: accent,
                  border: `1px solid ${accent}50`,
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  backdropFilter: "blur(8px)",
                  boxShadow: `0 0 20px ${accent}20`,
                  letterSpacing: "0.1em",
                }}
              >
                Enable Audio
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          {[...groups.entries()].map(([group, groupDefs]) => (
            <GlassPanel key={group} style={{ minWidth: 140 }}>
              <div style={{ fontSize: 9, color: accent, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12, opacity: 0.8 }}>
                {group}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
                {groupDefs.map((def) => {
                  const val = params[def.key];
                  if (def.type === "select") {
                    return (
                      <GlassWaveSelect key={def.key} def={def}
                        value={(val as string) ?? (def.defaultValue as string)}
                        onChange={(v) => setParam(def.key, v)} accent={accent} />
                    );
                  }
                  if (def.type === "fader") {
                    return (
                      <div key={def.key} style={{ width: 200 }}>
                        <GlassFader def={def} value={(val as number) ?? (def.defaultValue as number)}
                          onChange={(v) => setParam(def.key, v)} accent={accent} />
                      </div>
                    );
                  }
                  return (
                    <GlassKnob key={def.key} def={def}
                      value={(val as number) ?? (def.defaultValue as number)}
                      onChange={(v) => setParam(def.key, v)} accent={accent} />
                  );
                })}
              </div>
            </GlassPanel>
          ))}
        </div>

        {/* Keyboard */}
        <GlassPanel style={{ padding: "14px 16px", display: "flex", justifyContent: "center", overflowX: "auto" }}>
          <SynthKeyboard
            onNoteOn={noteOn}
            onNoteOff={noteOff}
            startOctave={3}
            octaves={3}
            whiteKeyWidth={34}
            whiteKeyHeight={92}
            whiteColor="rgba(255,255,255,0.85)"
            blackColor="rgba(8,6,20,0.95)"
            activeColor={accent}
            borderColor="rgba(255,255,255,0.15)"
            showKeyLabels
          />
        </GlassPanel>
      </div>

      {!isReady && isStarted && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4,3,15,0.8)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <GlassPanel style={{ padding: "24px 40px" }}>
            <div style={{ fontSize: 13, color: accent, letterSpacing: "0.2em", textTransform: "uppercase" }}>Initializing…</div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
