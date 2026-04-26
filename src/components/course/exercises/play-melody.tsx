"use client";
import { useEffect, useRef, useState } from "react";
import type { PlayMelodyExercise, Note } from "@/lib/course/types";
import { ExerciseShell } from "./exercise-shell";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { CourseAudioEngine } from "@/lib/course/audio";

interface Props { ex: PlayMelodyExercise; onAnswered: (correct: boolean) => void; }

const DEADLINE_MS = 8000;

export function PlayMelody({ ex, onAnswered }: Props) {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  const onAnsweredRef = useRef(onAnswered);
  useEffect(() => { onAnsweredRef.current = onAnswered; });

  const doneRef = useRef(false);
  useEffect(() => { doneRef.current = done; });

  useEffect(() => {
    void CourseAudioEngine.start().then(() => CourseAudioEngine.setPatch(ex.patch));
    const id = window.setTimeout(() => {
      if (!doneRef.current) {
        onAnsweredRef.current(false);
        setDone(true);
      }
    }, DEADLINE_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id]);

  const onNoteOn = (note: string, vel: number) => {
    setActive((s) => new Set(s).add(note));
    CourseAudioEngine.noteOn(note, vel);
    if (doneRef.current) return;
    if (note === ex.sequence[progress]) {
      const next = progress + 1;
      setProgress(next);
      if (next === ex.sequence.length) {
        setDone(true);
        onAnsweredRef.current(true);
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
