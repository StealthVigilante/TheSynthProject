// src/app/temp-synths/5/page.tsx
"use client";

import { useState } from "react";
import { Knob } from "@/components/synth/knob";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";

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

const WAVES = ["Sine", "Triangle", "Square", "Saw", "Noise", "PWM", "Wavetable"];
const MOD_SOURCES = ["LFO 1", "LFO 2", "Env 1", "Env 2", "Vel", "MW"];
const MOD_DESTS = ["Pitch", "Cutoff", "Amp", "Pan", "PW", "Res"];

function ToggleButton({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: "5px 12px",
        borderRadius: 7,
        border: "1px solid",
        borderColor: on ? "var(--primary)" : "var(--border)",
        background: on ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
        color: on ? "var(--foreground)" : "var(--muted-foreground)",
        fontSize: 11,
        fontWeight: on ? 600 : 400,
        cursor: "pointer",
        transition: "all 150ms",
      }}
    >
      {label}
    </button>
  );
}

export default function Synth5Page() {
  const [wavePos, setWavePos] = useState(0);
  const [selectedWave, setSelectedWave] = useState(0);

  const [fmFreq, setFmFreq] = useState(2);
  const [fmIndex, setFmIndex] = useState(3);

  const [modMatrix, setModMatrix] = useState<boolean[][]>(
    Array.from({ length: MOD_SOURCES.length }, () => new Array(MOD_DESTS.length).fill(false))
  );

  const [distOn, setDistOn] = useState(false);
  const [distAmt, setDistAmt] = useState(50);
  const [bitOn, setBitOn] = useState(false);
  const [bitDepth, setBitDepth] = useState(8);
  const [delayOn, setDelayOn] = useState(false);
  const [delayTime, setDelayTime] = useState(0.3);
  const [delayFeedback, setDelayFeedback] = useState(0.4);
  const [delaySpread, setDelaySpread] = useState(0.5);

  const [voices, setVoices] = useState(4);
  const [unisonOn, setUnisonOn] = useState(false);
  const [unisonCount, setUnisonCount] = useState(4);
  const [unisonDetune, setUnisonDetune] = useState(15);
  const [unisonSpread, setUnisonSpread] = useState(0.7);

  const toggleMatrix = (row: number, col: number) => {
    setModMatrix((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = !next[row][col];
      return next;
    });
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 80px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>The Lab</p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
          Wavetable · FM · Mod Matrix · Advanced FX · Unison
        </p>
      </div>

      {/* Wavetable + FM */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div style={SECTION}>
          <p style={LABEL}>Wavetable</p>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
            {WAVES.map((w, i) => (
              <button
                key={w}
                onClick={() => setSelectedWave(i)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid",
                  borderColor: selectedWave === i ? "var(--primary)" : "var(--border)",
                  background: selectedWave === i ? "oklch(from var(--primary) l c h / 10%)" : "var(--card)",
                  color: selectedWave === i ? "var(--foreground)" : "var(--muted-foreground)",
                  fontSize: 11,
                  cursor: "pointer",
                  transition: "all 150ms",
                }}
              >
                {w}
              </button>
            ))}
          </div>
          <div>
            <p style={{ ...LABEL, marginBottom: 6 }}>Wave Position</p>
            <input
              type="range"
              min={0}
              max={100}
              value={wavePos}
              onChange={(e) => setWavePos(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--primary)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>0</span>
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{wavePos}%</span>
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>100</span>
            </div>
          </div>
        </div>

        <div style={SECTION}>
          <p style={LABEL}>FM Synthesis</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
            <Knob value={fmFreq} min={0.5} max={16} step={0.5} label="Mod Freq" unit="×" onChange={setFmFreq} size="md" />
            <Knob value={fmIndex} min={0} max={20} step={0.1} label="Mod Index" onChange={setFmIndex} size="md" />
          </div>
        </div>
      </div>

      {/* Modulation Matrix */}
      <div style={SECTION}>
        <p style={LABEL}>Modulation Matrix</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ padding: "4px 8px", color: "var(--muted-foreground)", textAlign: "left", fontWeight: 600, fontSize: 9, letterSpacing: "0.08em" }}>
                  SOURCE ↓ / DEST →
                </th>
                {MOD_DESTS.map((d) => (
                  <th key={d} style={{ padding: "4px 10px", color: "var(--muted-foreground)", fontWeight: 600, fontSize: 9, letterSpacing: "0.08em" }}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOD_SOURCES.map((src, row) => (
                <tr key={src}>
                  <td style={{ padding: "4px 8px", color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 }}>{src}</td>
                  {MOD_DESTS.map((_, col) => {
                    const on = modMatrix[row][col];
                    return (
                      <td key={col} style={{ padding: "3px 10px", textAlign: "center" }}>
                        <button
                          onClick={() => toggleMatrix(row, col)}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 5,
                            border: "1px solid",
                            borderColor: on ? "var(--primary)" : "var(--border)",
                            background: on ? "oklch(from var(--primary) l c h / 20%)" : "var(--muted)",
                            cursor: "pointer",
                            transition: "all 120ms",
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced FX Rack */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div style={SECTION}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <p style={{ ...LABEL, margin: 0 }}>Distortion</p>
            <ToggleButton label={distOn ? "ON" : "OFF"} on={distOn} onToggle={() => setDistOn(!distOn)} />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Knob value={distAmt} min={0} max={100} step={1} label="Amount" unit="%" onChange={setDistAmt} size="md" />
          </div>
        </div>

        <div style={SECTION}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <p style={{ ...LABEL, margin: 0 }}>Bitcrusher</p>
            <ToggleButton label={bitOn ? "ON" : "OFF"} on={bitOn} onToggle={() => setBitOn(!bitOn)} />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Knob value={bitDepth} min={1} max={16} step={1} label="Bit Depth" unit="bit" onChange={setBitDepth} size="md" />
          </div>
        </div>

        <div style={SECTION}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <p style={{ ...LABEL, margin: 0 }}>Stereo Delay</p>
            <ToggleButton label={delayOn ? "ON" : "OFF"} on={delayOn} onToggle={() => setDelayOn(!delayOn)} />
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Knob value={delayTime} min={0.01} max={1} step={0.01} label="Time" unit="s" onChange={setDelayTime} size="sm" />
            <Knob value={delayFeedback} min={0} max={0.95} step={0.01} label="FB" onChange={setDelayFeedback} size="sm" />
            <Knob value={delaySpread} min={0} max={1} step={0.01} label="Spread" onChange={setDelaySpread} size="sm" />
          </div>
        </div>
      </div>

      {/* Polyphony + Unison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
        <div style={SECTION}>
          <p style={LABEL}>Polyphony</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Knob value={voices} min={1} max={16} step={1} label="Voices" onChange={setVoices} size="lg" />
          </div>
        </div>

        <div style={SECTION}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <p style={{ ...LABEL, margin: 0 }}>Unison</p>
            <ToggleButton label={unisonOn ? "ON" : "OFF"} on={unisonOn} onToggle={() => setUnisonOn(!unisonOn)} />
          </div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
            <Knob value={unisonCount} min={2} max={8} step={1} label="Voices" onChange={setUnisonCount} size="sm" />
            <Knob value={unisonDetune} min={0} max={100} step={1} label="Detune" unit="¢" onChange={setUnisonDetune} size="sm" />
            <Knob value={unisonSpread} min={0} max={1} step={0.01} label="Spread" onChange={setUnisonSpread} size="sm" />
          </div>
        </div>
      </div>

      {/* Keyboard */}
      <div style={SECTION}>
        <PianoKeyboard onNoteOn={() => {}} onNoteOff={() => {}} startOctave={3} octaves={2} />
      </div>
    </div>
  );
}
