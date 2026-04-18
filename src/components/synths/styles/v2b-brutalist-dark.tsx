"use client";

/**
 * V2b — BRUTALIST DARK / INDUSTRIAL
 * Same confrontational rawness as V2 but at night.
 * Near-black chassis. Yellow accent like a warning label.
 * Looks like a machine you operate, not software you use.
 */

import { useState } from "react";
import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { getParamDefs, groupParamDefs } from "@/lib/synth-engine";
import type { EngineType, ParamDef } from "@/lib/synth-engine";
import { SYNTH_CONFIGS, SYNTH_LIST, type SynthSlug } from "../configs";
import { SynthKeyboard } from "../shared/keyboard";
import { useDrag } from "./use-drag";

const BG = "#080808";
const PANEL = "#111111";
const FG = "#e8e8e4";
const YELLOW = "#e8cc00";
const DIM = "#444";
const BORDER = "#2a2a2a";

function Param({ def, value, onChange }: { def: ParamDef; value: number; onChange: (v: number) => void }) {
  const { dragging, bind } = useDrag({ value, min: def.min, max: def.max, step: def.step, onChange });
  const norm = Math.max(0, Math.min(1, (value - def.min) / (def.max - def.min)));

  const fmt = (v: number) =>
    Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);

  return (
    <div
      style={{
        border: `2px solid ${dragging ? YELLOW : BORDER}`,
        background: dragging ? "#1a1800" : PANEL,
        padding: "10px 12px",
        cursor: "ns-resize",
        userSelect: "none",
        touchAction: "none",
        minWidth: 88,
        position: "relative",
        overflow: "hidden",
      }}
      {...(bind as React.HTMLAttributes<HTMLDivElement>)}
    >
      {/* Bottom progress strip */}
      <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, width: `${norm * 100}%`, background: YELLOW }} />
      {/* Side accent when dragging */}
      {dragging && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: YELLOW }} />}

      <div style={{ fontSize: 30, fontWeight: 900, fontFamily: "monospace", color: dragging ? YELLOW : FG, lineHeight: 1, letterSpacing: "-0.03em" }}>
        {fmt(value)}
        {def.unit && <span style={{ fontSize: 13, marginLeft: 3, fontWeight: 400, color: DIM }}>{def.unit}</span>}
      </div>
      <div style={{ fontSize: 8, fontFamily: "monospace", fontWeight: 700, color: DIM, textTransform: "uppercase", letterSpacing: "0.18em", marginTop: 5 }}>
        {def.label}
      </div>
    </div>
  );
}

