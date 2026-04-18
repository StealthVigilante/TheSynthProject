"use client";

/**
 * V4 — CRT TERMINAL
 * 1983. You're running synth software on a green phosphor monitor.
 * Everything is monospace. Scanlines. ASCII borders. Glow.
 * Parameters are text lines you drag. The keyboard shows as ASCII art.
 */

import { useState } from "react";
import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { getParamDefs, groupParamDefs } from "@/lib/synth-engine";
import type { EngineType, ParamDef } from "@/lib/synth-engine";
import { SYNTH_CONFIGS, SYNTH_LIST, type SynthSlug } from "../configs";
import { SynthKeyboard } from "../shared/keyboard";
import { useDrag } from "./use-drag";

// CRT phosphor colors — green or amber choice
const GREEN = "#33ff33";
const DIM = "#1a8a1a";
const BG = "#000800";
const AMBER = false; // set true for amber mode

const FG = AMBER ? "#ff9900" : GREEN;
const FG_DIM = AMBER ? "#884400" : DIM;
const BG_COL = AMBER ? "#080400" : BG;

const GLOW_STYLE = {
  textShadow: `0 0 6px ${FG}, 0 0 12px ${FG}60`,
  color: FG,
};

const DIM_STYLE = {
  color: FG_DIM,
};

// --- ASCII progress bar ---
function progressBar(norm: number, width = 12): string {
  const filled = Math.round(norm * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

// --- CRT Parameter line (draggable) ---
function CRTParam({ def, value, onChange }: { def: ParamDef; value: number; onChange: (v: number) => void }) {
  const { dragging, bind } = useDrag({ value, min: def.min, max: def.max, step: def.step, onChange });
  const norm = Math.max(0, Math.min(1, (value - def.min) / (def.max - def.min)));

  const fmt = (v: number) =>
    Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);

  const label = def.label.toUpperCase().padEnd(14, " ");
  const bar = progressBar(norm);
  const valStr = `${fmt(value)}${def.unit ?? ""}`.padStart(8, " ");

  return (
    <div
      style={{
        fontFamily: "monospace",
        fontSize: 12,
        cursor: "ns-resize",
        userSelect: "none",
        touchAction: "none",
        padding: "3px 0",
        display: "flex",
        alignItems: "center",
        gap: 0,
        ...GLOW_STYLE,
        ...(dragging ? { background: `${FG}18` } : {}),
      }}
      {...(bind as React.HTMLAttributes<HTMLDivElement>)}
    >
      <span style={{ ...DIM_STYLE, marginRight: 2 }}>{label}</span>
      <span style={{ letterSpacing: "0.05em" }}>[{bar}]</span>
      <span style={{ ...DIM_STYLE, minWidth: 80, textAlign: "right" }}>{valStr}</span>
    </div>
  );
}

// --- CRT Wave Select ---
function CRTWaveSelect({ def, value, onChange }: { def: ParamDef; value: string; onChange: (v: string) => void }) {
  const opts = def.options ?? [];
  return (
    <div style={{ fontFamily: "monospace", fontSize: 12 }}>
      <span style={DIM_STYLE}>{def.label.toUpperCase().padEnd(14, " ")}</span>
      <span style={GLOW_STYLE}>{"["}</span>
      {opts.map((o, i) => (
        <span key={o}>
          {i > 0 && <span style={DIM_STYLE}>{"|"}</span>}
          <span
            onClick={() => onChange(o)}
            style={{
              cursor: "pointer",
              fontFamily: "monospace",
              padding: "0 4px",
              ...(value === o
                ? { ...GLOW_STYLE, background: `${FG}20` }
                : DIM_STYLE),
            }}
          >
            {value === o ? `>${o}<` : o}
          </span>
        </span>
      ))}
      <span style={GLOW_STYLE}>{"]"}</span>
    </div>
  );
}

// --- CRT Fader ---
function CRTFader({ def, value, onChange }: { def: ParamDef; value: number; onChange: (v: number) => void }) {
  const norm = (value - def.min) / (def.max - def.min);
  const bar = progressBar(norm, 20);
  const label = def.label.toUpperCase().padEnd(14, " ");
  return (
    <div style={{ fontFamily: "monospace", fontSize: 12, padding: "3px 0", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0, ...GLOW_STYLE }}>
        <span style={{ ...DIM_STYLE, marginRight: 2 }}>{label}</span>
        <span style={{ letterSpacing: "0.05em" }}>[{bar}]</span>
        <span style={{ ...DIM_STYLE, minWidth: 80, textAlign: "right" }}> {value.toFixed(0)}{def.unit}</span>
      </div>
      <input
        type="range" min={def.min} max={def.max} step={def.step ?? 1} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
      />
    </div>
  );
}

// --- ASCII box border ---
function ASCIIBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "monospace" }}>
      <div style={{ ...GLOW_STYLE, fontSize: 11 }}>
        {"┌─ "}<span style={{ fontWeight: 700 }}>{title.toUpperCase()}</span>{" "}
        {"─".repeat(Math.max(0, 28 - title.length))}{"┐"}
      </div>
      <div style={{ padding: "4px 0 4px 4px", borderLeft: `1px solid ${FG}30`, marginLeft: 1 }}>
        {children}
      </div>
      <div style={{ ...GLOW_STYLE, fontSize: 11 }}>
        {"└"}{"─".repeat(30)}{"┘"}
      </div>
    </div>
  );
}

