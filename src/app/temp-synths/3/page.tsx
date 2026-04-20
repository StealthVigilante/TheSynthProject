// src/app/temp-synths/3/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { WaveformCanvas } from "../waveform-canvas";
import { Synth3Engine } from "./engine";

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

const SUBLABEL: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--muted-foreground)",
  marginBottom: 8,
};

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

  useEffect(() => {
    engineRef.current = new Synth3Engine();
    return () => engineRef.current?.dispose();
  }, []);

  const noteOn = useCallback((note: string, vel: number) => engineRef.current?.noteOn(note, vel), []);
  const noteOff = useCallback((note: string) => engineRef.current?.noteOff(note), []);
  const getWaveform = useCallback((): Float32Array => engineRef.current?.getWaveform() ?? new Float32Array(1024), []);

  const e = engineRef.current;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 80px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>The Classic</p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
          Dual Osc · Filter · Dual ADSR · LFO
        </p>
      </div>

      {/* Signal flow: 3 columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {/* OSC */}
        <div style={SECTION}>
          <p style={LABEL}>Oscillators</p>

          <p style={SUBLABEL}>OSC 1</p>
          <WaveformSelect value={osc1Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc1Type(v); e?.setOsc1Type(v as OscillatorType); }} label="" />

          <div style={{ height: 12 }} />

          <p style={SUBLABEL}>OSC 2</p>
          <WaveformSelect value={osc2Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={(v) => { setOsc2Type(v); e?.setOsc2Type(v as OscillatorType); }} label="" />

          <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <Knob value={osc2Detune} min={-100} max={100} step={1} label="Detune" unit="¢" onChange={(v) => { setOsc2Detune(v); e?.setOsc2Detune(v); }} size="sm" />
            <Knob value={oscMix} min={0} max={1} step={0.01} label="Mix" onChange={(v) => { setOscMix(v); e?.setOscMix(v); }} size="sm" />
          </div>
        </div>

        {/* FILTER */}
        <div style={SECTION}>
          <p style={LABEL}>Filter</p>
          <FilterTypeSelect value={filterType} onChange={(v) => { setFilterTypeState(v); e?.setFilterType(v); }} />
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12 }}>
            <Knob value={filterCutoff} min={80} max={18000} step={10} label="Cutoff" unit="Hz" onChange={(v) => { setFilterCutoff(v); e?.setFilterCutoff(v); }} size="sm" />
            <Knob value={filterRes} min={0.1} max={20} step={0.1} label="Res" unit="Q" onChange={(v) => { setFilterRes(v); e?.setFilterResonance(v); }} size="sm" />
          </div>

          <p style={{ ...SUBLABEL, marginTop: 14 }}>Filter Env</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Knob value={fEnvAmt} min={0} max={10000} step={50} label="Amount" unit="Hz" onChange={(v) => { setFEnvAmt(v); e?.setFilterEnvAmount(v); }} size="sm" />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "center" }}>
            <Fader value={fEnvA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setFEnvA(v); e?.setFilterEnvAttack(v); }} />
            <Fader value={fEnvD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setFEnvD(v); e?.setFilterEnvDecay(v); }} />
            <Fader value={fEnvS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setFEnvS(v); e?.setFilterEnvSustain(v); }} />
            <Fader value={fEnvR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setFEnvR(v); e?.setFilterEnvRelease(v); }} />
          </div>
        </div>

        {/* AMP */}
        <div style={SECTION}>
          <p style={LABEL}>Amp Env</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Fader value={ampA} min={0.001} max={2} step={0.001} label="A" unit="s" onChange={(v) => { setAmpA(v); e?.setAmpAttack(v); }} />
            <Fader value={ampD} min={0.01} max={3} step={0.01} label="D" unit="s" onChange={(v) => { setAmpD(v); e?.setAmpDecay(v); }} />
            <Fader value={ampS} min={0} max={1} step={0.01} label="S" onChange={(v) => { setAmpS(v); e?.setAmpSustain(v); }} />
            <Fader value={ampR} min={0.01} max={4} step={0.01} label="R" unit="s" onChange={(v) => { setAmpR(v); e?.setAmpRelease(v); }} />
          </div>
        </div>
      </div>

      {/* LFO */}
      <div style={SECTION}>
        <p style={LABEL}>LFO</p>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <WaveformSelect value={lfoType} options={["sine", "square"]} onChange={(v) => { setLfoType(v); e?.setLfoType(v as OscillatorType); }} label="Shape" />
          <Knob value={lfoRate} min={0.1} max={20} step={0.1} label="Rate" unit="Hz" onChange={(v) => { setLfoRate(v); e?.setLfoRate(v); }} size="md" />
          <Knob value={lfoDepth} min={0} max={100} step={1} label="Depth" onChange={(v) => { setLfoDepth(v); e?.setLfoDepth(v); }} size="md" />
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
        </div>
      </div>

      {/* Waveform display */}
      <div style={{ ...SECTION, display: "flex", justifyContent: "center" }}>
        <WaveformCanvas getWaveform={getWaveform} width={680} height={80} />
      </div>

      {/* Keyboard */}
      <div style={SECTION}>
        <PianoKeyboard onNoteOn={noteOn} onNoteOff={noteOff} startOctave={3} octaves={2} />
      </div>
    </div>
  );
}
