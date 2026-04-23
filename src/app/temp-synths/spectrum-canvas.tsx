"use client";

import { useEffect, useRef } from "react";

interface SpectrumCanvasProps {
  getFFT: () => Float32Array;
  filterFreq: number;
  resonance?: number;
  sampleRate: number;
  fftSize: number;
  width?: number;
  height?: number;
  lineColor?: string;
  getFilterFreq?: () => number;
}

const MIN_FREQ = 20;
const MAX_FREQ = 18000;
const LOG_RANGE = Math.log10(MAX_FREQ / MIN_FREQ);
const MIN_DB = -100;
const DB_RANGE = 100;
const EQ_HALF = 36; // ±36 dB around 0 dB; 0 dB maps to vertical midpoint

function biquadLowpassMagDb(f: number, fc: number, Q: number, sr: number): number {
  const w0 = 2 * Math.PI * fc / sr;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosW0 = Math.cos(w0);
  const b0 = (1 - cosW0) / 2, b1 = 1 - cosW0, b2 = (1 - cosW0) / 2;
  const a0 = 1 + alpha, a1 = -2 * cosW0, a2 = 1 - alpha;
  const B0 = b0/a0, B1 = b1/a0, B2 = b2/a0, A1 = a1/a0, A2 = a2/a0;
  const w = 2 * Math.PI * f / sr;
  const cw = Math.cos(w), c2w = Math.cos(2 * w);
  const num = B0*B0 + B1*B1 + B2*B2 + 2*(B0*B1 + B1*B2)*cw + 2*B0*B2*c2w;
  const den = 1 + A1*A1 + A2*A2 + 2*(A1 + A1*A2)*cw + 2*A2*c2w;
  return 20 * Math.log10(Math.max(Math.sqrt(num / den), 1e-10));
}

export function SpectrumCanvas({
  getFFT,
  filterFreq,
  resonance = 1.0,
  sampleRate,
  fftSize,
  width = 320,
  height = 80,
  lineColor = "#f97316",
  getFilterFreq,
}: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const getRef = useRef(getFFT);
  const filterFreqRef = useRef(filterFreq);
  const resonanceRef = useRef(resonance);
  const lineColorRef = useRef(lineColor);
  const getFilterFreqRef = useRef(getFilterFreq);

  useEffect(() => { getRef.current = getFFT; });
  useEffect(() => { filterFreqRef.current = filterFreq; }, [filterFreq]);
  useEffect(() => { resonanceRef.current = resonance; }, [resonance]);
  useEffect(() => { lineColorRef.current = lineColor; }, [lineColor]);
  useEffect(() => { getFilterFreqRef.current = getFilterFreq; }, [getFilterFreq]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const draw = () => {
      const data = getRef.current();
      ctx.clearRect(0, 0, width, height);

      // FFT bars — one pixel column per x position, log-scaled frequency
      ctx.fillStyle = "var(--primary)";
      ctx.globalAlpha = 0.55;
      for (let x = 0; x < width; x++) {
        const freq = MIN_FREQ * Math.pow(10, (x / width) * LOG_RANGE);
        const bin = Math.round((freq * fftSize) / sampleRate);
        if (bin <= 0 || bin >= data.length) continue;
        const db = Math.max(data[bin], MIN_DB);
        const barH = ((db - MIN_DB) / DB_RANGE) * height;
        ctx.fillRect(x, height - barH, 1, barH);
      }
      ctx.globalAlpha = 1;

      // Lowpass EQ curve — 0 dB at vertical midpoint, ±EQ_HALF dB range
      ctx.strokeStyle = lineColorRef.current;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const freq = MIN_FREQ * Math.pow(10, (x / width) * LOG_RANGE);
        const fc = getFilterFreqRef.current ? getFilterFreqRef.current() : filterFreqRef.current;
        const db = biquadLowpassMagDb(freq, fc, resonanceRef.current, sampleRate);
        const clamped = Math.max(-EQ_HALF, Math.min(EQ_HALF, db));
        const y = height / 2 - (clamped / EQ_HALF) * (height / 2);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height, sampleRate, fftSize]);

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
