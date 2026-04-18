"use client";

import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { Knob } from "./shared/knob";
import { SynthKeyboard } from "./shared/keyboard";
import { WaveformDisplay } from "./shared/waveform-display";
import { SYNTH_CONFIGS } from "./configs";

const C = SYNTH_CONFIGS["osci-fm"];
const T = C.theme;

const WAVEFORMS = ["sine", "square", "sawtooth", "triangle"] as const;
type Waveform = (typeof WAVEFORMS)[number];
const WAVE_SYMBOLS: Record<Waveform, string> = {
  sine: "∿", square: "⊓", sawtooth: "⩘", triangle: "∧",
};

function OperatorBlock({
  label,
  badge,
  color,
  children,
}: {
  label: string;
  badge: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4 flex-1"
      style={{
        background: T.surface,
        border: `1px solid ${color}50`,
        boxShadow: `inset 0 0 30px ${color}08`,
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-xs font-black"
          style={{ background: color, color: T.bg }}
        >
          {badge}
        </div>
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function WaveSelector({
  value,
  onChange,
  color,
}: {
  value: Waveform;
  onChange: (v: string) => void;
  color: string;
}) {
  return (
    <div className="flex gap-1 mb-4">
      {WAVEFORMS.map((w) => (
        <button
          key={w}
          onClick={() => onChange(w)}
          className="flex-1 py-1.5 rounded text-sm font-bold transition-all"
          style={{
            background: value === w ? color : `${color}10`,
            color: value === w ? T.bg : color,
            border: `1px solid ${value === w ? color : `${color}30`}`,
          }}
        >
          {WAVE_SYMBOLS[w]}
        </button>
      ))}
    </div>
  );
}

export function OsciFM() {
  const { params, isReady, setParam, noteOn, noteOff, getWaveform } =
    useSynthEngine({
      engineType: C.engineType,
      engineConfig: C.engineConfig,
      defaultParams: C.defaultParams,
      allParams: C.allParams,
    });

  const { isStarted, startAudio } = useAudioContext();
  const carrierWave = (params["oscillator.type"] as Waveform) ?? "sine";
  const modWave = (params["modulation.type"] as Waveform) ?? "sine";
  const p = (key: string) => (params[key] as number) ?? 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: T.bg, fontFamily: "monospace" }}
    >
      {/* Header bar */}
      <div
        className="flex items-center gap-4 px-6 py-3 border-b"
        style={{
          borderColor: T.border,
          background: T.panel,
          borderBottom: `1px solid ${T.accent}30`,
        }}
      >
        {/* LED indicator */}
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: isStarted ? T.accent : T.dim,
              boxShadow: isStarted ? `0 0 8px ${T.accent}` : "none",
            }}
          />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: isStarted ? T.accent : T.dim }}
          >
            {isStarted ? "ONLINE" : "OFFLINE"}
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <h1
            className="text-xl font-black tracking-[0.3em] uppercase"
            style={{ color: T.accent }}
          >
            OSCI FM
          </h1>
        </div>

        {/* FM flow diagram */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold"
          style={{ background: `${T.accent}10`, border: `1px solid ${T.accent}25`, color: T.dim }}
        >
          <span style={{ color: T.accent }}>CAR</span>
          <span>→</span>
          <span style={{ color: T.accent2 }}>MOD</span>
          <span>→</span>
          <span style={{ color: T.dim }}>OUT</span>
        </div>

        {!isStarted && (
          <button
            onClick={startAudio}
            className="px-4 py-1.5 rounded text-xs font-black tracking-widest uppercase transition-all"
            style={{ background: T.accent, color: T.bg }}
          >
            Start
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 p-6">
        <div className="flex gap-4 h-full">

          {/* Carrier operator */}
          <OperatorBlock label="Carrier" badge="C" color={T.accent}>
            <WaveSelector
              value={carrierWave}
              onChange={(v) => setParam("oscillator.type", v)}
              color={T.accent}
            />
            <p
              className="text-xs font-bold tracking-widest uppercase mb-2"
              style={{ color: T.dim }}
            >
              Envelope
            </p>
            <div className="flex gap-2 justify-around">
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
                    size={50}
                  />
                );
              })}
            </div>
          </OperatorBlock>

          {/* FM arrow + master controls */}
          <div className="flex flex-col items-center justify-center gap-4 py-4 px-2">
            <div className="flex flex-col items-center gap-1">
              <div className="w-px flex-1 min-h-[20px]" style={{ background: T.border }} />
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                style={{ background: T.border, color: T.dim }}
              >
                →
              </div>
              <div className="w-px flex-1 min-h-[20px]" style={{ background: T.border }} />
            </div>

            <div
              className="flex flex-col gap-3 items-center rounded-xl p-3"
              style={{ background: T.panel, border: `1px solid ${T.border}` }}
            >
              <Knob
                value={p("harmonicity")}
                min={0.1}
                max={20}
                step={0.1}
                label="Ratio"
                onChange={(v) => setParam("harmonicity", v)}
                color={T.accent}
                trackColor={`${T.accent}20`}
                textColor={T.dim}
                size={52}
              />
              <Knob
                value={p("modulationIndex")}
                min={0}
                max={100}
                step={0.1}
                label="Index"
                onChange={(v) => setParam("modulationIndex", v)}
                color={T.accent2}
                trackColor={`${T.accent}20`}
                textColor={T.dim}
                size={52}
              />
              <Knob
                value={p("volume")}
                min={-40}
                max={6}
                step={1}
                label="Vol"
                unit="dB"
                onChange={(v) => setParam("volume", v)}
                color={T.dim}
                trackColor={`${T.border}60`}
                textColor={T.dim}
                size={44}
              />
            </div>
          </div>

          {/* Modulator operator */}
          <OperatorBlock label="Modulator" badge="M" color={T.accent2}>
            <WaveSelector
              value={modWave}
              onChange={(v) => setParam("modulation.type", v)}
              color={T.accent2}
            />
            <p
              className="text-xs font-bold tracking-widest uppercase mb-2"
              style={{ color: T.dim }}
            >
              Mod Envelope
            </p>
            <div className="flex gap-2 justify-around">
              {(["attack", "decay", "sustain", "release"] as const).map((stage) => {
                const key = `modulationEnvelope.${stage}`;
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
                    color={T.accent2}
                    trackColor={`${T.accent2}20`}
                    textColor={T.dim}
                    size={50}
                  />
                );
              })}
            </div>
          </OperatorBlock>
        </div>
      </div>

      {/* Waveform + keyboard */}
      <div
        className="border-t"
        style={{ borderColor: T.border }}
      >
        <div className="px-6 pt-3">
          <div
            className="rounded-lg overflow-hidden mb-3"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}
          >
            <WaveformDisplay
              getData={getWaveform}
              width={900}
              height={48}
              color={T.accent}
              lineWidth={1.5}
              className="w-full"
            />
          </div>
        </div>
        <div
          className="px-6 pb-4 flex justify-center overflow-x-auto"
          style={{ background: T.panel }}
        >
          <SynthKeyboard
            onNoteOn={noteOn}
            onNoteOff={noteOff}
            startOctave={3}
            octaves={3}
            whiteKeyWidth={34}
            whiteKeyHeight={88}
            whiteColor="#e8f4ff"
            blackColor={T.surface}
            activeColor={T.accent}
            borderColor={T.border}
            showKeyLabels
          />
        </div>
      </div>

      {!isReady && isStarted && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70">
          <div
            className="px-8 py-4 rounded text-xs font-black tracking-widest uppercase"
            style={{ background: T.panel, color: T.accent, border: `1px solid ${T.accent}` }}
          >
            Loading FM Engine…
          </div>
        </div>
      )}
    </div>
  );
}
