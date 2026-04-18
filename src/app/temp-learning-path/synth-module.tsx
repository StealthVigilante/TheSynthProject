"use client";

import { WaveformCanvas } from "./visuals";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import type { ParamValues } from "@/lib/synth-engine";

interface SynthModuleProps {
  enabledParams: string[];
  params: ParamValues;
  onChange: (key: string, value: number | string) => void;
  onNoteOn: (note: string, velocity: number) => void;
  onNoteOff: (note: string) => void;
  getWaveform: () => Float32Array;
}

const WAVEFORM_OPTIONS = ["sine", "square", "triangle", "sawtooth"];

export function SynthModule({
  enabledParams,
  params,
  onChange,
  onNoteOn,
  onNoteOff,
  getWaveform,
}: SynthModuleProps) {
  const waveEnabled = enabledParams.includes("oscillator.type");

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
        Synth Module
      </div>

      {/* Waveform selector */}
      <div style={{ opacity: waveEnabled ? 1 : 0.35, pointerEvents: waveEnabled ? "auto" : "none" }}>
        <WaveformSelect
          value={String(params["oscillator.type"] ?? "sine")}
          options={WAVEFORM_OPTIONS}
          onChange={(v) => onChange("oscillator.type", v)}
          label="Waveform"
          disabled={!waveEnabled}
        />
      </div>

      {/* Live waveform display */}
      <WaveformCanvas getWaveform={getWaveform} width={280} height={80} />

      {/* Keyboard */}
      <PianoKeyboard
        onNoteOn={onNoteOn}
        onNoteOff={onNoteOff}
        startOctave={3}
        octaves={2}
      />
    </div>
  );
}
