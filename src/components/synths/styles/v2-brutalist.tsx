"use client";

/**
 * V2 — BRUTALIST
 * Maximally raw. No decoration, no skeuomorphism, no gradients.
 * Controls are big draggable numbers. Borders are thick black rules.
 * Typography does all the work. Unsettling, confrontational, honest.
 */

import { useState } from "react";
import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { getParamDefs, groupParamDefs } from "@/lib/synth-engine";
import type { EngineType, ParamDef } from "@/lib/synth-engine";
import { SYNTH_CONFIGS, SYNTH_LIST, type SynthSlug } from "../configs";
import { SynthKeyboard } from "../shared/keyboard";
import { useDrag } from "./use-drag";

const BG = "#f0ebe2";
const BLACK = "#0a0a0a";
const RED = "#dd1100";

// --- Brutalist draggable number ---
function BrutalistParam({ def, value, onChange }: { def: ParamDef; value: number; onChange: (v: number) => void }) {
  const { dragging, bind } = useDrag({ value, min: def.min, max: def.max, step: def.step, onChange });

  const fmt = (v: number) =>
    Math.abs(v) >= 1000
      ? `${(v / 1000).toFixed(1)}k`
      : Math.abs(v) >= 10
        ? v.toFixed(1)
        : v.toFixed(2);

  const norm = (value - def.min) / (def.max - def.min);

  return (
    <div
      style={{
        border: `3px solid ${BLACK}`,
        background: dragging ? BLACK : BG,
        padding: "10px 12px",
        cursor: "ns-resize",
        userSelect: "none",
        touchAction: "none",
        minWidth: 90,
        position: "relative",
      }}
      {...(bind as React.HTMLAttributes<HTMLDivElement>)}
    >
      {/* Progress bar along bottom */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0,
        height: 4,
        width: `${norm * 100}%`,
        background: RED,
      }} />
      <div style={{
        fontSize: 28,
        fontWeight: 900,
        fontFamily: "monospace",
        color: dragging ? BG : BLACK,
        lineHeight: 1,
        letterSpacing: "-0.02em",
      }}>
        {fmt(value)}
        {def.unit && (
          <span style={{ fontSize: 13, marginLeft: 2, fontWeight: 400, color: dragging ? "#aaa" : "#666" }}>
            {def.unit}
          </span>
        )}
      </div>
      <div style={{
        fontSize: 9,
        fontFamily: "monospace",
        fontWeight: 700,
        color: dragging ? "#888" : "#444",
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        marginTop: 4,
      }}>
        {def.label}
      </div>
    </div>
  );
}

