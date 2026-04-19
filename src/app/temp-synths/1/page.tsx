"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { WaveformCanvas } from "../waveform-canvas";
import { Synth1Engine } from "./engine";

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

export default function Synth1Page() {
  const engineRef = useRef<Synth1Engine | null>(null);

  const [waveform, setWaveformState] = useState<string>("sine");
  const [filterFreq, setFilterFreqState] = useState(4000);
  const [attack, setAttackState] = useState(0.02);
  const [release, setReleaseState] = useState(0.5);
  const [reverb, setReverbState] = useState(false);

  useEffect(() => {
    engineRef.current = new Synth1Engine();
    return () => engineRef.current?.dispose();
  }, []);

  const noteOn = useCallback((note: string, vel: number) => {
    engineRef.current?.noteOn(note, vel);
  }, []);

  const noteOff = useCallback((note: string) => {
    engineRef.current?.noteOff(note);
  }, []);

  const getWaveform = useCallback((): Float32Array => {
    return engineRef.current?.getWaveform() ?? new Float32Array(1024);
  }, []);

  const handleWaveform = useCallback((v: string) => {
    setWaveformState(v);
    engineRef.current?.setWaveform(v as OscillatorType);
  }, []);

  const handleFilterFreq = useCallback((hz: number) => {
    setFilterFreqState(hz);
    engineRef.current?.setFilterFreq(hz);
  }, []);

  const handleAttack = useCallback((s: number) => {
    setAttackState(s);
    engineRef.current?.setAttack(s);
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

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 80px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>The Starter</p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
          Oscillator · Filter · Envelope · Reverb
        </p>
      </div>

      {/* Waveform display */}
      <div style={{ ...SECTION, display: "flex", justifyContent: "center" }}>
        <WaveformCanvas getWaveform={getWaveform} width={560} height={80} />
      </div>

      {/* Oscillator */}
      <div style={SECTION}>
        <p style={LABEL}>Oscillator</p>
        <WaveformSelect
          value={waveform}
          options={["sine", "square", "sawtooth", "triangle"]}
          onChange={handleWaveform}
          label="Waveform"
        />
      </div>

      {/* Filter */}
      <div style={SECTION}>
        <p style={LABEL}>Filter</p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Knob
            value={filterFreq}
            min={80}
            max={18000}
            step={10}
            label="Tone"
            unit="Hz"
            onChange={handleFilterFreq}
            size="lg"
          />
        </div>
      </div>

      {/* Envelope */}
      <div style={SECTION}>
        <p style={LABEL}>Envelope</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 32 }}>
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
      </div>

      {/* FX */}
      <div style={SECTION}>
        <p style={LABEL}>FX</p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={handleReverb}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: reverb ? "var(--primary)" : "var(--border)",
              background: reverb ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
              color: reverb ? "var(--foreground)" : "var(--muted-foreground)",
              fontSize: 13,
              fontWeight: reverb ? 600 : 400,
              cursor: "pointer",
              transition: "all 150ms",
            }}
          >
            Reverb {reverb ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Keyboard */}
      <div style={SECTION}>
        <PianoKeyboard onNoteOn={noteOn} onNoteOff={noteOff} startOctave={3} octaves={2} />
      </div>
    </div>
  );
}
