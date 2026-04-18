"use client";

/**
 * V5c — SWISS EDITORIAL
 * Same grid discipline but now the VALUE is the hero.
 * Giant draggable numbers fill each cell.
 * A small knob indicator sits beside it — secondary, ornamental.
 * Like a typographic data poster that happens to make sound.
 */

import { useState } from "react";
import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { getParamDefs, groupParamDefs } from "@/lib/synth-engine";
import type { EngineType, ParamDef } from "@/lib/synth-engine";
import { SYNTH_CONFIGS, SYNTH_LIST, type SynthSlug } from "../configs";
import { SynthKeyboard } from "../shared/keyboard";
import { useDrag } from "./use-drag";

const BG = "#f4f2ee";
const WHITE = "#ffffff";
const BLACK = "#0a0a0a";
const RED = "#cc0000";
const GRAY = "#999";
const RULE = "#dedbd4";

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

// Small arc indicator — just the progress, no labels
function MiniArc({ norm }: { norm: number }) {
  const sz = 36;
  const cx = sz / 2;
  const cy = sz / 2;
  const r = sz / 2 - 4;
  return (
    <svg width={sz} height={sz} style={{ display: "block", flexShrink: 0 }}>
      <path d={arc(cx, cy, r, A0, A1)} fill="none" stroke={RULE} strokeWidth={2} strokeLinecap="round" />
      {norm > 0.01 && (
        <path d={arc(cx, cy, r, A0, A0 + norm * (A1 - A0))} fill="none" stroke={RED} strokeWidth={2} strokeLinecap="round" />
      )}
    </svg>
  );
}

// Editorial control: giant number + small arc
function EditorialParam({ def, value, onChange }: { def: ParamDef; value: number; onChange: (v: number) => void }) {
  const { dragging, bind } = useDrag({ value, min: def.min, max: def.max, step: def.step, onChange });
  const norm = Math.max(0, Math.min(1, (value - def.min) / (def.max - def.min)));

  const fmt = (v: number) =>
    Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);

  return (
    <div
      style={{
        padding: "14px 0",
        borderBottom: `1px solid ${RULE}`,
        userSelect: "none",
        touchAction: "none",
        cursor: "ns-resize",
      }}
      {...(bind as React.HTMLAttributes<HTMLDivElement>)}
    >
      {/* Param name — tiny above */}
      <div style={{ fontSize: 8, fontWeight: 700, color: dragging ? RED : GRAY, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "system-ui, Helvetica Neue, sans-serif", marginBottom: 4 }}>
        {def.label}
      </div>

      {/* Large value + mini arc */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <span style={{
            fontSize: 52,
            fontWeight: 900,
            fontFamily: "system-ui, Helvetica Neue, sans-serif",
            color: dragging ? RED : BLACK,
            lineHeight: 0.9,
            letterSpacing: "-0.05em",
            display: "block",
          }}>
            {fmt(value)}
          </span>
          {def.unit && (
            <span style={{ fontSize: 12, color: GRAY, fontFamily: "system-ui", marginTop: 2, display: "block", letterSpacing: "0.05em" }}>
              {def.unit}
            </span>
          )}
        </div>
        <MiniArc norm={norm} />
      </div>
    </div>
  );
}

