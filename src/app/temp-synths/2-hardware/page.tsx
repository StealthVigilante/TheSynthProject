"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { WaveformCanvas } from "../waveform-canvas";
import { SpectrumCanvas } from "../spectrum-canvas";
import { SynthShell } from "@/components/synths/shared/synth-shell";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Synth2Engine } from "../2/engine";

// ── Acid Green palette ──────────────────────────────────────────
const ACCENT     = "#39ff14";
const ACCENT_RGB = "57,255,20";
const CHB        = "#1a2e1a";    // chassis border
const FACEPLATE  = "#050c05";
const SEC_BG     = "#020602";
const SEC_BDR    = "#0d1a0d";
const LABEL      = "#1a5a1a";
// ────────────────────────────────────────────────────────────────

const MOBILE_THEME = { bg: "#020602", border: "#0d1a0d", panel: "#050c05" };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const KEY_NOTE_MAP: Record<string, [string, number]> = {
  a: ["C", 0],  w: ["C#", 0], s: ["D", 0],  e: ["D#", 0],
  d: ["E", 0],  f: ["F", 0],  t: ["F#", 0], g: ["G", 0],
  y: ["G#", 0], h: ["A", 0],  u: ["A#", 0], j: ["B", 0],
  k: ["C", 1],  o: ["C#", 1], l: ["D", 1],  p: ["D#", 1],
  ";": ["E", 1],
};

const TABS = [
  { id: "osc"    as const, label: "OSC"    },
  { id: "filter" as const, label: "FILTER" },
  { id: "env"    as const, label: "ENV"    },
  { id: "fx"     as const, label: "FX"     },
];

// ── Animated ADSR envelope curve ────────────────────────────────
interface EnvCurveProps {
  attack: number; decay: number; sustainLevel: number; release: number;
  noteOnMs: number | null; noteOffMs: number | null;
  width?: number; height?: number;
}

