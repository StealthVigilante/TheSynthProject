"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { WaveformCanvas } from "../waveform-canvas";
import { SpectrumCanvas } from "../spectrum-canvas";
import { SynthShell } from "@/components/synths/shared/synth-shell";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { ClassicProEngine } from "./engine";

const ACCENT = "#00d4ff";
const MOBILE_THEME = { bg: "#0a0a0a", border: "#1e1e1e", panel: "#0f0f0f" };

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
  { id: "lfo"    as const, label: "LFO"    },
  { id: "fx"     as const, label: "FX"     },
];

function FilterTypeSelect({ value, onChange }: { value: BiquadFilterType; onChange: (v: BiquadFilterType) => void }) {
  const options: BiquadFilterType[] = ["lowpass", "highpass", "bandpass"];
  const labels: Record<string, string> = { lowpass: "LP", highpass: "HP", bandpass: "BP" };
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} style={{
          padding: "3px 8px", borderRadius: 3, border: "1px solid",
          borderColor: value === o ? ACCENT : "#2a2a2a",
          background: value === o ? "#001a22" : "#080808",
          color: value === o ? ACCENT : "#404040",
          fontSize: 10, fontWeight: value === o ? 700 : 400, cursor: "pointer",
          fontFamily: "Arial", letterSpacing: "0.08em",
          boxShadow: value === o ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
          transition: "all 150ms",
        }}>{labels[o]}</button>
      ))}
    </div>
  );
}

interface EnvCurveProps {
  attack: number; decay: number; sustainLevel: number; release: number;
  noteOnMs: number | null; noteOffMs: number | null;
  width?: number; height?: number;
}

