"use client";
import { useEffect, useRef } from "react";

interface Props { attack?: number; release?: number; trigger?: number; }

export function EnvelopeShape({ attack = 0.3, release = 1.0, trigger = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    let raf = 0;
    const tStart = performance.now();
    const totalDuration = (attack + release) * 1000;

    const draw = () => {
      const elapsed = performance.now() - tStart;
      const t = (elapsed % (totalDuration + 600)) / 1000;
      ctx.clearRect(0, 0, W, H);

      const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#a78bfa";

      ctx.strokeStyle = primary; ctx.lineWidth = 2;
      ctx.beginPath();
      const attackEnd = attack;
      const releaseEnd = attack + release;
      const peakX = (attackEnd / releaseEnd) * W;

      ctx.moveTo(0, H);
      ctx.lineTo(peakX, H * 0.1);
      ctx.lineTo(W, H);
      ctx.stroke();

      let bx = 0, by = H;
      if (t <= attackEnd) {
        bx = (t / attackEnd) * peakX;
        by = H - ((t / attackEnd) * H * 0.9);
      } else if (t <= releaseEnd) {
        const r = (t - attackEnd) / release;
        bx = peakX + r * (W - peakX);
        by = H * 0.1 + r * (H * 0.9);
      } else {
        bx = W; by = H;
      }
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [attack, release, trigger]);

  return <canvas ref={canvasRef} className="w-full h-32" />;
}
