"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * QWERTY-to-note mapping (2 octaves starting from C4).
 */
const KEY_MAP: Record<string, string> = {
  // Lower row: C4 - B4
  a: "C4",
  w: "C#4",
  s: "D4",
  e: "D#4",
  d: "E4",
  f: "F4",
  t: "F#4",
  g: "G4",
  y: "G#4",
  h: "A4",
  u: "A#4",
  j: "B4",
  // Upper row: C5 - E5
  k: "C5",
  o: "C#5",
  l: "D5",
  p: "D#5",
  ";": "E5",
};

interface UseKeyboardOptions {
  onNoteOn: (note: string, velocity: number) => void;
  onNoteOff: (note: string) => void;
  enabled?: boolean;
}

export function useKeyboard({
  onNoteOn,
  onNoteOff,
  enabled = true,
}: UseKeyboardOptions) {
  const activeKeys = useRef(new Set<string>());
  const callbacksRef = useRef({ onNoteOn, onNoteOff });
  callbacksRef.current = { onNoteOn, onNoteOff };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key in KEY_MAP && !activeKeys.current.has(key)) {
        activeKeys.current.add(key);
        callbacksRef.current.onNoteOn(KEY_MAP[key], 0.8);
      }
    },
    [enabled]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      const key = e.key.toLowerCase();
      if (key in KEY_MAP && activeKeys.current.has(key)) {
        activeKeys.current.delete(key);
        callbacksRef.current.onNoteOff(KEY_MAP[key]);
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      // Release all active notes on cleanup
      for (const key of activeKeys.current) {
        if (key in KEY_MAP) {
          callbacksRef.current.onNoteOff(KEY_MAP[key]);
        }
      }
      activeKeys.current.clear();
    };
  }, [enabled, handleKeyDown, handleKeyUp]);

  return { keyMap: KEY_MAP };
}
