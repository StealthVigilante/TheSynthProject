"use client";

import { useCallback, useEffect, useRef } from "react";

interface SpectrumDisplayProps {
  getData: () => Float32Array;
  width?: number;
  height?: number;
  color?: string;
}

export function SpectrumDisplay({
  getData,
  width = 300,
  height = 100,
  color = "#34d399",
}: SpectrumDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const data = getData();
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Only draw the useful range (first ~half of FFT bins)
    const binCount = Math.floor(data.length / 2);
    const barWidth = w / binCount;

    for (let i = 0; i < binCount; i++) {
      // dB values from Tone.js are typically -100 to 0
      const db = data[i];
      const normalized = Math.max(0, (db + 100) / 100);
      const barHeight = normalized * h;

      const alpha = 0.3 + normalized * 0.7;
      ctx.fillStyle =
        color +
        Math.round(alpha * 255)
          .toString(16)
          .padStart(2, "0");
      ctx.fillRect(i * barWidth, h - barHeight, barWidth - 0.5, barHeight);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [getData, color]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full rounded-lg border bg-card"
      style={{ height }}
    />
  );
}