function WaveSelect({ def, value, onChange }: { def: ParamDef; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${RULE}` }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: GRAY, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "system-ui", marginBottom: 10 }}>
        {def.label}
      </div>
      {/* Large text buttons */}
      <div style={{ display: "flex", gap: 0 }}>
        {(def.options ?? []).map((o, i) => (
          <button key={o} onClick={() => onChange(o)} style={{
            padding: "10px 14px",
            background: value === o ? BLACK : WHITE,
            color: value === o ? WHITE : GRAY,
            border: `1px solid ${RULE}`,
            borderLeft: i === 0 ? `1px solid ${RULE}` : "none",
            fontSize: 11, fontWeight: 700,
            fontFamily: "system-ui, Helvetica Neue, sans-serif",
            cursor: "pointer", letterSpacing: "0.05em",
          }}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function EditorialFader({ def, value, onChange }: { def: ParamDef; value: number; onChange: (v: number) => void }) {
  const norm = (value - def.min) / (def.max - def.min);
  return (
    <div style={{ padding: "14px 0", borderBottom: `1px solid ${RULE}` }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: GRAY, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "system-ui", marginBottom: 10 }}>
        {def.label}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 44, fontWeight: 900, fontFamily: "system-ui", color: BLACK, lineHeight: 0.9, letterSpacing: "-0.04em" }}>
          {value.toFixed(0)}
        </span>
        <span style={{ fontSize: 14, color: GRAY, marginBottom: 4 }}>{def.unit}</span>
      </div>
      {/* Wide fader track */}
      <div style={{ position: "relative", height: 3, background: RULE }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: 3, width: `${norm * 100}%`, background: RED }} />
        <div style={{ position: "absolute", top: -8, left: `${norm * 100}%`, transform: "translateX(-50%)", width: 3, height: 18, background: BLACK }} />
        <input type="range" min={def.min} max={def.max} step={def.step ?? 1} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: 20, top: -10 }} />
      </div>
    </div>
  );
}

export function V5CEditorial() {
  const [slug, setSlug] = useState<SynthSlug>("osci-mono");
  const config = SYNTH_CONFIGS[slug];
  const { params, setParam, noteOn, noteOff, isReady } = useSynthEngine({
    engineType: config.engineType, engineConfig: config.engineConfig,
    defaultParams: config.defaultParams, allParams: config.allParams,
  });
  const { isStarted, startAudio } = useAudioContext();
  const groups = groupParamDefs(getParamDefs(config.engineType as EngineType));

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "system-ui, Helvetica Neue, sans-serif" }}>
      {/* Red top bar — thicker for editorial */}
      <div style={{ height: 6, background: RED }} />

      {/* Masthead */}
      <div style={{ padding: "16px 32px 0", borderBottom: `1px solid ${RULE}` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: RED, letterSpacing: "0.4em", textTransform: "uppercase" }}>
            Osciscoops
          </div>
          <div style={{ flex: 1, height: 1, background: RULE }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: GRAY, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            {config.category}
          </div>
        </div>

        {/* Giant synth name */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: -2 }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: BLACK, lineHeight: 0.85, letterSpacing: "-0.05em" }}>
            {config.name}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, paddingBottom: 6 }}>
            {!isStarted ? (
              <button onClick={startAudio} style={{ padding: "10px 20px", background: RED, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Enable Audio
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: RED }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: RED, letterSpacing: "0.2em", textTransform: "uppercase" }}>Live</span>
              </div>
            )}
          </div>
        </div>

        {/* Synth selector as text nav */}
        <div style={{ display: "flex", gap: 0, marginTop: 8 }}>
          {SYNTH_LIST.map((s, i) => (
            <button key={s.slug} onClick={() => setSlug(s.slug)} style={{
              padding: "8px 16px",
              background: "transparent",
              color: slug === s.slug ? BLACK : GRAY,
              border: "none",
              borderLeft: i === 0 ? "none" : `1px solid ${RULE}`,
              fontSize: 11, fontWeight: slug === s.slug ? 900 : 400,
              cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase",
              borderBottom: slug === s.slug ? `3px solid ${RED}` : "3px solid transparent",
            }}>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Controls — editorial grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {[...groups.entries()].map(([group, defs]) => (
          <div key={group} style={{ borderRight: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}`, padding: "16px 24px" }}>
            {/* Section label — thin red rule above */}
            <div style={{ height: 2, background: RED, marginBottom: 8 }} />
            <div style={{ fontSize: 8, fontWeight: 700, color: RED, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 4 }}>
              {group}
            </div>

            {defs.map((def) => {
              const val = params[def.key];
              if (def.type === "select") return <WaveSelect key={def.key} def={def} value={(val as string) ?? (def.defaultValue as string)} onChange={(v) => setParam(def.key, v)} />;
              if (def.type === "fader") return <EditorialFader key={def.key} def={def} value={(val as number) ?? (def.defaultValue as number)} onChange={(v) => setParam(def.key, v)} />;
              return <EditorialParam key={def.key} def={def} value={(val as number) ?? (def.defaultValue as number)} onChange={(v) => setParam(def.key, v)} />;
            })}
          </div>
        ))}
      </div>

      {/* Keyboard */}
      <div style={{ borderTop: `1px solid ${RULE}`, padding: "24px 32px", display: "flex", justifyContent: "center", overflowX: "auto", background: WHITE }}>
        <SynthKeyboard onNoteOn={noteOn} onNoteOff={noteOff} startOctave={3} octaves={3}
          whiteKeyWidth={36} whiteKeyHeight={104} whiteColor="#ffffff"
          blackColor={BLACK} activeColor={RED} borderColor={RULE} showKeyLabels />
      </div>

      <div style={{ height: 2, background: RULE }} />

      {!isReady && isStarted && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(244,242,238,0.96)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 6, background: RED, width: 100, marginBottom: 16, marginLeft: "auto", marginRight: "auto" }} />
            <div style={{ fontSize: 32, fontWeight: 900, color: BLACK, letterSpacing: "-0.03em" }}>Loading</div>
          </div>
        </div>
      )}
    </div>
  );
}
