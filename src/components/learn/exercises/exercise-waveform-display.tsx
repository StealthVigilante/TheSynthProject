"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { Json } from "@/lib/supabase/types";
import type { ParamValues } from "@/lib/synth-engine";

interface Props {
  instructions: string;
  content: Json;
  params: ParamValues;
  getWaveform: () => Float32Array;
  onComplete: () => void;
}

function WaveformCanvas({ getWaveform }: { getWaveform: () => Float32Array }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const primary = getComputedStyle(canvas).getPropertyValue("--primary").trim() || "#7c3aed";

    const draw = () => {
      const data = getWaveform();
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      // Faint grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
      ctx.stroke();

      // Waveform
      ctx.strokeStyle = `hsl(var(--primary))`;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.beginPath();

      const step = Math.max(1, Math.floor(data.length / W));
      for (let i = 0; i < W; i++) {
        const sample = data[i * step] ?? 0;
        const y = H / 2 - sample * (H / 2 - 4);
        i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
      }
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getWaveform]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={80}
      style={{
        display: "block",
        margin: "0 auto",
        borderRadius: 6,
        background: "var(--muted)",
        border: "1px solid var(--border)",
      }}
    />
  );
}

export function ExerciseWaveformDisplay({ instructions, params, getWaveform, onComplete }: Props) {
  const waveType = String(params["oscillator.type"] ?? "sawtooth");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">{instructions}</p>
      <div style={{ padding: "8px 0" }}>
        <WaveformCanvas getWaveform={getWaveform} />
      </div>
      <p style={{ fontSize: 11, textAlign: "center", color: "var(--muted-foreground)" }}>
        Play a note to see the <strong>{waveType}</strong> waveform
      </p>
      <Button onClick={onComplete} className="w-full">Continue</Button>
    </div>
  );
}
