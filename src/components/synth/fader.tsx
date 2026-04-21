"use client";

import { cn } from "@/lib/utils";

interface FaderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  onChange: (value: number) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  locked?: boolean;
}

const FADER_SIZES = {
  sm: { label: "text-[10px]", value: "text-[10px]", track: "h-24 w-6" },
  md: { label: "text-[14px]", value: "text-[14px]", track: "h-28 w-7" },
};

export function Fader({
  value,
  min,
  max,
  step = 1,
  label,
  unit,
  onChange,
  size = "sm",
  disabled = false,
  locked = false,
}: FaderProps) {
  const s = FADER_SIZES[size];
  const normalizedValue = ((value - min) / (max - min)) * 100;

  const displayValue = step >= 1 ? Math.round(value) : value.toFixed(1);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2",
        (disabled || locked) && "opacity-40"
      )}
    >
      <span className={cn(s.label, "text-muted-foreground")}>{label}</span>
      <div className={cn("relative rounded-full bg-muted", s.track)}>
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full bg-primary transition-[height]"
          style={{ height: `${normalizedValue}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled || locked}
          className="absolute inset-0 h-full w-full cursor-ns-resize appearance-none bg-transparent opacity-0"
          style={{ writingMode: "vertical-lr", direction: "rtl" }}
        />
      </div>
      <span className={cn(s.value, "font-mono text-muted-foreground")}>
        {displayValue}
        {unit && <span className="text-muted-foreground/60"> {unit}</span>}
      </span>
    </div>
  );
}
