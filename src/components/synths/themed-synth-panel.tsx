"use client";

/**
 * ThemedSynthPanel
 *
 * Normal mode (focusedGroup = null): full synth, all groups in a scrollable
 * grid. Always fills 100% of the container height.
 *
 * Focused lesson mode (focusedGroup set): zoomed-in section fills the panel;
 * other groups collapsed to a mini chip strip at the top.
 *
 * Zoom sequence is managed by the parent (lesson-page-client) via zoomPhase
 * state — it passes focusedGroup=null during "full" phase, then the real
 * group name once it's time to zoom in.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAudioContext } from "@/providers/audio-provider";
import { getParamDefs, groupParamDefs } from "@/lib/synth-engine";
import type { EngineType, ParamDef } from "@/lib/synth-engine";
import type { ParamValues } from "@/lib/synth-engine";
import { SynthKeyboard } from "./shared/keyboard";
import { useDrag } from "./styles/use-drag";

// ─── Arc math ─────────────────────────────────────────────────────────────────

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

// ─── Auto-play loop hook ───────────────────────────────────────────────────────

const ARPEGGIO = ["C4", "E4", "G4", "B4", "C5", "G4", "E4", "C4"];
const NOTE_GAP = 300;  // ms between note onsets
const NOTE_DUR = 240;  // ms note stays on

function useAutoPlay(
  onNoteOn: (note: string, velocity: number) => void,
  onNoteOff: (note: string) => void,
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const offTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const indexRef = useRef(0);

  const stopLoop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    offTimersRef.current.forEach(clearTimeout);
    offTimersRef.current = [];
    // silence any lingering notes
    ARPEGGIO.forEach((n) => onNoteOff(n));
    setIsPlaying(false);
  }, [onNoteOff]);

  const startLoop = useCallback(() => {
    indexRef.current = 0;
    setIsPlaying(true);

    const fireNote = () => {
      const note = ARPEGGIO[indexRef.current % ARPEGGIO.length];
      indexRef.current++;
      onNoteOn(note, 0.65);
      const t = setTimeout(() => onNoteOff(note), NOTE_DUR);
      offTimersRef.current.push(t);
    };

    fireNote(); // immediate first note
    intervalRef.current = setInterval(fireNote, NOTE_GAP);
  }, [onNoteOn, onNoteOff]);

  const toggle = useCallback(() => {
    if (isPlaying) stopLoop(); else startLoop();
  }, [isPlaying, stopLoop, startLoop]);

  // cleanup on unmount
  useEffect(() => () => stopLoop(), [stopLoop]);

  return { toggle, isPlaying };
}

// ─── Knob ──────────────────────────────────────────────────────────────────────

function ThemedKnob({
  def, value, onChange, large = false,
}: { def: ParamDef; value: number; onChange: (v: number) => void; large?: boolean }) {
  const { dragging, bind } = useDrag({ value, min: def.min, max: def.max, step: def.step, onChange });
  const norm = Math.max(0, Math.min(1, (value - def.min) / (def.max - def.min)));
  const sz = large ? 80 : 60;
  const cx = sz / 2; const cy = sz / 2; const r = sz / 2 - 7;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, userSelect: "none", touchAction: "none" }}>
      <svg width={sz} height={sz} style={{ cursor: dragging ? "ns-resize" : "pointer", display: "block" }}
        {...(bind as React.SVGAttributes<SVGSVGElement>)}>
        <path d={describeArc(cx, cy, r, A0, A1)} fill="none" stroke="var(--border)" strokeWidth={2} strokeLinecap="round" />
        {norm > 0.005 && (
          <path d={describeArc(cx, cy, r, A0, A0 + norm * (A1 - A0))}
            fill="none" stroke="var(--primary)" strokeWidth={large ? 3 : 2.5} strokeLinecap="round" />
        )}
        <circle cx={cx} cy={cy} r={r * 0.65} fill="var(--card)" stroke="var(--border)" strokeWidth={1} />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={large ? 12 : 10} fontWeight={700}
          fill={dragging ? "var(--primary)" : "var(--foreground)"}
          style={{ fontVariantNumeric: "tabular-nums", fontFamily: "inherit" }}>
          {fmtVal(value, def.step ?? 0.01)}
        </text>
      </svg>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: large ? 10 : 9, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {def.label}
        </div>
        {def.unit && <div style={{ fontSize: large ? 9 : 8, color: "var(--muted-foreground)" }}>{def.unit}</div>}
      </div>
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

function ThemedSelect({
  def, value, onChange, large = false,
}: { def: ParamDef; value: string; onChange: (v: string) => void; large?: boolean }) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{
        fontSize: large ? 11 : 9, fontWeight: 700,
        color: "var(--muted-foreground)", letterSpacing: "0.12em",
        textTransform: "uppercase", marginBottom: large ? 14 : 8,
      }}>
        {def.label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
        {(def.options ?? []).map((o, i) => (
          <button key={o} onClick={() => onChange(o)} style={{
            flex: "1 1 auto",
            padding: large ? "14px 12px" : "6px 10px",
            background: value === o ? "var(--foreground)" : "transparent",
            color: value === o ? "var(--background)" : "var(--muted-foreground)",
            border: "1px solid var(--border)",
            borderLeft: i === 0 ? "1px solid var(--border)" : "none",
            fontSize: large ? 13 : 10, fontWeight: 700,
            cursor: "pointer", letterSpacing: "0.04em",
            fontFamily: "inherit",
            transition: "background 0.15s, color 0.15s",
          }}>
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
        <div style={{ position: "absolute", top: -5, left: `${norm * 100}%`, transform: "translateX(-50%)", width: 2, height: 12, background: "var(--foreground)" }} />
        <input type="range" min={def.min} max={def.max} step={def.step ?? 1} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: 20, top: -10 }} />
      </div>
    </div>
  );
}

// ─── Lock overlay ─────────────────────────────────────────────────────────────

function GroupLockOverlay({ lessonName, synthSlug }: { lessonName: string; synthSlug?: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "color-mix(in srgb, var(--background) 82%, transparent)",
      backdropFilter: "blur(2px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 8, zIndex: 10, padding: 16,
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Locked</div>
        <div style={{ fontSize: 10, color: "var(--muted-foreground)", lineHeight: 1.4 }}>Unlock in</div>
        <Link href={synthSlug ? `/learn/${synthSlug}` : "/learn"}
          style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textDecoration: "none", letterSpacing: "0.02em", lineHeight: 1.4 }}>
          {lessonName}
        </Link>
      </div>
    </div>
  );
}

// ─── Play / Stop button ────────────────────────────────────────────────────────

function PlayButton({ onToggle, isPlaying }: { onToggle: () => void; isPlaying: boolean }) {
  return (
    <button onClick={onToggle} style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 28px",
      background: isPlaying ? "var(--foreground)" : "var(--primary)",
      color: isPlaying ? "var(--background)" : "var(--primary-foreground)",
      border: "none", borderRadius: "var(--radius)",
      fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
      cursor: "pointer", fontFamily: "inherit",
      transition: "background 0.2s, color 0.2s",
    }}>
      <svg width="10" height="11" viewBox="0 0 10 11" fill="currentColor">
        {isPlaying
          ? <><rect x="1" y="1" width="3" height="9" /><rect x="6" y="1" width="3" height="9" /></>
          : <polygon points="0,0 10,5.5 0,11" />
        }
      </svg>
      {isPlaying ? "Stop" : "Play"}
    </button>
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
  paramLessonMap: Record<string, string>;
  isReady: boolean;
  synthName: string;
  synthSlug?: string;
  /** Lesson mode: which group gets the spotlight. null = show full synth. */
  focusedGroup?: string | null;
}

