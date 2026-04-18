"use client";

import { useCallback, useRef, useState } from "react";

interface DragOptions {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

export function useDrag({ value, min, max, step = 0.01, onChange }: DragOptions) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef({ startY: 0, startValue: 0 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      ref.current = { startY: e.clientY, startValue: value };
      setDragging(true);
    },
    [value]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const dy = ref.current.startY - e.clientY;
      const range = max - min;
      const factor = e.shiftKey ? 0.08 : 1;
      const raw = ref.current.startValue + (dy / 150) * range * factor;
      const snapped = step > 0 ? Math.round((raw - min) / step) * step + min : raw;
      onChange(Math.max(min, Math.min(max, snapped)));
    },
    [dragging, min, max, step, onChange]
  );

  const stop = useCallback(() => setDragging(false), []);

  return {
    dragging,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: stop,
      onPointerLeave: stop,
    } as React.HTMLAttributes<HTMLElement> & { onPointerDown: typeof onPointerDown },
  };
}
