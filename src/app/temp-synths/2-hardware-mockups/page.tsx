"use client";

import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { WaveformSelect } from "@/components/synth/waveform-select";

const noop = () => {};

interface HWTheme {
  name: string;
  subtitle: string;
  lidGrad: string;
  chassisGrad: string;
  chassisBorder: string;
  faceplateColor: string;
  faceplateBorder: string;
  sectionBg: string;
  sectionBorder: string;
  accent: string;
  accentRgb: string;
  labelColor: string;
  oledText: string;
  oledGlow: string;
  keyBg: string;
  keyBorder: string;
  tagline: string;
  sideShadow?: string;
}

const THEME_A: HWTheme = {
  name: "CONCEPT A",
  subtitle: "ACID GREEN · OSCILLOSCOPE",
  tagline: "Vintage test-equipment meets modern synthesis",
  lidGrad: "linear-gradient(180deg, #1a2e1a, #0d1a0d)",
  chassisGrad: "linear-gradient(175deg, #0d1a0d 0%, #080f08 60%, #050c05 100%)",
  chassisBorder: "#1a2e1a",
  faceplateColor: "#050c05",
  faceplateBorder: "#0d1a0d",
  sectionBg: "#020602",
  sectionBorder: "#0d1a0d",
  accent: "#39ff14",
  accentRgb: "57,255,20",
  labelColor: "#1a5a1a",
  oledText: "#39ff14",
  oledGlow: "rgba(57,255,20,0.65)",
  keyBg: "#020602",
  keyBorder: "#0a160a",
};

const THEME_B: HWTheme = {
  name: "CONCEPT B",
  subtitle: "SYNTHWAVE · ELECTRIC VIOLET",
  tagline: "Jupiter-era drama meets underground rave energy",
  lidGrad: "linear-gradient(180deg, #200035, #100018)",
  chassisGrad: "linear-gradient(175deg, #160022 0%, #0d0018 60%, #08000f 100%)",
  chassisBorder: "#2a0040",
  faceplateColor: "#080010",
  faceplateBorder: "#14001e",
  sectionBg: "#050008",
  sectionBorder: "#1a0028",
  accent: "#bf00ff",
  accentRgb: "191,0,255",
  labelColor: "#480070",
  oledText: "#e040fb",
  oledGlow: "rgba(224,64,251,0.65)",
  keyBg: "#040006",
  keyBorder: "#100018",
};

const THEME_C: HWTheme = {
  name: "CONCEPT C",
  subtitle: "VINTAGE AMBER · MINIMOOG",
  tagline: "Warm transistor-era warmth — 1970s Moog lineage",
  lidGrad: "linear-gradient(180deg, #2e1e00, #1e1400)",
  chassisGrad: "linear-gradient(175deg, #1e1500 0%, #141000 60%, #0e0b00 100%)",
  chassisBorder: "#2e2200",
  faceplateColor: "#0f0c00",
  faceplateBorder: "#1a1400",
  sectionBg: "#080600",
  sectionBorder: "#1e1800",
  accent: "#ff9500",
  accentRgb: "255,149,0",
  labelColor: "#5a4800",
  oledText: "#ff9500",
  oledGlow: "rgba(255,149,0,0.65)",
  keyBg: "#070500",
  keyBorder: "#141000",
};

const THEME_D: HWTheme = {
  name: "CONCEPT D",
  subtitle: "SLATE GUNMETAL · #5A5A66",
  tagline: "Cold-war precision engineering — the machine is the colour",
  lidGrad: "linear-gradient(180deg, #7e7e8e, #5a5a66)",
  chassisGrad: "linear-gradient(175deg, #3e3e4a 0%, #2e2e38 60%, #222230 100%)",
  chassisBorder: "#5a5a66",
  faceplateColor: "#090910",
  faceplateBorder: "#1e1e28",
  sectionBg: "#060610",
  sectionBorder: "#1e1e2a",
  accent: "#5a5a66",
  accentRgb: "90,90,102",
  labelColor: "#3a3a48",
  oledText: "#c4c4d4",
  oledGlow: "rgba(196,196,212,0.5)",
  keyBg: "#050510",
  keyBorder: "#161622",
  sideShadow: "#3a3a46",
};