// --- Main Component ---
export function V4CRT() {
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
    <div style={{
      background: BG_COL,
      minHeight: "100vh",
      fontFamily: "monospace",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* CRT scanline overlay */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: `repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)`,
        pointerEvents: "none",
        zIndex: 10,
      }} />

      {/* CRT vignette */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.5) 100%)",
        pointerEvents: "none",
        zIndex: 11,
      }} />

      <div style={{ padding: "16px 20px", position: "relative", zIndex: 1 }}>
        {/* Boot header */}
        <div style={{ marginBottom: 16, fontSize: 11, ...GLOW_STYLE }}>
          <div style={{ borderBottom: `1px solid ${FG}40`, paddingBottom: 8, marginBottom: 8 }}>
            {"████████████████████████████████████████████"}
          </div>
          <div>OSCISCOOPS SYNTHESIZER SYSTEM v2.4.1</div>
          <div style={DIM_STYLE}>COPYRIGHT (C) 1983 OSCISCOOPS INC. ALL RIGHTS RESERVED.</div>
          <div style={DIM_STYLE}>(C) LICENSED FIRMWARE BUILD 2026-04-15</div>
          <div style={{ marginTop: 4 }}>
            AUDIO ENGINE:{" "}
            <span style={isStarted ? GLOW_STYLE : DIM_STYLE}>
              {isStarted ? "[ONLINE]" : "[OFFLINE]"}
            </span>
            {!isStarted && (
              <span
                onClick={startAudio}
                style={{ ...GLOW_STYLE, cursor: "pointer", marginLeft: 12, textDecoration: "underline" }}
              >
                &gt; ENABLE AUDIO
              </span>
            )}
          </div>
        </div>

        {/* Synth selector */}
        <div style={{ marginBottom: 12, fontSize: 11 }}>
          <span style={DIM_STYLE}>SELECT INSTRUMENT: </span>
          {SYNTH_LIST.map((s, i) => (
            <span key={s.slug}>
              {i > 0 && <span style={DIM_STYLE}> | </span>}
              <span
                onClick={() => setSlug(s.slug)}
                style={{
                  ...(slug === s.slug ? GLOW_STYLE : DIM_STYLE),
                  cursor: "pointer",
                  fontWeight: slug === s.slug ? 700 : 400,
                }}
              >
                {slug === s.slug ? `[${s.name.toUpperCase()}]` : s.name.toUpperCase()}
              </span>
            </span>
          ))}
        </div>

        {/* Current synth header */}
        <ASCIIBox title={`${config.name} — ${config.tagline}`}>
          <div style={{ fontSize: 11, ...DIM_STYLE, padding: "4px 0 8px" }}>
            {config.description}
          </div>
        </ASCIIBox>

        <div style={{ marginTop: 12 }} />

        {/* Parameter groups */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
          {[...groups.entries()].map(([group, groupDefs]) => (
            <ASCIIBox key={group} title={group}>
              {groupDefs.map((def) => {
                const val = params[def.key];
                if (def.type === "select") {
                  return (
                    <CRTWaveSelect
                      key={def.key}
                      def={def}
                      value={(val as string) ?? (def.defaultValue as string)}
                      onChange={(v) => setParam(def.key, v)}
                    />
                  );
                }
                if (def.type === "fader") {
                  return (
                    <CRTFader
                      key={def.key}
                      def={def}
                      value={(val as number) ?? (def.defaultValue as number)}
                      onChange={(v) => setParam(def.key, v)}
                    />
                  );
                }
                return (
                  <CRTParam
                    key={def.key}
                    def={def}
                    value={(val as number) ?? (def.defaultValue as number)}
                    onChange={(v) => setParam(def.key, v)}
                  />
                );
              })}
            </ASCIIBox>
          ))}
        </div>

        {/* Help text */}
        <div style={{ marginTop: 12, fontSize: 10, ...DIM_STYLE }}>
          &gt; DRAG PARAMETERS VERTICALLY TO CHANGE VALUE. HOLD SHIFT FOR FINE CONTROL.
          <br />
          &gt; USE KEYBOARD: A-J FOR NOTES (C4-B4), W/E/T/Y/U FOR SHARPS.
        </div>

        {/* Keyboard */}
        <div style={{ marginTop: 16, borderTop: `1px solid ${FG}30`, paddingTop: 12 }}>
          <div style={{ fontSize: 10, ...DIM_STYLE, marginBottom: 8 }}>
            {"┌─ KEYBOARD ─────────────────────────────────┐"}
          </div>
          <div style={{ display: "flex", justifyContent: "center", overflowX: "auto" }}>
            <SynthKeyboard
              onNoteOn={noteOn}
              onNoteOff={noteOff}
              startOctave={3}
              octaves={3}
              whiteKeyWidth={32}
              whiteKeyHeight={88}
              whiteColor="#0d2a0d"
              blackColor="#010801"
              activeColor={FG}
              borderColor={`${FG}40`}
              showKeyLabels
            />
          </div>
        </div>
      </div>

      {!isReady && isStarted && (
        <div style={{ position: "fixed", inset: 0, background: `rgba(0,8,0,0.95)`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, fontFamily: "monospace" }}>
          <div style={{ ...GLOW_STYLE, fontSize: 14 }}>
            &gt; LOADING ENGINE<span className="animate-pulse">_</span>
          </div>
        </div>
      )}
    </div>
  );
}
