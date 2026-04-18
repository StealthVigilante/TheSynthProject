"use client";

import { useCallback, useRef, useState } from "react";

// SVG arc math — angles measured from top (north), clockwise
function polarToXY(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.sin(angle),
    y: cy - r * Math.cos(angle),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const s = polarToXY(cx, cy, r, startAngle);
  const e = polarToXY(cx, cy, r, endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
}

const START_ANGLE = (-135 * Math.PI) / 180;
const END_ANGLE = (135 * Math.PI) / 180;
const TOTAL_RANGE = END_ANGLE - START_ANGLE;

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  onChange: (value: number) => void;
  size?: number;
  color?: string;
  trackColor?: string;
  textColor?: string;
  disabled?: boolean;
  formatValue?: (v: number) => string;
}

export function Knob({
  value,
  min,
  max,
  step = 0.01,
  label,
  unit,
  onChange,
  size = 60,
  color = "#e8930a",
  trackColor = "#ffffff18",
  textColor = "#ffffff60",
  disabled = false,
  formatValue,
}: KnobProps) {
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragRef = useRef({ startY: 0, startValue: 0 });

  const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const valueAngle = START_ANGLE + norm * TOTAL_RANGE;

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const strokeW = Math.max(2.5, size * 0.065);

  const tip = polarToXY(cx, cy, r * 0.72, valueAngle);
  const tipInner = polarToXY(cx, cy, r * 0.22, valueAngle);

  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const snapStep = (v: number) => {
    if (step <= 0) return v;
    return Math.round((v - min) / step) * step + min;
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (disabled) return;
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startValue: value };
      setDragging(true);
    },
    [disabled, value]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging) return;
      const dy = dragRef.current.startY - e.clientY;
      const range = max - min;
      const sensitivity = e.shiftKey ? 0.08 : 1;
      const delta = (dy / 160) * range * sensitivity;
      onChange(clamp(snapStep(dragRef.current.startValue + delta)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragging, min, max, onChange]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const showTooltip = hovered || dragging;

  const displayValue = formatValue
    ? formatValue(value)
    : Math.abs(value) >= 100
      ? Math.round(value).toString()
      : Math.abs(value) >= 10
        ? value.toFixed(1)
        : value.toFixed(2);

  return (
    <div
      className="flex flex-col items-center gap-1 select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        {showTooltip && (
          <div
            style={{
              position: "absolute",
              top: -26,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#000000ee",
              color: color,
              fontSize: 10,
              fontFamily: "monospace",
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 3,
              border: `1px solid ${color}50`,
              whiteSpace: "nowrap",
              zIndex: 20,
              pointerEvents: "none",
              letterSpacing: "0.04em",
            }}
          >
            {displayValue}
            {unit ? <span style={{ opacity: 0.6, marginLeft: 2 }}>{unit}</span> : null}
          </div>
        )}

        <svg
          width={size}
          height={size}
          style={{
            display: "block",
            cursor: disabled ? "default" : dragging ? "ns-resize" : "pointer",
            touchAction: "none",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Glow under active arc */}
          {!disabled && norm > 0.02 && (
            <path
              d={describeArc(cx, cy, r, START_ANGLE, valueAngle)}
              fill="none"
              stroke={color}
              strokeWidth={strokeW + 4}
              strokeLinecap="round"
              opacity={0.12}
            />
          )}

          {/* Track background */}
          <path
            d={describeArc(cx, cy, r, START_ANGLE, END_ANGLE)}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />

          {/* Value arc */}
          {norm > 0.01 && (
            <path
              d={describeArc(cx, cy, r, START_ANGLE, valueAngle)}
              fill="none"
              stroke={disabled ? `${color}40` : color}
              strokeWidth={strokeW}
              strokeLinecap="round"
            />
          )}

          {/* Center cap */}
          <circle
            cx={cx}
            cy={cy}
            r={size * 0.16}
            fill={disabled ? "#ffffff06" : "#ffffff0c"}
            stroke={disabled ? `${color}20` : `${color}50`}
            strokeWidth={1}
          />

          {/* Indicator line */}
          <line
            x1={tipInner.x}
            y1={tipInner.y}
            x2={tip.x}
            y2={tip.y}
            stroke={disabled ? `${color}30` : color}
            strokeWidth={Math.max(1.5, strokeW * 0.45)}
            strokeLinecap="round"
          />
        </svg>
      </div>

      <span
        style={{
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: disabled ? `${textColor}40` : textColor,
          fontFamily: "sans-serif",
          fontWeight: 600,
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}
