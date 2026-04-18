"use client";

import { useEffect, useRef } from "react";

interface SpectrumDisplayProps {
  getData: () => Float32Array;
  width?: number;
  height?: number;
  color?: string;
  bgColor?: string;
  barGap?: number;
  barCount?: number;
  className?: string;
}

export function SpectrumDisplay({
  getData,
  width = 200,
  height = 80,
  color = "#22c55e",
  bgColor = "transparent",
  barGap = 1,
  barCount = 64,
  className,
}: SpectrumDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const data = getData();
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (bgColor !== "transparent") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      }

      const bins = Math.min(data.length, barCount);
      const barW = (w - barGap * (bins - 1)) / bins;

      for (let i = 0; i < bins; i++) {
        // FFT data is in dB: -100 to 0
        const db = data[i];
        const norm = Math.max(0, (db + 100) / 100);
        const barH = norm * h;
        const x = i * (barW + barGap);
        const y = h - barH;

        // Gradient: brighter at top (high amplitude)
        const alpha = Math.round((0.35 + norm * 0.65) * 255)
          .toString(16)
          .padStart(2, "0");
        ctx.fillStyle = `${color}${alpha}`;
        ctx.fillRect(x, y, barW, barH);

        // Bright tip
        if (barH > 2) {
          ctx.fillStyle = `${color}ff`;
          ctx.fillRect(x, y, barW, 1);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [getData, color, bgColor, barGap, barCount]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ width, height, display: "block" }}
    />
  );
}
