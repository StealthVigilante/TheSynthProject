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
import { Synth1Engine } from "./engine";

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

export default function Synth1Page() {
  const engineRef = useRef<Synth1Engine | null>(null);
  const { isMobile, mobileKeyWidth } = useBreakpoint();

  const [analyserInfo, setAnalyserInfo] = useState({ sampleRate: 44100, fftSize: 1024 });
  const [waveform, setWaveformState] = useState<string>("sine");
  const [filterFreq, setFilterFreqState] = useState(4000);
  const [attack, setAttackState] = useState(0.02);
  const [release, setReleaseState] = useState(0.5);
  const [reverb, setReverbState] = useState(false);

  useEffect(() => {
    engineRef.current = new Synth1Engine();
    setAnalyserInfo({
      sampleRate: engineRef.current.sampleRate,
      fftSize: engineRef.current.fftSize,
    });
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

  const getFFT = useCallback((): Float32Array => {
    return engineRef.current?.getFFT() ?? new Float32Array(512);
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

  const vizW = isMobile ? 152 : 220;
  const vizH = isMobile ? 44 : 60;

  const header = (
    <div
      style={{
        padding: isMobile ? "8px 12px" : "12px 16px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <p
        style={{
          fontSize: isMobile ? 13 : 16,
          fontWeight: 700,
          margin: 0,
        }}
      >
        The Starter
      </p>
      <p
        style={{
          fontSize: isMobile ? 9 : 11,
          color: "var(--muted-foreground)",
          margin: isMobile ? "1px 0 6px" : "2px 0 8px",
        }}
      >
        Oscillator · Filter · Envelope · Reverb
      </p>
      <div style={{ display: "flex", gap: 6 }}>
        <WaveformCanvas getWaveform={getWaveform} width={vizW} height={vizH} />
        <SpectrumCanvas
          getFFT={getFFT}
          filterFreq={filterFreq}
          sampleRate={analyserInfo.sampleRate}
          fftSize={analyserInfo.fftSize}
          width={vizW}
          height={vizH}
        />
      </div>
    </div>
  );

  const controls = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 12 }}>
      <div style={SECTION}>
        <p style={LABEL}>Oscillator</p>
        <WaveformSelect
          value={waveform}
          options={["sine", "square", "sawtooth", "triangle"]}
          onChange={handleWaveform}
          label="Waveform"
        />
      </div>

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
            size={isMobile ? "sm" : "md"}
          />
        </div>
      </div>

      <div style={SECTION}>
        <p style={LABEL}>Envelope</p>
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
      </div>

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
    </div>
  );

  const keyboard = (
    <div style={{ padding: "8px 12px" }}>
      <PianoKeyboard
        onNoteOn={noteOn}
        onNoteOff={noteOff}
        startOctave={3}
        octaves={isMobile ? 2 : 3}
        whiteKeyWidth={isMobile ? mobileKeyWidth : 24}
        whiteKeyHeight={isMobile ? 80 : 72}
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
