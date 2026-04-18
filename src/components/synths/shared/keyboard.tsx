"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

interface NoteKey {
  note: string; // e.g. "C#4"
  name: string; // e.g. "C#"
  octave: number;
  isBlack: boolean;
  whiteIndex: number;
}

function generateKeys(startOctave: number, numOctaves: number): NoteKey[] {
  const keys: NoteKey[] = [];
  let whiteIndex = 0;

  for (let oct = startOctave; oct < startOctave + numOctaves; oct++) {
    for (const name of NOTE_NAMES) {
      const isBlack = name.includes("#");
      keys.push({
        note: `${name}${oct}`,
        name,
        octave: oct,
        isBlack,
        whiteIndex: isBlack ? whiteIndex - 0.5 : whiteIndex,
      });
      if (!isBlack) whiteIndex++;
    }
  }
  return keys;
}

// Computer keyboard → note mapping
const KEY_MAP: Record<string, string> = {
  z: "C3", s: "C#3", x: "D3", d: "D#3", c: "E3", v: "F3",
  g: "F#3", b: "G3", h: "G#3", n: "A3", j: "A#3", m: "B3",
  a: "C4", w: "C#4", e: "D4", r: "D#4", q: "E4",  // ... wait, let me fix this
  // Standard layout:
  // Bottom row: Z=C3, X=D3, C=E3, V=F3, B=G3, N=A3, M=B3
  // Black: S=C#3, D=D#3, G=F#3, H=G#3, J=A#3
  // Top row: A=C4, S=D4... wait, overlap with black keys
  // Let me use a non-overlapping layout:
};

// Corrected KEY_MAP
const KEYBOARD_MAP: Record<string, string> = {
  // White keys (two rows)
  a: "C4", s: "D4", d: "E4", f: "F4", g: "G4", h: "A4", j: "B4",
  k: "C5", l: "D5", ";": "E5",
  // Black keys
  w: "C#4", e: "D#4", t: "F#4", y: "G#4", u: "A#4",
  o: "C#5", p: "D#5",
  // Lower octave
  z: "C3", x: "D3", c: "E3", v: "F3", b: "G3", n: "A3", m: "B3",
};

export interface SynthKeyboardProps {
  onNoteOn: (note: string) => void;
  onNoteOff: (note: string) => void;
  startOctave?: number;
  octaves?: number;
  whiteKeyWidth?: number;
  whiteKeyHeight?: number;
  whiteColor?: string;
  blackColor?: string;
  activeColor?: string;
  borderColor?: string;
  showKeyLabels?: boolean;
}

export function SynthKeyboard({
  onNoteOn,
  onNoteOff,
  startOctave = 3,
  octaves = 2,
  whiteKeyWidth = 36,
  whiteKeyHeight = 96,
  whiteColor = "#f0ece4",
  blackColor = "#111118",
  activeColor = "#e8930a",
  borderColor = "#999",
  showKeyLabels = false,
}: SynthKeyboardProps) {
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const dragging = useRef(false);
  const dragNote = useRef<string | null>(null);
  const pressedKeys = useRef<Set<string>>(new Set());

  const keys = generateKeys(startOctave, octaves);
  const whiteKeys = keys.filter((k) => !k.isBlack);
  const blackKeys = keys.filter((k) => k.isBlack);

  const blackW = Math.round(whiteKeyWidth * 0.58);
  const blackH = Math.round(whiteKeyHeight * 0.62);
  const totalWidth = whiteKeys.length * whiteKeyWidth;

  const startNote = useCallback(
    (note: string) => {
      onNoteOn(note);
      setActiveNotes((prev) => new Set([...prev, note]));
    },
    [onNoteOn]
  );

  const endNote = useCallback(
    (note: string) => {
      onNoteOff(note);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    },
    [onNoteOff]
  );

  const handlePointerDown = useCallback(
    (note: string, e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      dragNote.current = note;
      startNote(note);
    },
    [startNote]
  );

  const handlePointerEnter = useCallback(
    (note: string) => {
      if (!dragging.current) return;
      if (dragNote.current && dragNote.current !== note) {
        endNote(dragNote.current);
      }
      dragNote.current = note;
      startNote(note);
    },
    [startNote, endNote]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
    if (dragNote.current) {
      endNote(dragNote.current);
      dragNote.current = null;
    }
  }, [endNote]);

  useEffect(() => {
    const up = () => {
      if (dragging.current) handlePointerUp();
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [handlePointerUp]);

  // Computer keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const note = KEYBOARD_MAP[e.key.toLowerCase()];
      if (note && !pressedKeys.current.has(note)) {
        pressedKeys.current.add(note);
        startNote(note);
      }
    };
    const up = (e: KeyboardEvent) => {
      const note = KEYBOARD_MAP[e.key.toLowerCase()];
      if (note) {
        pressedKeys.current.delete(note);
        endNote(note);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [startNote, endNote]);

  return (
    <div
      style={{
        position: "relative",
        width: totalWidth,
        height: whiteKeyHeight,
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {/* White keys */}
      {whiteKeys.map((key, i) => {
        const active = activeNotes.has(key.note);
        return (
          <div
            key={key.note}
            style={{
              position: "absolute",
              left: i * whiteKeyWidth,
              top: 0,
              width: whiteKeyWidth - 1,
              height: whiteKeyHeight,
              backgroundColor: active ? activeColor : whiteColor,
              borderRadius: "0 0 5px 5px",
              border: `1px solid ${borderColor}`,
              borderTop: "none",
              boxSizing: "border-box",
              cursor: "pointer",
              transition: "background-color 0.03s",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingBottom: 5,
              touchAction: "none",
            }}
            onPointerDown={(e) => handlePointerDown(key.note, e)}
            onPointerEnter={() => handlePointerEnter(key.note)}
          >
            {showKeyLabels && (
              <span
                style={{
                  fontSize: 8,
                  fontFamily: "monospace",
                  color: active ? "#fff" : "#888",
                  pointerEvents: "none",
                }}
              >
                {key.name === "C" ? `C${key.octave}` : ""}
              </span>
            )}
          </div>
        );
      })}

      {/* Black keys */}
      {blackKeys.map((key) => {
        const active = activeNotes.has(key.note);
        // Black key left = (whiteIndex + 0.5) * whiteKeyWidth - blackW/2
        const left = (key.whiteIndex + 0.5) * whiteKeyWidth - blackW / 2;
        return (
          <div
            key={key.note}
            style={{
              position: "absolute",
              left: Math.round(left),
              top: 0,
              width: blackW,
              height: blackH,
              backgroundColor: active ? activeColor : blackColor,
              borderRadius: "0 0 4px 4px",
              border: "1px solid #000",
              borderTop: "none",
              boxSizing: "border-box",
              cursor: "pointer",
              zIndex: 2,
              transition: "background-color 0.03s",
              touchAction: "none",
            }}
            onPointerDown={(e) => handlePointerDown(key.note, e)}
            onPointerEnter={() => handlePointerEnter(key.note)}
          />
        );
      })}
    </div>
  );
}
