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
import { Synth2Engine } from "./engine";

const THEME = { bg: "var(--background)", border: "var(--border)", panel: "var(--card)" };

const KEY_NOTE_MAP: Record<string, [string, number]> = {
  a: ["C", 0],  w: ["C#", 0], s: ["D", 0],  e: ["D#", 0],
  d: ["E", 0],  f: ["F", 0],  t: ["F#", 0], g: ["G", 0],
  y: ["G#", 0], h: ["A", 0],  u: ["A#", 0], j: ["B", 0],
  k: ["C", 1],  o: ["C#", 1], l: ["D", 1],  p: ["D#", 1],
  ";": ["E", 1],
};

const SECTION: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "16px 20px",
};

const LABEL: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "var(--muted-foreground)",
  marginBottom: 14,
};

const TAB_BAR_STYLE: React.CSSProperties = {
  display: "flex",
  borderBottom: "1px solid var(--border)",
  flexShrink: 0,
};

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "8px 4px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  background: "none",
  border: "none",
  borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
  color: active ? "var(--foreground)" : "var(--muted-foreground)",
  cursor: "pointer",
});

const TABS = [
  { id: "osc" as const, label: "OSC" },
  { id: "filter" as const, label: "FILTER" },
  { id: "env" as const, label: "ENV" },
  { id: "fx" as const, label: "FX" },
];

const toggleStyle = (on: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid",
  borderColor: on ? "var(--primary)" : "var(--border)",
  background: on ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
  color: on ? "var(--foreground)" : "var(--muted-foreground)",
  fontSize: 12,
  fontWeight: on ? 600 : 400,
  cursor: "pointer",
  transition: "all 150ms",
});

const lerp = (a: number, b: number, t: number) =>
  a + (b - a) * Math.min(1, Math.max(0, t));

interface EnvelopeCurveProps {
  attack: number;
  decay: number;
  sustainLevel: number;
  release: number;
  noteOnMs: number | null;
  noteOffMs: number | null;
  width?: number;
  height?: number;
}

function EnvelopeCurve({ attack, decay, sustainLevel, release, noteOnMs, noteOffMs, width = 220, height = 80 }: EnvelopeCurveProps) {
  const W = width;
  const H = height;
  const top = 6;
  const bot = H - 6;

  const maxT = Math.max(attack + decay + release, 2);
  const aX = (attack / maxT) * (W * 0.65);
  const dX = aX + (decay / maxT) * (W * 0.65);
  const sX = dX + W * 0.16;
  const rEnd = Math.min(sX + (release / maxT) * (W * 0.65), W - 4);
  const susY = top + (1 - sustainLevel) * (bot - top);

  const d = `M 0 ${bot} L ${aX} ${top} L ${dX} ${susY} L ${sX} ${susY} L ${rEnd} ${bot}`;

  const [dot, setDot] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: bot,
    visible: false,
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (noteOnMs === null) {
      setDot((prev) => prev.visible ? { ...prev, visible: false } : prev);
      return;
    }

    const attackMs = attack * 1000;
    const decayMs = decay * 1000;
    const releaseMs = release * 1000;

    const tick = () => {
      const elapsed = performance.now() - noteOnMs;

      if (noteOffMs === null) {
        if (elapsed < attackMs) {
          const t = elapsed / attackMs;
          setDot({ x: lerp(0, aX, t), y: lerp(bot, top, t), visible: true });
        } else if (elapsed < attackMs + decayMs) {
          const t = (elapsed - attackMs) / decayMs;
          setDot({ x: lerp(aX, dX, t), y: lerp(top, susY, t), visible: true });
        } else {
          setDot({ x: sX, y: susY, visible: true });
        }
      } else {
        const releaseElapsed = performance.now() - noteOffMs;
        if (releaseElapsed < releaseMs) {
          const t = releaseElapsed / releaseMs;
          setDot({ x: lerp(sX, rEnd, t), y: lerp(susY, bot, t), visible: true });
        } else {
          setDot((prev) => ({ ...prev, visible: false }));
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [noteOnMs, noteOffMs, attack, decay, release, aX, dX, sX, rEnd, top, bot, susY]);

  const gridY1 = top + (bot - top) * 0.33;
  const gridY2 = top + (bot - top) * 0.66;

  return (
    <svg width={W} height={H} style={{ display: "block", maxWidth: "100%" }}>
      <line x1={0} y1={gridY1} x2={W} y2={gridY1} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      <line x1={0} y1={gridY2} x2={W} y2={gridY2} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      <path
        d={d}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: "drop-shadow(0 0 3px var(--primary))" }}
      />
      <circle cx={aX} cy={top} r={3} fill="var(--primary)" opacity={0.6} />
      <circle cx={dX} cy={susY} r={3} fill="var(--primary)" opacity={0.6} />
      <circle cx={sX} cy={susY} r={3} fill="var(--primary)" opacity={0.6} />
      <circle cx={Math.min(rEnd, W - 3)} cy={bot} r={3} fill="var(--primary)" opacity={0.6} />
      {dot.visible && (
        <circle
          cx={dot.x}
          cy={dot.y}
          r={4}
          fill="var(--primary)"
          style={{ filter: "drop-shadow(0 0 4px var(--primary))" }}
        />
      )}
    </svg>
  );
}

