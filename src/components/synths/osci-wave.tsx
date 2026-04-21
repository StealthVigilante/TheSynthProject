"use client";

import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Knob } from "./shared/knob";
import { SynthKeyboard } from "./shared/keyboard";
import { WaveformDisplay } from "./shared/waveform-display";
import { SynthShell } from "./shared/synth-shell";
import { SYNTH_CONFIGS } from "./configs";

const C = SYNTH_CONFIGS["osci-wave"];
const T = C.theme;

const WAVEFORMS = [
  { id: "sine", label: "Sine", path: "M0 20 Q12 2 24 20 Q36 38 48 20" },
  { id: "square", label: "Square", path: "M0 8 L0 32 L24 32 L24 8 L48 8" },
  { id: "sawtooth", label: "Saw", path: "M0 32 L24 8 L24 32 L48 8" },
  { id: "triangle", label: "Tri", path: "M0 32 L12 8 L24 32 L36 8 L48 32" },
  { id: "fatsine", label: "FatSin", path: "M0 20 Q6 4 12 20 Q18 36 24 20 Q30 4 36 20 Q42 36 48 20" },
  { id: "fatsquare", label: "FatSq", path: "M0 10 L0 30 L20 30 L20 10 L28 10 L28 30 L48 30 L48 10" },
  { id: "fatsawtooth", label: "FatSaw", path: "M0 30 L16 8 L16 30 L32 8 L32 30 L48 8" },
  { id: "fattriangle", label: "FatTri", path: "M0 30 L8 8 L16 30 L24 8 L32 30 L40 8 L48 30" },
] as const;

export function OsciWave() {
  const { params, isReady, setParam, noteOn, noteOff, getWaveform } =
    useSynthEngine({
      engineType: C.engineType,
      engineConfig: C.engineConfig,
      defaultParams: C.defaultParams,
      allParams: C.allParams,
    });

  const { isStarted, startAudio } = useAudioContext();
  const { isMobile, mobileKeyWidth } = useBreakpoint();

  const wave = (params["oscillator.type"] as string) ?? "fatsawtooth";
  const p = (key: string) => (params[key] as number) ?? 0;
  const ks = (n: number) => (isMobile ? Math.round(n * 0.85) : n);

  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: T.border }}>
      <div>
        <h1 className="text-xl font-black tracking-tight" style={{ color: T.accent }}>OSCI WAVE</h1>
        <p className="text-xs mt-0.5 font-medium" style={{ color: T.dim }}>Wavetable-Style Synthesizer</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono" style={{ color: T.dim }}>
          voices: <span style={{ color: T.accent }}>{Math.round(p("oscillator.count"))}</span>
          {" "}· spread: <span style={{ color: T.accent }}>{Math.round(p("oscillator.spread"))} ct</span>
        </span>
        {!isStarted ? (
          <button onClick={startAudio} className="px-3 py-1.5 rounded-lg text-sm font-bold"
            style={{ background: T.accent, color: T.bg }}>Enable</button>
        ) : (
          <div className="w-2.5 h-2.5 rounded-full"
            style={{ background: T.accent, boxShadow: `0 0 10px ${T.accent}` }} />
        )}
      </div>
    </div>
  );

  const controls = (
    <div className={isMobile ? "p-3" : "p-4"}>
      {/* Waveform display */}
      <div className="rounded-2xl overflow-hidden mb-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <WaveformDisplay getData={getWaveform} width={900} height={isMobile ? 44 : 80}
          color={T.accent} lineWidth={2} className="w-full" />
      </div>

      {/* 8-button waveform selector */}
      <div className={`grid gap-2 mb-3 ${isMobile ? "grid-cols-8" : "grid-cols-4 sm:grid-cols-8"}`}>
        {WAVEFORMS.map((w) => {
          const active = wave === w.id;
          return (
            <button key={w.id} onClick={() => setParam("oscillator.type", w.id)}
              className="flex flex-col items-center gap-1 py-2 rounded-xl transition-all"
              style={{
                background: active ? `${T.accent}18` : T.panel,
                border: `1.5px solid ${active ? T.accent : T.border}`,
              }}>
              <svg width={isMobile ? 28 : 36} height={isMobile ? 24 : 30} viewBox="0 0 48 40" fill="none">
                <path d={w.path} stroke={active ? T.accent : T.dim}
                  strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              {!isMobile && (
                <span className="text-xs font-bold" style={{ color: active ? T.accent : T.dim, fontSize: 9 }}>{w.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Unison + Envelope + Volume row */}
      <div className={`flex gap-3 flex-wrap`}>
        <div className="rounded-xl p-3" style={{ background: T.panel, border: `1px solid ${T.border}` }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: T.dim }}>Unison</p>
          <div className="flex gap-3">
            <Knob value={p("oscillator.spread")} min={0} max={100} step={1} label="Spread" unit="ct"
              onChange={(v) => setParam("oscillator.spread", v)} color={T.accent}
              trackColor={`${T.accent}20`} textColor={T.dim} size={ks(48)} />
            <Knob value={p("oscillator.count")} min={1} max={8} step={1} label="Voices"
              onChange={(v) => setParam("oscillator.count", Math.round(v))} color={T.accent2}
              trackColor={`${T.accent}20`} textColor={T.dim} size={ks(48)}
              formatValue={(v) => Math.round(v).toString()} />
          </div>
        </div>

        <div className="rounded-xl p-3 flex-1" style={{ background: T.panel, border: `1px solid ${T.border}` }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: T.dim }}>Envelope</p>
          <div className="flex gap-4 justify-around">
            {(["attack", "decay", "sustain", "release"] as const).map((stage) => {
              const key = `envelope.${stage}`;
              const max = stage === "release" ? 5 : stage === "sustain" ? 1 : 2;
              return (
                <Knob key={key} value={p(key)} min={stage === "attack" ? 0.001 : 0.01} max={max}
                  step={stage === "attack" ? 0.001 : 0.01}
                  label={stage.slice(0, 3).toUpperCase()} unit={stage !== "sustain" ? "s" : undefined}
                  onChange={(v) => setParam(key, v)} color={T.accent}
                  trackColor={`${T.accent}20`} textColor={T.dim} size={ks(48)} />
              );
            })}
          </div>
        </div>

        <div className="rounded-xl p-3 flex flex-col items-center justify-center" style={{ background: T.panel, border: `1px solid ${T.border}` }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: T.dim }}>Master</p>
          <Knob value={p("volume")} min={-40} max={6} step={1} label="Vol" unit="dB"
            onChange={(v) => setParam("volume", v)} color={T.accent}
            trackColor={`${T.accent}20`} textColor={T.dim} size={ks(48)} />
        </div>
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
        whiteColor="#f0fff4" blackColor={T.surface}
        activeColor={T.accent} borderColor={T.border} showKeyLabels
      />
    </div>
  );

  return (
    <>
      <SynthShell isMobile={isMobile} theme={T} header={header} controls={controls} keyboard={keyboard} />
      {!isReady && isStarted && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70">
          <div className="px-8 py-4 rounded-xl text-sm font-bold"
            style={{ background: T.panel, color: T.accent, border: `1px solid ${T.border}` }}>
            Loading…
          </div>
        </div>
      )}
    </>
  );
}
