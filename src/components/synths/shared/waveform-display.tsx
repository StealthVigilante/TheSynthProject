"use client";

import { useEffect, useRef } from "react";

interface WaveformDisplayProps {
  getData: () => Float32Array;
  width?: number;
  height?: number;
  color?: string;
  bgColor?: string;
  lineWidth?: number;
  className?: string;
}

export function WaveformDisplay({
  getData,
  width = 200,
  height = 80,
  color = "#22c55e",
  bgColor = "transparent",
  lineWidth = 1.5,
  className,
}: WaveformDisplayProps) {
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

      // Center reference line
      ctx.strokeStyle = `${color}20`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Waveform glow
      ctx.shadowBlur = 6;
      ctx.shadowColor = color;

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";
      ctx.beginPath();

      const step = w / data.length;
      for (let i = 0; i < data.length; i++) {
        const x = i * step;
        const y = ((data[i] + 1) / 2) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [getData, color, bgColor, lineWidth]);

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
