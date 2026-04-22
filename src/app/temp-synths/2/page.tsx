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

const lerp = (a: number, b: number, t: number) =>
  a + (b - a) * Math.min(1, Math.max(0, t));

interface EnvelopeCurveProps {
  attack: number;
  release: number;
  sustainOn: boolean;
  noteOnMs: number | null;
  noteOffMs: number | null;
}

function EnvelopeCurve({ attack, release, sustainOn, noteOnMs, noteOffMs }: EnvelopeCurveProps) {
  const W = 280;
  const H = 80;
  const maxT = 3;

  const aX = (Math.min(attack, maxT) / maxT) * (W * 0.3);
  const sX = W * 0.55;
  const rEnd = W * 0.85 + (Math.min(release, maxT) / maxT) * (W * 0.15);
  const top = 6;
  const bot = H - 6;
  const mid = sustainOn ? top + (bot - top) * 0.3 : bot;

  const d = `M 0 ${bot} L ${aX} ${top} L ${sX} ${mid} L ${rEnd} ${bot}`;

  const [dot, setDot] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: bot,
    visible: false,
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (noteOnMs === null) {
      setDot((prev) => ({ ...prev, visible: false }));
      return;
    }

    const tick = () => {
      const elapsed = performance.now() - noteOnMs;

      if (noteOffMs === null) {
        if (elapsed < attack * 1000) {
          const t = elapsed / (attack * 1000);
          setDot({ x: lerp(0, aX, t), y: lerp(bot, top, t), visible: true });
        } else {
          setDot({ x: sX, y: mid, visible: true });
        }
      } else {
        const releaseElapsed = performance.now() - noteOffMs;
        if (releaseElapsed < release * 1000) {
          const t = releaseElapsed / (release * 1000);
          setDot({ x: lerp(sX, rEnd, t), y: lerp(mid, bot, t), visible: true });
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
  }, [noteOnMs, noteOffMs, attack, release, aX, sX, rEnd, top, bot, mid]);

  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <path
        d={d}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={aX} cy={top} r={3} fill="var(--primary)" />
      <circle cx={sX} cy={mid} r={3} fill="var(--primary)" />
      <circle cx={Math.min(rEnd, W - 3)} cy={bot} r={3} fill="var(--primary)" />
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
  const [sustainOn, setSustainState] = useState(true);
  const [release, setReleaseState] = useState(0.6);
  const [reverbOn, setReverbState] = useState(false);
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

  const handleSustain = useCallback(() => {
    setSustainState((prev) => {
      const next = !prev;
      engineRef.current?.setSustain(next);
      return next;
    });
  }, []);

  const handleRelease = useCallback((s: number) => {
    setReleaseState(s);
    engineRef.current?.setRelease(s);
  }, []);

  const handleReverb = useCallback(() => {
    setReverbState((prev) => {
      const next = !prev;
      engineRef.current?.setReverb(next);
      return next;
    });
  }, []);

  const handleDelay = useCallback((v: number) => {
    setDelayState(v);
    engineRef.current?.setDelay(v);
  }, []);

  const handleVolume = useCallback((v: number) => {
    setVolumeState(v);
    engineRef.current?.setVolume(v);
  }, []);

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
      engineRef.current?.noteOn(note, 0.8);
      setActiveNotes((prev) => new Set([...prev, note]));
      setNoteOnMs(performance.now());
      setNoteOffMs(null);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const entry = KEY_NOTE_MAP[e.key.toLowerCase()];
      if (!entry) return;
      heldKeys.delete(e.key.toLowerCase());
      const [name, offset] = entry;
      const note = `${name}${startOctaveRef.current + offset}`;
      engineRef.current?.noteOff(note);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      setNoteOffMs(performance.now());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isMobile]);

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
          <button
            onClick={handleReverb}
            style={toggleStyle(reverbOn)}
            aria-label={reverbOn ? "Reverb on" : "Reverb off"}
          >
            Reverb {reverbOn ? "ON" : "OFF"}
          </button>
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

      <div style={{ ...SECTION, gridColumn: "1 / -1" }}>
        <p style={LABEL}>Envelope</p>
        <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 28 }}>
            <Fader
              value={attack}
              min={0.001}
              max={2}
              step={0.001}
              label="Attack"
              unit="s"
              size="md"
              onChange={handleAttack}
            />
            <Fader
              value={release}
              min={0.05}
              max={4}
              step={0.01}
              label="Release"
              unit="s"
              size="md"
              onChange={handleRelease}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleSustain} style={toggleStyle(sustainOn)}>
                Sustain {sustainOn ? "ON" : "OFF"}
              </button>
            </div>
            <EnvelopeCurve
              attack={attack}
              release={release}
              sustainOn={sustainOn}
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
            <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
              <Fader
                value={attack}
                min={0.001}
                max={2}
                step={0.001}
                label="Attack"
                unit="s"
                onChange={handleAttack}
              />
              <Fader
                value={release}
                min={0.05}
                max={4}
                step={0.01}
                label="Release"
                unit="s"
                onChange={handleRelease}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
              <button onClick={handleSustain} style={toggleStyle(sustainOn)}>
                Sustain {sustainOn ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        )}
        {activeTab === "fx" && (
          <div style={SECTION}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <button
                onClick={handleReverb}
                style={toggleStyle(reverbOn)}
                aria-label={reverbOn ? "Reverb on" : "Reverb off"}
              >
                Reverb {reverbOn ? "ON" : "OFF"}
              </button>
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
