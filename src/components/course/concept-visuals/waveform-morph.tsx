"use client";
import { useEffect, useRef } from "react";
import type { Waveform } from "@/lib/course/types";

interface Props { focus?: Waveform | "morph"; }

const SHAPES: Waveform[] = ["sine", "triangle", "square", "sawtooth"];

function sample(shape: Waveform, x: number): number {
  switch (shape) {
    case "sine": return Math.sin(x * Math.PI * 2);
    case "triangle": return x < 0.5 ? 4 * x - 1 : 3 - 4 * x;
    case "square": return x < 0.5 ? 1 : -1;
    case "sawtooth": return 2 * x - 1;
  }
}

export function WaveformMorph({ focus = "morph" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const focusRef = useRef(focus);

  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    let raf = 0;
    const start = performance.now();

    const draw = () => {
      const t = (performance.now() - start) / 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary").trim() || "#a78bfa";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const f = focusRef.current;
      const morphIdx = f === "morph" ? (t * 0.4) % SHAPES.length : SHAPES.indexOf(f as Waveform);
      const i0 = Math.floor(morphIdx) % SHAPES.length;
      const i1 = (i0 + 1) % SHAPES.length;
      const blend = morphIdx - Math.floor(morphIdx);

      const cycles = 2;
      for (let px = 0; px < W; px++) {
        const phase = ((px / W) * cycles) % 1;
        const y0 = sample(SHAPES[i0], phase);
        const y1 = sample(SHAPES[i1], phase);
        const y = f === "morph" ? y0 * (1 - blend) + y1 * blend : sample(SHAPES[i0], phase);
        const py = H / 2 - (y * H * 0.4);
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      ctx.stroke();
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="w-full h-32" />;
}