function EnvelopeCurve({ attack, decay, sustainLevel, release, noteOnMs, noteOffMs, width = 180, height = 60 }: EnvCurveProps) {
  const W = width, H = height;
  const top = 5, bot = H - 5;
  const maxT = Math.max(attack + decay + release, 2);
  const aX   = (attack / maxT) * (W * 0.65);
  const dX   = aX + (decay / maxT) * (W * 0.65);
  const sX   = dX + W * 0.16;
  const rEnd = Math.min(sX + (release / maxT) * (W * 0.65), W - 4);
  const susY = top + (1 - sustainLevel) * (bot - top);
  const d    = `M 0 ${bot} L ${aX} ${top} L ${dX} ${susY} L ${sX} ${susY} L ${rEnd} ${bot}`;

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
    <svg width={W} height={H} style={{ display: "block", overflow: "visible", filter: "drop-shadow(0 0 3px rgba(0,212,255,0.4))" }}>
      <defs>
        <linearGradient id="env3h-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.25" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${rEnd} ${bot} Z`} fill="url(#env3h-grad)" />
      <path d={d} fill="none" stroke={ACCENT} strokeWidth={1.5} strokeLinejoin="round" />
      {dot.visible && (
        <circle cx={dot.x} cy={dot.y} r={4} fill={ACCENT}
          style={{ filter: "drop-shadow(0 0 5px rgba(0,212,255,0.8))" }} />
      )}
    </svg>
  );
}

export default function Synth3ProPage() {
  const engineRef = useRef<ClassicProEngine | null>(null);
  const { isMobile, mobileKeyWidth } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<"osc" | "filter" | "env" | "lfo" | "fx">("osc");
  const [analyserInfo, setAnalyserInfo] = useState({ sampleRate: 44100, fftSize: 2048 });
  const [ready, setReady] = useState(false);

  const [osc1Type, setOsc1Type] = useState<string>("sawtooth");
  const [osc2Type, setOsc2Type] = useState<string>("sawtooth");
  const [osc2Detune, setOsc2Detune] = useState(7);
  const [oscMix, setOscMix] = useState(0.5);

  const [filterType, setFilterTypeState] = useState<BiquadFilterType>("lowpass");
  const [filterCutoff, setFilterCutoff] = useState(3000);
  const [filterRes, setFilterRes] = useState(2);

  const [ampA, setAmpA] = useState(0.05);
  const [ampD, setAmpD] = useState(0.2);
  const [ampS, setAmpS] = useState(0.7);
  const [ampR, setAmpR] = useState(0.5);

  const [fEnvAmt, setFEnvAmt] = useState(2000);
  const [fEnvA, setFEnvA] = useState(0.1);
  const [fEnvD, setFEnvD] = useState(0.3);
  const [fEnvS, setFEnvS] = useState(0.3);
  const [fEnvR, setFEnvR] = useState(0.4);

  const [lfoType, setLfoType] = useState<string>("sine");
  const [lfoRate, setLfoRate] = useState(4);
  const [lfoDepth, setLfoDepth] = useState(30);
  const [lfoRoute, setLfoRoute] = useState<"pitch" | "filter">("pitch");
  const [lfoEnabled, setLfoEnabled] = useState(true);
  const [filterEnvEnabled, setFilterEnvEnabled] = useState(true);
  const [polyEnabled, setPolyEnabled] = useState(false);
  const [reverbEnabled, setReverbEnabled] = useState(false);
  const [reverbAmount, setReverbAmount] = useState(0.3);
  const [delayEnabled, setDelayEnabled] = useState(false);
  const [delayAmount, setDelayAmount] = useState(0.3);

  const [volume, setVolume] = useState(0.8);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [noteOnMs, setNoteOnMs] = useState<number | null>(null);
  const [noteOffMs, setNoteOffMs] = useState<number | null>(null);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [startOctave, setStartOctave] = useState(3);
  const startOctaveRef = useRef(startOctave);
  useEffect(() => { startOctaveRef.current = startOctave; }, [startOctave]);

  useEffect(() => {
    let disposed = false;
    ClassicProEngine.create().then((eng) => {
      if (!disposed) {
        engineRef.current = eng;
        setAnalyserInfo({ sampleRate: eng.sampleRate, fftSize: eng.fftSize });
        setReady(true);
      } else {
        eng.dispose();
      }
    }).catch((err) => {
      if (!disposed) console.error("ClassicProEngine init failed:", err);
    });
    return () => {
      disposed = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const noteOn = useCallback((note: string, vel: number) => {
    engineRef.current?.noteOn(note, vel);
    setActiveNotes((prev) => new Set(prev).add(note));
    setCurrentNote(note);
    setNoteOnMs(performance.now());
    setNoteOffMs(null);
  }, []);

  const noteOff = useCallback((note: string) => {
    engineRef.current?.noteOff(note);
    setActiveNotes((prev) => { const s = new Set(prev); s.delete(note); return s; });
    setCurrentNote(null);
    setNoteOffMs(performance.now());
  }, []);

  const getWaveform = useCallback((): Float32Array => engineRef.current?.getWaveform() ?? new Float32Array(2048), []);
  const getFFT = useCallback((): Float32Array => engineRef.current?.getFFT() ?? new Float32Array(1024), []);
  const getFilterFreq = useCallback((): number => engineRef.current?.getFilterFreq() ?? filterCutoff, [filterCutoff]);

  const e = engineRef.current;

  useEffect(() => {
    if (isMobile) return;
    const pressed = new Set<string>();
    const onDown = (ev: KeyboardEvent) => {
      if (ev.repeat) return;
      const entry = KEY_NOTE_MAP[ev.key.toLowerCase()];
      if (!entry) return;
      ev.preventDefault();
      if (pressed.has(ev.key.toLowerCase())) return;
      pressed.add(ev.key.toLowerCase());
      const [name, off] = entry;
      const note = `${name}${startOctaveRef.current + off}`;
      noteOn(note, 0.8);
      setActiveNotes((prev) => new Set([...prev, note]));
    };
    const onUp = (ev: KeyboardEvent) => {
      const entry = KEY_NOTE_MAP[ev.key.toLowerCase()];
      if (!entry) return;
      pressed.delete(ev.key.toLowerCase());
      const [name, off] = entry;
      const note = `${name}${startOctaveRef.current + off}`;
      noteOff(note);
      setActiveNotes((prev) => { const s = new Set(prev); s.delete(note); return s; });
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [isMobile, noteOn, noteOff]);

  const themeVars = {
    "--primary": ACCENT,
    "--color-primary": ACCENT,
    "--primary-foreground": "#000a0f",
  } as React.CSSProperties;

  // ── Mobile ──────────────────────────────────────────────────────
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "8px 4px", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.08em", background: "none", border: "none",
    borderBottom: active ? `2px solid ${ACCENT}` : "2px solid transparent",
    color: active ? "#ffffff" : "#404040", cursor: "pointer",
  });

  const mobilePanelStyle: React.CSSProperties = {
    background: "#0a0a0a", border: "1px solid #1e1e1e", borderRadius: 5, padding: "14px 12px",
  };

  const mobileHeader = (
    <div style={{ padding: "8px 12px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#ffffff", fontFamily: "Arial" }}>The Classic Pro</p>
        <p style={{ fontSize: 9, color: "#404040", margin: "1px 0 0" }}>AudioWorklet Edition</p>
        <button
          onClick={() => { const next = !polyEnabled; setPolyEnabled(next); e?.setPolyEnabled(next); }}
          style={{
            marginTop: 4, padding: "2px 8px", borderRadius: 3, border: "1px solid",
            borderColor: polyEnabled ? ACCENT : "#2a2a2a",
            background: polyEnabled ? "#001a22" : "#0a0a0a",
            color: polyEnabled ? ACCENT : "#404040",
            fontSize: 8, cursor: "pointer", fontFamily: "Arial", letterSpacing: "0.15em",
            boxShadow: polyEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
          }}
        >{polyEnabled ? "POLY" : "MONO"}</button>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <WaveformCanvas getWaveform={getWaveform} width={100} height={36} />
        <SpectrumCanvas getFFT={getFFT} filterFreq={filterCutoff} resonance={filterRes} sampleRate={analyserInfo.sampleRate} fftSize={analyserInfo.fftSize} width={100} height={36} lineColor={ACCENT} filterType={filterType} getFilterFreq={getFilterFreq} />
        <Knob value={volume} min={0} max={1} step={0.01} label="VOL" onChange={(v) => { setVolume(v); e?.setVolume(v); }} size="sm" />
      </div>
    </div>
  );

  const mobileControls = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", borderBottom: "1px solid #1e1e1e", flexShrink: 0 }}>
        {TABS.map((tab) => (
          <button key={tab.id} style={tabBtnStyle(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto" }}>
        {activeTab === "osc" && (
          <div style={mobilePanelStyle}>
            <p style={{ fontSize: 9, color: "#404040", fontFamily: "Arial", letterSpacing: "0.2em", marginBottom: 8 }}>OSC 1</p>
            <WaveformSelect value={osc1Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc1Type(v); e?.setOsc1Type(v as OscillatorType); }} label="" />
            <p style={{ fontSize: 9, color: "#404040", fontFamily: "Arial", letterSpacing: "0.2em", margin: "12px 0 8px" }}>OSC 2</p>
            <WaveformSelect value={osc2Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc2Type(v); e?.setOsc2Type(v as OscillatorType); }} label="" />
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 12 }}>
              <Knob value={osc2Detune} min={-100} max={100} step={1} label="Detune" unit="¢" onChange={(v) => { setOsc2Detune(v); e?.setOsc2Detune(v); }} size="sm" />
              <Knob value={oscMix} min={0} max={1} step={0.01} label="Mix" onChange={(v) => { setOscMix(v); e?.setOscMix(v); }} size="sm" />
            </div>
          </div>
        )}
        {activeTab === "filter" && (
          <div style={mobilePanelStyle}>
            <FilterTypeSelect value={filterType} onChange={(v) => { setFilterTypeState(v); e?.setFilterType(v); }} />
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 12 }}>
              <Knob value={filterCutoff} min={80} max={18000} step={10} label="Cutoff" unit="Hz" onChange={(v) => { setFilterCutoff(v); e?.setFilterCutoff(v); }} size="sm" />
              <Knob value={filterRes} min={0.1} max={20} step={0.1} label="Res" unit="Q" onChange={(v) => { setFilterRes(v); e?.setFilterResonance(v); }} size="sm" />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0 8px" }}>
              <span style={{ fontSize: 9, color: "#404040", fontFamily: "Arial", letterSpacing: "0.2em" }}>FILTER ENV</span>
              <button
                onClick={() => { const next = !filterEnvEnabled; setFilterEnvEnabled(next); e?.setFilterEnvEnabled(next); }}
                style={{
                  padding: "3px 12px", borderRadius: 3, border: "1px solid",
                  borderColor: filterEnvEnabled ? ACCENT : "#2a2a2a",
                  background: filterEnvEnabled ? "#001a22" : "#0a0a0a",
                  color: filterEnvEnabled ? ACCENT : "#404040",
                  fontSize: 10, cursor: "pointer",
                  boxShadow: filterEnvEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                }}
              >{filterEnvEnabled ? "ON" : "OFF"}</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <Knob value={fEnvAmt} min={0} max={10000} step={50} label="Amount" unit="Hz" onChange={(v) => { setFEnvAmt(v); e?.setFilterEnvAmount(v); }} size="sm" />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Fader value={fEnvA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setFEnvA(v); e?.setFilterEnvAttack(v); }} />
              <Fader value={fEnvD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setFEnvD(v); e?.setFilterEnvDecay(v); }} />
              <Fader value={fEnvS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setFEnvS(v); e?.setFilterEnvSustain(v); }} />
              <Fader value={fEnvR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setFEnvR(v); e?.setFilterEnvRelease(v); }} />
            </div>
          </div>
        )}
        {activeTab === "env" && (
          <div style={mobilePanelStyle}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <Knob value={volume} min={0} max={1} step={0.01} label="VOL" onChange={(v) => { setVolume(v); e?.setVolume(v); }} size="sm" />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <Fader value={ampA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setAmpA(v); e?.setAmpAttack(v); }} />
                <Fader value={ampD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setAmpD(v); e?.setAmpDecay(v); }} />
                <Fader value={ampS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setAmpS(v); e?.setAmpSustain(v); }} />
                <Fader value={ampR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setAmpR(v); e?.setAmpRelease(v); }} />
              </div>
              <div style={{ background: "#000", borderRadius: 3, padding: "4px 6px", border: "1px solid #1e1e1e" }}>
                <EnvelopeCurve attack={ampA} decay={ampD} sustainLevel={ampS} release={ampR} noteOnMs={noteOnMs} noteOffMs={noteOffMs} width={120} height={56} />
              </div>
            </div>
          </div>
        )}
        {activeTab === "lfo" && (
          <div style={mobilePanelStyle}>
            <WaveformSelect value={lfoType} options={["sine", "square"]} onChange={(v) => { setLfoType(v); e?.setLfoType(v as OscillatorType); }} label="Shape" />
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 12 }}>
              <Knob value={lfoRate} min={0.1} max={20} step={0.1} label="Rate" unit="Hz" onChange={(v) => { setLfoRate(v); e?.setLfoRate(v); }} size="sm" />
              <Knob value={lfoDepth} min={0} max={100} step={1} label="Depth" onChange={(v) => { setLfoDepth(v); e?.setLfoDepth(v); }} size="sm" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
              <span style={{ fontSize: 9, color: "#404040", fontFamily: "Arial", letterSpacing: "0.15em" }}>ROUTE</span>
              <div style={{ display: "flex", gap: 4 }}>
                {(["pitch", "filter"] as const).map((r) => (
                  <button key={r} onClick={() => { setLfoRoute(r); e?.setLfoRoute(r); }} style={{
                    padding: "4px 12px", borderRadius: 3, border: "1px solid",
                    borderColor: lfoRoute === r ? ACCENT : "#2a2a2a",
                    background: lfoRoute === r ? "#001a22" : "#0a0a0a",
                    color: lfoRoute === r ? ACCENT : "#404040",
                    fontSize: 10, cursor: "pointer", fontFamily: "Arial",
                    letterSpacing: "0.08em", textTransform: "capitalize",
                  }}>{r}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
              <span style={{ fontSize: 9, color: "#404040", fontFamily: "Arial", letterSpacing: "0.15em" }}>LFO</span>
              <button
                onClick={() => { const next = !lfoEnabled; setLfoEnabled(next); e?.setLfoEnabled(next); }}
                style={{
                  padding: "3px 12px", borderRadius: 3, border: "1px solid",
                  borderColor: lfoEnabled ? ACCENT : "#2a2a2a",
                  background: lfoEnabled ? "#001a22" : "#0a0a0a",
                  color: lfoEnabled ? ACCENT : "#404040",
                  fontSize: 10, cursor: "pointer",
                  boxShadow: lfoEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                }}
              >{lfoEnabled ? "ON" : "OFF"}</button>
            </div>
          </div>
        )}
        {activeTab === "fx" && (
          <div style={mobilePanelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 9, color: "#404040", fontFamily: "Arial", letterSpacing: "0.2em" }}>REVERB</span>
              <button
                onClick={() => { const next = !reverbEnabled; setReverbEnabled(next); e?.setReverbEnabled(next); }}
                style={{
                  padding: "3px 12px", borderRadius: 3, border: "1px solid",
                  borderColor: reverbEnabled ? ACCENT : "#2a2a2a",
                  background: reverbEnabled ? "#001a22" : "#0a0a0a",
                  color: reverbEnabled ? ACCENT : "#404040",
                  fontSize: 10, cursor: "pointer",
                  boxShadow: reverbEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                }}
              >{reverbEnabled ? "ON" : "OFF"}</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <Knob value={reverbAmount} min={0} max={1} step={0.01} label="Amount" onChange={(v) => { setReverbAmount(v); e?.setReverbAmount(v); }} size="sm" />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 9, color: "#404040", fontFamily: "Arial", letterSpacing: "0.2em" }}>DELAY</span>
              <button
                onClick={() => { const next = !delayEnabled; setDelayEnabled(next); e?.setDelayEnabled(next); }}
                style={{
                  padding: "3px 12px", borderRadius: 3, border: "1px solid",
                  borderColor: delayEnabled ? ACCENT : "#2a2a2a",
                  background: delayEnabled ? "#001a22" : "#0a0a0a",
                  color: delayEnabled ? ACCENT : "#404040",
                  fontSize: 10, cursor: "pointer",
                  boxShadow: delayEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                }}
              >{delayEnabled ? "ON" : "OFF"}</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Knob value={delayAmount} min={0} max={1} step={0.01} label="Amount" onChange={(v) => { setDelayAmount(v); e?.setDelayAmount(v); }} size="sm" />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const mobileKeyboard = (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <PianoKeyboard onNoteOn={noteOn} onNoteOff={noteOff} startOctave={startOctave} octaves={2} activeNotes={activeNotes} whiteKeyWidth={mobileKeyWidth} whiteKeyHeight={80} />
    </div>
  );

  if (isMobile) {
    return (
      <div style={themeVars}>
        <SynthShell isMobile={true} theme={MOBILE_THEME} header={mobileHeader} controls={mobileControls} keyboard={mobileKeyboard} navHeight={48} />
      </div>
    );
  }

  // ── Desktop chassis (synth-1 style) ──────────────────────────────
  const sectionLabel: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", color: "#404040",
    fontFamily: "Arial", textTransform: "uppercase", marginBottom: 12,
    borderBottom: "1px solid #1a1a1a", paddingBottom: 8,
  };

  const sectionPanel: React.CSSProperties = {
    background: "#0a0a0a", border: "1px solid #1e1e1e",
    borderTop: `2px solid ${ACCENT}`, borderRadius: 5,
    padding: "14px 12px", textAlign: "center",
  };

  return (
    <div style={{
      ...themeVars,
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "calc(100dvh - 48px)", background: "#0a0a0a",
    }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* 3D lid */}
        <div style={{
          width: 860, height: 18,
          background: "linear-gradient(180deg, #2e2e2e, #1e1e1e)",
          borderRadius: "12px 12px 0 0",
          border: "1px solid #3a3a3a", borderBottom: "none",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
          transform: "perspective(500px) rotateX(-18deg) scaleY(0.55)",
          transformOrigin: "bottom center", marginBottom: -1,
        }} />

        {/* Chassis body */}
        <div style={{
          background: "linear-gradient(175deg, #1e1e1e 0%, #141414 60%, #0e0e0e 100%)",
          borderRadius: "0 0 10px 10px",
          border: "1px solid #282828", borderTop: "1px solid #3a3a3a",
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.04),
            -5px 0 0 #0c0c0c, 5px 0 0 #0c0c0c,
            0 5px 0 #080808, 0 7px 0 #060606,
            0 9px 0 #040404, 0 18px 50px rgba(0,0,0,0.95)
          `,
          width: 860,
        }}>
          {/* Faceplate */}
          <div style={{
            margin: 14, background: "#0f0f0f", borderRadius: 6,
            border: "1px solid #1a1a1a",
            boxShadow: "inset 0 2px 10px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.02)",
            padding: "16px 18px",
            position: "relative" as const,
          }}>
            {/* Header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              borderBottom: "1px solid #1a1a1a", paddingBottom: 14, marginBottom: 14,
            }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.3em", color: "#ffffff", fontFamily: "Arial", margin: 0 }}>THE CLASSIC PRO</p>
                <p style={{ fontSize: 7, color: "#404040", letterSpacing: "0.25em", margin: "3px 0 0", fontFamily: "Arial" }}>AudioWorklet · PolyBLEP · SVF</p>
                <button
                  onClick={() => { const next = !polyEnabled; setPolyEnabled(next); e?.setPolyEnabled(next); }}
                  style={{
                    marginTop: 6, padding: "2px 8px", borderRadius: 3, border: "1px solid",
                    borderColor: polyEnabled ? ACCENT : "#2a2a2a",
                    background: polyEnabled ? "#001a22" : "#0a0a0a",
                    color: polyEnabled ? ACCENT : "#404040",
                    fontSize: 8, cursor: "pointer", fontFamily: "Arial", letterSpacing: "0.15em",
                    boxShadow: polyEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                  }}
                >{polyEnabled ? "POLY" : "MONO"}</button>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ background: "#000", border: "1px solid #1e1e1e", borderRadius: 3, padding: "5px 12px" }}>
                  <span style={{ color: ACCENT, fontSize: 16, fontFamily: "monospace", letterSpacing: 3, textShadow: "0 0 8px rgba(0,212,255,0.5)" }}>
                    {currentNote ?? "---"}
                  </span>
                </div>
                <WaveformCanvas getWaveform={getWaveform} width={200} height={48} />
                <SpectrumCanvas getFFT={getFFT} filterFreq={filterCutoff} resonance={filterRes} sampleRate={analyserInfo.sampleRate} fftSize={analyserInfo.fftSize} width={200} height={48} lineColor={ACCENT} filterType={filterType} getFilterFreq={getFilterFreq} />
              </div>
              <Knob value={volume} min={0} max={1} step={0.01} label="VOL" onChange={(v) => { setVolume(v); e?.setVolume(v); }} size="sm" />
            </div>

            {/* Controls grid — row 1: OSC | FILTER | FILTER ENV | AMP ENV */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              {/* OSC */}
              <div style={sectionPanel}>
                <p style={sectionLabel}>OSC</p>
                <p style={{ fontSize: 8, color: "#404040", fontFamily: "Arial", letterSpacing: "0.2em", marginBottom: 6 }}>OSC 1</p>
                <WaveformSelect value={osc1Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc1Type(v); e?.setOsc1Type(v as OscillatorType); }} label="" />
                <p style={{ fontSize: 8, color: "#404040", fontFamily: "Arial", letterSpacing: "0.2em", margin: "10px 0 6px" }}>OSC 2</p>
                <WaveformSelect value={osc2Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc2Type(v); e?.setOsc2Type(v as OscillatorType); }} label="" />
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10 }}>
                  <Knob value={osc2Detune} min={-100} max={100} step={1} label="Detune" unit="¢" onChange={(v) => { setOsc2Detune(v); e?.setOsc2Detune(v); }} size="sm" />
                  <Knob value={oscMix} min={0} max={1} step={0.01} label="Mix" onChange={(v) => { setOscMix(v); e?.setOscMix(v); }} size="sm" />
                </div>
              </div>

              {/* FILTER */}
              <div style={sectionPanel}>
                <p style={sectionLabel}>Filter</p>
                <FilterTypeSelect value={filterType} onChange={(v) => { setFilterTypeState(v); e?.setFilterType(v); }} />
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10 }}>
                  <Knob value={filterCutoff} min={80} max={18000} step={10} label="Cutoff" unit="Hz" onChange={(v) => { setFilterCutoff(v); e?.setFilterCutoff(v); }} size="sm" />
                  <Knob value={filterRes} min={0.1} max={20} step={0.1} label="Res" unit="Q" onChange={(v) => { setFilterRes(v); e?.setFilterResonance(v); }} size="sm" />
                </div>
              </div>

              {/* FILTER ENV */}
              <div style={sectionPanel}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, borderBottom: "1px solid #1a1a1a", paddingBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", color: "#404040", fontFamily: "Arial", textTransform: "uppercase" }}>Filter Env</span>
                  <button
                    onClick={() => { const next = !filterEnvEnabled; setFilterEnvEnabled(next); e?.setFilterEnvEnabled(next); }}
                    style={{
                      padding: "2px 8px", borderRadius: 3, border: "1px solid",
                      borderColor: filterEnvEnabled ? ACCENT : "#2a2a2a",
                      background: filterEnvEnabled ? "#001a22" : "#0a0a0a",
                      color: filterEnvEnabled ? ACCENT : "#404040",
                      fontSize: 9, cursor: "pointer", fontFamily: "Arial", letterSpacing: "0.1em",
                      boxShadow: filterEnvEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                    }}
                  >{filterEnvEnabled ? "ON" : "OFF"}</button>
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <Knob value={fEnvAmt} min={0} max={10000} step={50} label="Amount" unit="Hz" onChange={(v) => { setFEnvAmt(v); e?.setFilterEnvAmount(v); }} size="sm" />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <Fader value={fEnvA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setFEnvA(v); e?.setFilterEnvAttack(v); }} />
                  <Fader value={fEnvD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setFEnvD(v); e?.setFilterEnvDecay(v); }} />
                  <Fader value={fEnvS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setFEnvS(v); e?.setFilterEnvSustain(v); }} />
                  <Fader value={fEnvR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setFEnvR(v); e?.setFilterEnvRelease(v); }} />
                </div>
              </div>

              {/* AMP ENV */}
              <div style={sectionPanel}>
                <p style={sectionLabel}>Amp Env</p>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <div style={{ background: "#000", borderRadius: 3, padding: "4px 6px", border: "1px solid #1e1e1e" }}>
                    <EnvelopeCurve attack={ampA} decay={ampD} sustainLevel={ampS} release={ampR} noteOnMs={noteOnMs} noteOffMs={noteOffMs} width={170} height={56} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                  <Fader value={ampA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setAmpA(v); e?.setAmpAttack(v); }} />
                  <Fader value={ampD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setAmpD(v); e?.setAmpDecay(v); }} />
                  <Fader value={ampS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setAmpS(v); e?.setAmpSustain(v); }} />
                  <Fader value={ampR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setAmpR(v); e?.setAmpRelease(v); }} />
                </div>
              </div>
            </div>

            {/* LFO row */}
            <div style={{ ...sectionPanel, textAlign: "left", marginBottom: 12 }}>
              <p style={sectionLabel}>LFO</p>
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <WaveformSelect value={lfoType} options={["sine", "square"]} onChange={(v) => { setLfoType(v); e?.setLfoType(v as OscillatorType); }} label="Shape" />
                <Knob value={lfoRate} min={0.1} max={20} step={0.1} label="Rate" unit="Hz" onChange={(v) => { setLfoRate(v); e?.setLfoRate(v); }} size="sm" />
                <Knob value={lfoDepth} min={0} max={100} step={1} label="Depth" onChange={(v) => { setLfoDepth(v); e?.setLfoDepth(v); }} size="sm" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 8, color: "#404040", fontFamily: "Arial", letterSpacing: "0.2em" }}>ROUTE</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["pitch", "filter"] as const).map((r) => (
                      <button key={r} onClick={() => { setLfoRoute(r); e?.setLfoRoute(r); }} style={{
                        padding: "3px 10px", borderRadius: 3, border: "1px solid",
                        borderColor: lfoRoute === r ? ACCENT : "#2a2a2a",
                        background: lfoRoute === r ? "#001a22" : "#0a0a0a",
                        color: lfoRoute === r ? ACCENT : "#404040",
                        fontSize: 9, cursor: "pointer", fontFamily: "Arial",
                        letterSpacing: "0.1em", textTransform: "capitalize",
                        boxShadow: lfoRoute === r ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                      }}>{r}</button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => { const next = !lfoEnabled; setLfoEnabled(next); e?.setLfoEnabled(next); }}
                  style={{
                    padding: "3px 10px", borderRadius: 3, border: "1px solid",
                    borderColor: lfoEnabled ? ACCENT : "#2a2a2a",
                    background: lfoEnabled ? "#001a22" : "#0a0a0a",
                    color: lfoEnabled ? ACCENT : "#404040",
                    fontSize: 9, cursor: "pointer", fontFamily: "Arial", letterSpacing: "0.15em",
                    boxShadow: lfoEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                  }}
                >{lfoEnabled ? "ON" : "OFF"}</button>
              </div>
            </div>

            {/* FX row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={sectionPanel}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, borderBottom: "1px solid #1a1a1a", paddingBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", color: "#404040", fontFamily: "Arial", textTransform: "uppercase" }}>Reverb</span>
                  <button
                    onClick={() => { const next = !reverbEnabled; setReverbEnabled(next); e?.setReverbEnabled(next); }}
                    style={{
                      padding: "2px 8px", borderRadius: 3, border: "1px solid",
                      borderColor: reverbEnabled ? ACCENT : "#2a2a2a",
                      background: reverbEnabled ? "#001a22" : "#0a0a0a",
                      color: reverbEnabled ? ACCENT : "#404040",
                      fontSize: 9, cursor: "pointer", fontFamily: "Arial", letterSpacing: "0.1em",
                      boxShadow: reverbEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                    }}
                  >{reverbEnabled ? "ON" : "OFF"}</button>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Knob value={reverbAmount} min={0} max={1} step={0.01} label="Amount" onChange={(v) => { setReverbAmount(v); e?.setReverbAmount(v); }} size="sm" />
                </div>
              </div>
              <div style={sectionPanel}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, borderBottom: "1px solid #1a1a1a", paddingBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", color: "#404040", fontFamily: "Arial", textTransform: "uppercase" }}>Delay</span>
                  <button
                    onClick={() => { const next = !delayEnabled; setDelayEnabled(next); e?.setDelayEnabled(next); }}
                    style={{
                      padding: "2px 8px", borderRadius: 3, border: "1px solid",
                      borderColor: delayEnabled ? ACCENT : "#2a2a2a",
                      background: delayEnabled ? "#001a22" : "#0a0a0a",
                      color: delayEnabled ? ACCENT : "#404040",
                      fontSize: 9, cursor: "pointer", fontFamily: "Arial", letterSpacing: "0.1em",
                      boxShadow: delayEnabled ? "inset 0 0 6px rgba(0,212,255,0.2)" : "none",
                    }}
                  >{delayEnabled ? "ON" : "OFF"}</button>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Knob value={delayAmount} min={0} max={1} step={0.01} label="Amount" onChange={(v) => { setDelayAmount(v); e?.setDelayAmount(v); }} size="sm" />
                </div>
              </div>
            </div>

            {/* Keyboard */}
            <div style={{ background: "#050505", borderRadius: 5, border: "1px solid #111", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.5)", overflow: "hidden" }}>
              <div style={{
                display: "flex", alignItems: "stretch", height: 28,
                background: "linear-gradient(90deg, #080808, #111 10%, #111 90%, #080808)",
                borderBottom: "1px solid #080808",
              }}>
                <button style={{ border: "none", borderRight: "1px solid #1a1a1a", background: "transparent", color: startOctave <= 1 ? "#222" : "#666", fontSize: 12, padding: "0 16px", cursor: startOctave <= 1 ? "default" : "pointer", fontFamily: "Arial" }}
                  onClick={() => setStartOctave((o) => Math.max(1, o - 1))} disabled={startOctave <= 1}>◀</button>
                <span style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#2a2a2a", fontSize: 9, fontFamily: "Arial", letterSpacing: "0.3em" }}>
                  OCT {startOctave}–{startOctave + 3}
                </span>
                <button style={{ border: "none", borderLeft: "1px solid #1a1a1a", background: "transparent", color: startOctave >= 5 ? "#222" : "#666", fontSize: 12, padding: "0 16px", cursor: startOctave >= 5 ? "default" : "pointer", fontFamily: "Arial" }}
                  onClick={() => setStartOctave((o) => Math.min(5, o + 1))} disabled={startOctave >= 5}>▶</button>
              </div>
              <PianoKeyboard onNoteOn={noteOn} onNoteOff={noteOff} startOctave={startOctave} octaves={4} activeNotes={activeNotes} whiteKeyWidth={28} whiteKeyHeight={90} />
            </div>

            {!ready && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: 6,
                background: "rgba(10,10,10,0.85)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 10,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.3em",
                  color: ACCENT, fontFamily: "Arial",
                }}>INITIALIZING...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
