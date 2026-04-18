"use client";

/**
 * V2c — COLOR BLOCK BRUTALIST
 * Mondrian meets a synthesizer.
 * Each control section is a flat saturated color block.
 * Still raw — thick borders, monospace numbers, no decoration.
 * But now there's color. Bold, unapologetic color.
 */

import { useState } from "react";
import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { getParamDefs, groupParamDefs } from "@/lib/synth-engine";
import type { EngineType, ParamDef } from "@/lib/synth-engine";
import { SYNTH_CONFIGS, SYNTH_LIST, type SynthSlug } from "../configs";
import { SynthKeyboard } from "../shared/keyboard";
import { useDrag } from "./use-drag";

const CREAM = "#f0ebe2";
const BLACK = "#0a0a0a";

// Color palette for section blocks — flat, saturated, distinct
const BLOCK_COLORS = [
  { bg: "#0040ff", text: "#ffffff", dim: "#aabbff", border: "#0030cc" }, // electric blue
  { bg: "#ff3300", text: "#ffffff", dim: "#ffaaaa", border: "#cc2200" }, // red-orange
  { bg: "#009944", text: "#ffffff", dim: "#88ffbb", border: "#007733" }, // green
  { bg: "#ff9900", text: "#000000", dim: "#664400", border: "#cc7700" }, // amber
  { bg: "#7700cc", text: "#ffffff", dim: "#ddaaff", border: "#5500aa" }, // purple
  { bg: "#00aacc", text: "#000000", dim: "#003344", border: "#008899" }, // cyan
  { bg: CREAM, text: BLACK, dim: "#666", border: "#ccc" },               // cream (default/fallback)
];

function Param({
  def, value, onChange, colors,
}: { def: ParamDef; value: number; onChange: (v: number) => void; colors: typeof BLOCK_COLORS[0] }) {
  const { dragging, bind } = useDrag({ value, min: def.min, max: def.max, step: def.step, onChange });
  const norm = Math.max(0, Math.min(1, (value - def.min) / (def.max - def.min)));

  const fmt = (v: number) =>
    Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);

  const activeBg = dragging ? colors.border : `${colors.bg}cc`;

  return (
    <div
      style={{
        border: `3px solid ${dragging ? colors.text : colors.border}`,
        background: activeBg,
        padding: "8px 10px",
        cursor: "ns-resize",
        userSelect: "none",
        touchAction: "none",
        minWidth: 82,
        position: "relative",
        overflow: "hidden",
      }}
      {...(bind as React.HTMLAttributes<HTMLDivElement>)}
    >
      <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, width: `${norm * 100}%`, background: colors.text, opacity: 0.6 }} />
      <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: colors.text, lineHeight: 1, letterSpacing: "-0.03em" }}>
        {fmt(value)}
        {def.unit && <span style={{ fontSize: 11, marginLeft: 2, fontWeight: 400, opacity: 0.6 }}>{def.unit}</span>}
      </div>
      <div style={{ fontSize: 8, fontFamily: "monospace", fontWeight: 700, color: colors.text, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.15em", marginTop: 4 }}>
        {def.label}
      </div>
    </div>
  );
}

