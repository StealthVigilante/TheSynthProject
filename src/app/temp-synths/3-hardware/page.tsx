"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { WaveformCanvas } from "../waveform-canvas";
import { SpectrumCanvas } from "../spectrum-canvas";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Synth3Engine } from "../3/engine";

// ── Hot Magenta palette ─────────────────────────────────────────
const ACCENT      = "#e040fb";
const ACCENT_DIM  = "#9a00c0";
const CHB         = "#2a003d";
const FACEPLATE   = "#0d0010";
const SEC_BG      = "#070009";
const SEC_BDR     = "#1a0025";
const SCREEN_BG   = "#0a0012";
// ────────────────────────────────────────────────────────────────

const themeVars = {
  "--primary":            ACCENT,
  "--color-primary":      ACCENT,
  "--primary-foreground": "#0d0010",
} as CSSProperties;

const MOBILE_THEME = { bg: "#070009", border: "#1a0025", panel: "#0d0010" };

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
];

function FilterTypeSelect({ value, onChange }: { value: BiquadFilterType; onChange: (v: BiquadFilterType) => void }) {
  const options: BiquadFilterType[] = ["lowpass", "highpass", "bandpass"];
  const labels: Record<string, string> = { lowpass: "LP", highpass: "HP", bandpass: "BP" };
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} style={{
          padding: "3px 7px", borderRadius: 4, border: "1px solid",
          borderColor: value === o ? ACCENT : SEC_BDR,
          background: value === o ? `${ACCENT}22` : SEC_BG,
          color: value === o ? ACCENT : "#555",
          fontSize: 10, fontWeight: value === o ? 700 : 400, cursor: "pointer",
          letterSpacing: "0.08em", transition: "all 150ms",
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

function EnvelopeCurve({ attack, decay, sustainLevel, release, noteOnMs, noteOffMs, width = 200, height = 70 }: EnvCurveProps) {
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
    <svg width={W} height={H} style={{ display: "block", overflow: "visible", filter: `drop-shadow(0 0 4px ${ACCENT}88)` }}>
      <defs>
        <linearGradient id="env3h-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.3" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${rEnd} ${bot} Z`} fill="url(#env3h-grad)" />
      <path d={d} fill="none" stroke={ACCENT} strokeWidth={1.5} strokeLinejoin="round" />
      {dot.visible && (
        <circle cx={dot.x} cy={dot.y} r={4} fill={ACCENT}
          style={{ filter: `drop-shadow(0 0 6px ${ACCENT})` }} />
      )}
    </svg>
  );
}

const SEC_LABEL: CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: "0.2em",
  textTransform: "uppercase", color: ACCENT_DIM, marginBottom: 10,
};
const SUBLABEL: CSSProperties = {
  fontSize: 8, fontWeight: 700, letterSpacing: "0.15em",
  textTransform: "uppercase", color: "#444", marginBottom: 6,
};

function HSection({ label, children, style }: { label: string; children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      background: SEC_BG, borderTop: `2px solid ${ACCENT}`,
      borderRadius: "0 0 6px 6px", padding: "10px 14px",
      ...style,
    }}>
      <p style={SEC_LABEL}>{label}</p>
      {children}
    </div>
  );
}

export default function Synth3HardwarePage() {
  const engineRef = useRef<Synth3Engine | null>(null);
  const { isMobile, mobileKeyWidth } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<"osc" | "filter" | "env" | "lfo">("osc");

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

  const [volume, setVolume] = useState(0.8);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [noteOnMs, setNoteOnMs] = useState<number | null>(null);
  const [noteOffMs, setNoteOffMs] = useState<number | null>(null);
  const [startOctave, setStartOctave] = useState(3);
  const startOctaveRef = useRef(startOctave);
  useEffect(() => { startOctaveRef.current = startOctave; }, [startOctave]);

  useEffect(() => {
    engineRef.current = new Synth3Engine();
    return () => engineRef.current?.dispose();
  }, []);

  const noteOn = useCallback((note: string, vel: number) => {
    engineRef.current?.noteOn(note, vel);
    setActiveNotes((prev) => new Set(prev).add(note));
    setNoteOnMs(performance.now());
    setNoteOffMs(null);
  }, []);

  const noteOff = useCallback((note: string) => {
    engineRef.current?.noteOff(note);
    setActiveNotes((prev) => { const s = new Set(prev); s.delete(note); return s; });
    setNoteOffMs(performance.now());
  }, []);

  const getWaveform = useCallback((): Float32Array => engineRef.current?.getWaveform() ?? new Float32Array(2048), []);
  const getFFT = useCallback((): Float32Array => engineRef.current?.getFFT() ?? new Float32Array(1024), []);

  const e = engineRef.current;

  useEffect(() => {
    const pressed = new Set<string>();
    const onDown = (ev: KeyboardEvent) => {
      if (ev.repeat || ev.target instanceof HTMLInputElement) return;
      const entry = KEY_NOTE_MAP[ev.key.toLowerCase()];
      if (!entry) return;
      const [name, octOffset] = entry;
      const note = `${name}${startOctaveRef.current + octOffset}`;
      if (pressed.has(ev.key)) return;
      pressed.add(ev.key);
      noteOn(note, 0.8);
    };
    const onUp = (ev: KeyboardEvent) => {
      const entry = KEY_NOTE_MAP[ev.key.toLowerCase()];
      if (!entry) return;
      const [name, octOffset] = entry;
      const note = `${name}${startOctaveRef.current + octOffset}`;
      pressed.delete(ev.key);
      noteOff(note);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [noteOn, noteOff]);

  const desktopView = (
    <div style={{ ...themeVars, minHeight: "100vh", background: "#050008", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{
        width: "100%", maxWidth: 900,
        background: `linear-gradient(160deg, #1a0028 0%, #0d0010 40%, #070009 100%)`,
        borderRadius: 18,
        boxShadow: `0 32px 80px #00000088, 0 0 0 1px ${CHB}, inset 0 1px 0 #3a005560`,
        transform: "perspective(900px) rotateX(-3deg)",
        transformOrigin: "bottom center",
        overflow: "hidden",
      }}>
        <div style={{
          background: `linear-gradient(90deg, #0d0010 0%, #1a0025 50%, #0d0010 100%)`,
          borderBottom: `1px solid ${CHB}`,
          padding: "10px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 900, letterSpacing: "0.3em", color: ACCENT, textTransform: "uppercase" }}>OSCISCOOPS</span>
            <span style={{ marginLeft: 16, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "#444", textTransform: "uppercase" }}>Model 3 · The Classic</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a0025", border: `1px solid ${CHB}` }} />
          </div>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            background: SCREEN_BG, borderRadius: 8, padding: 12,
            border: `1px solid ${SEC_BDR}`,
            display: "flex", gap: 12, alignItems: "center",
          }}>
            <WaveformCanvas getWaveform={getWaveform} width={300} height={56} />
            <SpectrumCanvas
              getFFT={getFFT}
              filterFreq={filterCutoff}
              resonance={filterRes}
              sampleRate={engineRef.current?.sampleRate ?? 44100}
              fftSize={engineRef.current?.fftSize ?? 2048}
              lineColor={ACCENT}
              width={220}
              height={56}
            />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, alignSelf: "center" }}>
              <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "#444" }}>DUAL OSC · FILTER · DUAL ADSR · LFO</span>
              <span style={{ fontSize: 9, color: ACCENT_DIM, fontFamily: "monospace" }}>SR: {engineRef.current?.sampleRate ?? "–"} Hz</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <HSection label="Oscillators">
              <p style={SUBLABEL}>OSC 1</p>
              <WaveformSelect value={osc1Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc1Type(v); e?.setOsc1Type(v as OscillatorType); }} label="" />
              <div style={{ height: 8 }} />
              <p style={SUBLABEL}>OSC 2</p>
              <WaveformSelect value={osc2Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc2Type(v); e?.setOsc2Type(v as OscillatorType); }} label="" />
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
                <Knob value={osc2Detune} min={-100} max={100} step={1} label="Detune" unit="¢" onChange={(v) => { setOsc2Detune(v); e?.setOsc2Detune(v); }} size="sm" />
                <Knob value={oscMix} min={0} max={1} step={0.01} label="Mix" onChange={(v) => { setOscMix(v); e?.setOscMix(v); }} size="sm" />
              </div>
            </HSection>

            <HSection label="Filter">
              <FilterTypeSelect value={filterType} onChange={(v) => { setFilterTypeState(v); e?.setFilterType(v); }} />
              <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10 }}>
                <Knob value={filterCutoff} min={80} max={18000} step={10} label="Cutoff" unit="Hz" onChange={(v) => { setFilterCutoff(v); e?.setFilterCutoff(v); }} size="sm" />
                <Knob value={filterRes} min={0.1} max={20} step={0.1} label="Res" unit="Q" onChange={(v) => { setFilterRes(v); e?.setFilterResonance(v); }} size="sm" />
              </div>
              <p style={{ ...SUBLABEL, marginTop: 10 }}>Filter Env</p>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                <Knob value={fEnvAmt} min={0} max={10000} step={50} label="Amount" unit="Hz" onChange={(v) => { setFEnvAmt(v); e?.setFilterEnvAmount(v); }} size="sm" />
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                <Fader value={fEnvA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setFEnvA(v); e?.setFilterEnvAttack(v); }} />
                <Fader value={fEnvD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setFEnvD(v); e?.setFilterEnvDecay(v); }} />
                <Fader value={fEnvS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setFEnvS(v); e?.setFilterEnvSustain(v); }} />
                <Fader value={fEnvR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setFEnvR(v); e?.setFilterEnvRelease(v); }} />
              </div>
            </HSection>

            <HSection label="Amp Env">
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <Knob value={volume} min={0} max={1} step={0.01} label="Vol" onChange={(v) => { setVolume(v); e?.setVolume(v); }} size="sm" />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <Fader value={ampA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setAmpA(v); e?.setAmpAttack(v); }} />
                  <Fader value={ampD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setAmpD(v); e?.setAmpDecay(v); }} />
                  <Fader value={ampS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setAmpS(v); e?.setAmpSustain(v); }} />
                  <Fader value={ampR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setAmpR(v); e?.setAmpRelease(v); }} />
                </div>
                <div style={{ background: SCREEN_BG, borderRadius: 6, padding: "4px 6px", border: `1px solid ${SEC_BDR}` }}>
                  <EnvelopeCurve
                    attack={ampA} decay={ampD} sustainLevel={ampS} release={ampR}
                    noteOnMs={noteOnMs} noteOffMs={noteOffMs}
                    width={130} height={70}
                  />
                </div>
              </div>
            </HSection>
          </div>

          <HSection label="LFO">
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <WaveformSelect value={lfoType} options={["sine", "square"]} onChange={(v) => { setLfoType(v); e?.setLfoType(v as OscillatorType); }} label="Shape" />
              <Knob value={lfoRate} min={0.1} max={20} step={0.1} label="Rate" unit="Hz" onChange={(v) => { setLfoRate(v); e?.setLfoRate(v); }} size="sm" />
              <Knob value={lfoDepth} min={0} max={100} step={1} label="Depth" onChange={(v) => { setLfoDepth(v); e?.setLfoDepth(v); }} size="sm" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 9, color: "#444", letterSpacing: "0.15em" }}>ROUTE</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["pitch", "filter"] as const).map((r) => (
                    <button key={r} onClick={() => { setLfoRoute(r); e?.setLfoRoute(r); }} style={{
                      padding: "3px 10px", borderRadius: 4, border: "1px solid",
                      borderColor: lfoRoute === r ? ACCENT : SEC_BDR,
                      background: lfoRoute === r ? `${ACCENT}22` : SEC_BG,
                      color: lfoRoute === r ? ACCENT : "#555",
                      fontSize: 10, cursor: "pointer", letterSpacing: "0.08em",
                      textTransform: "capitalize", transition: "all 150ms",
                    }}>{r}</button>
                  ))}
                </div>
              </div>
            </div>
          </HSection>

          <div style={{ background: SCREEN_BG, borderRadius: 8, padding: "10px 14px", border: `1px solid ${SEC_BDR}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setStartOctave((o) => Math.max(1, o - 1))} style={{ padding: "2px 10px", borderRadius: 4, border: `1px solid ${SEC_BDR}`, background: SEC_BG, color: "#555", fontSize: 14, cursor: "pointer" }}>−</button>
                <span style={{ fontSize: 11, color: "#555", alignSelf: "center" }}>Oct {startOctave}</span>
                <button onClick={() => setStartOctave((o) => Math.min(6, o + 1))} style={{ padding: "2px 10px", borderRadius: 4, border: `1px solid ${SEC_BDR}`, background: SEC_BG, color: "#555", fontSize: 14, cursor: "pointer" }}>+</button>
              </div>
              <span style={{ fontSize: 9, color: "#333", letterSpacing: "0.15em" }}>QWERTY</span>
            </div>
            <PianoKeyboard
              onNoteOn={noteOn}
              onNoteOff={noteOff}
              startOctave={startOctave}
              octaves={3}
              whiteKeyWidth={24}
              whiteKeyHeight={72}
              activeNotes={activeNotes}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const mobileView = (
    <div style={{ ...themeVars, minHeight: "100vh", background: MOBILE_THEME.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${SEC_BDR}` }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: ACCENT }}>The Classic</p>
        <p style={{ margin: "2px 0 8px", fontSize: 10, color: "#444" }}>Dual Osc · Filter · Dual ADSR · LFO</p>
        <WaveformCanvas getWaveform={getWaveform} width={320} height={50} />
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${SEC_BDR}` }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: "8px 0", background: "transparent", border: "none",
            borderBottom: `2px solid ${activeTab === t.id ? ACCENT : "transparent"}`,
            color: activeTab === t.id ? ACCENT : "#444",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
        {activeTab === "osc" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <p style={SUBLABEL}>OSC 1</p>
              <WaveformSelect value={osc1Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc1Type(v); e?.setOsc1Type(v as OscillatorType); }} label="" />
            </div>
            <div>
              <p style={SUBLABEL}>OSC 2</p>
              <WaveformSelect value={osc2Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc2Type(v); e?.setOsc2Type(v as OscillatorType); }} label="" />
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              <Knob value={osc2Detune} min={-100} max={100} step={1} label="Detune" unit="¢" onChange={(v) => { setOsc2Detune(v); e?.setOsc2Detune(v); }} size="sm" />
              <Knob value={oscMix} min={0} max={1} step={0.01} label="Mix" onChange={(v) => { setOscMix(v); e?.setOscMix(v); }} size="sm" />
            </div>
          </div>
        )}
        {activeTab === "filter" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FilterTypeSelect value={filterType} onChange={(v) => { setFilterTypeState(v); e?.setFilterType(v); }} />
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              <Knob value={filterCutoff} min={80} max={18000} step={10} label="Cutoff" unit="Hz" onChange={(v) => { setFilterCutoff(v); e?.setFilterCutoff(v); }} size="sm" />
              <Knob value={filterRes} min={0.1} max={20} step={0.1} label="Res" unit="Q" onChange={(v) => { setFilterRes(v); e?.setFilterResonance(v); }} size="sm" />
            </div>
            <p style={{ ...SUBLABEL, marginTop: 8 }}>Filter Env</p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Knob value={volume} min={0} max={1} step={0.01} label="Vol" onChange={(v) => { setVolume(v); e?.setVolume(v); }} size="sm" />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <Fader value={ampA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setAmpA(v); e?.setAmpAttack(v); }} />
                <Fader value={ampD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setAmpD(v); e?.setAmpDecay(v); }} />
                <Fader value={ampS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setAmpS(v); e?.setAmpSustain(v); }} />
                <Fader value={ampR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setAmpR(v); e?.setAmpRelease(v); }} />
              </div>
              <div style={{ background: SCREEN_BG, borderRadius: 6, padding: "4px 6px", border: `1px solid ${SEC_BDR}` }}>
                <EnvelopeCurve
                  attack={ampA} decay={ampD} sustainLevel={ampS} release={ampR}
                  noteOnMs={noteOnMs} noteOffMs={noteOffMs}
                  width={130} height={60}
                />
              </div>
            </div>
          </div>
        )}
        {activeTab === "lfo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <WaveformSelect value={lfoType} options={["sine", "square"]} onChange={(v) => { setLfoType(v); e?.setLfoType(v as OscillatorType); }} label="Shape" />
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              <Knob value={lfoRate} min={0.1} max={20} step={0.1} label="Rate" unit="Hz" onChange={(v) => { setLfoRate(v); e?.setLfoRate(v); }} size="sm" />
              <Knob value={lfoDepth} min={0} max={100} step={1} label="Depth" onChange={(v) => { setLfoDepth(v); e?.setLfoDepth(v); }} size="sm" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 10, color: "#444" }}>Route</span>
              <div style={{ display: "flex", gap: 4 }}>
                {(["pitch", "filter"] as const).map((r) => (
                  <button key={r} onClick={() => { setLfoRoute(r); e?.setLfoRoute(r); }} style={{
                    padding: "5px 14px", borderRadius: 4, border: "1px solid",
                    borderColor: lfoRoute === r ? ACCENT : SEC_BDR,
                    background: lfoRoute === r ? `${ACCENT}22` : SEC_BG,
                    color: lfoRoute === r ? ACCENT : "#555",
                    fontSize: 11, cursor: "pointer", textTransform: "capitalize",
                  }}>{r}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${SEC_BDR}`, padding: "8px 10px", background: SEC_BG }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setStartOctave((o) => Math.max(1, o - 1))} style={{ padding: "2px 10px", borderRadius: 4, border: `1px solid ${SEC_BDR}`, background: SCREEN_BG, color: "#555", fontSize: 14, cursor: "pointer" }}>−</button>
            <span style={{ fontSize: 11, color: "#555", alignSelf: "center" }}>Oct {startOctave}</span>
            <button onClick={() => setStartOctave((o) => Math.min(6, o + 1))} style={{ padding: "2px 10px", borderRadius: 4, border: `1px solid ${SEC_BDR}`, background: SCREEN_BG, color: "#555", fontSize: 14, cursor: "pointer" }}>+</button>
          </div>
        </div>
        <PianoKeyboard
          onNoteOn={noteOn}
          onNoteOff={noteOff}
          startOctave={startOctave}
          octaves={2}
          whiteKeyWidth={mobileKeyWidth}
          whiteKeyHeight={80}
          activeNotes={activeNotes}
        />
      </div>
    </div>
  );

  return isMobile ? mobileView : desktopView;
}