function WaveSelect({ def, value, onChange }: { def: ParamDef; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 8, fontFamily: "monospace", fontWeight: 700, color: DIM, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 7 }}>
        {def.label}
      </div>
      <div style={{ display: "flex", gap: 0 }}>
        {(def.options ?? []).map((o, i) => (
          <button key={o} onClick={() => onChange(o)} style={{
            padding: "8px 12px",
            background: value === o ? YELLOW : PANEL,
            color: value === o ? BG : DIM,
            border: `2px solid ${value === o ? YELLOW : BORDER}`,
            marginLeft: i === 0 ? 0 : -2,
            fontSize: 10, fontFamily: "monospace", fontWeight: 900,
            cursor: "pointer", letterSpacing: "0.05em", textTransform: "uppercase",
          }}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Fader({ def, value, onChange }: { def: ParamDef; value: number; onChange: (v: number) => void }) {
  const norm = (value - def.min) / (def.max - def.min);
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 8, fontFamily: "monospace", fontWeight: 700, color: DIM, letterSpacing: "0.18em", textTransform: "uppercase" }}>{def.label}</span>
        <span style={{ fontSize: 22, fontFamily: "monospace", fontWeight: 900, color: FG }}>{value.toFixed(0)}<span style={{ fontSize: 11, color: DIM, marginLeft: 2 }}>{def.unit}</span></span>
      </div>
      <div style={{ position: "relative", height: 8, background: BORDER }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${norm * 100}%`, background: YELLOW }} />
        <input type="range" min={def.min} max={def.max} step={def.step ?? 1} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }} />
      </div>
    </div>
  );
}

export function V2BDark() {
  const [slug, setSlug] = useState<SynthSlug>("osci-mono");
  const config = SYNTH_CONFIGS[slug];
  const { params, setParam, noteOn, noteOff, isReady } = useSynthEngine({
    engineType: config.engineType, engineConfig: config.engineConfig,
    defaultParams: config.defaultParams, allParams: config.allParams,
  });
  const { isStarted, startAudio } = useAudioContext();
  const groups = groupParamDefs(getParamDefs(config.engineType as EngineType));

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "monospace" }}>
      {/* Yellow top stripe */}
      <div style={{ height: 5, background: YELLOW }} />

      {/* Header */}
      <div style={{ borderBottom: `2px solid ${BORDER}`, padding: "14px 24px", display: "flex", alignItems: "center", gap: 0 }}>
        <div style={{ borderRight: `2px solid ${BORDER}`, paddingRight: 20, marginRight: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: YELLOW, letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 2 }}>
            Osciscoops
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: FG, lineHeight: 1, letterSpacing: "-0.04em" }}>
            SYNTHESIZER
          </div>
        </div>

        <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
          {SYNTH_LIST.map((s, i) => (
            <button key={s.slug} onClick={() => setSlug(s.slug)} style={{
              padding: "0 14px",
              background: slug === s.slug ? YELLOW : PANEL,
              color: slug === s.slug ? BG : DIM,
              border: `2px solid ${slug === s.slug ? YELLOW : BORDER}`,
              marginLeft: i === 0 ? 0 : -2,
              fontSize: 10, fontWeight: 900,
              cursor: "pointer", letterSpacing: "0.12em", textTransform: "uppercase",
            }}>
              {s.name}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto" }}>
          {!isStarted ? (
            <button onClick={startAudio} style={{
              padding: "10px 18px", background: YELLOW, color: BG,
              border: "none", fontSize: 10, fontWeight: 900, cursor: "pointer",
              letterSpacing: "0.2em", textTransform: "uppercase",
            }}>
              ENABLE
            </button>
          ) : (
            <div style={{ fontSize: 10, fontWeight: 700, color: YELLOW, letterSpacing: "0.25em" }}>
              ● LIVE
            </div>
          )}
        </div>
      </div>

      {/* Label strip */}
      <div style={{ background: "#141400", borderBottom: `2px solid ${YELLOW}22`, padding: "7px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: YELLOW, letterSpacing: "0.2em", textTransform: "uppercase" }}>
          {config.name}
        </span>
        <span style={{ fontSize: 9, color: DIM, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {config.engineType}
        </span>
      </div>

      {/* Controls */}
      <div style={{ padding: "0 24px 16px", display: "flex", flexWrap: "wrap", gap: 0 }}>
        {[...groups.entries()].map(([group, defs]) => (
          <div key={group} style={{ borderRight: `2px solid ${BORDER}`, borderBottom: `2px solid ${BORDER}`, padding: "16px 18px", minWidth: 150 }}>
            <div style={{ fontSize: 8, fontWeight: 900, color: YELLOW, letterSpacing: "0.3em", textTransform: "uppercase", borderBottom: `2px solid ${YELLOW}22`, paddingBottom: 8, marginBottom: 12 }}>
              {group}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, alignItems: "flex-start" }}>
              {defs.map((def) => {
                const val = params[def.key];
                if (def.type === "select") return <div key={def.key} style={{ width: "100%" }}><WaveSelect def={def} value={(val as string) ?? (def.defaultValue as string)} onChange={(v) => setParam(def.key, v)} /></div>;
                if (def.type === "fader") return <div key={def.key} style={{ width: "100%" }}><Fader def={def} value={(val as number) ?? (def.defaultValue as number)} onChange={(v) => setParam(def.key, v)} /></div>;
                return <Param key={def.key} def={def} value={(val as number) ?? (def.defaultValue as number)} onChange={(v) => setParam(def.key, v)} />;
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Keyboard */}
      <div style={{ borderTop: `4px solid ${BORDER}`, padding: "14px 24px", display: "flex", justifyContent: "center", overflowX: "auto", background: PANEL }}>
        <SynthKeyboard onNoteOn={noteOn} onNoteOff={noteOff} startOctave={3} octaves={3}
          whiteKeyWidth={36} whiteKeyHeight={100} whiteColor="#2a2a2a" blackColor="#080808"
          activeColor={YELLOW} borderColor={BORDER} showKeyLabels />
      </div>

      {!isReady && isStarted && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(8,8,8,0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ border: `4px solid ${YELLOW}`, padding: "24px 40px", background: BG }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: YELLOW, letterSpacing: "0.3em" }}>LOADING</div>
          </div>
        </div>
      )}
    </div>
  );
}