function WaveSelect({
  def, value, onChange, colors,
}: { def: ParamDef; value: string; onChange: (v: string) => void; colors: typeof BLOCK_COLORS[0] }) {
  return (
    <div>
      <div style={{ fontSize: 8, fontFamily: "monospace", fontWeight: 700, color: colors.text, opacity: 0.6, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 7 }}>
        {def.label}
      </div>
      <div style={{ display: "flex", gap: 0 }}>
        {(def.options ?? []).map((o, i) => (
          <button key={o} onClick={() => onChange(o)} style={{
            padding: "7px 11px",
            background: value === o ? colors.text : "transparent",
            color: value === o ? colors.bg : colors.text,
            border: `3px solid ${colors.text}`,
            marginLeft: i === 0 ? 0 : -3,
            fontSize: 10, fontFamily: "monospace", fontWeight: 900,
            cursor: "pointer", letterSpacing: "0.05em", textTransform: "uppercase",
            opacity: value === o ? 1 : 0.7,
          }}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Fader({
  def, value, onChange, colors,
}: { def: ParamDef; value: number; onChange: (v: number) => void; colors: typeof BLOCK_COLORS[0] }) {
  const norm = (value - def.min) / (def.max - def.min);
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 8, fontFamily: "monospace", fontWeight: 700, color: colors.text, opacity: 0.6, letterSpacing: "0.18em", textTransform: "uppercase" }}>{def.label}</span>
        <span style={{ fontSize: 22, fontFamily: "monospace", fontWeight: 900, color: colors.text }}>{value.toFixed(0)}<span style={{ fontSize: 10, opacity: 0.6, marginLeft: 2 }}>{def.unit}</span></span>
      </div>
      <div style={{ position: "relative", height: 8, background: `${colors.text}25` }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${norm * 100}%`, background: colors.text, opacity: 0.8 }} />
        <input type="range" min={def.min} max={def.max} step={def.step ?? 1} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }} />
      </div>
    </div>
  );
}

export function V2CColor() {
  const [slug, setSlug] = useState<SynthSlug>("osci-mono");
  const config = SYNTH_CONFIGS[slug];
  const { params, setParam, noteOn, noteOff, isReady } = useSynthEngine({
    engineType: config.engineType, engineConfig: config.engineConfig,
    defaultParams: config.defaultParams, allParams: config.allParams,
  });
  const { isStarted, startAudio } = useAudioContext();
  const groups = [...groupParamDefs(getParamDefs(config.engineType as EngineType)).entries()];

  return (
    <div style={{ background: CREAM, minHeight: "100vh", fontFamily: "monospace" }}>
      {/* Header — black block */}
      <div style={{ background: BLACK, padding: "0 24px", display: "flex", alignItems: "stretch", gap: 0, borderBottom: `4px solid ${BLACK}` }}>
        <div style={{ padding: "14px 0", borderRight: `3px solid #333`, paddingRight: 20, marginRight: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#666", letterSpacing: "0.4em", textTransform: "uppercase" }}>Osciscoops</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: "-0.04em" }}>SYNTH</div>
        </div>

        {/* Synth selector — each gets the block palette color */}
        {SYNTH_LIST.map((s, i) => {
          const c = BLOCK_COLORS[i % BLOCK_COLORS.length];
          const active = slug === s.slug;
          return (
            <button key={s.slug} onClick={() => setSlug(s.slug)} style={{
              padding: "0 14px",
              background: active ? c.bg : "transparent",
              color: active ? c.text : "#555",
              border: "none",
              borderLeft: `3px solid #1e1e1e`,
              fontSize: 10, fontWeight: 900,
              cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}>
              {s.name}
            </button>
          );
        })}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", padding: "0 0 0 20px", borderLeft: "3px solid #1e1e1e" }}>
          {!isStarted ? (
            <button onClick={startAudio} style={{
              padding: "10px 18px", background: "#fff", color: BLACK,
              border: "none", fontSize: 10, fontWeight: 900, cursor: "pointer",
              letterSpacing: "0.2em", textTransform: "uppercase",
            }}>
              ENABLE
            </button>
          ) : (
            <div style={{ fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.25em" }}>● LIVE</div>
          )}
        </div>
      </div>

      {/* Controls — each group is a color block */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
        {groups.map(([group, defs], gi) => {
          const colors = BLOCK_COLORS[gi % BLOCK_COLORS.length];
          return (
            <div key={group} style={{ background: colors.bg, borderRight: `4px solid ${BLACK}`, borderBottom: `4px solid ${BLACK}`, padding: "16px 18px", minWidth: 160 }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: colors.text, opacity: 0.7, letterSpacing: "0.3em", textTransform: "uppercase", borderBottom: `3px solid ${colors.text}22`, paddingBottom: 8, marginBottom: 12 }}>
                {group}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, alignItems: "flex-start" }}>
                {defs.map((def) => {
                  const val = params[def.key];
                  if (def.type === "select") return <div key={def.key} style={{ width: "100%" }}><WaveSelect def={def} value={(val as string) ?? (def.defaultValue as string)} onChange={(v) => setParam(def.key, v)} colors={colors} /></div>;
                  if (def.type === "fader") return <div key={def.key} style={{ width: "100%" }}><Fader def={def} value={(val as number) ?? (def.defaultValue as number)} onChange={(v) => setParam(def.key, v)} colors={colors} /></div>;
                  return <Param key={def.key} def={def} value={(val as number) ?? (def.defaultValue as number)} onChange={(v) => setParam(def.key, v)} colors={colors} />;
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Keyboard */}
      <div style={{ borderTop: `4px solid ${BLACK}`, padding: "14px 24px", display: "flex", justifyContent: "center", overflowX: "auto" }}>
        <SynthKeyboard onNoteOn={noteOn} onNoteOff={noteOff} startOctave={3} octaves={3}
          whiteKeyWidth={36} whiteKeyHeight={100} whiteColor="#f8f4ea"
          blackColor={BLACK} activeColor="#0040ff" borderColor={BLACK} showKeyLabels />
      </div>

      {!isReady && isStarted && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(240,235,226,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ border: `6px solid ${BLACK}`, padding: "24px 40px", background: "#0040ff" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "0.2em" }}>LOADING</div>
          </div>
        </div>
      )}
    </div>
  );
}