export function ThemedSynthPanel({
  engineType, params, onParamChange, onNoteOn, onNoteOff,
  unlockedParams, paramLessonMap, isReady, synthName, synthSlug,
  focusedGroup,
}: ThemedSynthPanelProps) {
  const { isStarted, startAudio } = useAudioContext();
  const groups = groupParamDefs(getParamDefs(engineType));
  const { toggle, isPlaying } = useAutoPlay(onNoteOn, onNoteOff);

  const isParamLocked = (key: string) => unlockedParams != null && !unlockedParams.includes(key);
  const isGroupLocked = (defs: ParamDef[]) => defs.some((d) => isParamLocked(d.key));
  const groupLessonName = (defs: ParamDef[]): string => {
    const first = defs.find((d) => isParamLocked(d.key));
    return first ? (paramLessonMap[first.key] ?? "a lesson") : "";
  };

  // ── Audio prompt ──────────────────────────────────────────────────────────
  if (!isStarted) {
    return (
      <div style={{
        height: "100%", border: "1px solid var(--border)", background: "var(--card)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 16, padding: "40px 32px", textAlign: "center",
      }}>
        <div style={{ height: 3, width: 48, background: "var(--primary)", marginBottom: 8 }} />
        <div style={{ fontSize: 22, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.03em" }}>{synthName}</div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 280 }}>Tap to enable audio and begin the lesson.</p>
        <button onClick={startAudio} style={{
          padding: "14px 32px", background: "var(--primary)", color: "var(--primary-foreground)",
          border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
          letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "inherit",
          borderRadius: "var(--radius)",
        }}>Enable Audio</button>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!isReady) {
    return (
      <div style={{
        height: "100%", border: "1px solid var(--border)", background: "var(--card)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 12, padding: "40px 32px",
      }}>
        <div style={{ height: 3, width: 48, background: "var(--primary)" }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--foreground)" }}>Loading engine…</div>
      </div>
    );
  }

  // ── FOCUSED LESSON MODE ───────────────────────────────────────────────────
  if (focusedGroup) {
    const focusedDefs = focusedGroup !== "Keyboard" ? (groups.get(focusedGroup) ?? []) : [];
    const otherGroups = [...groups.entries()].filter(([g]) => g !== focusedGroup);
    const focusLocked = focusedGroup !== "Keyboard" && isGroupLocked(focusedDefs);

    return (
      <div style={{
        height: "100%", display: "flex", flexDirection: "column",
        border: "1px solid var(--border)", background: "var(--background)",
        overflow: "hidden",
      }}>
        <div style={{ height: 3, background: "var(--primary)", flexShrink: 0 }} />

        {/* Other-group chips */}
        <div style={{
          display: "flex", gap: 6, overflowX: "auto", padding: "8px 12px",
          flexShrink: 0, borderBottom: "1px solid var(--border)", scrollbarWidth: "none",
        }}>
          {otherGroups.map(([group, defs], i) => {
            const locked = isGroupLocked(defs);
            return (
              <div key={group} style={{
                padding: "3px 8px",
                background: locked ? "transparent" : "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: "calc(var(--radius) * 0.6)",
                fontSize: 8, fontWeight: 700, color: "var(--muted-foreground)",
                letterSpacing: "0.12em", textTransform: "uppercase",
                whiteSpace: "nowrap", flexShrink: 0,
                display: "flex", alignItems: "center", gap: 3,
                opacity: locked ? 0.45 : 0.7,
                animation: `chip-fade-in 0.3s ${i * 0.04}s ease-out both`,
              }}>
                {locked && (
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
                {group}
              </div>
            );
          })}
        </div>

        {/* Keyboard focus */}
        {focusedGroup === "Keyboard" ? (
          <div style={{
            flex: 1, overflow: "hidden",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 24, padding: "16px 12px",
            animation: "group-focus-in 0.5s 0.15s ease-out both",
          }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.3em", textTransform: "uppercase" }}>
              Keyboard
            </div>
            <div style={{ overflowX: "auto", maxWidth: "100%", scrollbarWidth: "none" }}>
              <SynthKeyboard
                onNoteOn={(note) => onNoteOn(note, 0.8)} onNoteOff={onNoteOff}
                startOctave={3} octaves={3}
                whiteKeyWidth={40} whiteKeyHeight={110}
                whiteColor="var(--card)" blackColor="var(--foreground)"
                activeColor="var(--primary)" borderColor="var(--border)"
                showKeyLabels
              />
            </div>
            <PlayButton onToggle={toggle} isPlaying={isPlaying} />
          </div>
        ) : (
          /* Section focus */
          <div style={{
            flex: 1, overflow: "auto", padding: "24px 28px",
            position: "relative",
            display: "flex", flexDirection: "column", gap: 24,
            animation: "group-focus-in 0.5s 0.15s ease-out both",
          }}>
            <div>
              <div style={{ height: 2, background: focusLocked ? "var(--border)" : "var(--primary)", marginBottom: 8 }} />
              <div style={{
                fontSize: 9, fontWeight: 700,
                color: focusLocked ? "var(--muted-foreground)" : "var(--primary)",
                letterSpacing: "0.3em", textTransform: "uppercase",
              }}>
                {focusedGroup}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center", alignItems: "flex-start" }}>
              {focusedDefs.map((def) => {
                const val = params[def.key] ?? def.defaultValue;
                if (def.type === "select") return (
                  <div key={def.key} style={{ width: "100%" }}>
                    <ThemedSelect def={def} value={String(val)} onChange={(v) => onParamChange(def.key, v)} large />
                  </div>
                );
                if (def.type === "fader") return (
                  <div key={def.key} style={{ width: "100%", paddingTop: 4 }}>
                    <ThemedFader def={def} value={Number(val)} onChange={(v) => onParamChange(def.key, v)} />
                  </div>
                );
                return <ThemedKnob key={def.key} def={def} value={Number(val)} onChange={(v) => onParamChange(def.key, v)} large />;
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
              <PlayButton onToggle={toggle} isPlaying={isPlaying} />
            </div>

            {focusLocked && <GroupLockOverlay lessonName={groupLessonName(focusedDefs)} synthSlug={synthSlug} />}
          </div>
        )}
      </div>
    );
  }

  // ── NORMAL MODE — full synth, fills container height ─────────────────────
  return (
    <div style={{
      height: "100%",
      display: "flex", flexDirection: "column",
      border: "1px solid var(--border)", background: "var(--background)",
      overflow: "hidden",
    }}>
      <div style={{ height: 4, background: "var(--primary)", flexShrink: 0 }} />

      {/* Header */}
      <div style={{
        padding: "10px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.03em" }}>
          {synthName}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)" }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.2em", textTransform: "uppercase" }}>Live</span>
        </div>
      </div>

      {/* Groups — scrollable, fills remaining space */}
      <div style={{
        flex: 1, overflow: "auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        alignContent: "start",
      }}>
        {[...groups.entries()].map(([group, defs]) => {
          const locked = isGroupLocked(defs);
          const lessonName = locked ? groupLessonName(defs) : "";
          return (
            <div key={group} data-group={group} style={{
              position: "relative",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              padding: "14px 16px",
            }}>
              <div style={{ height: 2, background: locked ? "var(--border)" : "var(--primary)", marginBottom: 6 }} />
              <div style={{
                fontSize: 8, fontWeight: 700,
                color: locked ? "var(--muted-foreground)" : "var(--primary)",
                letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 12,
              }}>
                {group}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
                {defs.map((def) => {
                  const val = params[def.key] ?? def.defaultValue;
                  if (def.type === "select") return (
                    <div key={def.key} style={{ width: "100%" }}>
                      <ThemedSelect def={def} value={String(val)} onChange={(v) => onParamChange(def.key, v)} />
                    </div>
                  );
                  if (def.type === "fader") return (
                    <div key={def.key} style={{ width: "100%", paddingTop: 4 }}>
                      <ThemedFader def={def} value={Number(val)} onChange={(v) => onParamChange(def.key, v)} />
                    </div>
                  );
                  return <ThemedKnob key={def.key} def={def} value={Number(val)} onChange={(v) => onParamChange(def.key, v)} />;
                })}
              </div>
              {locked && <GroupLockOverlay lessonName={lessonName} synthSlug={synthSlug} />}
            </div>
          );
        })}
      </div>

      {/* Keyboard strip */}
      <div data-group="Keyboard" style={{
        borderTop: "1px solid var(--border)", padding: "14px 20px",
        display: "flex", justifyContent: "center", overflowX: "auto",
        background: "var(--card)", flexShrink: 0, scrollbarWidth: "none",
      }}>
        <SynthKeyboard
          onNoteOn={(note) => onNoteOn(note, 0.8)} onNoteOff={onNoteOff}
          startOctave={3} octaves={3}
          whiteKeyWidth={34} whiteKeyHeight={90}
          whiteColor="var(--card)" blackColor="var(--foreground)"
          activeColor="var(--primary)" borderColor="var(--border)"
          showKeyLabels
        />
      </div>
    </div>
  );
}
