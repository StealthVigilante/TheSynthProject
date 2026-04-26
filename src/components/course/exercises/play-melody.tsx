"use client";
import { useEffect, useRef, useState } from "react";
import type { PlayMelodyExercise, Note } from "@/lib/course/types";
import { ExerciseShell } from "./exercise-shell";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { CourseAudioEngine } from "@/lib/course/audio";

interface Props { ex: PlayMelodyExercise; onAnswered: (correct: boolean) => void; }

export function PlayMelody({ ex, onAnswered }: Props) {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);
  const startedAt = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    void CourseAudioEngine.start().then(() => CourseAudioEngine.setPatch(ex.patch));
    startedAt.current = performance.now();
    timeoutRef.current = window.setTimeout(() => {
      if (!done) onAnswered(false);
      setDone(true);
    }, 8000);
    return () => { if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current); };
  }, [ex.id, ex.patch, onAnswered, done]);

  const onNoteOn = (note: string, vel: number) => {
    setActive((s) => new Set(s).add(note));
    CourseAudioEngine.noteOn(note, vel);
    if (done) return;
    if (note === ex.sequence[progress]) {
      const next = progress + 1;
      setProgress(next);
      if (next === ex.sequence.length) {
        setDone(true);
        if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
        onAnswered(true);
      }
    }
  };

  const onNoteOff = (note: Note) => {
    setActive((s) => { const c = new Set(s); c.delete(note); return c; });
    CourseAudioEngine.noteOff(note);
  };

  return (
    <ExerciseShell prompt={ex.prompt} feedback={done ? { correct: progress === ex.sequence.length } : null}>
      <div className="flex flex-col items-center gap-3 w-full">
        {ex.hint && <p className="text-xs text-muted-foreground">{ex.hint}</p>}
        <div className="flex gap-1 mb-2">
          {ex.sequence.map((n, i) => (
            <span
              key={i}
              className={`rounded px-2 py-1 text-xs font-mono border ${
                i < progress ? "bg-emerald-500/20 border-emerald-500" : "border-border text-muted-foreground"
              }`}
            >{n}</span>
          ))}
        </div>
        <PianoKeyboard
          startOctave={3}
          octaves={2}
          activeNotes={active}
          onNoteOn={onNoteOn}
          onNoteOff={onNoteOff}
        />
      </div>
    </ExerciseShell>
  );
}