// --- Brutalist wave select ---
function BrutalistWaveSelect({ def, value, onChange }: { def: ParamDef; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ borderBottom: `3px solid ${BLACK}`, paddingBottom: 12, marginBottom: 4 }}>
      <div style={{ fontSize: 9, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#555", marginBottom: 8 }}>
        {def.label}
      </div>
      <div style={{ display: "flex", gap: 0 }}>
        {(def.options ?? []).map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              padding: "8px 14px",
              background: value === o ? BLACK : BG,
              color: value === o ? BG : BLACK,
              border: `3px solid ${BLACK}`,
              marginLeft: -3,
              fontSize: 11,
              fontFamily: "monospace",
              fontWeight: 900,
              cursor: "pointer",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Brutalist fader ---
function BrutalistFader({ def, value, onChange }: { def: ParamDef; value: number; onChange: (v: number) => void }) {
  const norm = (value - def.min) / (def.max - def.min);
  return (
    <div style={{ borderTop: `3px solid ${BLACK}`, paddingTop: 10, marginTop: 4, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 9, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#444" }}>
          {def.label}
        </span>
        <span style={{ fontSize: 22, fontFamily: "monospace", fontWeight: 900, color: BLACK }}>
          {value.toFixed(0)}{def.unit}
        </span>
      </div>
      <div style={{ position: "relative", height: 12, background: BG, border: `3px solid ${BLACK}` }}>
        <div style={{ position: "absolute", inset: 0, width: `${norm * 100}%`, background: BLACK }} />
        <input
          type="range"
          min={def.min} max={def.max} step={def.step ?? 1} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
        />
      </div>
    </div>
  );
}

// --- Main Component ---
export function V2Brutalist() {
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
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "monospace" }}>
      {/* Header */}
      <div style={{
        borderBottom: `6px solid ${BLACK}`,
        padding: "16px 24px",
        display: "flex",
        alignItems: "stretch",
        gap: 0,
      }}>
        <div style={{ borderRight: `6px solid ${BLACK}`, paddingRight: 20, marginRight: 20 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: BLACK, lineHeight: 1, letterSpacing: "-0.04em" }}>
            OSCISCOOPS
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: RED, letterSpacing: "0.3em", textTransform: "uppercase", marginTop: 2 }}>
            SYNTHESIZER
          </div>
        </div>

        {/* Synth tabs */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 0, flex: 1 }}>
          {SYNTH_LIST.map((s, i) => (
            <button
              key={s.slug}
              onClick={() => setSlug(s.slug)}
              style={{
                padding: "0 16px",
                background: slug === s.slug ? BLACK : BG,
                color: slug === s.slug ? BG : BLACK,
                border: `3px solid ${BLACK}`,
                marginLeft: i === 0 ? 0 : -3,
                fontSize: 11,
                fontWeight: 900,
                cursor: "pointer",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Audio */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          {!isStarted ? (
            <button
              onClick={startAudio}
              style={{
                padding: "12px 20px",
                background: RED,
                color: "#fff",
                border: `3px solid ${BLACK}`,
                fontSize: 11,
                fontWeight: 900,
                cursor: "pointer",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              ENABLE AUDIO
            </button>
          ) : (
            <div style={{ fontSize: 11, fontWeight: 700, color: RED, letterSpacing: "0.2em" }}>
              ● LIVE
            </div>
          )}
        </div>
      </div>

      {/* Synth name banner */}
      <div style={{
        borderBottom: `3px solid ${BLACK}`,
        padding: "8px 24px",
        background: BLACK,
      }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: BG, letterSpacing: "0.3em", textTransform: "uppercase" }}>
          {config.name}
        </span>
        <span style={{ fontSize: 11, color: "#888", marginLeft: 16, letterSpacing: "0.1em" }}>
          {config.tagline.toUpperCase()}
        </span>
      </div>

      {/* Controls */}
      <div style={{ padding: "0 24px 16px", display: "flex", flexWrap: "wrap", gap: 0 }}>
        {[...groups.entries()].map(([group, groupDefs]) => (
          <div
            key={group}
            style={{
              borderRight: `3px solid ${BLACK}`,
              borderBottom: `3px solid ${BLACK}`,
              padding: "16px 20px",
              minWidth: 160,
            }}
          >
            <div style={{
              fontSize: 9,
              fontWeight: 900,
              color: RED,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              borderBottom: `3px solid ${BLACK}`,
              paddingBottom: 8,
              marginBottom: 12,
            }}>
              {group}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, alignItems: "flex-start" }}>
              {groupDefs.map((def) => {
                const val = params[def.key];
                if (def.type === "select") {
                  return (
                    <div key={def.key} style={{ width: "100%" }}>
                      <BrutalistWaveSelect
                        def={def}
                        value={(val as string) ?? (def.defaultValue as string)}
                        onChange={(v) => setParam(def.key, v)}
                      />
                    </div>
                  );
                }
                if (def.type === "fader") {
                  return (
                    <div key={def.key} style={{ width: "100%" }}>
                      <BrutalistFader def={def} value={(val as number) ?? (def.defaultValue as number)} onChange={(v) => setParam(def.key, v)} />
                    </div>
                  );
                }
                return (
                  <BrutalistParam
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
        borderTop: `6px solid ${BLACK}`,
        padding: "16px 24px",
        display: "flex",
        justifyContent: "center",
        overflowX: "auto",
        background: "#e8e2d8",
      }}>
        <SynthKeyboard
          onNoteOn={noteOn}
          onNoteOff={noteOff}
          startOctave={3}
          octaves={3}
          whiteKeyWidth={36}
          whiteKeyHeight={100}
          whiteColor="#f5f0e8"
          blackColor={BLACK}
          activeColor={RED}
          borderColor={BLACK}
          showKeyLabels
        />
      </div>

      {!isReady && isStarted && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(240,235,226,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ border: `6px solid ${BLACK}`, padding: "32px 48px", background: BG }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: BLACK, letterSpacing: "0.2em" }}>LOADING</div>
          </div>
        </div>
      )}
    </div>
  );
}
