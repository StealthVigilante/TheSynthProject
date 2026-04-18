"use client";

import { useEffect, useRef } from "react";

// ── WaveformCanvas ────────────────────────────────────────────────────────────
interface WaveformCanvasProps {
  getWaveform: () => Float32Array;
  width?: number;
  height?: number;
}

export function WaveformCanvas({ getWaveform, width = 320, height = 100 }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const getWaveformRef = useRef(getWaveform);

  useEffect(() => {
    getWaveformRef.current = getWaveform;
  });

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
      const data = getWaveformRef.current();
      const W = width;
      const H = height;
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = "oklch(1 0 0 / 6%)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();

      ctx.strokeStyle = "var(--primary)";
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
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: "block",
        borderRadius: 8,
        background: "var(--muted)",
        border: "1px solid var(--border)",
      }}
    />
  );
}

// ── AdsrGraph ─────────────────────────────────────────────────────────────────
interface AdsrGraphProps {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  width?: number;
  height?: number;
}

export function AdsrGraph({ attack, decay, sustain, release, width = 320, height = 90 }: AdsrGraphProps) {
  const W = width;
  const H = height;
  const pad = 8;
  const iW = W - pad * 2;
  const iH = H - pad * 2;

  const a = Math.max(attack, 0.01);
  const d = Math.max(decay, 0.01);
  const s = sustain;
  const r = Math.max(release, 0.01);
  const sustainDur = 0.35;
  const total = a + d + sustainDur + r;

  const toX = (t: number) => pad + (t / total) * iW;
  const toY = (amp: number) => pad + (1 - amp) * iH;

  const ax = toX(a);
  const dx = toX(a + d);
  const sx = toX(a + d + sustainDur);
  const rx = toX(total);
  const sy = toY(s);

  const pathD = [
    `M ${pad} ${toY(0)}`,
    `L ${ax} ${toY(1)}`,
    `L ${dx} ${sy}`,
    `L ${sx} ${sy}`,
    `L ${rx} ${toY(0)}`,
  ].join(" ");

  const labels = [
    { x: (pad + ax) / 2, label: "A" },
    { x: (ax + dx) / 2, label: "D" },
    { x: (dx + sx) / 2, label: "S" },
    { x: (sx + rx) / 2, label: "R" },
  ];

  return (
    <svg width={W} height={H + 18} viewBox={`0 0 ${W} ${H + 18}`} style={{ display: "block" }}>
      <path d={pathD + ` L ${rx} ${pad + iH} L ${pad} ${pad + iH} Z`} fill="var(--primary)" opacity={0.12} />
      <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {labels.map(({ x, label }) => (
        <text key={label} x={x} y={H + 14} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)" fontFamily="inherit">
          {label}
        </text>
      ))}
      <circle cx={dx} cy={sy} r={3} fill="var(--primary)" />
    </svg>
  );
}

// ── FilterGraph ───────────────────────────────────────────────────────────────
interface FilterGraphProps {
  cutoff: number;
  resonance: number;
  width?: number;
  height?: number;
}

export function FilterGraph({ cutoff, resonance, width = 320, height = 90 }: FilterGraphProps) {
  const W = width;
  const H = height;
  const pad = 8;
  const iW = W - pad * 2;
  const iH = H - pad * 2;

  const fc = Math.max(cutoff, 20);
  const Q = Math.max(resonance, 0.1);

  const fMin = Math.log10(20);
  const fMax = Math.log10(20000);
  const toX = (f: number) => pad + ((Math.log10(f) - fMin) / (fMax - fMin)) * iW;

  const magnitude = (f: number) => {
    const r = f / fc;
    return 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / Q, 2));
  };

  const points: string[] = [];
  for (let i = 0; i <= 200; i++) {
    const f = Math.pow(10, fMin + (i / 200) * (fMax - fMin));
    const mag = Math.min(magnitude(f), Q * 1.5 + 0.5);
    const dB = 20 * Math.log10(Math.max(mag, 0.001));
    const y = pad + ((20 - dB) / 60) * iH;
    points.push(`${i === 0 ? "M" : "L"} ${toX(f).toFixed(1)} ${Math.max(pad, Math.min(pad + iH, y)).toFixed(1)}`);
  }
  const pathD = points.join(" ");
  const cx = toX(fc);
  const freqLabels = [20, 200, 2000, 20000];

  return (
    <svg width={W} height={H + 18} viewBox={`0 0 ${W} ${H + 18}`} style={{ display: "block" }}>
      <path d={pathD + ` L ${pad + iW} ${pad + iH} L ${pad} ${pad + iH} Z`} fill="var(--primary)" opacity={0.12} />
      <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" />
      <line x1={cx} y1={pad} x2={cx} y2={pad + iH} stroke="var(--primary)" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
      {freqLabels.map(f => (
        <text key={f} x={toX(f)} y={H + 14} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)" fontFamily="inherit">
          {f >= 1000 ? `${f / 1000}k` : f}
        </text>
      ))}
    </svg>
  );
}
