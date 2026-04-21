// src/app/temp-synths/4/page.tsx
"use client";

import { useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { SynthShell } from "@/components/synths/shared/synth-shell";
import { useBreakpoint } from "@/hooks/use-breakpoint";

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
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "var(--muted-foreground)",
  marginBottom: 6,
};

function ToggleButton({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
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
      }}
    >
      {label}
    </button>
  );
}

export default function Synth4Page() {
  const { isMobile, mobileKeyWidth } = useBreakpoint();

  const [osc1Type, setOsc1Type] = useState("square");
  const [osc1Pwm, setOsc1Pwm] = useState(50);
  const [osc2Type, setOsc2Type] = useState("square");
  const [osc2Pwm, setOsc2Pwm] = useState(50);
  const [oscMix, setOscMix] = useState(50);

  const [filterCutoff, setFilterCutoff] = useState(3000);
  const [filterRes, setFilterRes] = useState(2);
  const [filterEnvAmt, setFilterEnvAmt] = useState(50);

  const [lfo1Rate, setLfo1Rate] = useState(4);
  const [lfo1Depth, setLfo1Depth] = useState(30);
  const [lfo1Type, setLfo1Type] = useState("sine");

  const [lfo2Rate, setLfo2Rate] = useState(0.5);
  const [lfo2Depth, setLfo2Depth] = useState(20);
  const [lfo2Type, setLfo2Type] = useState("sine");

  const [ampA, setAmpA] = useState(0.05);
  const [ampD, setAmpD] = useState(0.2);
  const [ampS, setAmpS] = useState(0.7);
  const [ampR, setAmpR] = useState(0.5);

  const [chorusOn, setChorusOn] = useState(false);
  const [chorusDepth, setChorusDepth] = useState(30);
  const [phaserOn, setPhaserOn] = useState(false);
  const [phaserRate, setPhaserRate] = useState(0.5);

  const [poly, setPoly] = useState(false);

  const header = (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "baseline", gap: 12 }}>
      <div>
        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>The Producer</p>
        <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
          Dual Osc + PWM · Filter Env · Dual LFO · Chorus + Phaser
        </p>
      </div>
      <div style={{ marginLeft: "auto" }}>
        <ToggleButton label={poly ? "Poly" : "Mono"} on={poly} onToggle={() => setPoly(!poly)} />
      </div>
    </div>
  );

  const controls = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={SECTION}>
          <p style={LABEL}>OSC 1</p>
          <WaveformSelect value={osc1Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={setOsc1Type} label="Shape" />
          <div style={{ marginTop: 10 }}>
            <p style={SUBLABEL}>Pulse Width</p>
            <Fader value={osc1Pwm} min={1} max={99} step={1} label="PWM" unit="%" onChange={setOsc1Pwm} />
          </div>
        </div>
        <div style={SECTION}>
          <p style={LABEL}>OSC 2</p>
          <WaveformSelect value={osc2Type} options={["sine", "square", "sawtooth", "triangle"]} onChange={setOsc2Type} label="Shape" />
          <div style={{ marginTop: 10 }}>
            <p style={SUBLABEL}>Pulse Width</p>
            <Fader value={osc2Pwm} min={1} max={99} step={1} label="PWM" unit="%" onChange={setOsc2Pwm} />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
        <div style={SECTION}>
          <p style={LABEL}>Mix</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Knob value={oscMix} min={0} max={100} step={1} label="OSC Mix" unit="%" onChange={setOscMix} size="md" />
          </div>
        </div>
        <div style={SECTION}>
          <p style={LABEL}>Filter</p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <Knob value={filterCutoff} min={80} max={18000} step={10} label="Cutoff" unit="Hz" onChange={setFilterCutoff} size="sm" />
            <Knob value={filterRes} min={0.1} max={20} step={0.1} label="Res" unit="Q" onChange={setFilterRes} size="sm" />
            <Knob value={filterEnvAmt} min={0} max={100} step={1} label="Env Amt" unit="%" onChange={setFilterEnvAmt} size="sm" />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={SECTION}>
          <p style={LABEL}>LFO 1 → Pitch</p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <WaveformSelect value={lfo1Type} options={["sine", "square"]} onChange={setLfo1Type} label="Shape" />
            <Knob value={lfo1Rate} min={0.1} max={20} step={0.1} label="Rate" unit="Hz" onChange={setLfo1Rate} size="sm" />
            <Knob value={lfo1Depth} min={0} max={100} step={1} label="Depth" onChange={setLfo1Depth} size="sm" />
          </div>
        </div>
        <div style={SECTION}>
          <p style={LABEL}>LFO 2 → Filter</p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <WaveformSelect value={lfo2Type} options={["sine", "square"]} onChange={setLfo2Type} label="Shape" />
            <Knob value={lfo2Rate} min={0.1} max={20} step={0.1} label="Rate" unit="Hz" onChange={setLfo2Rate} size="sm" />
            <Knob value={lfo2Depth} min={0} max={100} step={1} label="Depth" onChange={setLfo2Depth} size="sm" />
          </div>
        </div>
      </div>

      <div style={SECTION}>
        <p style={LABEL}>Amp Envelope</p>
        <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
          <Fader value={ampA} min={0.001} max={2} step={0.001} label="Attack" unit="s" onChange={setAmpA} />
          <Fader value={ampD} min={0.01} max={3} step={0.01} label="Decay" unit="s" onChange={setAmpD} />
          <Fader value={ampS} min={0} max={1} step={0.01} label="Sustain" onChange={setAmpS} />
          <Fader value={ampR} min={0.01} max={4} step={0.01} label="Release" unit="s" onChange={setAmpR} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={SECTION}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <p style={{ ...LABEL, margin: 0 }}>Chorus</p>
            <ToggleButton label={chorusOn ? "ON" : "OFF"} on={chorusOn} onToggle={() => setChorusOn(!chorusOn)} />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Knob value={chorusDepth} min={0} max={100} step={1} label="Depth" unit="%" onChange={setChorusDepth} size="sm" />
          </div>
        </div>
        <div style={SECTION}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <p style={{ ...LABEL, margin: 0 }}>Phaser</p>
            <ToggleButton label={phaserOn ? "ON" : "OFF"} on={phaserOn} onToggle={() => setPhaserOn(!phaserOn)} />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Knob value={phaserRate} min={0.1} max={10} step={0.1} label="Rate" unit="Hz" onChange={setPhaserRate} size="sm" />
          </div>
        </div>
      </div>
    </div>
  );

  const keyboard = (
    <div style={{ padding: "8px 12px" }}>
      <PianoKeyboard
        onNoteOn={() => {}}
        onNoteOff={() => {}}
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
