"use client";

import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Knob } from "./shared/knob";
import { SynthKeyboard } from "./shared/keyboard";
import { WaveformDisplay } from "./shared/waveform-display";
import { SpectrumDisplay } from "./shared/spectrum-display";
import { SynthShell } from "./shared/synth-shell";
import { SYNTH_CONFIGS } from "./configs";

const C = SYNTH_CONFIGS["osci-mono"];
const T = C.theme;

const WAVEFORMS = ["sine", "square", "sawtooth", "triangle"] as const;
type Waveform = (typeof WAVEFORMS)[number];

const WAVE_ICONS: Record<Waveform, string> = {
  sine: "∿",
  square: "⊓",
  sawtooth: "⩘",
  triangle: "∧",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1" style={{ background: T.border }} />
      <span
        className="text-xs font-bold tracking-widest uppercase px-2"
        style={{ color: T.dim }}
      >
        {children}
      </span>
      <div className="h-px flex-1" style={{ background: T.border }} />
    </div>
  );
}

export function OsciMono() {
  const { params, isReady, setParam, noteOn, noteOff, getWaveform, getSpectrum } =
    useSynthEngine({
      engineType: C.engineType,
      engineConfig: C.engineConfig,
      defaultParams: C.defaultParams,
      allParams: C.allParams,
    });

  const { isStarted, startAudio } = useAudioContext();
  const { isMobile, mobileKeyWidth } = useBreakpoint();

  const wave = (params["oscillator.type"] as Waveform) ?? "sawtooth";
  const p = (key: string) => (params[key] as number) ?? 0;
  const ks = (n: number) => (isMobile ? Math.round(n * 0.85) : n);
  const vizH = isMobile ? 32 : 56;

  const header = (
    <div
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{ borderColor: T.border }}
    >
      <div>
        <div className="text-xs tracking-widest uppercase mb-0.5" style={{ color: T.dim }}>
          Osciscoops / Lab
        </div>
        <h1 className="text-xl font-black tracking-tight" style={{ color: T.accent }}>
          OSCI MONO
        </h1>
      </div>
      <div className="flex gap-2 items-center">
        <div className="rounded-lg overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <WaveformDisplay getData={getWaveform} width={isMobile ? 80 : 180} height={vizH} color={T.accent} />
        </div>
        <div className="rounded-lg overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <SpectrumDisplay getData={getSpectrum} width={isMobile ? 60 : 120} height={vizH} color={T.accent} barCount={32} />
        </div>
        {!isStarted ? (
          <button
            onClick={startAudio}
            className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide"
            style={{ background: T.accent, color: T.bg }}
          >
            Enable
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: T.dim }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: T.accent }} />
            On
          </div>
        )}
      </div>
    </div>
  );

  const controls = (
    <div className={`grid grid-cols-2 ${isMobile ? "p-3 gap-3" : "p-4 gap-5"}`}>
      {/* Oscillator + Filter */}
      <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <SectionLabel>Oscillator</SectionLabel>
        <div className="flex gap-1.5 mb-4">
          {WAVEFORMS.map((w) => (
            <button
              key={w}
              onClick={() => setParam("oscillator.type", w)}
              className="flex-1 py-1.5 rounded text-base font-bold transition-all"
              style={{
                background: wave === w ? T.accent : T.surface,
                color: wave === w ? T.bg : T.dim,
                border: `1px solid ${wave === w ? T.accent : T.border}`,
              }}
              title={w}
            >
              {WAVE_ICONS[w]}
            </button>
          ))}
        </div>
        <SectionLabel>Filter</SectionLabel>
        <div className="flex gap-4 justify-center">
          <Knob value={p("filter.frequency")} min={20} max={20000} step={1} label="Cutoff" unit="Hz"
            onChange={(v) => setParam("filter.frequency", v)} color={T.accent}
            trackColor={`${T.accent}25`} textColor={T.dim} size={ks(56)}
            formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString()} />
          <Knob value={p("filter.Q")} min={0.1} max={20} step={0.1} label="Reso"
            onChange={(v) => setParam("filter.Q", v)} color={T.accent2}
            trackColor={`${T.accent}25`} textColor={T.dim} size={ks(56)} />
        </div>
      </div>

      {/* Amp Envelope */}
      <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <SectionLabel>Amp Envelope</SectionLabel>
        <div className="flex gap-3 justify-center">
          {(["attack", "decay", "sustain", "release"] as const).map((stage) => {
            const key = `envelope.${stage}`;
            const max = stage === "release" ? 5 : stage === "attack" ? 2 : stage === "decay" ? 2 : 1;
            return (
              <Knob key={key} value={p(key)} min={stage === "attack" ? 0.001 : 0.01} max={max}
                step={stage === "attack" ? 0.001 : 0.01}
                label={stage.charAt(0).toUpperCase()} unit={stage !== "sustain" ? "s" : undefined}
                onChange={(v) => setParam(key, v)} color={T.accent}
                trackColor={`${T.accent}25`} textColor={T.dim} size={ks(52)} />
            );
          })}
        </div>
      </div>

      {/* Filter Envelope */}
      <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <SectionLabel>Filter Envelope</SectionLabel>
        <div className="flex gap-3 justify-center flex-wrap">
          {(["attack", "decay", "sustain", "release"] as const).map((stage) => {
            const key = `filterEnvelope.${stage}`;
            const max = stage === "release" ? 5 : stage === "attack" ? 2 : stage === "decay" ? 2 : 1;
            return (
              <Knob key={key} value={p(key)} min={stage === "attack" ? 0.001 : 0.01} max={max}
                step={stage === "attack" ? 0.001 : 0.01}
                label={`F·${stage.charAt(0).toUpperCase()}`} unit={stage !== "sustain" ? "s" : undefined}
                onChange={(v) => setParam(key, v)} color={T.accent2}
                trackColor={`${T.accent2}25`} textColor={T.dim} size={ks(52)} />
            );
          })}
          <Knob value={p("filterEnvelope.baseFrequency")} min={20} max={5000} step={1} label="Base" unit="Hz"
            onChange={(v) => setParam("filterEnvelope.baseFrequency", v)} color={T.accent2}
            trackColor={`${T.accent2}25`} textColor={T.dim} size={ks(52)}
            formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString()} />
          <Knob value={p("filterEnvelope.octaves")} min={0} max={8} step={0.1} label="Octaves"
            onChange={(v) => setParam("filterEnvelope.octaves", v)} color={T.accent2}
            trackColor={`${T.accent2}25`} textColor={T.dim} size={ks(52)} />
        </div>
      </div>

      {/* Master */}
      <div className="rounded-xl p-4 flex flex-col items-center justify-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <SectionLabel>Master</SectionLabel>
        <Knob value={p("volume")} min={-40} max={6} step={1} label="Volume" unit="dB"
          onChange={(v) => setParam("volume", v)} color={T.accent}
          trackColor={`${T.accent}25`} textColor={T.dim} size={ks(56)} />
      </div>
    </div>
  );

  const keyboard = (
    <div className="px-4 py-3 flex justify-center overflow-x-auto">
      <SynthKeyboard
        onNoteOn={noteOn} onNoteOff={noteOff}
        startOctave={3} octaves={isMobile ? 2 : 3}
        whiteKeyWidth={isMobile ? mobileKeyWidth : 24}
        whiteKeyHeight={isMobile ? 80 : 72}
        whiteColor="#f0e8d4" blackColor={T.surface}
        activeColor={T.accent} borderColor={T.border} showKeyLabels
      />
    </div>
  );

  return (
    <>
      <SynthShell isMobile={isMobile} theme={T} header={header} controls={controls} keyboard={keyboard} />
      {!isReady && isStarted && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="px-8 py-4 rounded-xl text-sm font-bold tracking-wide"
            style={{ background: T.panel, color: T.accent, border: `1px solid ${T.border}` }}>
            Loading engine…
          </div>
        </div>
      )}
    </>
  );
}