export default function Synth2Page() {
  const engineRef = useRef<Synth2Engine | null>(null);
  const { isMobile, mobileKeyWidth } = useBreakpoint();

  const [analyserInfo, setAnalyserInfo] = useState({ sampleRate: 44100, fftSize: 2048 });
  const [waveform, setWaveformState] = useState<string>("sawtooth");
  const [subEnabled, setSubState] = useState(false);
  const [cutoff, setCutoffState] = useState(3000);
  const [resonance, setResState] = useState(1);
  const [attack, setAttackState] = useState(0.05);
  const [decay, setDecayState] = useState(0.15);
  const [sustainLevel, setSustainLevelState] = useState(0.7);
  const [release, setReleaseState] = useState(0.6);
  const [reverbAmount, setReverbState] = useState(0);
  const [delayAmount, setDelayState] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [startOctave, setStartOctave] = useState(3);
  const startOctaveRef = useRef(startOctave);
  useEffect(() => { startOctaveRef.current = startOctave; }, [startOctave]);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [noteOnMs, setNoteOnMs] = useState<number | null>(null);
  const [noteOffMs, setNoteOffMs] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"osc" | "filter" | "env" | "fx">("osc");

  useEffect(() => {
    engineRef.current = new Synth2Engine();
    setAnalyserInfo({
      sampleRate: engineRef.current.sampleRate,
      fftSize: engineRef.current.fftSize,
    });
    return () => engineRef.current?.dispose();
  }, []);

  const noteOn = useCallback((note: string, vel: number) => {
    engineRef.current?.noteOn(note, vel);
    setActiveNotes((prev) => new Set([...prev, note]));
    setNoteOnMs(performance.now());
    setNoteOffMs(null);
  }, []);

  const noteOff = useCallback((note: string) => {
    engineRef.current?.noteOff(note);
    setActiveNotes((prev) => { const n = new Set(prev); n.delete(note); return n; });
    setNoteOffMs(performance.now());
  }, []);

  const getWaveform = useCallback((): Float32Array => {
    return engineRef.current?.getWaveform() ?? new Float32Array(2048);
  }, []);

  const getFFT = useCallback((): Float32Array => {
    return engineRef.current?.getFFT() ?? new Float32Array(512);
  }, []);

  const handleWaveform = useCallback((v: string) => {
    setWaveformState(v);
    engineRef.current?.setWaveform(v as OscillatorType);
  }, []);

  const handleSub = useCallback(() => {
    setSubState((prev) => {
      const next = !prev;
      engineRef.current?.setSubEnabled(next);
      return next;
    });
  }, []);

  const handleCutoff = useCallback((hz: number) => {
    setCutoffState(hz);
    engineRef.current?.setCutoff(hz);
  }, []);

  const handleRes = useCallback((q: number) => {
    setResState(q);
    engineRef.current?.setResonance(q);
  }, []);

  const handleAttack = useCallback((s: number) => {
    setAttackState(s);
    engineRef.current?.setAttack(s);
  }, []);

  const handleDecay = useCallback((s: number) => {
    setDecayState(s);
    engineRef.current?.setDecay(s);
  }, []);

  const handleSustainLevel = useCallback((level: number) => {
    setSustainLevelState(level);
    engineRef.current?.setSustainLevel(level);
  }, []);


  const handleRelease = useCallback((s: number) => {
    setReleaseState(s);
    engineRef.current?.setRelease(s);
  }, []);

  const handleReverb = useCallback((v: number) => {
    setReverbState(v);
    engineRef.current?.setReverb(v);
  }, []);

  const handleDelay = useCallback((v: number) => {
    setDelayState(v);
    engineRef.current?.setDelay(v);
  }, []);

  const handleVolume = useCallback((v: number) => {
    setVolumeState(v);
    engineRef.current?.setVolume(v);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    const heldKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const entry = KEY_NOTE_MAP[e.key.toLowerCase()];
      if (!entry) return;
      e.preventDefault();
      if (heldKeys.has(e.key.toLowerCase())) return;
      heldKeys.add(e.key.toLowerCase());
      const [name, offset] = entry;
      const note = `${name}${startOctaveRef.current + offset}`;
      noteOn(note, 0.8);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const entry = KEY_NOTE_MAP[e.key.toLowerCase()];
      if (!entry) return;
      heldKeys.delete(e.key.toLowerCase());
      const [name, offset] = entry;
      const note = `${name}${startOctaveRef.current + offset}`;
      noteOff(note);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isMobile, noteOn, noteOff]);

  const vizW = isMobile ? 100 : 280;
  const vizH = isMobile ? 36 : 76;

  const octaveNavStyle: React.CSSProperties = {
    background: "none",
    border: "1px solid var(--border)",
    borderRadius: 7,
    color: "var(--foreground)",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1,
    padding: "4px 12px",
  };

  const desktopHeader = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--border)",
        padding: "16px 20px",
      }}
    >
      <div>
        <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>The Learner</p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "3px 0 0" }}>
          Osc + Sub · Filter · ADSR · Reverb + Delay
        </p>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <WaveformCanvas getWaveform={getWaveform} width={vizW} height={vizH} />
        <SpectrumCanvas
          getFFT={getFFT}
          filterFreq={cutoff}
          resonance={resonance}
          sampleRate={analyserInfo.sampleRate}
          fftSize={analyserInfo.fftSize}
          width={vizW}
          height={vizH}
        />
      </div>
      <Knob value={volume} min={0} max={1} step={0.01} label="Vol" onChange={handleVolume} size="sm" />
    </div>
  );

  const mobileHeader = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>The Learner</p>
        <p style={{ fontSize: 9, color: "var(--muted-foreground)", margin: "1px 0 0" }}>
          Osc + Sub · Filter · ADSR · Reverb + Delay
        </p>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <WaveformCanvas getWaveform={getWaveform} width={vizW} height={vizH} />
        <SpectrumCanvas
          getFFT={getFFT}
          filterFreq={cutoff}
          resonance={resonance}
          sampleRate={analyserInfo.sampleRate}
          fftSize={analyserInfo.fftSize}
          width={vizW}
          height={vizH}
        />
        <div style={{ marginLeft: 4 }}>
          <Knob value={volume} min={0} max={1} step={0.01} label="Vol" onChange={handleVolume} size="sm" />
        </div>
      </div>
    </div>
  );

  const desktopControls = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateRows: "auto auto",
        gap: 14,
        padding: 16,
      }}
    >
      <div style={SECTION}>
        <p style={LABEL}>Oscillator</p>
        <WaveformSelect
          value={waveform}
          options={["sine", "square", "sawtooth", "triangle"]}
          onChange={handleWaveform}
          size="md"
          label="Waveform"
        />
        <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
          <button onClick={handleSub} style={toggleStyle(subEnabled)}>
            Sub {subEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      <div style={SECTION}>
        <p style={LABEL}>Filter</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
          <Knob
            value={cutoff}
            min={80}
            max={18000}
            step={10}
            label="Cutoff"
            unit="Hz"
            scale="log"
            onChange={handleCutoff}
            size="lg"
          />
          <Knob
            value={resonance}
            min={0.1}
            max={20}
            step={0.1}
            label="Res"
            unit="Q"
            onChange={handleRes}
            size="sm"
          />
        </div>
      </div>

      <div style={SECTION}>
        <p style={LABEL}>FX</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
          <Knob value={reverbAmount} min={0} max={1} step={0.01} label="Reverb" onChange={handleReverb} size="sm" />
          <Knob
            value={delayAmount}
            min={0}
            max={1}
            step={0.01}
            label="Delay"
            onChange={handleDelay}
            size="sm"
          />
        </div>
      </div>

      <div style={{ ...SECTION, gridColumn: "1 / -1", borderTop: "2px solid var(--primary)" }}>
        <p style={LABEL}>Envelope</p>
        <div style={{ display: "flex", gap: 28, alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", gap: 24 }}>
            <Fader value={attack} min={0.001} max={2} step={0.001} label="Attack" unit="s" size="md" onChange={handleAttack} />
            <Fader value={decay} min={0.01} max={2} step={0.01} label="Decay" unit="s" size="md" onChange={handleDecay} />
            <Fader value={sustainLevel} min={0} max={1} step={0.01} label="Sustain" size="md" onChange={handleSustainLevel} />
            <Fader value={release} min={0.05} max={4} step={0.01} label="Release" unit="s" size="md" onChange={handleRelease} />
          </div>
          <div style={{
            background: "#000",
            borderRadius: 8,
            padding: "10px 12px",
            border: "1px solid #2e2e2e",
            boxShadow: "inset 0 0 16px rgba(0,0,0,0.9), 0 0 0 3px #181818, 0 0 0 4px #2e2e2e",
            flexShrink: 0,
          }}>
            <EnvelopeCurve
              attack={attack}
              decay={decay}
              sustainLevel={sustainLevel}
              release={release}
              noteOnMs={noteOnMs}
              noteOffMs={noteOffMs}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const mobileControls = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={TAB_BAR_STYLE}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            style={tabBtnStyle(activeTab === tab.id)}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto" }}>
        {activeTab === "osc" && (
          <div style={SECTION}>
            <WaveformSelect
              value={waveform}
              options={["sine", "square", "sawtooth", "triangle"]}
              onChange={handleWaveform}
              label="Waveform"
            />
            <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
              <button onClick={handleSub} style={toggleStyle(subEnabled)}>
                Sub {subEnabled ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        )}
        {activeTab === "filter" && (
          <div style={SECTION}>
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              <Knob
                value={cutoff}
                min={80}
                max={18000}
                step={10}
                label="Cutoff"
                unit="Hz"
                scale="log"
                onChange={handleCutoff}
                size="sm"
              />
              <Knob
                value={resonance}
                min={0.1}
                max={20}
                step={0.1}
                label="Res"
                unit="Q"
                onChange={handleRes}
                size="sm"
              />
            </div>
          </div>
        )}
        {activeTab === "env" && (
          <div style={SECTION}>
            <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <Fader value={attack} min={0.001} max={2} step={0.001} label="Attack" unit="s" onChange={handleAttack} />
                <Fader value={decay} min={0.01} max={2} step={0.01} label="Decay" unit="s" onChange={handleDecay} />
                <Fader value={sustainLevel} min={0} max={1} step={0.01} label="Sustain" onChange={handleSustainLevel} />
                <Fader value={release} min={0.05} max={4} step={0.01} label="Release" unit="s" onChange={handleRelease} />
              </div>
              <div style={{
                background: "#000",
                borderRadius: 6,
                padding: "8px",
                border: "1px solid #2e2e2e",
                boxShadow: "inset 0 0 12px rgba(0,0,0,0.9), 0 0 0 2px #181818, 0 0 0 3px #2e2e2e",
                flexShrink: 0,
              }}>
                <EnvelopeCurve
                  attack={attack}
                  decay={decay}
                  sustainLevel={sustainLevel}
                  release={release}
                  noteOnMs={noteOnMs}
                  noteOffMs={noteOffMs}
                  width={140}
                  height={60}
                />
              </div>
            </div>
          </div>
        )}
        {activeTab === "fx" && (
          <div style={SECTION}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <Knob value={reverbAmount} min={0} max={1} step={0.01} label="Reverb" onChange={handleReverb} size="sm" />
              <Knob
                value={delayAmount}
                min={0}
                max={1}
                step={0.01}
                label="Delay"
                onChange={handleDelay}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const keyboard = (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {!isMobile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
            justifyContent: "center",
          }}
        >
          <button
            style={octaveNavStyle}
            onClick={() => setStartOctave((o) => Math.max(1, o - 1))}
            disabled={startOctave <= 1}
            aria-label="Octave down"
          >
            −
          </button>
          <span style={{ fontSize: 14, color: "var(--muted-foreground)", minWidth: 74, textAlign: "center" }}>
            Oct {startOctave}–{startOctave + 2}
          </span>
          <button
            style={octaveNavStyle}
            onClick={() => setStartOctave((o) => Math.min(5, o + 1))}
            disabled={startOctave >= 5}
            aria-label="Octave up"
          >
            +
          </button>
        </div>
      )}
      <PianoKeyboard
        onNoteOn={noteOn}
        onNoteOff={noteOff}
        startOctave={startOctave}
        octaves={isMobile ? 2 : 3}
        activeNotes={activeNotes}
        whiteKeyWidth={isMobile ? mobileKeyWidth : 28}
        whiteKeyHeight={isMobile ? 80 : 92}
      />
    </div>
  );

  return (
    <SynthShell
      isMobile={isMobile}
      theme={THEME}
      header={isMobile ? mobileHeader : desktopHeader}
      controls={isMobile ? mobileControls : desktopControls}
      keyboard={keyboard}
      navHeight={48}
      desktopClassName="w-[760px] lg:w-[840px]"
    />
  );
}
