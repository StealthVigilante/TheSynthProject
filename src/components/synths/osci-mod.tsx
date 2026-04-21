"use client";

import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Knob } from "./shared/knob";
import { SynthKeyboard } from "./shared/keyboard";
import { WaveformDisplay } from "./shared/waveform-display";
import { SynthShell } from "./shared/synth-shell";
import { SYNTH_CONFIGS } from "./configs";

const C = SYNTH_CONFIGS["osci-mod"];
const T = C.theme;

const WAVEFORMS = ["sine", "square", "sawtooth", "triangle"] as const;
type Waveform = (typeof WAVEFORMS)[number];
const WAVE_SYMBOLS: Record<Waveform, string> = {
  sine: "∿", square: "⊓", sawtooth: "⩘", triangle: "∧",
};

const V1_COLOR = T.accent;
const V2_COLOR = T.accent2;

function VoicePanel({ label, color, waveKey, envKey, wave, p, setParam, ks }: {
  label: string; color: string; waveKey: string; envKey: string;
  wave: Waveform; p: (k: string) => number;
  setParam: (k: string, v: number | string) => void;
  ks: (n: number) => number;
}) {
  return (
    <div className="flex-1 rounded-xl p-4" style={{ background: T.surface, border: `1.5px solid ${color}40` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-6 rounded-full" style={{ background: color }} />
        <span className="text-sm font-black tracking-widest uppercase" style={{ color }}>{label}</span>
      </div>
      <div className="grid grid-cols-4 gap-1 mb-4">
        {WAVEFORMS.map((w) => (
          <button key={w} onClick={() => setParam(waveKey, w)}
            className="py-2 rounded-lg text-base font-bold transition-all"
            style={{
              background: wave === w ? `${color}25` : T.panel,
              color: wave === w ? color : T.dim,
              border: `1px solid ${wave === w ? color : T.border}`,
            }}>
            {WAVE_SYMBOLS[w]}
          </button>
        ))}
      </div>
      <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: T.dim }}>Envelope</p>
      <div className="flex gap-2 justify-around">
        {(["attack", "decay", "sustain", "release"] as const).map((stage) => {
          const key = `${envKey}.${stage}`;
          const max = stage === "release" ? 5 : stage === "sustain" ? 1 : 2;
          return (
            <Knob key={key} value={p(key)} min={stage === "attack" ? 0.001 : 0.01} max={max}
              step={stage === "attack" ? 0.001 : 0.01}
              label={stage.charAt(0).toUpperCase()} unit={stage !== "sustain" ? "s" : undefined}
              onChange={(v) => setParam(key, v)} color={color}
              trackColor={`${color}15`} textColor={T.dim} size={ks(44)} />
          );
        })}
      </div>
    </div>
  );
}

