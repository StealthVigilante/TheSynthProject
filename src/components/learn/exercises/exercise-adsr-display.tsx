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

function AdsrGraph({ params }: { params: ParamValues }) {
  const a = Math.max(Number(params["envelope.attack"])  ?? 0.01, 0.01);
  const d = Math.max(Number(params["envelope.decay"])   ?? 0.3,  0.01);
  const s =          Number(params["envelope.sustain"]) ?? 0.7;
  const r = Math.max(Number(params["envelope.release"]) ?? 0.5,  0.01);

  const W = 280, H = 80;
  const pad = 6;
  const iW = W - pad * 2;
  const iH = H - pad * 2;

  // Normalize phases: sustain phase fixed at 0.35 of total
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
    `L ${ax}  ${toY(1)}`,
    `L ${dx}  ${sy}`,
    `L ${sx}  ${sy}`,
    `L ${rx}  ${toY(0)}`,
  ].join(" ");

  const fillD = pathD + ` L ${rx} ${toY(0) + pad} L ${pad} ${toY(0) + pad} Z`;

  const labels = [
    { x: ax / 2 + pad / 2,          label: "A" },
    { x: (ax + dx) / 2,             label: "D" },
    { x: (dx + sx) / 2,             label: "S" },
    { x: (sx + rx) / 2,             label: "R" },
  ];

  return (
    <svg width={W} height={H + 18} viewBox={`0 0 ${W} ${H + 18}`} style={{ display: "block", margin: "0 auto" }}>
      {/* Fill */}
      <path d={fillD} fill="var(--primary)" opacity={0.12} />
      {/* Line */}
      <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* Labels */}
      {labels.map(({ x, label }) => (
        <text key={label} x={x} y={H + 14} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)" fontFamily="inherit">
          {label}
        </text>
      ))}
      {/* Sustain level dot */}
      <circle cx={dx} cy={sy} r={3} fill="var(--primary)" />
    </svg>
  );
}

export function ExerciseAdsrDisplay({ instructions, params, onComplete }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">{instructions}</p>
      <div style={{ padding: "12px 0" }}>
        <AdsrGraph params={params} />
      </div>
      <p style={{ fontSize: 11, textAlign: "center", color: "var(--muted-foreground)" }}>
        Adjust the knobs above — graph updates live
      </p>
      <Button onClick={onComplete} className="w-full">Continue</Button>
    </div>
  );
}