function StaticEnvelopeCurve({ accent, accentRgb }: { accent: string; accentRgb: string }) {
  const W = 190;
  const H = 66;
  const top = 5;
  const bot = H - 5;
  const aX = 38;
  const dX = 66;
  const sX = 116;
  const rEnd = 178;
  const susY = top + (bot - top) * 0.36;
  const gridY1 = top + (bot - top) * 0.33;
  const gridY2 = top + (bot - top) * 0.66;
  const d = `M 0 ${bot} L ${aX} ${top} L ${dX} ${susY} L ${sX} ${susY} L ${rEnd} ${bot}`;
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <line x1={0} y1={gridY1} x2={W} y2={gridY1} stroke={`rgba(${accentRgb},0.1)`} strokeWidth={1} />
      <line x1={0} y1={gridY2} x2={W} y2={gridY2} stroke={`rgba(${accentRgb},0.1)`} strokeWidth={1} />
      <path d={d} fill="none" stroke={accent} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${accent})` }} />
      {[{ cx: aX, cy: top }, { cx: dX, cy: susY }, { cx: sX, cy: susY }, { cx: rEnd, cy: bot }].map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={2.5} fill={accent} opacity={0.6} />
      ))}
    </svg>
  );
}

function WaveformPreview({ accent, accentRgb }: { accent: string; accentRgb: string }) {
  const pts = Array.from({ length: 80 }, (_, i) => {
    const x = (i / 79) * 160;
    const y = 22 + Math.sin((i / 79) * Math.PI * 4) * 14;
    return `${x},${y}`;
  }).join(" ");
  return (
    <div style={{ width: 160, height: 44, background: "#000", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
      <svg width={160} height={44}>
        <polyline points={pts} fill="none" stroke={accent} strokeWidth={1.5} opacity={0.75}
          style={{ filter: `drop-shadow(0 0 2px rgba(${accentRgb},0.5))` }} />
      </svg>
    </div>
  );
}

function SpectrumPreview({ accent, accentRgb }: { accent: string; accentRgb: string }) {
  const bars = [28, 42, 55, 70, 58, 48, 62, 80, 65, 50, 42, 35, 28, 22, 18, 14, 10, 8, 6, 5];
  return (
    <div style={{
      width: 160, height: 44, background: "#000", borderRadius: 3, overflow: "hidden",
      display: "flex", alignItems: "flex-end", gap: "1px", padding: "3px 3px 0", flexShrink: 0,
    }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          flex: 1, height: `${h}%`,
          background: `rgba(${accentRgb},0.55)`,
          borderRadius: "1px 1px 0 0",
        }} />
      ))}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
      }} />
    </div>
  );
}

function SubLED({ accent, accentRgb, on = true }: { accent: string; accentRgb: string; on?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center", marginTop: 8 }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%",
        background: on ? accent : "#111",
        boxShadow: on ? `0 0 5px rgba(${accentRgb},0.9), 0 0 10px rgba(${accentRgb},0.4)` : "none",
      }} />
      <span style={{ fontSize: 7, fontFamily: "monospace", letterSpacing: "0.2em", color: on ? accent : "#2a2a2a" }}>
        SUB
      </span>
    </div>
  );
}

function HardwareMockup({ theme }: { theme: HWTheme }) {
  const sectionLabel: React.CSSProperties = {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: "0.32em",
    color: theme.labelColor,
    fontFamily: "monospace",
    textTransform: "uppercase",
    marginBottom: 10,
    borderBottom: `1px solid ${theme.sectionBorder}`,
    paddingBottom: 5,
  };

  const sectionPanel: React.CSSProperties = {
    background: theme.sectionBg,
    border: `1px solid ${theme.sectionBorder}`,
    borderTop: `2px solid ${theme.accent}`,
    borderRadius: 4,
    padding: "12px 10px",
    textAlign: "center",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* 3D perspective lid */}
      <div style={{
        width: 760,
        height: 18,
        background: theme.lidGrad,
        borderRadius: "12px 12px 0 0",
        border: `1px solid ${theme.chassisBorder}`,
        borderBottom: "none",
        boxShadow: `inset 0 1px 0 rgba(${theme.accentRgb},0.04)`,
        transform: "perspective(500px) rotateX(-18deg) scaleY(0.55)",
        transformOrigin: "bottom center",
        marginBottom: -1,
      }} />

      {/* Chassis body */}
      <div style={{
        background: theme.chassisGrad,
        borderRadius: "0 0 10px 10px",
        border: `1px solid ${theme.chassisBorder}`,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.03),
          -5px 0 0 ${theme.sideShadow ?? "#050505"},
          5px 0 0 ${theme.sideShadow ?? "#050505"},
          0 5px 0 #030303,
          0 8px 0 #020202,
          0 20px 60px rgba(0,0,0,0.97)
        `,
        width: 760,
      }}>
        {/* Faceplate */}
        <div style={{
          margin: 14,
          background: theme.faceplateColor,
          borderRadius: 6,
          border: `1px solid ${theme.faceplateBorder}`,
          boxShadow: "inset 0 2px 12px rgba(0,0,0,0.8)",
          padding: "14px 16px",
        }}>

          {/* ── Header ── */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${theme.sectionBorder}`,
            paddingBottom: 12,
            marginBottom: 12,
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.32em", color: "#fff", fontFamily: "monospace", margin: 0 }}>
                THE LEARNER
              </p>
              <p style={{ fontSize: 7, color: theme.labelColor, letterSpacing: "0.28em", margin: "3px 0 0", fontFamily: "monospace" }}>
                SYNTHESIZER · MK II
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* OLED note display */}
              <div style={{
                background: "#000",
                border: `1px solid ${theme.sectionBorder}`,
                borderRadius: 3,
                padding: "4px 10px",
                boxShadow: `inset 0 0 8px rgba(0,0,0,0.9)`,
              }}>
                <span style={{
                  color: theme.oledText,
                  fontSize: 16,
                  fontFamily: "monospace",
                  letterSpacing: 3,
                  textShadow: `0 0 8px ${theme.oledGlow}, 0 0 16px ${theme.oledGlow}`,
                }}>
                  C4
                </span>
              </div>
              <WaveformPreview accent={theme.accent} accentRgb={theme.accentRgb} />
              <SpectrumPreview accent={theme.accent} accentRgb={theme.accentRgb} />
            </div>

            <Knob value={0.8} min={0} max={1} step={0.01} label="VOL" onChange={noop} size="sm" />
          </div>

          {/* ── Controls: 3-col row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>

            {/* OSC */}
            <div style={sectionPanel}>
              <p style={sectionLabel}>OSC</p>
              <WaveformSelect value="sawtooth" options={["sine", "square", "sawtooth", "triangle"]} onChange={noop} size="md" label="Waveform" />
              <SubLED accent={theme.accent} accentRgb={theme.accentRgb} on={true} />
            </div>

            {/* FILTER */}
            <div style={sectionPanel}>
              <p style={sectionLabel}>FILTER</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 18 }}>
                <Knob value={3000} min={80} max={18000} step={10} label="CUT" unit="Hz" scale="log" onChange={noop} size="lg" />
                <Knob value={1} min={0.1} max={20} step={0.1} label="RES" unit="Q" onChange={noop} size="sm" />
              </div>
            </div>

            {/* FX */}
            <div style={sectionPanel}>
              <p style={sectionLabel}>FX</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
                <Knob value={0.3} min={0} max={1} step={0.01} label="REV" onChange={noop} size="sm" />
                <Knob value={0.2} min={0} max={1} step={0.01} label="DLY" onChange={noop} size="sm" />
              </div>
            </div>
          </div>

          {/* ── ENV: full-width row ── */}
          <div style={{ ...sectionPanel, textAlign: "left" }}>
            <p style={sectionLabel}>ENV</p>
            <div style={{ display: "flex", gap: 24, alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", gap: 18 }}>
                <Fader value={0.05} min={0.001} max={2} step={0.001} label="ATK" unit="s" size="md" onChange={noop} />
                <Fader value={0.15} min={0.01} max={2} step={0.01} label="DEC" unit="s" size="md" onChange={noop} />
                <Fader value={0.7} min={0} max={1} step={0.01} label="SUS" size="md" onChange={noop} />
                <Fader value={0.6} min={0.05} max={4} step={0.01} label="REL" unit="s" size="md" onChange={noop} />
              </div>
              <div style={{
                background: "#000",
                borderRadius: 5,
                padding: "8px 10px",
                border: `1px solid ${theme.sectionBorder}`,
                boxShadow: `inset 0 0 14px rgba(0,0,0,0.95), 0 0 0 2px #101010, 0 0 0 3px ${theme.sectionBorder}`,
                flexShrink: 0,
              }}>
                <StaticEnvelopeCurve accent={theme.accent} accentRgb={theme.accentRgb} />
              </div>
            </div>
          </div>

          {/* ── Keyboard ── */}
          <div style={{
            background: theme.keyBg,
            borderRadius: 5,
            border: `1px solid ${theme.keyBorder}`,
            marginTop: 10,
            overflow: "hidden",
            boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)",
          }}>
            {/* Octave strip */}
            <div style={{
              height: 26,
              background: `linear-gradient(90deg, ${theme.keyBg}, ${theme.keyBorder} 8%, ${theme.keyBorder} 92%, ${theme.keyBg})`,
              borderBottom: `1px solid ${theme.keyBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
            }}>
              <span style={{ color: theme.labelColor, fontSize: 9, fontFamily: "monospace" }}>◀</span>
              <span style={{ color: theme.labelColor, fontSize: 8, fontFamily: "monospace", letterSpacing: "0.3em" }}>OCT 3–5</span>
              <span style={{ color: theme.labelColor, fontSize: 9, fontFamily: "monospace" }}>▶</span>
            </div>
            {/* White keys */}
            <div style={{ display: "flex", height: 88, padding: "0 2px" }}>
              {Array.from({ length: 21 }).map((_, i) => (
                <div key={i} style={{
                  flex: 1,
                  background: "linear-gradient(180deg, #deded6 0%, #eeeee6 40%, #f4f4ec 100%)",
                  borderRight: "1px solid #aaa",
                  borderBottom: "3px solid #999",
                  borderRadius: "0 0 3px 3px",
                  margin: "0 0.5px",
                }} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function Synth2HardwareMockupsPage() {
  return (
    <div style={{
      minHeight: "100dvh",
      background: "#060606",
      backgroundImage: "radial-gradient(circle, #141414 1px, transparent 1px)",
      backgroundSize: "28px 28px",
      overflowY: "auto",
      padding: "48px 24px 80px",
    }}>
      {/* Page header */}
      <div style={{ textAlign: "center", marginBottom: 60 }}>
        <p style={{
          fontSize: 8,
          letterSpacing: "0.5em",
          color: "#2a2a2a",
          fontFamily: "monospace",
          marginBottom: 10,
          textTransform: "uppercase",
        }}>
          OSCISCOOPS · THE LEARNER MK II
        </p>
        <h1 style={{
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: "0.3em",
          color: "#ffffff",
          fontFamily: "monospace",
          margin: 0,
          textTransform: "uppercase",
        }}>
          DESIGN CONCEPTS
        </h1>
        <p style={{
          fontSize: 10,
          color: "#333",
          fontFamily: "monospace",
          letterSpacing: "0.2em",
          marginTop: 8,
        }}>
          SELECT A DIRECTION — HARDWARE EDITION
        </p>
      </div>

      {/* Mockups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 72, alignItems: "center" }}>
        {[THEME_A, THEME_B, THEME_C, THEME_D].map((theme) => (
          <div key={theme.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            {/* Concept label */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, alignSelf: "flex-start" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                border: `2px solid ${theme.accent}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 8px rgba(${theme.accentRgb},0.4)`,
              }}>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: theme.accent, fontWeight: 700 }}>
                  {theme.name.split(" ")[1]}
                </span>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontFamily: "monospace", letterSpacing: "0.3em", color: theme.accent, fontWeight: 700 }}>
                  {theme.name} — {theme.subtitle}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 9, fontFamily: "monospace", letterSpacing: "0.15em", color: "#333" }}>
                  {theme.tagline}
                </p>
              </div>
            </div>
            <HardwareMockup theme={theme} />
          </div>
        ))}
      </div>

      {/* Footer */}
      <p style={{
        textAlign: "center",
        marginTop: 72,
        fontSize: 8,
        fontFamily: "monospace",
        letterSpacing: "0.3em",
        color: "#1a1a1a",
      }}>
        OSCISCOOPS · HARDWARE EDITION · DESIGN EXPLORATION
      </p>
    </div>
  );
}
