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
import { StarterProEngine } from "./engine";

const MOBILE_THEME = { bg: "#0a0a0a", border: "#1e1e1e", panel: "#0f0f0f" };

const KEY_NOTE_MAP: Record<string, [string, number]> = {
  a: ["C", 0],  w: ["C#", 0], s: ["D", 0],  e: ["D#", 0],
  d: ["E", 0],  f: ["F", 0],  t: ["F#", 0], g: ["G", 0],
  y: ["G#", 0], h: ["A", 0],  u: ["A#", 0], j: ["B", 0],
  k: ["C", 1],  o: ["C#", 1], l: ["D", 1],  p: ["D#", 1],
  ";": ["E", 1],
};

const TABS = [
  { id: "osc" as const, label: "OSC" },
  { id: "filter" as const, label: "FILTER" },
  { id: "env" as const, label: "ENV" },
  { id: "fx" as const, label: "FX" },
];

export default function Synth1HardwarePage() {
  const engineRef = useRef<StarterProEngine | null>(null);
  const { isMobile, mobileKeyWidth } = useBreakpoint();

  const [analyserInfo, setAnalyserInfo] = useState({ sampleRate: 44100, fftSize: 2048 });
  const [waveform, setWaveformState] = useState<string>("sine");
  const [filterFreq, setFilterFreqState] = useState(4000);
  const [attack, setAttackState] = useState(0.02);
  const [release, setReleaseState] = useState(0.5);
  const [reverb, setReverbState] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [startOctave, setStartOctave] = useState(3);
  const startOctaveRef = useRef(startOctave);
  useEffect(() => { startOctaveRef.current = startOctave; }, [startOctave]);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"osc" | "filter" | "env" | "fx">("osc");
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    StarterProEngine.create().then((eng) => {
      if (!disposed) {
        engineRef.current = eng;
        setAnalyserInfo({ sampleRate: eng.sampleRate, fftSize: eng.fftSize });
        setReady(true);
      } else {
        eng.dispose();
      }
    }).catch((err) => {
      if (!disposed) console.error('StarterProEngine init failed:', err);
    });
    return () => {
      disposed = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const noteOn = useCallback((note: string, vel: number) => {
    engineRef.current?.noteOn(note, vel);
    setCurrentNote(note);
  }, []);

  const noteOff = useCallback((note: string) => {
    engineRef.current?.noteOff(note);
    setCurrentNote(null);
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
      setActiveNotes((prev) => new Set([...prev, note]));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const entry = KEY_NOTE_MAP[e.key.toLowerCase()];
      if (!entry) return;
      heldKeys.delete(e.key.toLowerCase());
      const [name, offset] = entry;
      const note = `${name}${startOctaveRef.current + offset}`;
      noteOff(note);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isMobile, noteOn, noteOff]);

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "8px 4px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    background: "none",
    border: "none",
    borderBottom: active ? "2px solid #00d4ff" : "2px solid transparent",
    color: active ? "#ffffff" : "#404040",
    cursor: "pointer",
  });

  const mobilePanelStyle: React.CSSProperties = {
    background: "#0a0a0a",
    border: "1px solid #1e1e1e",
    borderRadius: 5,
    padding: "14px 12px",
  };

  const mobileHeader = (
    <div style={{
      padding: "8px 12px",
      borderBottom: "1px solid #1e1e1e",
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#ffffff", fontFamily: "Arial" }}>
          The Starter Pro
        </p>
        <p style={{ fontSize: 9, color: "#404040", margin: "1px 0 0" }}>
          AudioWorklet Edition
        </p>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <WaveformCanvas getWaveform={getWaveform} width={100} height={36} />
        <SpectrumCanvas
          getFFT={getFFT}
          filterFreq={filterFreq}
          sampleRate={analyserInfo.sampleRate}
          fftSize={analyserInfo.fftSize}
          width={100}
          height={36}
          lineColor="#00d4ff"
        />
        <div style={{ marginLeft: 4 }}>
          <Knob value={volume} min={0} max={1} step={0.01} label="VOL" onChange={handleVolume} size="sm" />
        </div>
      </div>
    </div>
  );

  const mobileControls = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", borderBottom: "1px solid #1e1e1e", flexShrink: 0 }}>
        {TABS.map((tab) => (
          <button key={tab.id} style={tabBtnStyle(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto" }}>
        {activeTab === "osc" && (
          <div style={mobilePanelStyle}>
            <WaveformSelect
              value={waveform}
              options={["sine", "square", "sawtooth", "triangle"]}
              onChange={handleWaveform}
              label="Waveform"
            />
          </div>
        )}
        {activeTab === "filter" && (
          <div style={mobilePanelStyle}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Knob
                value={filterFreq}
                min={80}
                max={18000}
                step={10}
                label="TONE"
                unit="Hz"
                scale="log"
                onChange={handleFilterFreq}
                size="sm"
              />
            </div>
          </div>
        )}
        {activeTab === "env" && (
          <div style={mobilePanelStyle}>
            <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
              <Fader value={attack} min={0.001} max={2} step={0.001} label="ATK" unit="s" onChange={handleAttack} />
              <Fader value={release} min={0.05} max={4} step={0.01} label="REL" unit="s" onChange={handleRelease} />
            </div>
          </div>
        )}
        {activeTab === "fx" && (
          <div style={mobilePanelStyle}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                onClick={handleReverb}
                aria-label={reverb ? "Reverb on" : "Reverb off"}
                style={{
                  padding: "8px 20px",
                  borderRadius: 3,
                  border: `1px solid ${reverb ? "#00d4ff" : "#2a2a2a"}`,
                  background: reverb ? "#001a22" : "#0a0a0a",
                  color: reverb ? "#00d4ff" : "#404040",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  cursor: "pointer",
                  boxShadow: reverb ? "inset 0 0 8px rgba(0,212,255,0.3)" : "none",
                }}
              >
                REVERB
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const mobileKeyboard = (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <PianoKeyboard
        onNoteOn={noteOn}
        onNoteOff={noteOff}
        startOctave={startOctave}
        octaves={2}
        activeNotes={activeNotes}
        whiteKeyWidth={mobileKeyWidth}
        whiteKeyHeight={80}
      />
    </div>
  );

  const themeVars = {
    "--primary": "#00d4ff",
    "--color-primary": "#00d4ff",
    "--primary-foreground": "#000a0f",
  } as React.CSSProperties;

  if (isMobile) {
    return (
      <div style={themeVars}>
        <SynthShell
          isMobile={true}
          theme={MOBILE_THEME}
          header={mobileHeader}
          controls={mobileControls}
          keyboard={mobileKeyboard}
          navHeight={48}
        />
      </div>
    );
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.3em",
    color: "#404040",
    fontFamily: "Arial",
    textTransform: "uppercase",
    marginBottom: 12,
    borderBottom: "1px solid #1a1a1a",
    paddingBottom: 8,
  };

  const sectionPanel: React.CSSProperties = {
    background: "#0a0a0a",
    border: "1px solid #1e1e1e",
    borderTop: "2px solid #00d4ff",
    borderRadius: 5,
    padding: "14px 12px",
    textAlign: "center",
  };

  return (
    <div style={{
      ...themeVars,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "calc(100dvh - 48px)",
      background: "#0a0a0a",
    }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* Top face — 3D lid */}
        <div style={{
          width: 760,
          height: 18,
          background: "linear-gradient(180deg, #2e2e2e, #1e1e1e)",
          borderRadius: "12px 12px 0 0",
          border: "1px solid #3a3a3a",
          borderBottom: "none",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
          transform: "perspective(500px) rotateX(-18deg) scaleY(0.55)",
          transformOrigin: "bottom center",
          marginBottom: -1,
        }} />

        {/* Chassis body */}
        <div style={{
          background: "linear-gradient(175deg, #1e1e1e 0%, #141414 60%, #0e0e0e 100%)",
          borderRadius: "0 0 10px 10px",
          border: "1px solid #282828",
          borderTop: "1px solid #3a3a3a",
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.04),
            -5px 0 0 #0c0c0c,
            5px 0 0 #0c0c0c,
            0 5px 0 #080808,
            0 7px 0 #060606,
            0 9px 0 #040404,
            0 18px 50px rgba(0,0,0,0.95)
          `,
          width: 760,
        }}>
          {/* Faceplate */}
          <div style={{
            margin: 14,
            background: "#0f0f0f",
            borderRadius: 6,
            border: "1px solid #1a1a1a",
            boxShadow: "inset 0 2px 10px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.02)",
            padding: "16px 18px",
            position: "relative" as const,
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #1a1a1a",
              paddingBottom: 14,
              marginBottom: 14,
            }}>
              {/* Left: Title */}
              <div>
                <p style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.3em", color: "#ffffff", fontFamily: "Arial", margin: 0 }}>
                  THE STARTER PRO
                </p>
                <p style={{ fontSize: 7, color: "#404040", letterSpacing: "0.25em", margin: "3px 0 0", fontFamily: "Arial" }}>
                  AudioWorklet · PolyBLEP · SVF
                </p>
              </div>

              {/* Center: OLED note display + canvases */}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{
                  background: "#000",
                  border: "1px solid #1e1e1e",
                  borderRadius: 3,
                  padding: "5px 12px",
                }}>
                  <span style={{
                    color: "#00d4ff",
                    fontSize: 16,
                    fontFamily: "monospace",
                    letterSpacing: 3,
                    textShadow: "0 0 8px rgba(0,212,255,0.5)",
                  }}>
                    {currentNote ?? "---"}
                  </span>
                </div>
                <WaveformCanvas getWaveform={getWaveform} width={200} height={48} />
                <SpectrumCanvas
                  getFFT={getFFT}
                  filterFreq={filterFreq}
                  sampleRate={analyserInfo.sampleRate}
                  fftSize={analyserInfo.fftSize}
                  width={200}
                  height={48}
                  lineColor="#00d4ff"
                />
              </div>

              {/* Right: Volume knob */}
              <Knob value={volume} min={0} max={1} step={0.01} label="VOL" onChange={handleVolume} size="sm" />
            </div>

            {/* Controls grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 12,
              marginBottom: 14,
            }}>
              {/* OSC */}
              <div style={sectionPanel}>
                <p style={sectionLabel}>OSC</p>
                <WaveformSelect
                  value={waveform}
                  options={["sine", "square", "sawtooth", "triangle"]}
                  onChange={handleWaveform}
                  size="md"
                  label="Waveform"
                />
              </div>

              {/* FILTER */}
              <div style={sectionPanel}>
                <p style={sectionLabel}>FILTER</p>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Knob
                    value={filterFreq}
                    min={80}
                    max={18000}
                    step={10}
                    label="TONE"
                    unit="Hz"
                    scale="log"
                    onChange={handleFilterFreq}
                    size="lg"
                  />
                </div>
              </div>

              {/* ENV */}
              <div style={sectionPanel}>
                <p style={sectionLabel}>ENV</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 28 }}>
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
              </div>

              {/* FX */}
              <div style={sectionPanel}>
                <p style={sectionLabel}>FX</p>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <button
                    onClick={handleReverb}
                    aria-label={reverb ? "Reverb on" : "Reverb off"}
                    style={{
                      width: 56,
                      height: 22,
                      borderRadius: 3,
                      border: `1px solid ${reverb ? "#00d4ff" : "#2a2a2a"}`,
                      background: reverb ? "#001a22" : "#0a0a0a",
                      boxShadow: reverb ? "inset 0 0 8px rgba(0,212,255,0.3)" : "none",
                      cursor: "pointer",
                    }}
                  />
                  <span style={{ fontSize: 8, color: "#404040", fontFamily: "Arial", letterSpacing: "0.1em" }}>
                    REVERB
                  </span>
                </div>
              </div>
            </div>

            {/* Keyboard section */}
            <div style={{
              background: "#050505",
              borderRadius: 5,
              border: "1px solid #111",
              padding: "0",
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}>
              {/* Top strip — octave navigation */}
              <div style={{
                display: "flex",
                alignItems: "stretch",
                height: 28,
                background: "linear-gradient(90deg, #080808, #111 10%, #111 90%, #080808)",
                borderBottom: "1px solid #080808",
              }}>
                <button
                  style={{
                    border: "none",
                    borderRight: "1px solid #1a1a1a",
                    background: "transparent",
                    color: startOctave <= 1 ? "#222" : "#666",
                    fontSize: 12,
                    padding: "0 16px",
                    cursor: startOctave <= 1 ? "default" : "pointer",
                    fontFamily: "Arial",
                  }}
                  onClick={() => setStartOctave((o) => Math.max(1, o - 1))}
                  disabled={startOctave <= 1}
                  aria-label="Octave down"
                >
                  ◀
                </button>
                <span style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2a2a2a",
                  fontSize: 9,
                  fontFamily: "Arial",
                  letterSpacing: "0.3em",
                }}>
                  OCT {startOctave}–{startOctave + 2}
                </span>
                <button
                  style={{
                    border: "none",
                    borderLeft: "1px solid #1a1a1a",
                    background: "transparent",
                    color: startOctave >= 5 ? "#222" : "#666",
                    fontSize: 12,
                    padding: "0 16px",
                    cursor: startOctave >= 5 ? "default" : "pointer",
                    fontFamily: "Arial",
                  }}
                  onClick={() => setStartOctave((o) => Math.min(5, o + 1))}
                  disabled={startOctave >= 5}
                  aria-label="Octave up"
                >
                  ▶
                </button>
              </div>

              <PianoKeyboard
                onNoteOn={noteOn}
                onNoteOff={noteOff}
                startOctave={startOctave}
                octaves={3}
                activeNotes={activeNotes}
                whiteKeyWidth={33}
                whiteKeyHeight={96}
              />
            </div>
            {!ready && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: 6,
                background: "rgba(10,10,10,0.85)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 10,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.3em",
                  color: "#00d4ff", fontFamily: "Arial",
                }}>INITIALIZING...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
