"use client";

import { useEffect, useRef } from "react";
import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import { Knob } from "./shared/knob";
import { SynthKeyboard } from "./shared/keyboard";
import { SYNTH_CONFIGS } from "./configs";

const C = SYNTH_CONFIGS["osci-grain"];
const T = C.theme;

// Animated grain particle canvas
function GrainVisualization({
  grainSize,
  overlap,
  active,
}: {
  grainSize: number;
  overlap: number;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; alpha: number }>
  >([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Spawn rate based on grain size (smaller = more grains)
    const spawnRate = Math.max(1, Math.round(10 * (1 - grainSize * 8)));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Deep space background
      ctx.fillStyle = T.bg;
      ctx.fillRect(0, 0, W, H);

      // Spawn new particles
      if (active) {
        for (let i = 0; i < spawnRate; i++) {
          particlesRef.current.push({
            x: W * 0.5 + (Math.random() - 0.5) * W * 0.7,
            y: H * 0.5 + (Math.random() - 0.5) * H * 0.5,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            life: 0,
            maxLife: 20 + Math.random() * 40 * overlap * 10,
            size: 1 + Math.random() * 3 * grainSize * 8,
            alpha: 0,
          });
        }
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

      for (const p of particlesRef.current) {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Fade in then out
        const progress = p.life / p.maxLife;
        p.alpha = progress < 0.3
          ? progress / 0.3
          : progress > 0.7
            ? (1 - progress) / 0.3
            : 1;

        const alpha = Math.round(p.alpha * 200).toString(16).padStart(2, "0");
        ctx.fillStyle = `${T.accent}${alpha}`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = T.accent;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;

      // Limit particle count
      if (particlesRef.current.length > 300) {
        particlesRef.current = particlesRef.current.slice(-200);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [grainSize, overlap, active]);

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={140}
      className="w-full"
      style={{ display: "block" }}
    />
  );
}

export function OsciGrain() {
  const { params, isReady, setParam, noteOn, noteOff } =
    useSynthEngine({
      engineType: C.engineType,
      engineConfig: C.engineConfig,
      defaultParams: C.defaultParams,
      allParams: C.allParams,
    });

  const { isStarted, startAudio } = useAudioContext();
  const p = (key: string) => (params[key] as number) ?? 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: T.bg }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: T.border }}
      >
        <div>
          <h1
            className="text-2xl font-black tracking-tight"
            style={{
              color: T.accent,
              textShadow: `0 0 20px ${T.glow}`,
            }}
          >
            OSCI GRAIN
          </h1>
          <p className="text-xs mt-0.5 font-medium" style={{ color: T.dim }}>
            Granular Synthesizer
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="text-xs font-mono px-3 py-1.5 rounded"
            style={{ background: T.surface, color: T.dim, border: `1px solid ${T.border}` }}
          >
            grains/{" "}
            <span style={{ color: T.accent }}>
              {Math.round(1 / Math.max(0.01, p("grainSize")))}
            </span>
            /s
          </div>

          {!isStarted ? (
            <button
              onClick={startAudio}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
              style={{
                background: T.accent,
                color: T.bg,
                boxShadow: `0 0 15px ${T.glow}`,
              }}
            >
              Enable
            </button>
          ) : (
            <div
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ background: T.accent, boxShadow: `0 0 10px ${T.accent}` }}
            />
          )}
        </div>
      </div>

      {/* Grain cloud visualization */}
      <div
        className="mx-6 mt-5 rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${T.border}` }}
      >
        <GrainVisualization
          grainSize={p("grainSize")}
          overlap={p("overlap")}
          active={isStarted}
        />
      </div>

      {/* Granular controls */}
      <div className="px-6 mt-5 flex gap-4 flex-wrap">
        <div
          className="rounded-xl p-5 flex-1"
          style={{ background: T.panel, border: `1px solid ${T.border}` }}
        >
          <p
            className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: T.dim }}
          >
            Granular Parameters
          </p>
          <div className="flex gap-6 justify-around">
            <Knob
              value={p("grainSize")}
              min={0.01}
              max={0.5}
              step={0.01}
              label="Grain"
              unit="s"
              onChange={(v) => setParam("grainSize", v)}
              color={T.accent}
              trackColor={`${T.accent}20`}
              textColor={T.dim}
              size={64}
            />
            <Knob
              value={p("overlap")}
              min={0.01}
              max={0.5}
              step={0.01}
              label="Overlap"
              unit="s"
              onChange={(v) => setParam("overlap", v)}
              color={T.accent2}
              trackColor={`${T.accent}20`}
              textColor={T.dim}
              size={64}
            />
            <Knob
              value={p("playbackRate")}
              min={0.1}
              max={4}
              step={0.01}
              label="Rate"
              onChange={(v) => setParam("playbackRate", v)}
              color={T.accent}
              trackColor={`${T.accent}20`}
              textColor={T.dim}
              size={64}
            />
            <Knob
              value={p("detune")}
              min={-1200}
              max={1200}
              step={1}
              label="Detune"
              unit="ct"
              onChange={(v) => setParam("detune", v)}
              color={T.accent2}
              trackColor={`${T.accent}20`}
              textColor={T.dim}
              size={64}
            />
          </div>
        </div>

        <div
          className="rounded-xl p-5"
          style={{ background: T.panel, border: `1px solid ${T.border}` }}
        >
          <p
            className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: T.dim }}
          >
            Master
          </p>
          <Knob
            value={p("volume")}
            min={-40}
            max={6}
            step={1}
            label="Vol"
            unit="dB"
            onChange={(v) => setParam("volume", v)}
            color={T.accent}
            trackColor={`${T.accent}20`}
            textColor={T.dim}
            size={60}
          />
        </div>
      </div>

      {/* Note about GrainPlayer */}
      <div
        className="mx-6 mt-3 px-4 py-2 rounded-lg text-xs"
        style={{ background: `${T.accent}08`, border: `1px solid ${T.accent}20`, color: T.dim }}
      >
        <span style={{ color: T.accent }}>Note:</span> GrainPlayer requires an audio buffer (sample) to process.
        Load a sample in the full app to hear granular playback. The UI and parameter controls are fully wired.
      </div>

      {/* Keyboard */}
      <div
        className="mt-auto border-t px-6 py-4 flex justify-center overflow-x-auto"
        style={{ borderColor: T.border, background: T.panel }}
      >
        <SynthKeyboard
          onNoteOn={noteOn}
          onNoteOff={noteOff}
          startOctave={3}
          octaves={3}
          whiteKeyWidth={36}
          whiteKeyHeight={92}
          whiteColor="#eeeeff"
          blackColor={T.surface}
          activeColor={T.accent}
          borderColor={T.border}
          showKeyLabels
        />
      </div>

      {!isReady && isStarted && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80">
          <div
            className="px-8 py-4 rounded-xl text-sm font-bold"
            style={{
              background: T.panel,
              color: T.accent,
              border: `1px solid ${T.border}`,
              boxShadow: `0 0 30px ${T.glow}`,
            }}
          >
            Initializing granular engine…
          </div>
        </div>
      )}
    </div>
  );
}
