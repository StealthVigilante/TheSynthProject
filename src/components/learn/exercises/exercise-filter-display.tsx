"use client";

import { Button } from "@/components/ui/button";
import type { Json } from "@/lib/supabase/types";
import type { ParamValues } from "@/lib/synth-engine";

interface Props {
  instructions: string;
  content: Json;
  params: ParamValues;
  onComplete: () => void;
}

function FilterGraph({ params }: { params: ParamValues }) {
  const cutoff = Math.max(Number(params["filter.frequency"]) || 2000, 20);
  const Q      = Math.max(Number(params["filter.Q"])         || 1,    0.1);

  const W = 280, H = 80;
  const pad = 6;
  const iW = W - pad * 2;
  const iH = H - pad * 2;

  // Log-scale frequency axis: 20 Hz – 20 kHz
  const fMin = Math.log10(20);
  const fMax = Math.log10(20000);
  const toX = (f: number) => pad + ((Math.log10(f) - fMin) / (fMax - fMin)) * iW;

  // 2nd-order resonant LP magnitude: |H| = 1/sqrt((1-(f/fc)²)²+(f/(fc·Q))²)
  const magnitude = (f: number) => {
    const r = f / cutoff;
    return 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / Q, 2));
  };

  // Build path across 200 points
  const points: string[] = [];
  const N = 200;
  for (let i = 0; i <= N; i++) {
    const f   = Math.pow(10, fMin + (i / N) * (fMax - fMin));
    const mag = Math.min(magnitude(f), Q * 1.5 + 0.5); // cap peak
    const dB  = 20 * Math.log10(Math.max(mag, 0.001));  // convert to dB
    // Map dB range -40..+20 to y
    const y   = pad + ((20 - dB) / 60) * iH;
    points.push(`${i === 0 ? "M" : "L"} ${toX(f).toFixed(1)} ${Math.max(pad, Math.min(pad + iH, y)).toFixed(1)}`);
  }
  const pathD = points.join(" ");
  const fillD = pathD + ` L ${pad + iW} ${pad + iH} L ${pad} ${pad + iH} Z`;

  // Cutoff marker
  const cx = toX(cutoff);

  // Frequency labels
  const freqLabels = [20, 100, 500, 2000, 10000, 20000];

  return (
    <svg width={W} height={H + 18} viewBox={`0 0 ${W} ${H + 18}`} style={{ display: "block", margin: "0 auto" }}>
      {/* Fill */}
      <path d={fillD} fill="var(--primary)" opacity={0.12} />
      {/* Curve */}
      <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" />
      {/* 0 dB baseline */}
      <line
        x1={pad} y1={pad + iH * (20 / 60)}
        x2={pad + iW} y2={pad + iH * (20 / 60)}
        stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3"
      />
      {/* Cutoff marker */}
      <line x1={cx} y1={pad} x2={cx} y2={pad + iH} stroke="var(--primary)" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
      {/* Freq labels */}
      {freqLabels.map(f => (
        <text key={f} x={toX(f)} y={H + 14} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)" fontFamily="inherit">
          {f >= 1000 ? `${f / 1000}k` : f}
        </text>
      ))}
    </svg>
  );
}

export function ExerciseFilterDisplay({ instructions, params, onComplete }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">{instructions}</p>
      <div style={{ padding: "12px 0" }}>
        <FilterGraph params={params} />
      </div>
      <p style={{ fontSize: 11, textAlign: "center", color: "var(--muted-foreground)" }}>
        Turn the Cutoff + Resonance knobs — curve updates live
      </p>
      <Button onClick={onComplete} className="w-full">Continue</Button>
    </div>
  );
}