export function OsciMod() {
  const { params, isReady, setParam, noteOn, noteOff, getWaveform } =
    useSynthEngine({
      engineType: C.engineType,
      engineConfig: C.engineConfig,
      defaultParams: C.defaultParams,
      allParams: C.allParams,
    });

  const { isStarted, startAudio } = useAudioContext();
  const { isMobile, mobileKeyWidth } = useBreakpoint();

  const v1Wave = (params["voice0.oscillator.type"] as Waveform) ?? "sawtooth";
  const v2Wave = (params["voice1.oscillator.type"] as Waveform) ?? "square";
  const p = (key: string) => (params[key] as number) ?? 0;
  const ks = (n: number) => (isMobile ? Math.round(n * 0.85) : n);

  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: T.border }}>
      <div>
        <h1 className="text-xl font-black tracking-tight" style={{ color: T.text }}>
          OSCI{" "}
          <span style={{
            background: `linear-gradient(90deg, ${V1_COLOR}, ${V2_COLOR})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>MOD</span>
        </h1>
        <p className="text-xs mt-0.5" style={{ color: T.dim }}>Dual-Voice Modular Synthesizer</p>
      </div>
      {!isStarted ? (
        <button onClick={startAudio} className="px-4 py-2 rounded text-sm font-bold"
          style={{ background: T.text, color: T.bg }}>Enable Audio</button>
      ) : (
        <div className="flex items-center gap-2 text-xs" style={{ color: T.dim }}>
          <span className="w-2 h-2 rounded-full" style={{ background: T.accent }} />
          <span>Active</span>
        </div>
      )}
    </div>
  );

  const controls = (
    <div className={`flex gap-3 ${isMobile ? "p-3" : "p-4"}`}>
      <VoicePanel label="Voice 1" color={V1_COLOR}
        waveKey="voice0.oscillator.type" envKey="voice0.envelope"
        wave={v1Wave} p={p} setParam={setParam} ks={ks} />

      {/* Modulation center */}
      <div className="rounded-xl p-3 w-40 flex-shrink-0" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-xs font-black tracking-widest uppercase mb-3 text-center" style={{ color: T.dim }}>Modulation</p>
        <div className="flex flex-col items-center gap-3">
          <Knob value={p("harmonicity")} min={0.1} max={10} step={0.1} label="Harmony"
            onChange={(v) => setParam("harmonicity", v)} color={T.text}
            trackColor={`${T.text}15`} textColor={T.dim} size={ks(48)} />
          <div className="w-full h-px" style={{ background: T.border }} />
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: T.dim }}>Vibrato</p>
          <Knob value={p("vibratoAmount")} min={0} max={1} step={0.01} label="Amount"
            onChange={(v) => setParam("vibratoAmount", v)} color={`${V1_COLOR}cc`}
            trackColor={`${T.text}15`} textColor={T.dim} size={ks(44)} />
          <Knob value={p("vibratoRate")} min={0.1} max={20} step={0.1} label="Rate" unit="Hz"
            onChange={(v) => setParam("vibratoRate", v)} color={`${V2_COLOR}cc`}
            trackColor={`${T.text}15`} textColor={T.dim} size={ks(44)} />
          <div className="w-full h-px" style={{ background: T.border }} />
          <Knob value={p("volume")} min={-40} max={6} step={1} label="Vol" unit="dB"
            onChange={(v) => setParam("volume", v)} color={T.dim}
            trackColor={`${T.border}60`} textColor={T.dim} size={ks(38)} />
        </div>
      </div>

      <VoicePanel label="Voice 2" color={V2_COLOR}
        waveKey="voice1.oscillator.type" envKey="voice1.envelope"
        wave={v2Wave} p={p} setParam={setParam} ks={ks} />
    </div>
  );

  const keyboard = (
    <div>
      <div className="overflow-hidden mx-4 mt-2 mb-0 rounded-lg" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <WaveformDisplay getData={getWaveform} width={900} height={isMobile ? 28 : 40}
          color={T.text} lineWidth={1.5} className="w-full" />
      </div>
      <div className="px-4 py-3 flex justify-center overflow-x-auto">
        <SynthKeyboard
          onNoteOn={noteOn} onNoteOff={noteOff}
          startOctave={3} octaves={isMobile ? 2 : 3}
          whiteKeyWidth={isMobile ? mobileKeyWidth : 24}
          whiteKeyHeight={isMobile ? 80 : 72}
          whiteColor="#f5f5f5" blackColor={T.surface}
          activeColor={T.accent} borderColor={T.border} showKeyLabels
        />
      </div>
    </div>
  );

  return (
    <>
      <SynthShell isMobile={isMobile} theme={T} header={header} controls={controls} keyboard={keyboard} />
      {!isReady && isStarted && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80">
          <div className="px-8 py-4 rounded text-sm font-bold tracking-wide"
            style={{ background: T.panel, color: T.text, border: `1px solid ${T.border}` }}>
            Initializing dual voice engine…
          </div>
        </div>
      )}
    </>
  );
}
