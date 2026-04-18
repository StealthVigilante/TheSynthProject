"use client";

import { cn } from "@/lib/utils";

interface WaveformSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}

const WAVEFORM_ICONS: Record<string, string> = {
  sine: "∿",
  square: "⊓",
  sawtooth: "⩘",
  triangle: "△",
  fatsine: "∿+",
  fatsquare: "⊓+",
  fatsawtooth: "⩘+",
  fattriangle: "△+",
};

export function WaveformSelect({
  value,
  options,
  onChange,
  label,
  disabled = false,
}: WaveformSelectProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", disabled && "opacity-40")}>
      <span className="text-[10px] text-muted-foreground text-center">{label}</span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            disabled={disabled}
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-md border px-1.5 text-xs transition-colors",
              value === opt
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            )}
            title={opt}
          >
            {WAVEFORM_ICONS[opt] ?? opt.slice(0, 3)}
          </button>
        ))}
      </div>
    </div>
  );
}
