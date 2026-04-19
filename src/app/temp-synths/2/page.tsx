"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { WaveformCanvas } from "../waveform-canvas";
import { Synth2Engine } from "./engine";

const SECTION: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 20px",
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "var(--muted-foreground)",
  marginBottom: 12,
};

function EnvelopeCurve({ attack, release, sustainOn }: { attack: number; release: number; sustainOn: boolean }) {
  const W = 260;
  const H = 60;
  const maxT = 3;

  const aX = (Math.min(attack, maxT) / maxT) * (W * 0.3);
  const sX = W * 0.55;
  const rEnd = W * 0.85 + (Math.min(release, maxT) / maxT) * (W * 0.15);
  const top = 8;
  const bot = H - 8;
  const mid = sustainOn ? top + (bot - top) * 0.3 : bot;

  const d = `M 0 ${bot} L ${aX} ${top} L ${sX} ${mid} L ${rEnd} ${bot}`;

  return (
    <svg width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={aX} cy={top} r={3} fill="var(--primary)" />
      <circle cx={sX} cy={mid} r={3} fill="var(--primary)" />
      <circle cx={Math.min(rEnd, W - 3)} cy={bot} r={3} fill="var(--primary)" />
    </svg>
  );
}

export default function Synth2Page() {
  const engineRef = useRef<Synth2Engine | null>(null);

  const [waveform, setWaveformState] = useState<string>("sawtooth");
  const [subEnabled, setSubState] = useState(false);
  const [cutoff, setCutoffState] = useState(3000);
  const [resonance, setResState] = useState(1);
  const [attack, setAttackState] = useState(0.05);
  const [sustainOn, setSustainState] = useState(true);
  const [release, setReleaseState] = useState(0.6);
  const [reverbOn, setReverbState] = useState(false);
  const [delayAmount, setDelayState] = useState(0);

  useEffect(() => {
    engineRef.current = new Synth2Engine();
    return () => engineRef.current?.dispose();
  }, []);

  const noteOn = useCallback((note: string, vel: number) => engineRef.current?.noteOn(note, vel), []);
  const noteOff = useCallback((note: string) => engineRef.current?.noteOff(note), []);
  const getWaveform = useCallback((): Float32Array => engineRef.current?.getWaveform() ?? new Float32Array(1024), []);

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

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    padding: "6px 14px",
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

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 80px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>The Learner</p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
          Osc + Sub · Filter · ADSR · Reverb + Delay
        </p>
      </div>

      {/* Waveform display */}
      <div style={{ ...SECTION, display: "flex", justifyContent: "center" }}>
        <WaveformCanvas getWaveform={getWaveform} width={560} height={80} />
      </div>

      {/* Oscillator */}
      <div style={SECTION}>
        <p style={LABEL}>Oscillator</p>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <WaveformSelect value={waveform} options={["sine", "square", "sawtooth", "triangle"]} onChange={handleWaveform} label="Waveform" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--muted-foreground)", textAlign: "center" }}>Sub Osc</span>
            <button onClick={handleSub} style={toggleStyle(subEnabled)}>
              Sub {subEnabled ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={SECTION}>
        <p style={LABEL}>Filter</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 32 }}>
          <Knob value={cutoff} min={80} max={18000} step={10} label="Cutoff" unit="Hz" onChange={handleCutoff} size="md" />
          <Knob value={resonance} min={0.1} max={20} step={0.1} label="Resonance" unit="Q" onChange={handleRes} size="md" />
        </div>
      </div>

      {/* Envelope */}
      <div style={SECTION}>
        <p style={LABEL}>Envelope</p>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 24 }}>
            <Fader value={attack} min={0.001} max={2} step={0.001} label="Attack" unit="s" onChange={handleAttack} />
            <Fader value={release} min={0.05} max={4} step={0.01} label="Release" unit="s" onChange={handleRelease} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 16 }}>
            <button onClick={handleSustain} style={toggleStyle(sustainOn)}>
              Sustain {sustainOn ? "ON" : "OFF"}
            </button>
            <EnvelopeCurve attack={attack} release={release} sustainOn={sustainOn} />
          </div>
        </div>
      </div>

      {/* FX */}
      <div style={SECTION}>
        <p style={LABEL}>FX</p>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={handleReverb} style={toggleStyle(reverbOn)}>
            Reverb {reverbOn ? "ON" : "OFF"}
          </button>
          <Knob value={delayAmount} min={0} max={1} step={0.01} label="Delay" onChange={handleDelay} size="md" />
        </div>
      </div>

      {/* Keyboard */}
      <div style={SECTION}>
        <PianoKeyboard onNoteOn={noteOn} onNoteOff={noteOff} startOctave={3} octaves={2} />
      </div>
    </div>
  );
}
