"use client";

import { useEffect, useRef } from "react";

interface WaveformCanvasProps {
  getWaveform: () => Float32Array;
  width?: number;
  height?: number;
}

export function WaveformCanvas({ getWaveform, width = 320, height = 80 }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const getRef = useRef(getWaveform);

  useEffect(() => { getRef.current = getWaveform; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx2 = canvas.getContext("2d");
    if (!ctx2) return;
    ctx2.scale(dpr, dpr);

    const draw = () => {
      const data = getRef.current();
      ctx2.clearRect(0, 0, width, height);
      ctx2.strokeStyle = "var(--border)";
      ctx2.lineWidth = 1;
      ctx2.beginPath();
      ctx2.moveTo(0, height / 2);
      ctx2.lineTo(width, height / 2);
      ctx2.stroke();

      ctx2.strokeStyle = "var(--primary)";
      ctx2.lineWidth = 2;
      ctx2.lineJoin = "round";
      ctx2.beginPath();
      const step = Math.max(1, Math.floor(data.length / width));
      for (let i = 0; i < width; i++) {
        const s = data[i * step] ?? 0;
        const y = height / 2 - s * (height / 2 - 4);
        if (i === 0) { ctx2.moveTo(i, y); } else { ctx2.lineTo(i, y); }
      }
      ctx2.stroke();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        background: "var(--muted)",
        borderRadius: 8,
        border: "1px solid var(--border)",
        display: "block",
      }}
    />
  );
}
