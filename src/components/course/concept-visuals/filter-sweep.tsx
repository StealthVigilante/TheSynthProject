"use client";
import { useEffect, useRef } from "react";

export function FilterSweep({ minHz = 200, maxHz = 8000, durationS = 4 }: {
  minHz?: number; maxHz?: number; durationS?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    const start = performance.now();
    const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#a78bfa";

    const draw = () => {
      const elapsed = (performance.now() - start) / 1000;
      const phase = (elapsed % durationS) / durationS;
      const cutoffNorm = phase;

      ctx.clearRect(0, 0, W, H);

      const bins = 32;
      const barW = W / bins;
      for (let i = 0; i < bins; i++) {
        const norm = i / (bins - 1);
        const baseHeight = Math.sin(norm * Math.PI) * 0.7 + 0.2 * Math.random();
        const aboveCutoff = norm > cutoffNorm;
        const h = baseHeight * H * (aboveCutoff ? 0.15 : 1.0);
        ctx.fillStyle = aboveCutoff ? "rgba(120,120,120,0.4)" : primary;
        ctx.fillRect(i * barW + 1, H - h, barW - 2, h);
      }

      const cx = cutoffNorm * W;
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
      ctx.setLineDash([]);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [minHz, maxHz, durationS]);

  return <canvas ref={canvasRef} className="w-full h-32" />;
}
