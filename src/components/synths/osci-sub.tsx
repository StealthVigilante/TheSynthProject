"use client";

import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { Knob } from "./shared/knob";
import { SynthKeyboard } from "./shared/keyboard";
import { SpectrumDisplay } from "./shared/spectrum-display";
import { SYNTH_CONFIGS } from "./configs";

const C = SYNTH_CONFIGS["osci-sub"];
const T = C.theme;

const WAVEFORMS = ["sine", "square", "sawtooth", "triangle"] as const;
type Waveform = (typeof WAVEFORMS)[number];

// SVG waveform shapes for the selector
const WAVE_PATHS: Record<Waveform, string> = {
  sine: "M2 12 Q8 2 14 12 Q20 22 26 12",
  square: "M2 6 L2 18 L14 18 L14 6 L26 6",
  sawtooth: "M2 18 L14 6 L14 18 L26 6",
  triangle: "M2 18 L8 6 L14 18 L20 6 L26 18",
};

export function OsciSub() {
  const { params, isReady, setParam, noteOn, noteOff, getSpectrum } =
    useSynthEngine({
      engineType: C.engineType,
      engineConfig: C.engineConfig,
      defaultParams: C.defaultParams,
      allParams: C.allParams,
    });

  const { isStarted, startAudio } = useAudioContext();
  const wave = (params["oscillator.type"] as Waveform) ?? "square";
  const p = (key: string) => (params[key] as number) ?? 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: T.bg, fontFamily: "sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-8 py-5 border-b"
        style={{ borderColor: T.border }}
      >
        <div>
          <div
            className="text-xs tracking-widest uppercase mb-1"
            style={{ color: T.dim }}
          >
            Osciscoops / Lab / Beginner
          </div>
          <h1
            className="text-3xl font-black tracking-tighter"
            style={{ color: T.text }}
          >
            OSCI{" "}
            <span style={{ color: T.accent }}>SUB</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {!isStarted ? (
            <button
              onClick={startAudio}
              className="px-5 py-2.5 rounded-lg text-sm font-black tracking-widest uppercase transition-all"
              style={{
                background: T.accent,
                color: "#fff",
                boxShadow: `0 0 20px ${T.glow}`,
              }}
            >
              Power On
            </button>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: `${T.accent}20`, color: T.accent, border: `1px solid ${T.accent}40` }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: T.accent }}
              />
              LIVE
            </div>
          )}
        </div>
      </div>

      {/* Spectrum - big and bass-heavy */}
      <div
        className="px-8 pt-6 pb-2"
      >
        <div
          className="rounded-2xl overflow-hidden w-full"
          style={{ background: T.surface, border: `1px solid ${T.border}` }}
        >
          <SpectrumDisplay
            getData={getSpectrum}
            width={900}
            height={120}
            color={T.accent}
            barCount={80}
            barGap={2}
            className="w-full"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 px-8 py-6">
        <div className="grid grid-cols-3 gap-6">

          {/* Oscillator */}
          <div
            className="rounded-2xl p-5"
            style={{ background: T.panel, border: `1px solid ${T.border}` }}
          >
            <p
              className="text-xs font-black tracking-widest uppercase mb-4"
              style={{ color: T.accent }}
            >
              Oscillator
            </p>
            <div className="grid grid-cols-2 gap-2">
              {WAVEFORMS.map((w) => (
                <button
                  key={w}
                  onClick={() => setParam("oscillator.type", w)}
                  className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-all"
                  style={{
                    background: wave === w ? `${T.accent}20` : T.surface,
                    border: `1.5px solid ${wave === w ? T.accent : T.border}`,
                  }}
                >
                  <svg width="28" height="24" viewBox="0 0 28 24" fill="none">
                    <path
                      d={WAVE_PATHS[w]}
                      stroke={wave === w ? T.accent : T.dim}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: wave === w ? T.accent : T.dim }}
                  >
                    {w}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Filter */}
          <div
            className="rounded-2xl p-5"
            style={{ background: T.panel, border: `1px solid ${T.border}` }}
          >
            <p
              className="text-xs font-black tracking-widest uppercase mb-4"
              style={{ color: T.accent }}
            >
              Filter
            </p>
            <div className="flex flex-col gap-5">
              <div className="flex justify-around">
                <Knob
                  value={p("filter.frequency")}
                  min={20}
                  max={20000}
                  step={1}
                  label="Cutoff"
                  unit="Hz"
                  onChange={(v) => setParam("filter.frequency", v)}
                  color={T.accent}
                  trackColor={`${T.accent}20`}
                  textColor={T.dim}
                  size={64}
                  formatValue={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString()
                  }
                />
                <Knob
                  value={p("filter.Q")}
                  min={0.1}
                  max={20}
                  step={0.1}
                  label="Reso"
                  onChange={(v) => setParam("filter.Q", v)}
                  color={T.accent2}
                  trackColor={`${T.accent}20`}
                  textColor={T.dim}
                  size={64}
                />
              </div>
            </div>
          </div>

          {/* Envelope */}
          <div
            className="rounded-2xl p-5"
            style={{ background: T.panel, border: `1px solid ${T.border}` }}
          >
            <p
              className="text-xs font-black tracking-widest uppercase mb-4"
              style={{ color: T.accent }}
            >
              Envelope
            </p>
            <div className="flex justify-around">
              {(["attack", "decay", "sustain", "release"] as const).map((stage) => {
                const key = `envelope.${stage}`;
                const max = stage === "release" ? 5 : stage === "sustain" ? 1 : 2;
                return (
                  <Knob
                    key={key}
                    value={p(key)}
                    min={stage === "attack" ? 0.001 : 0.01}
                    max={max}
                    step={stage === "attack" ? 0.001 : 0.01}
                    label={stage.charAt(0).toUpperCase()}
                    unit={stage !== "sustain" ? "s" : undefined}
                    onChange={(v) => setParam(key, v)}
                    color={T.accent}
                    trackColor={`${T.accent}20`}
                    textColor={T.dim}
                    size={56}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Volume */}
        <div className="mt-5 flex items-center gap-4">
          <span
            className="text-xs font-black tracking-widest uppercase"
            style={{ color: T.dim }}
          >
            Vol
          </span>
          <div className="flex-1 relative h-8 flex items-center">
            <div
              className="absolute inset-x-0 h-1.5 rounded-full"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}
            />
            <div
              className="absolute left-0 h-1.5 rounded-full transition-all"
              style={{
                width: `${Math.max(0, ((p("volume") + 40) / 46) * 100)}%`,
                background: T.accent,
                boxShadow: `0 0 8px ${T.glow}`,
              }}
            />
            <input
              type="range"
              min={-40}
              max={6}
              step={1}
              value={p("volume")}
              onChange={(e) => setParam("volume", parseFloat(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-8"
            />
          </div>
          <span
            className="text-xs font-mono w-12 text-right"
            style={{ color: T.accent }}
          >
            {p("volume").toFixed(0)} dB
          </span>
        </div>
      </div>

      {/* Keyboard */}
      <div
        className="border-t px-8 py-5 flex justify-center overflow-x-auto"
        style={{ borderColor: T.border, background: T.panel }}
      >
        <SynthKeyboard
          onNoteOn={noteOn}
          onNoteOff={noteOff}
          startOctave={2}
          octaves={3}
          whiteKeyWidth={38}
          whiteKeyHeight={104}
          whiteColor="#e8e8ee"
          blackColor={T.surface}
          activeColor={T.accent}
          borderColor={T.border}
          showKeyLabels
        />
      </div>

      {!isReady && isStarted && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70">
          <div
            className="px-8 py-4 rounded-xl text-sm font-black tracking-widest uppercase"
            style={{ background: T.panel, color: T.accent, border: `1px solid ${T.accent}` }}
          >
            Initializing…
          </div>
        </div>
      )}
    </div>
  );
}
