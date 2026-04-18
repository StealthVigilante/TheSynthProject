"use client";

/**
 * ThemedSynthPanel
 * Renders any synth using the active CSS-variable theme.
 * Locked parameter groups get a single translucent overlay naming
 * the lesson that unlocks them — no per-knob padlocks.
 */

import Link from "next/link";
import { useAudioContext } from "@/providers/audio-provider";
import { getParamDefs, groupParamDefs } from "@/lib/synth-engine";
import type { EngineType, ParamDef } from "@/lib/synth-engine";
import type { ParamValues } from "@/lib/synth-engine";
import { SynthKeyboard } from "./shared/keyboard";
import { useDrag } from "./styles/use-drag";

// ─── Arc math ────────────────────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) };
}
function describeArc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const s = polarToXY(cx, cy, r, a0);
  const e = polarToXY(cx, cy, r, a1);
  return `M${s.x.toFixed(2)} ${s.y.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}
const A0 = (-135 * Math.PI) / 180;
const A1 = (135 * Math.PI) / 180;

function fmtVal(v: number, step: number) {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (step >= 1) return v.toFixed(0);
  if (step >= 0.1) return v.toFixed(1);
  return v.toFixed(2);
}

// ─── Knob ─────────────────────────────────────────────────────────────────────

function ThemedKnob({
  def, value, onChange,
}: { def: ParamDef; value: number; onChange: (v: number) => void }) {
  const { dragging, bind } = useDrag({ value, min: def.min, max: def.max, step: def.step, onChange });
  const norm = Math.max(0, Math.min(1, (value - def.min) / (def.max - def.min)));
  const sz = 60;
  const cx = sz / 2;
  const cy = sz / 2;
  const r = sz / 2 - 7;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, userSelect: "none", touchAction: "none" }}>
      <svg
        width={sz} height={sz}
        style={{ cursor: dragging ? "ns-resize" : "pointer", display: "block" }}
        {...(bind as React.SVGAttributes<SVGSVGElement>)}
      >
        <path d={describeArc(cx, cy, r, A0, A1)} fill="none" stroke="var(--border)" strokeWidth={2} strokeLinecap="round" />
        {norm > 0.005 && (
          <path
            d={describeArc(cx, cy, r, A0, A0 + norm * (A1 - A0))}
            fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round"
          />
        )}
        <circle cx={cx} cy={cy} r={r * 0.65} fill="var(--card)" stroke="var(--border)" strokeWidth={1} />
        <text
          x={cx} y={cy + 4} textAnchor="middle"
          fontSize={10} fontWeight={700} fill={dragging ? "var(--primary)" : "var(--foreground)"}
          style={{ fontVariantNumeric: "tabular-nums", fontFamily: "inherit" }}
        >
          {fmtVal(value, def.step ?? 0.01)}
        </text>
      </svg>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {def.label}
        </div>
        {def.unit && <div style={{ fontSize: 8, color: "var(--muted-foreground)" }}>{def.unit}</div>}
      </div>
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

function ThemedSelect({
  def, value, onChange,
}: { def: ParamDef; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
        {def.label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
        {(def.options ?? []).map((o, i) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              padding: "6px 12px",
              background: value === o ? "var(--foreground)" : "transparent",
              color: value === o ? "var(--background)" : "var(--muted-foreground)",
              border: "1px solid var(--border)",
              borderLeft: i === 0 ? "1px solid var(--border)" : "none",
              fontSize: 10, fontWeight: 700, cursor: "pointer",
              letterSpacing: "0.04em", fontFamily: "inherit",
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Fader ────────────────────────────────────────────────────────────────────

function ThemedFader({
  def, value, onChange,
}: { def: ParamDef; value: number; onChange: (v: number) => void }) {
  const norm = (value - def.min) / (def.max - def.min);
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {def.label}
        </span>
        <span style={{ fontSize: 18, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
          {fmtVal(value, def.step ?? 1)}
          {def.unit && <span style={{ fontSize: 10, fontWeight: 400, color: "var(--muted-foreground)", marginLeft: 3 }}>{def.unit}</span>}
        </span>
      </div>
      <div style={{ position: "relative", height: 2, background: "var(--border)" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: 2, width: `${norm * 100}%`, background: "var(--primary)" }} />
        <div style={{
          position: "absolute", top: -5, left: `${norm * 100}%`,
          transform: "translateX(-50%)", width: 2, height: 12,
          background: "var(--foreground)",
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

// ─── Group-level lock overlay ─────────────────────────────────────────────────

function GroupLockOverlay({ lessonName }: { lessonName: string }) {
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: "color-mix(in srgb, var(--background) 82%, transparent)",
      backdropFilter: "blur(2px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      zIndex: 10,
      padding: 16,
    }}>
      {/* Lock icon — drawn inline, no import needed */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
          Locked
        </div>
        <div style={{ fontSize: 10, color: "var(--muted-foreground)", lineHeight: 1.4 }}>
          Unlock in
        </div>
        <Link
          href="/learn/osci-mono"
          style={{
            fontSize: 11, fontWeight: 700, color: "var(--primary)",
            textDecoration: "none", letterSpacing: "0.02em", lineHeight: 1.4,
          }}
        >
          {lessonName}
        </Link>
      </div>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface ThemedSynthPanelProps {
  engineType: EngineType;
  params: ParamValues;
  onParamChange: (key: string, value: number | string) => void;
  onNoteOn: (note: string, velocity: number) => void;
  onNoteOff: (note: string) => void;
  unlockedParams?: string[] | null;
  /** Maps each param key to the lesson title that unlocks it */
  paramLessonMap: Record<string, string>;
  isReady: boolean;
  synthName: string;
}

export function ThemedSynthPanel({
  engineType, params, onParamChange, onNoteOn, onNoteOff,
  unlockedParams, paramLessonMap, isReady, synthName,
}: ThemedSynthPanelProps) {
  const { isStarted, startAudio } = useAudioContext();
  const groups = groupParamDefs(getParamDefs(engineType));

  /** A param is locked when unlockedParams is set and doesn't include it */
  const isParamLocked = (key: string) =>
    unlockedParams != null && !unlockedParams.includes(key);

  /** A group is locked when any of its params are locked */
  const isGroupLocked = (defs: ParamDef[]) =>
    defs.some((d) => isParamLocked(d.key));

  /** The lesson name to show for a locked group — uses the first locked param's lesson */
  const groupLessonName = (defs: ParamDef[]): string => {
    const first = defs.find((d) => isParamLocked(d.key));
    return first ? (paramLessonMap[first.key] ?? "a lesson") : "";
  };

  // ── Enable audio ──────────────────────────────────────────────────────────
  if (!isStarted) {
    return (
      <div style={{
        border: "1px solid var(--border)", background: "var(--card)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 16, padding: "64px 32px", textAlign: "center",
      }}>
        <div style={{ height: 3, width: 48, background: "var(--primary)", marginBottom: 8 }} />
        <div style={{ fontSize: 22, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.03em" }}>
          {synthName}
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 280 }}>
          Click to enable audio and start playing.
        </p>
        <button
          onClick={startAudio}
          style={{
            padding: "12px 28px", background: "var(--primary)", color: "var(--primary-foreground)",
            border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
            letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "inherit",
          }}
        >
          Enable Audio
        </button>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!isReady) {
    return (
      <div style={{
        border: "1px solid var(--border)", background: "var(--card)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 12, padding: "64px 32px",
      }}>
        <div style={{ height: 3, width: 48, background: "var(--primary)" }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--foreground)" }}>Loading engine…</div>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid var(--border)", background: "var(--background)" }}>
      {/* Accent bar */}
      <div style={{ height: 4, background: "var(--primary)" }} />

      {/* Synth name + live indicator */}
      <div style={{
        padding: "12px 24px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.03em" }}>
          {synthName}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)" }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Live
          </span>
        </div>
      </div>

      {/* Control groups */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {[...groups.entries()].map(([group, defs]) => {
          const locked = isGroupLocked(defs);
          const lessonName = locked ? groupLessonName(defs) : "";

          return (
            <div
              key={group}
              style={{
                position: "relative",
                borderRight: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                padding: "16px 20px",
              }}
            >
              {/* Group header */}
              <div style={{ height: 2, background: locked ? "var(--border)" : "var(--primary)", marginBottom: 8 }} />
              <div style={{
                fontSize: 8, fontWeight: 700,
                color: locked ? "var(--muted-foreground)" : "var(--primary)",
                letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 16,
              }}>
                {group}
              </div>

              {/* Controls */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
                {defs.map((def) => {
                  const val = params[def.key] ?? def.defaultValue;
                  if (def.type === "select") {
                    return (
                      <div key={def.key} style={{ width: "100%" }}>
                        <ThemedSelect def={def} value={String(val)} onChange={(v) => onParamChange(def.key, v)} />
                      </div>
                    );
                  }
                  if (def.type === "fader") {
                    return (
                      <div key={def.key} style={{ width: "100%", paddingTop: 4 }}>
                        <ThemedFader def={def} value={Number(val)} onChange={(v) => onParamChange(def.key, v)} />
                      </div>
                    );
                  }
                  return (
                    <ThemedKnob key={def.key} def={def} value={Number(val)} onChange={(v) => onParamChange(def.key, v)} />
                  );
                })}
              </div>

              {/* Group-level lock overlay */}
              {locked && <GroupLockOverlay lessonName={lessonName} />}
            </div>
          );
        })}
      </div>

      {/* Keyboard */}
      <div style={{
        borderTop: "1px solid var(--border)", padding: "20px 24px",
        display: "flex", justifyContent: "center", overflowX: "auto",
        background: "var(--card)",
      }}>
        <SynthKeyboard
          onNoteOn={(note) => onNoteOn(note, 0.8)} onNoteOff={onNoteOff}
          startOctave={3} octaves={3}
          whiteKeyWidth={36} whiteKeyHeight={100}
          whiteColor="var(--card)" blackColor="var(--foreground)"
          activeColor="var(--primary)" borderColor="var(--border)"
          showKeyLabels
        />
      </div>
    </div>
  );
}
