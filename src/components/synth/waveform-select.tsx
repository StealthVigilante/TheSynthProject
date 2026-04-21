"use client";

import { cn } from "@/lib/utils";

interface WaveformSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label: string;
  size?: "sm" | "md";
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

const WF_SIZES = {
  sm: { label: "text-[10px]", btn: "h-8 min-w-8 text-xs" },
  md: { label: "text-[14px]", btn: "h-10 min-w-10 text-sm" },
};

export function WaveformSelect({
  value,
  options,
  onChange,
  label,
  size = "sm",
  disabled = false,
}: WaveformSelectProps) {
  const s = WF_SIZES[size];
  return (
    <div className={cn("flex flex-col gap-1.5", disabled && "opacity-40")}>
      <span className={cn(s.label, "text-muted-foreground text-center")}>{label}</span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center rounded-md border px-1.5 transition-colors",
              s.btn,
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
