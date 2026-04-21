"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  onChange: (value: number) => void;
  size?: "sm" | "md" | "lg";
  scale?: "linear" | "log";
  disabled?: boolean;
  locked?: boolean;
}

const SIZES = {
  sm: { outer: 48, stroke: 3, fontSize: "text-[10px]", labelSize: "text-[9px]" },
  md: { outer: 64, stroke: 4, fontSize: "text-xs", labelSize: "text-[10px]" },
  lg: { outer: 80, stroke: 5, fontSize: "text-sm", labelSize: "text-[14px]" },
};

const START_ANGLE = 225;
const END_ANGLE = -45;
const SWEEP = 270;

export function Knob({
  value,
  min,
  max,
  step = 0.01,
  label,
  unit,
  onChange,
  size = "md",
  scale = "linear",
  disabled = false,
  locked = false,
}: KnobProps) {
  const s = SIZES[size];
  const radius = s.outer / 2 - s.stroke;
  const center = s.outer / 2;
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const normalizedValue = scale === "log"
    ? Math.log(value / min) / Math.log(max / min)
    : Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = START_ANGLE - normalizedValue * SWEEP;

  // Format display value
  const displayValue =
    step >= 1
      ? Math.round(value)
      : value.toFixed(step < 0.1 ? 2 : 1);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || locked) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startY: e.clientY, startValue: value };
      setIsDragging(true);
    },
    [value, disabled, locked]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || disabled || locked) return;
      const deltaY = dragRef.current.startY - e.clientY;
      const sensitivity = e.shiftKey ? 800 : 200;
      let newValue: number;
      if (scale === "log") {
        const startNorm = Math.log(dragRef.current.startValue / min) / Math.log(max / min);
        const newNorm = Math.max(0, Math.min(1, startNorm + deltaY / sensitivity));
        newValue = min * Math.pow(max / min, newNorm);
      } else {
        const range = max - min;
        const delta = (deltaY / sensitivity) * range;
        newValue = Math.max(min, Math.min(max, dragRef.current.startValue + delta));
      }
      const snapped = Math.round(newValue / step) * step;
      onChange(Math.max(min, Math.min(max, snapped)));
    },
    [min, max, step, scale, onChange, disabled, locked]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (disabled || locked) return;
    const midValue = scale === "log" ? Math.sqrt(min * max) : min + (max - min) / 2;
    onChange(Math.round(midValue / step) * step);
  }, [min, max, step, scale, onChange, disabled, locked]);

  // SVG arc path
  const polarToCartesian = (a: number) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const arcPath = (startA: number, endA: number) => {
    const start = polarToCartesian(startA);
    const end = polarToCartesian(endA);
    const sweep = startA - endA > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${sweep} 0 ${end.x} ${end.y}`;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 select-none",
        (disabled || locked) && "opacity-40"
      )}
    >
      <svg
        width={s.outer}
        height={s.outer}
        className={cn(
          "cursor-ns-resize",
          isDragging && "cursor-grabbing",
          (disabled || locked) && "cursor-not-allowed"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Background arc */}
        <path
          d={arcPath(START_ANGLE, END_ANGLE)}
          fill="none"
          stroke="currentColor"
          strokeWidth={s.stroke}
          className="text-muted"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {normalizedValue > 0.001 && (
          <path
            d={arcPath(START_ANGLE, angle)}
            fill="none"
            stroke="currentColor"
            strokeWidth={s.stroke}
            className="text-primary"
            strokeLinecap="round"
          />
        )}
        {/* Indicator dot */}
        {(() => {
          const pos = polarToCartesian(angle);
          return (
            <circle
              cx={pos.x}
              cy={pos.y}
              r={s.stroke}
              className="fill-primary"
            />
          );
        })()}
        {/* Center value text */}
        <text
          x={center}
          y={center + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className={cn("fill-foreground font-mono", s.fontSize)}
        >
          {displayValue}
        </text>
      </svg>
      <span className={cn("text-muted-foreground text-center leading-tight", s.labelSize)}>
        {label}
        {unit && (
          <span className="text-muted-foreground/60"> {unit}</span>
        )}
      </span>
      {locked && (
        <span className="text-[8px] text-muted-foreground/50">LOCKED</span>
      )}
    </div>
  );
}