function EnvelopeCurve({ attack, decay, sustainLevel, release, noteOnMs, noteOffMs, width = 210, height = 78 }: EnvCurveProps) {
  const W = width, H = height;
  const top = 5, bot = H - 5;
  const maxT = Math.max(attack + decay + release, 2);
  const aX   = (attack / maxT) * (W * 0.65);
  const dX   = aX + (decay / maxT) * (W * 0.65);
  const sX   = dX + W * 0.16;
  const rEnd = Math.min(sX + (release / maxT) * (W * 0.65), W - 4);
  const susY = top + (1 - sustainLevel) * (bot - top);
  const d    = `M 0 ${bot} L ${aX} ${top} L ${dX} ${susY} L ${sX} ${susY} L ${rEnd} ${bot}`;
  const gY1  = top + (bot - top) * 0.33;
  const gY2  = top + (bot - top) * 0.66;

  const [dot, setDot] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: bot, visible: false });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (noteOnMs === null) {
      setDot((p) => p.visible ? { ...p, visible: false } : p);
      return;
    }
    const aMs = attack * 1000, dMs = decay * 1000, rMs = release * 1000;
    const tick = () => {
      const el = performance.now() - noteOnMs;
      if (noteOffMs === null) {
        if (el < aMs) {
          const t = el / aMs;
          setDot({ x: lerp(0, aX, t), y: lerp(bot, top, t), visible: true });
        } else if (el < aMs + dMs) {
          const t = (el - aMs) / dMs;
          setDot({ x: lerp(aX, dX, t), y: lerp(top, susY, t), visible: true });
        } else {
          setDot({ x: sX, y: susY, visible: true });
        }
      } else {
        const re = performance.now() - noteOffMs;
        if (re < rMs) {
          const t = re / rMs;
          setDot({ x: lerp(sX, rEnd, t), y: lerp(susY, bot, t), visible: true });
        } else {
          setDot((p) => ({ ...p, visible: false }));
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [noteOnMs, noteOffMs, attack, decay, release, aX, dX, sX, rEnd, top, bot, susY]);

  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <line x1={0} y1={gY1} x2={W} y2={gY1} stroke={`rgba(${ACCENT_RGB},0.12)`} strokeWidth={1} />
      <line x1={0} y1={gY2} x2={W} y2={gY2} stroke={`rgba(${ACCENT_RGB},0.12)`} strokeWidth={1} />
      <path d={d} fill="none" stroke={ACCENT} strokeWidth={1.5}
        strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${ACCENT})` }} />
      {[{ cx: aX, cy: top }, { cx: dX, cy: susY }, { cx: sX, cy: susY }, { cx: Math.min(rEnd, W - 3), cy: bot }]
        .map((p, i) => <circle key={i} cx={p.cx} cy={p.cy} r={2.5} fill={ACCENT} opacity={0.55} />)}
      {dot.visible && (
        <circle cx={dot.x} cy={dot.y} r={4} fill={ACCENT}
          style={{ filter: `drop-shadow(0 0 5px ${ACCENT})` }} />
      )}
    </svg>
  );
}
// ────────────────────────────────────────────────────────────────

export default function Synth2HardwarePage() {
  const engineRef = useRef<Synth2Engine | null>(null);
  const { isMobile, mobileKeyWidth } = useBreakpoint();

  const [analyserInfo, setAnalyserInfo]     = useState({ sampleRate: 44100, fftSize: 2048 });
  const [waveform, setWaveformState]        = useState<string>("sawtooth");
  const [subEnabled, setSubState]           = useState(false);
  const [cutoff, setCutoffState]            = useState(3000);
  const [resonance, setResState]            = useState(1);
  const [attack, setAttackState]            = useState(0.05);
  const [decay, setDecayState]              = useState(0.15);
  const [sustainLevel, setSustainLvl]       = useState(0.7);
  const [release, setReleaseState]          = useState(0.6);
  const [reverbAmount, setReverbState]      = useState(0);
  const [delayAmount, setDelayState]        = useState(0);
  const [volume, setVolumeState]            = useState(0.8);
  const [startOctave, setStartOctave]       = useState(3);
  const startOctaveRef = useRef(startOctave);
  useEffect(() => { startOctaveRef.current = startOctave; }, [startOctave]);
  const [activeNotes, setActiveNotes]       = useState<Set<string>>(new Set());
  const [currentNote, setCurrentNote]       = useState<string | null>(null);
  const [noteOnMs, setNoteOnMs]             = useState<number | null>(null);
  const [noteOffMs, setNoteOffMs]           = useState<number | null>(null);
  const [activeTab, setActiveTab]           = useState<"osc" | "filter" | "env" | "fx">("osc");

  useEffect(() => {
    engineRef.current = new Synth2Engine();
    setAnalyserInfo({ sampleRate: engineRef.current.sampleRate, fftSize: engineRef.current.fftSize });
    return () => engineRef.current?.dispose();
  }, []);

  const noteOn = useCallback((note: string, vel: number) => {
    engineRef.current?.noteOn(note, vel);
    setActiveNotes((p) => new Set([...p, note]));
    setCurrentNote(note);
    setNoteOnMs(performance.now());
    setNoteOffMs(null);
  }, []);

  const noteOff = useCallback((note: string) => {
    engineRef.current?.noteOff(note);
    setActiveNotes((p) => { const n = new Set(p); n.delete(note); return n; });
    setCurrentNote(null);
    setNoteOffMs(performance.now());
  }, []);

  const getWaveform = useCallback((): Float32Array => engineRef.current?.getWaveform() ?? new Float32Array(2048), []);
  const getFFT      = useCallback((): Float32Array => engineRef.current?.getFFT()      ?? new Float32Array(512),  []);

  const handleWaveform     = useCallback((v: string)  => { setWaveformState(v); engineRef.current?.setWaveform(v as OscillatorType); }, []);
  const handleSub          = useCallback(()            => { setSubState((p) => { const n = !p; engineRef.current?.setSubEnabled(n); return n; }); }, []);
  const handleCutoff       = useCallback((hz: number)  => { setCutoffState(hz);       engineRef.current?.setCutoff(hz);        }, []);
  const handleRes          = useCallback((q: number)   => { setResState(q);            engineRef.current?.setResonance(q);      }, []);
  const handleAttack       = useCallback((s: number)   => { setAttackState(s);         engineRef.current?.setAttack(s);         }, []);
  const handleDecay        = useCallback((s: number)   => { setDecayState(s);          engineRef.current?.setDecay(s);          }, []);
  const handleSustainLevel = useCallback((l: number)   => { setSustainLvl(l);          engineRef.current?.setSustainLevel(l);   }, []);
  const handleRelease      = useCallback((s: number)   => { setReleaseState(s);        engineRef.current?.setRelease(s);        }, []);
  const handleReverb       = useCallback((v: number)   => { setReverbState(v);         engineRef.current?.setReverb(v);         }, []);
  const handleDelay        = useCallback((v: number)   => { setDelayState(v);          engineRef.current?.setDelay(v);          }, []);
  const handleVolume       = useCallback((v: number)   => { setVolumeState(v);         engineRef.current?.setVolume(v);         }, []);

  // QWERTY bindings
  useEffect(() => {
    if (isMobile) return;
    const held = new Set<string>();
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const entry = KEY_NOTE_MAP[e.key.toLowerCase()];
      if (!entry) return;
      e.preventDefault();
      if (held.has(e.key.toLowerCase())) return;
      held.add(e.key.toLowerCase());
      const [name, offset] = entry;
      noteOn(`${name}${startOctaveRef.current + offset}`, 0.8);
    };
    const up = (e: KeyboardEvent) => {
      const entry = KEY_NOTE_MAP[e.key.toLowerCase()];
      if (!entry) return;
      held.delete(e.key.toLowerCase());
      const [name, offset] = entry;
      noteOff(`${name}${startOctaveRef.current + offset}`);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [isMobile, noteOn, noteOff]);

  // ── Shared style helpers ──
  const secLabel: CSSProperties = {
    fontSize: 8, fontWeight: 700, letterSpacing: "0.32em",
    color: LABEL, fontFamily: "monospace", textTransform: "uppercase",
    marginBottom: 10, borderBottom: `1px solid ${SEC_BDR}`, paddingBottom: 5,
  };
  const secPanel: CSSProperties = {
    background: SEC_BG, border: `1px solid ${SEC_BDR}`,
    borderTop: `2px solid ${ACCENT}`, borderRadius: 4,
    padding: "12px 10px", textAlign: "center",
  };
  const subBtn = (on: boolean): CSSProperties => ({
    display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
    background: "none", border: "none", padding: 0,
  });

  const envDisplay: CSSProperties = {
    background: "#000", borderRadius: 5, padding: "8px 10px",
    border: `1px solid ${SEC_BDR}`,
    boxShadow: `inset 0 0 16px rgba(0,0,0,0.95), 0 0 0 2px #070707, 0 0 0 3px ${SEC_BDR}`,
    flexShrink: 0,
  };

  // ── MOBILE layouts ──────────────────────────────────────────
  const tabBtn = (active: boolean): CSSProperties => ({
    flex: 1, padding: "8px 4px", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.08em", background: "none", border: "none",
    borderBottom: active ? `2px solid ${ACCENT}` : "2px solid transparent",
    color: active ? "#ffffff" : "#2a3a2a",
    cursor: "pointer", fontFamily: "monospace",
  });
  const mPanel: CSSProperties = { background: SEC_BG, border: `1px solid ${SEC_BDR}`, borderRadius: 5, padding: "14px 12px" };

  const mobileHeader = (
    <div style={{ padding: "8px 12px", borderBottom: `1px solid ${SEC_BDR}`, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#fff", fontFamily: "monospace" }}>THE LEARNER</p>
        <p style={{ fontSize: 9, color: LABEL, margin: "1px 0 0", fontFamily: "monospace", letterSpacing: "0.2em" }}>HARDWARE EDITION</p>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <WaveformCanvas getWaveform={getWaveform} width={90} height={34} />
        <SpectrumCanvas getFFT={getFFT} filterFreq={cutoff} resonance={resonance} lineColor={ACCENT}
          sampleRate={analyserInfo.sampleRate} fftSize={analyserInfo.fftSize} width={90} height={34} />
        <Knob value={volume} min={0} max={1} step={0.01} label="VOL" onChange={handleVolume} size="sm" />
      </div>
    </div>
  );

  const mobileControls = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", borderBottom: `1px solid ${SEC_BDR}`, flexShrink: 0 }}>
        {TABS.map((t) => <button key={t.id} style={tabBtn(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>{t.label}</button>)}
      </div>
      <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto" }}>
        {activeTab === "osc" && (
          <div style={mPanel}>
            <WaveformSelect value={waveform} options={["sine", "square", "sawtooth", "triangle"]} onChange={handleWaveform} label="Waveform" />
            <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
              <button onClick={handleSub} style={{
                padding: "4px 18px", borderRadius: 2, cursor: "pointer",
                border: `1px solid ${subEnabled ? ACCENT : "#1a2a1a"}`,
                background: subEnabled ? `rgba(${ACCENT_RGB},0.08)` : SEC_BG,
                color: subEnabled ? ACCENT : LABEL,
                fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", fontFamily: "monospace",
                boxShadow: subEnabled ? `inset 0 0 8px rgba(${ACCENT_RGB},0.2)` : "none",
              }}>SUB {subEnabled ? "ON" : "OFF"}</button>
            </div>
          </div>
        )}
        {activeTab === "filter" && (
          <div style={mPanel}>
            <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
              <Knob value={cutoff} min={80} max={18000} step={10} label="CUT" unit="Hz" scale="log" onChange={handleCutoff} size="sm" />
              <Knob value={resonance} min={0.1} max={20} step={0.1} label="RES" unit="Q" onChange={handleRes} size="sm" />
            </div>
          </div>
        )}
        {activeTab === "env" && (
          <div style={mPanel}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <Fader value={attack}       min={0.001} max={2} step={0.001} label="ATK" unit="s" onChange={handleAttack}       />
                <Fader value={decay}        min={0.01}  max={2} step={0.01}  label="DEC" unit="s" onChange={handleDecay}        />
                <Fader value={sustainLevel} min={0}     max={1} step={0.01}  label="SUS"          onChange={handleSustainLevel} />
                <Fader value={release}      min={0.05}  max={4} step={0.01}  label="REL" unit="s" onChange={handleRelease}      />
              </div>
              <div style={envDisplay}>
                <EnvelopeCurve attack={attack} decay={decay} sustainLevel={sustainLevel} release={release}
                  noteOnMs={noteOnMs} noteOffMs={noteOffMs} width={130} height={56} />
              </div>
            </div>
          </div>
        )}
        {activeTab === "fx" && (
          <div style={mPanel}>
            <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
              <Knob value={reverbAmount} min={0} max={1} step={0.01} label="REV" onChange={handleReverb} size="sm" />
              <Knob value={delayAmount}  min={0} max={1} step={0.01} label="DLY" onChange={handleDelay}  size="sm" />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const mobileKeyboard = (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <PianoKeyboard onNoteOn={noteOn} onNoteOff={noteOff} startOctave={startOctave}
        octaves={2} activeNotes={activeNotes} whiteKeyWidth={mobileKeyWidth} whiteKeyHeight={80} />
    </div>
  );

  const themeVars = {
    "--primary": ACCENT,
    "--color-primary": ACCENT,
    "--primary-foreground": "#050c05",
  } as CSSProperties;

  if (isMobile) {
    return (
      <div style={themeVars}>
        <SynthShell isMobile={true} theme={MOBILE_THEME}
          header={mobileHeader} controls={mobileControls} keyboard={mobileKeyboard} navHeight={48} />
      </div>
    );
  }

  // ── DESKTOP ─────────────────────────────────────────────────
  return (
    <div style={{
      ...themeVars,
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "calc(100dvh - 48px)",
      background: "#020602",
    }}>
      <div style={{ display: "flex", flexDirection: "column" }}>

        {/* 3D lid */}
        <div style={{
          width: 800, height: 18,
          background: "linear-gradient(180deg, #1a2e1a, #0d1a0d)",
          borderRadius: "12px 12px 0 0",
          border: `1px solid ${CHB}`, borderBottom: "none",
          boxShadow: `inset 0 1px 0 rgba(${ACCENT_RGB},0.05)`,
          transform: "perspective(500px) rotateX(-18deg) scaleY(0.55)",
          transformOrigin: "bottom center",
          marginBottom: -1,
        }} />

        {/* Chassis body */}
        <div style={{
          background: "linear-gradient(175deg, #0d1a0d 0%, #080f08 60%, #050c05 100%)",
          borderRadius: "0 0 10px 10px",
          border: `1px solid ${CHB}`,
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.02),
            -5px 0 0 #040a04,
            5px 0 0 #040a04,
            0 5px 0 #030703,
            0 8px 0 #020502,
            0 20px 60px rgba(0,0,0,0.97)
          `,
          width: 800,
        }}>

          {/* Faceplate */}
          <div style={{
            margin: 14,
            background: FACEPLATE,
            borderRadius: 6,
            border: `1px solid ${SEC_BDR}`,
            boxShadow: "inset 0 2px 12px rgba(0,0,0,0.8)",
            padding: "14px 16px",
          }}>

            {/* ── Header ── */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              borderBottom: `1px solid ${SEC_BDR}`, paddingBottom: 12, marginBottom: 12,
            }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.32em", color: "#fff", fontFamily: "monospace", margin: 0 }}>
                  THE LEARNER
                </p>
                <p style={{ fontSize: 7, color: LABEL, letterSpacing: "0.28em", margin: "3px 0 0", fontFamily: "monospace" }}>
                  SYNTHESIZER · MK II
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{
                  background: "#000", border: `1px solid ${SEC_BDR}`, borderRadius: 3,
                  padding: "4px 10px", boxShadow: "inset 0 0 8px rgba(0,0,0,0.9)",
                }}>
                  <span style={{
                    color: ACCENT, fontSize: 16, fontFamily: "monospace", letterSpacing: 3,
                    textShadow: `0 0 8px rgba(${ACCENT_RGB},0.7), 0 0 16px rgba(${ACCENT_RGB},0.35)`,
                  }}>
                    {currentNote ?? "---"}
                  </span>
                </div>
                <WaveformCanvas getWaveform={getWaveform} width={200} height={48} />
                <SpectrumCanvas getFFT={getFFT} filterFreq={cutoff} resonance={resonance} lineColor={ACCENT}
                  sampleRate={analyserInfo.sampleRate} fftSize={analyserInfo.fftSize} width={200} height={48} />
              </div>

              <Knob value={volume} min={0} max={1} step={0.01} label="VOL" onChange={handleVolume} size="sm" />
            </div>

            {/* ── 3-col row: OSC | FILTER | FX ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>

              {/* OSC */}
              <div style={secPanel}>
                <p style={secLabel}>OSC</p>
                <WaveformSelect value={waveform} options={["sine", "square", "sawtooth", "triangle"]}
                  onChange={handleWaveform} size="md" label="Waveform" />
                <button onClick={handleSub} style={subBtn(subEnabled)} aria-label="Toggle sub oscillator">
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: subEnabled ? ACCENT : "#111",
                    boxShadow: subEnabled ? `0 0 5px rgba(${ACCENT_RGB},0.9), 0 0 10px rgba(${ACCENT_RGB},0.4)` : "none",
                    marginTop: 8,
                  }} />
                  <span style={{
                    fontSize: 7, fontFamily: "monospace", letterSpacing: "0.2em",
                    color: subEnabled ? ACCENT : "#2a3a2a", marginTop: 8,
                  }}>SUB</span>
                </button>
              </div>

              {/* FILTER */}
              <div style={secPanel}>
                <p style={secLabel}>FILTER</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
                  <Knob value={cutoff}    min={80}  max={18000} step={10}  label="CUT" unit="Hz" scale="log" onChange={handleCutoff} size="lg" />
                  <Knob value={resonance} min={0.1} max={20}    step={0.1} label="RES" unit="Q"              onChange={handleRes}    size="sm" />
                </div>
              </div>

              {/* FX */}
              <div style={secPanel}>
                <p style={secLabel}>FX</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 22 }}>
                  <Knob value={reverbAmount} min={0} max={1} step={0.01} label="REV" onChange={handleReverb} size="sm" />
                  <Knob value={delayAmount}  min={0} max={1} step={0.01} label="DLY" onChange={handleDelay}  size="sm" />
                </div>
              </div>
            </div>

            {/* ── ENV full-width row ── */}
            <div style={{ ...secPanel, textAlign: "left" }}>
              <p style={secLabel}>ENV</p>
              <div style={{ display: "flex", gap: 24, alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "flex", gap: 20 }}>
                  <Fader value={attack}       min={0.001} max={2} step={0.001} label="ATK" unit="s" size="md" onChange={handleAttack}       />
                  <Fader value={decay}        min={0.01}  max={2} step={0.01}  label="DEC" unit="s" size="md" onChange={handleDecay}        />
                  <Fader value={sustainLevel} min={0}     max={1} step={0.01}  label="SUS"          size="md" onChange={handleSustainLevel} />
                  <Fader value={release}      min={0.05}  max={4} step={0.01}  label="REL" unit="s" size="md" onChange={handleRelease}      />
                </div>
                <div style={envDisplay}>
                  <EnvelopeCurve attack={attack} decay={decay} sustainLevel={sustainLevel} release={release}
                    noteOnMs={noteOnMs} noteOffMs={noteOffMs} width={220} height={80} />
                </div>
              </div>
            </div>

            {/* ── Keyboard ── */}
            <div style={{
              background: "#020702", borderRadius: 5,
              border: "1px solid #0a160a", marginTop: 10,
              overflow: "hidden", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)",
            }}>
              {/* Octave strip */}
              <div style={{
                display: "flex", alignItems: "stretch", height: 28,
                background: "linear-gradient(90deg, #020702, #0a160a 8%, #0a160a 92%, #020702)",
                borderBottom: "1px solid #060e06",
              }}>
                <button
                  style={{
                    border: "none", borderRight: "1px solid #0a160a", background: "transparent",
                    color: startOctave <= 1 ? "#0a160a" : LABEL,
                    fontSize: 11, padding: "0 16px", cursor: startOctave <= 1 ? "default" : "pointer", fontFamily: "monospace",
                  }}
                  onClick={() => setStartOctave((o) => Math.max(1, o - 1))}
                  disabled={startOctave <= 1} aria-label="Octave down"
                >◀</button>
                <span style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#1a2e1a", fontSize: 9, fontFamily: "monospace", letterSpacing: "0.3em",
                }}>OCT {startOctave}–{startOctave + 2}</span>
                <button
                  style={{
                    border: "none", borderLeft: "1px solid #0a160a", background: "transparent",
                    color: startOctave >= 5 ? "#0a160a" : LABEL,
                    fontSize: 11, padding: "0 16px", cursor: startOctave >= 5 ? "default" : "pointer", fontFamily: "monospace",
                  }}
                  onClick={() => setStartOctave((o) => Math.min(5, o + 1))}
                  disabled={startOctave >= 5} aria-label="Octave up"
                >▶</button>
              </div>

              <PianoKeyboard
                onNoteOn={noteOn} onNoteOff={noteOff}
                startOctave={startOctave} octaves={3}
                activeNotes={activeNotes}
                whiteKeyWidth={33} whiteKeyHeight={96}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
