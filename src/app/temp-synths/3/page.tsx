// src/app/temp-synths/3/page.tsx
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
import { Synth3Engine } from "./engine";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const KEY_NOTE_MAP: Record<string, [string, number]> = {
  a: ["C", 0],  w: ["C#", 0], s: ["D", 0],  e: ["D#", 0],
  d: ["E", 0],  f: ["F", 0],  t: ["F#", 0], g: ["G", 0],
  y: ["G#", 0], h: ["A", 0],  u: ["A#", 0], j: ["B", 0],
  k: ["C", 1],  o: ["C#", 1], l: ["D", 1],  p: ["D#", 1],
  ";": ["E", 1],
};

const THEME = { bg: "var(--background)", border: "var(--border)", panel: "var(--card)" };

const SECTION: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "12px 16px",
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "var(--muted-foreground)",
  marginBottom: 10,
};

const SUBLABEL: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--muted-foreground)",
  marginBottom: 6,
};

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
    <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="env3-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${rEnd} ${bot} Z`} fill="url(#env3-grad)" />
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth={1.5} strokeLinejoin="round" />
      {dot.visible && (
        <circle cx={dot.x} cy={dot.y} r={4} fill="var(--primary)" opacity={0.9} />
      )}
    </svg>
  );
}

function FilterTypeSelect({ value, onChange }: { value: BiquadFilterType; onChange: (v: BiquadFilterType) => void }) {
  const options: BiquadFilterType[] = ["lowpass", "highpass", "bandpass"];
  const labels: Record<string, string> = { lowpass: "LP", highpass: "HP", bandpass: "BP" };
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: "1px solid",
            borderColor: value === o ? "var(--primary)" : "var(--border)",
            background: value === o ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
            color: value === o ? "var(--foreground)" : "var(--muted-foreground)",
            fontSize: 11,
            fontWeight: value === o ? 600 : 400,
            cursor: "pointer",
            transition: "all 150ms",
          }}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

