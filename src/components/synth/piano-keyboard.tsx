"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PianoKeyboardProps {
  onNoteOn: (note: string, velocity: number) => void;
  onNoteOff: (note: string) => void;
  startOctave?: number;
  octaves?: number;
  activeNotes?: Set<string>;
  /** QWERTY key labels to show on keys */
  keyLabels?: Record<string, string>;
  /** Explicit pixel width per white key. Omit to use flex-1 (fill container). */
  whiteKeyWidth?: number;
  /** Explicit pixel height for keys. Omit to use Tailwind h-32 sm:h-40. */
  whiteKeyHeight?: number;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const BLACK_KEYS = new Set(["C#", "D#", "F#", "G#", "A#"]);

// QWERTY-to-note reverse map for display
const QWERTY_LABELS: Record<string, string> = {
  C4: "A", "C#4": "W", D4: "S", "D#4": "E", E4: "D", F4: "F", "F#4": "T",
  G4: "G", "G#4": "Y", A4: "H", "A#4": "U", B4: "J",
  C5: "K", "C#5": "O", D5: "L", "D#5": "P", E5: ";",
};

export function PianoKeyboard({
  onNoteOn,
  onNoteOff,
  startOctave = 3,
  octaves = 3,
  activeNotes = new Set(),
  whiteKeyWidth: whiteKeyWidthPx,
  whiteKeyHeight,
}: PianoKeyboardProps) {
  const [mouseActive, setMouseActive] = useState(false);
  const activeRef = useRef(new Set<string>());

  const keys: { note: string; isBlack: boolean }[] = [];
  for (let oct = startOctave; oct < startOctave + octaves; oct++) {
    for (const name of NOTE_NAMES) {
      keys.push({ note: `${name}${oct}`, isBlack: BLACK_KEYS.has(name) });
    }
  }
  // Add final C
  keys.push({ note: `C${startOctave + octaves}`, isBlack: false });

  const whiteKeys = keys.filter((k) => !k.isBlack);
  const blackKeys = keys.filter((k) => k.isBlack);

  const handleNoteStart = useCallback(
    (note: string) => {
      if (!activeRef.current.has(note)) {
        activeRef.current.add(note);
        onNoteOn(note, 0.8);
      }
    },
    [onNoteOn]
  );

  const handleNoteEnd = useCallback(
    (note: string) => {
      if (activeRef.current.has(note)) {
        activeRef.current.delete(note);
        onNoteOff(note);
      }
    },
    [onNoteOff]
  );

  const handleMouseUp = useCallback(() => {
    setMouseActive(false);
    for (const note of activeRef.current) {
      onNoteOff(note);
    }
    activeRef.current.clear();
  }, [onNoteOff]);

  // Black key positioning: offset from left edge of preceding white key
  const getBlackKeyOffset = (note: string): number | null => {
    const noteName = note.replace(/\d+/, "");
    const octave = parseInt(note.replace(/\D+/g, ""));
    const whiteIndex = whiteKeys.findIndex((k) => {
      // Find the white key that this black key sits after
      const prevWhiteName =
        noteName === "C#" ? "C" :
        noteName === "D#" ? "D" :
        noteName === "F#" ? "F" :
        noteName === "G#" ? "G" :
        noteName === "A#" ? "A" : null;
      return prevWhiteName && k.note === `${prevWhiteName}${octave}`;
    });
    if (whiteIndex === -1) return null;
    return whiteIndex;
  };

  const whiteKeyWidthPct = 100 / whiteKeys.length;

  return (
    <div
      className="relative select-none touch-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* White keys */}
      <div
        className={cn("flex", !whiteKeyHeight && "h-32 sm:h-40")}
        style={whiteKeyHeight ? { height: whiteKeyHeight } : undefined}
      >
        {whiteKeys.map((key) => {
          const isActive = activeNotes.has(key.note);
          const qwertyLabel = QWERTY_LABELS[key.note];
          return (
            <button
              key={key.note}
              className={cn(
                "relative border border-border/50 rounded-b-md transition-colors",
                whiteKeyWidthPx ? "" : "flex-1",
                isActive
                  ? "bg-primary/30"
                  : "bg-card hover:bg-muted"
              )}
              style={whiteKeyWidthPx ? { width: whiteKeyWidthPx, flexShrink: 0 } : undefined}
              onMouseDown={() => {
                setMouseActive(true);
                handleNoteStart(key.note);
              }}
              onMouseEnter={() => {
                if (mouseActive) handleNoteStart(key.note);
              }}
              onMouseLeave={() => handleNoteEnd(key.note)}
              onTouchStart={(e) => {
                e.preventDefault();
                handleNoteStart(key.note);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleNoteEnd(key.note);
              }}
            >
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground/50">
                {qwertyLabel && (
                  <span className="block text-muted-foreground/70 font-mono">{qwertyLabel}</span>
                )}
                {key.note.replace("#", "")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Black keys */}
      {blackKeys.map((key) => {
        const offset = getBlackKeyOffset(key.note);
        if (offset === null) return null;
        const isActive = activeNotes.has(key.note);
        const qwertyLabel = QWERTY_LABELS[key.note];
        const blackKeyStyle = whiteKeyWidthPx
          ? {
              left: `${(offset + 0.65) * whiteKeyWidthPx}px`,
              width: `${whiteKeyWidthPx * 0.65}px`,
              height: "55%",
            }
          : {
              left: `${(offset + 0.65) * whiteKeyWidthPct}%`,
              width: `${whiteKeyWidthPct * 0.65}%`,
              height: "55%",
            };

        return (
          <button
            key={key.note}
            className={cn(
              "absolute top-0 z-10 rounded-b-md border border-border/30 transition-colors",
              isActive
                ? "bg-primary"
                : "bg-foreground hover:bg-foreground/80"
            )}
            style={blackKeyStyle}
            onMouseDown={() => {
              setMouseActive(true);
              handleNoteStart(key.note);
            }}
            onMouseEnter={() => {
              if (mouseActive) handleNoteStart(key.note);
            }}
            onMouseLeave={() => handleNoteEnd(key.note)}
            onTouchStart={(e) => {
              e.preventDefault();
              handleNoteStart(key.note);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleNoteEnd(key.note);
            }}
          >
            {qwertyLabel && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-mono text-background/50">
                {qwertyLabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