export default function Synth3Page() {
  const engineRef = useRef<Synth3Engine | null>(null);
  const { isMobile, mobileKeyWidth } = useBreakpoint();

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

  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [noteOnMs, setNoteOnMs] = useState<number | null>(null);
  const [noteOffMs, setNoteOffMs] = useState<number | null>(null);
  const [volume, setVolume] = useState(0.8);
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
  const getFilterFreq = useCallback((): number => engineRef.current?.getFilterFreq() ?? filterCutoff, [filterCutoff]);

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

  const header = (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
      <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>The Classic</p>
      <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 8px" }}>
        Dual Osc · Filter · Dual ADSR · LFO
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => { const next = !polyEnabled; setPolyEnabled(next); e?.setPolyEnabled(next); }}
          style={{
            padding: "3px 10px", borderRadius: 6, border: "1px solid",
            borderColor: polyEnabled ? "var(--primary)" : "var(--border)",
            background: polyEnabled ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
            color: polyEnabled ? "var(--foreground)" : "var(--muted-foreground)",
            fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: "0.1em",
          }}
        >{polyEnabled ? "POLY" : "MONO"}</button>
      </div>
      {isMobile ? (
        <WaveformCanvas getWaveform={getWaveform} width={320} height={60} />
      ) : (
        <div style={{ display: "flex", gap: 12 }}>
          <WaveformCanvas getWaveform={getWaveform} width={300} height={60} />
          <SpectrumCanvas
            getFFT={getFFT}
            filterFreq={filterCutoff}
            resonance={filterRes}
            filterType={filterType}
            sampleRate={engineRef.current?.sampleRate ?? 44100}
            fftSize={engineRef.current?.fftSize ?? 2048}
            width={180}
            height={60}
            getFilterFreq={getFilterFreq}
          />
        </div>
      )}
    </div>
  );

  const controls = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div style={SECTION}>
          <p style={LABEL}>Oscillators</p>
          <p style={SUBLABEL}>OSC 1</p>
          <WaveformSelect value={osc1Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc1Type(v); e?.setOsc1Type(v as OscillatorType); }} label="" />
          <div style={{ height: 10 }} />
          <p style={SUBLABEL}>OSC 2</p>
          <WaveformSelect value={osc2Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc2Type(v); e?.setOsc2Type(v as OscillatorType); }} label="" />
          <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 10 }}>
            <Knob value={osc2Detune} min={-100} max={100} step={1} label="Detune" unit="¢" onChange={(v) => { setOsc2Detune(v); e?.setOsc2Detune(v); }} size="sm" />
            <Knob value={oscMix} min={0} max={1} step={0.01} label="Mix" onChange={(v) => { setOscMix(v); e?.setOscMix(v); }} size="sm" />
          </div>
        </div>

        <div style={SECTION}>
          <p style={LABEL}>Filter</p>
          <FilterTypeSelect value={filterType} onChange={(v) => { setFilterTypeState(v); e?.setFilterType(v); }} />
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10 }}>
            <Knob value={filterCutoff} min={80} max={18000} step={10} label="Cutoff" unit="Hz" onChange={(v) => { setFilterCutoff(v); e?.setFilterCutoff(v); }} size="sm" />
            <Knob value={filterRes} min={0.1} max={20} step={0.1} label="Res" unit="Q" onChange={(v) => { setFilterRes(v); e?.setFilterResonance(v); }} size="sm" />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
            <p style={{ ...SUBLABEL, marginBottom: 0 }}>Filter Env</p>
            <button
              onClick={() => { const next = !filterEnvEnabled; setFilterEnvEnabled(next); e?.setFilterEnvEnabled(next); }}
              style={{
                padding: "3px 8px", borderRadius: 6, border: "1px solid",
                borderColor: filterEnvEnabled ? "var(--primary)" : "var(--border)",
                background: filterEnvEnabled ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
                color: filterEnvEnabled ? "var(--foreground)" : "var(--muted-foreground)",
                fontSize: 10, fontWeight: 700, cursor: "pointer",
              }}
            >{filterEnvEnabled ? "ON" : "OFF"}</button>
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
            <Knob value={fEnvAmt} min={0} max={10000} step={50} label="Amount" unit="Hz" onChange={(v) => { setFEnvAmt(v); e?.setFilterEnvAmount(v); }} size="sm" />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "center" }}>
            <Fader value={fEnvA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setFEnvA(v); e?.setFilterEnvAttack(v); }} />
            <Fader value={fEnvD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setFEnvD(v); e?.setFilterEnvDecay(v); }} />
            <Fader value={fEnvS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setFEnvS(v); e?.setFilterEnvSustain(v); }} />
            <Fader value={fEnvR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setFEnvR(v); e?.setFilterEnvRelease(v); }} />
          </div>
        </div>

        <div style={SECTION}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ ...LABEL, marginBottom: 0 }}>Amp Env</p>
            <Knob value={volume} min={0} max={1} step={0.01} label="Vol" onChange={(v) => { setVolume(v); e?.setVolume(v); }} size="sm" />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              <Fader value={ampA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setAmpA(v); e?.setAmpAttack(v); }} />
              <Fader value={ampD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setAmpD(v); e?.setAmpDecay(v); }} />
              <Fader value={ampS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setAmpS(v); e?.setAmpSustain(v); }} />
              <Fader value={ampR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setAmpR(v); e?.setAmpRelease(v); }} />
            </div>
            <div style={{ background: "var(--background)", borderRadius: 6, padding: 4, border: "1px solid var(--border)" }}>
              <EnvelopeCurve
                attack={ampA} decay={ampD} sustainLevel={ampS} release={ampR}
                noteOnMs={noteOnMs} noteOffMs={noteOffMs}
                width={130} height={60}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={SECTION}>
        <p style={LABEL}>LFO</p>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <WaveformSelect value={lfoType} options={["sine", "square"]} onChange={(v) => { setLfoType(v); e?.setLfoType(v as OscillatorType); }} label="Shape" />
          <Knob value={lfoRate} min={0.1} max={20} step={0.1} label="Rate" unit="Hz" onChange={(v) => { setLfoRate(v); e?.setLfoRate(v); }} size="sm" />
          <Knob value={lfoDepth} min={0} max={100} step={1} label="Depth" onChange={(v) => { setLfoDepth(v); e?.setLfoDepth(v); }} size="sm" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Route</span>
            <div style={{ display: "flex", gap: 4 }}>
              {(["pitch", "filter"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => { setLfoRoute(r); e?.setLfoRoute(r); }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid",
                    borderColor: lfoRoute === r ? "var(--primary)" : "var(--border)",
                    background: lfoRoute === r ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
                    color: lfoRoute === r ? "var(--foreground)" : "var(--muted-foreground)",
                    fontSize: 11,
                    cursor: "pointer",
                    transition: "all 150ms",
                    textTransform: "capitalize",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => { const next = !lfoEnabled; setLfoEnabled(next); e?.setLfoEnabled(next); }}
            style={{
              padding: "4px 10px", borderRadius: 6, border: "1px solid",
              borderColor: lfoEnabled ? "var(--primary)" : "var(--border)",
              background: lfoEnabled ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
              color: lfoEnabled ? "var(--foreground)" : "var(--muted-foreground)",
              fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: "0.1em",
            }}
          >{lfoEnabled ? "ON" : "OFF"}</button>
        </div>
      </div>

      <div style={SECTION}>
        <p style={LABEL}>FX</p>
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ ...SUBLABEL, marginBottom: 0 }}>Reverb</span>
              <button
                onClick={() => { const next = !reverbEnabled; setReverbEnabled(next); e?.setReverbEnabled(next); }}
                style={{
                  padding: "3px 8px", borderRadius: 6, border: "1px solid",
                  borderColor: reverbEnabled ? "var(--primary)" : "var(--border)",
                  background: reverbEnabled ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
                  color: reverbEnabled ? "var(--foreground)" : "var(--muted-foreground)",
                  fontSize: 10, fontWeight: 700, cursor: "pointer",
                }}
              >{reverbEnabled ? "ON" : "OFF"}</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Knob value={reverbAmount} min={0} max={1} step={0.01} label="Amount" onChange={(v) => { setReverbAmount(v); e?.setReverbAmount(v); }} size="sm" />
            </div>
          </div>
          <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ ...SUBLABEL, marginBottom: 0 }}>Delay</span>
              <button
                onClick={() => { const next = !delayEnabled; setDelayEnabled(next); e?.setDelayEnabled(next); }}
                style={{
                  padding: "3px 8px", borderRadius: 6, border: "1px solid",
                  borderColor: delayEnabled ? "var(--primary)" : "var(--border)",
                  background: delayEnabled ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
                  color: delayEnabled ? "var(--foreground)" : "var(--muted-foreground)",
                  fontSize: 10, fontWeight: 700, cursor: "pointer",
                }}
              >{delayEnabled ? "ON" : "OFF"}</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Knob value={delayAmount} min={0} max={1} step={0.01} label="Amount" onChange={(v) => { setDelayAmount(v); e?.setDelayAmount(v); }} size="sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const keyboard = (
    <div style={{ padding: "8px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => setStartOctave((o) => Math.max(1, o - 1))}
            style={{ padding: "2px 10px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--card)", color: "var(--muted-foreground)", fontSize: 14, cursor: "pointer" }}
          >−</button>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", alignSelf: "center" }}>Oct {startOctave}</span>
          <button
            onClick={() => setStartOctave((o) => Math.min(6, o + 1))}
            style={{ padding: "2px 10px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--card)", color: "var(--muted-foreground)", fontSize: 14, cursor: "pointer" }}
          >+</button>
        </div>
        <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.6 }}>QWERTY</span>
      </div>
      <PianoKeyboard
        onNoteOn={noteOn}
        onNoteOff={noteOff}
        startOctave={startOctave}
        octaves={isMobile ? 2 : 3}
        whiteKeyWidth={isMobile ? mobileKeyWidth : 24}
        whiteKeyHeight={isMobile ? 80 : 72}
        activeNotes={activeNotes}
      />
    </div>
  );

  return (
    <SynthShell
      isMobile={isMobile}
      theme={THEME}
      header={header}
      controls={controls}
      keyboard={keyboard}
      navHeight={48}
    />
  );
}
