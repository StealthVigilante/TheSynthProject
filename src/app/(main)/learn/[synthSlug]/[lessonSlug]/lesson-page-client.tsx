"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioProvider, useAudioContext } from "@/providers/audio-provider";
import { ExercisePlayer } from "@/components/learn/exercise-player";
import { ThemedSynthPanel } from "@/components/synths/themed-synth-panel";
import { useSynthEngine } from "@/hooks/use-synth-engine";
import { useKeyboard } from "@/hooks/use-keyboard";
import type { Exercise } from "@/lib/supabase/types";
import type { EngineType } from "@/lib/synth-engine";
import type { Json } from "@/lib/supabase/types";
import { Play, Square } from "lucide-react";

// Fixed natural width — same as sandbox. Height is auto (content).
const SYNTH_W    = 900;
const BASE_SCALE = 0.5;
const SPRING     = "transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1)";

/** lesson slug → data-group name in ThemedSynthPanel */
const LESSON_FOCUS: Record<string, string> = {
  intro:                "Keyboard",
  waveforms:            "Oscillator",
  filter:               "Filter",
  envelope:             "Envelope",
  "filter-envelope":    "Filter Env",
  "filter-env-advanced":"Filter Env",
};

interface LessonPageClientProps {
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  exercises: Exercise[];
  synthSlug: string;
  synthName: string;
  engineType: string;
  engineConfig: Json;
  defaultParams: Json;
  allParams: string[];
  unlockedParams: string[];
  paramLessonMap: Record<string, string>;
}

function LessonPageInner({
  lessonId,
  lessonSlug,
  lessonTitle,
  exercises,
  synthSlug,
  synthName,
  engineType,
  engineConfig,
  defaultParams,
  allParams,
  unlockedParams,
  paramLessonMap,
}: LessonPageClientProps) {
  const { isStarted } = useAudioContext();
  const focusTarget   = LESSON_FOCUS[lessonSlug] ?? null;

  const areaRef  = useRef<HTMLDivElement>(null);
  const synthRef = useRef<HTMLDivElement>(null);

  const [synthTransform,  setSynthTransform]  = useState(`scale(${BASE_SCALE})`);
  const [synthTransition, setSynthTransition] = useState("none");

  const { params, isReady, setParam, noteOn, noteOff, playNote, getWaveform } = useSynthEngine({
    engineType,
    engineConfig,
    defaultParams,
    allParams,
  });

  useKeyboard({ onNoteOn: noteOn, onNoteOff: noteOff, enabled: isReady });

  const LOOP_NOTES = ["C4", "E4", "G4", "C5", "G4", "E4"];
  const loopIdxRef  = useRef(0);
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLooping, setIsLooping] = useState(false);

  const stopLoop = useCallback(() => {
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    loopTimerRef.current = null;
    setIsLooping(false);
  }, []);

  const scheduleNext = useCallback(() => {
    const note = LOOP_NOTES[loopIdxRef.current % LOOP_NOTES.length];
    playNote(note, "8n");
    loopIdxRef.current += 1;
    loopTimerRef.current = setTimeout(scheduleNext, 480);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playNote]);

  const toggleLoop = useCallback(() => {
    if (isLooping) {
      stopLoop();
    } else {
      loopIdxRef.current = 0;
      setIsLooping(true);
      scheduleNext();
    }
  }, [isLooping, stopLoop, scheduleNext]);

  useEffect(() => () => stopLoop(), [stopLoop]);

  // Zoom to a specific DOM target immediately (used for slide-triggered zooms)
  const zoomToTarget = useCallback((target: string) => {
    const synth = synthRef.current;
    const area  = areaRef.current;
    if (!synth || !area) return;

    const groupEl = synth.querySelector(`[data-group="${target}"]`) as HTMLElement | null;
    if (!groupEl) return;

    const synthRect = synth.getBoundingClientRect();
    const groupRect = groupEl.getBoundingClientRect();

    const fx = (groupRect.left + groupRect.width  / 2 - synthRect.left) / synthRect.width;
    const fy = (groupRect.top  + groupRect.height / 2 - synthRect.top)  / synthRect.height - 0.32;
    const groupNaturalH = groupRect.height / BASE_SCALE;
    const ZOOM = Math.min((area.offsetHeight * 1.2) / groupNaturalH, 5.5);
    const dx = (0.5 - fx) * SYNTH_W;
    const dy = (0.5 - fy) * synth.offsetHeight;

    setSynthTransition(SPRING);
    setSynthTransform(`scale(${ZOOM.toFixed(3)}) translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`);
  }, []);

  // For the intro lesson: slide 1 zooms into the groups area
  const handleSlideChange = useCallback((index: number) => {
    if (lessonSlug !== "intro") return;
    if (index === 1) {
      // Zoom to Oscillator group — center of the controls grid
      zoomToTarget("Oscillator");
    } else if (index === 0) {
      setSynthTransition(SPRING);
      setSynthTransform(`scale(${BASE_SCALE})`);
    }
  }, [lessonSlug, zoomToTarget]);

  // Zoom fires 1.8 s after audio is enabled — by then the full synth panel
  // has rendered and getBoundingClientRect gives real group positions.
  useEffect(() => {
    if (!focusTarget || !isStarted || lessonSlug === "intro") return;

    const tEnable = setTimeout(() => setSynthTransition(SPRING), 1750);

    const tZoom = setTimeout(() => {
      const synth = synthRef.current;
      const area  = areaRef.current;
      if (!synth || !area) return;

      const groupEl = synth.querySelector(
        `[data-group="${focusTarget}"]`
      ) as HTMLElement | null;
      if (!groupEl) return;

      // getBoundingClientRect gives visual (post-transform) positions.
      // Fractions (fx, fy) are invariant to uniform scale, so they map
      // directly to the same fraction in natural-coordinate space.
      const synthRect = synth.getBoundingClientRect();
      const groupRect = groupEl.getBoundingClientRect();

      const fx = (groupRect.left + groupRect.width  / 2 - synthRect.left) / synthRect.width;
      const fy = (groupRect.top  + groupRect.height / 2 - synthRect.top)  / synthRect.height - 0.32;

      // Convert group height from visual to natural coords
      const groupNaturalH = groupRect.height / BASE_SCALE;

      // Zoom so section fills ~85 % of area height; cap at 3.5×
      const ZOOM = Math.min((area.offsetHeight * 1.2) / groupNaturalH, 5.5);

      // Translate in natural coords (CSS: scale then translate in local space)
      const dx = (0.5 - fx) * SYNTH_W;
      const dy = (0.5 - fy) * synth.offsetHeight;

      setSynthTransform(
        `scale(${ZOOM.toFixed(3)}) translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`
      );
    }, 1800);

    return () => { clearTimeout(tEnable); clearTimeout(tZoom); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted]);

  return (
    <div
      style={{
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "var(--background)",
      }}
    >
      {/* ── Synth area — fills full height ─────────────────── */}
      <div
        ref={areaRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: "1.5rem",
          animation: "lesson-synth-in 0.45s ease-out both",
        }}
      >
        <div
          ref={synthRef}
          style={{
            width: SYNTH_W,
            flexShrink: 0,
            transformOrigin: "center center",
            transform: synthTransform,
            transition: synthTransition,
          }}
        >
          <ThemedSynthPanel
            engineType={engineType as EngineType}
            params={params}
            onParamChange={setParam}
            onNoteOn={noteOn}
            onNoteOff={noteOff}
            unlockedParams={unlockedParams}
            paramLessonMap={paramLessonMap}
            isReady={isReady}
            synthName={synthName}
            synthSlug={synthSlug}
            focusedGroup={null}
          />
        </div>
      </div>

      {/* ── Loop play button ───────────────────────────────── */}
      <button
        onClick={toggleLoop}
        disabled={!isReady}
        style={{
          position: "absolute",
          bottom: "1.25rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "2px solid var(--primary)",
          background: isLooping ? "var(--primary)" : "color-mix(in srgb, var(--card) 80%, transparent)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: isLooping ? "var(--primary-foreground)" : "var(--primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isReady ? "pointer" : "not-allowed",
          opacity: isReady ? 1 : 0.4,
          transition: "background 0.2s, color 0.2s",
          boxShadow: isLooping ? "0 0 16px color-mix(in srgb, var(--primary) 50%, transparent)" : "none",
        }}
        aria-label={isLooping ? "Stop loop" : "Play loop"}
      >
        {isLooping
          ? <Square size={20} fill="currentColor" />
          : <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />
        }
      </button>

      {/* ── Instruction sheet — floats over synth ──────────── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          background: "color-mix(in srgb, var(--card) 92%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid color-mix(in srgb, var(--border) 60%, transparent)",
          animation: "lesson-sheet-in 0.45s 0.1s ease-out both",
        }}
      >
        <div
          style={{
            width: 36, height: 4,
            background: "var(--border)",
            borderRadius: 2,
            margin: "8px auto 4px",
          }}
        />
        <div style={{ padding: "0 16px 16px" }}>
          <ExercisePlayer
            lessonId={lessonId}
            lessonTitle={lessonTitle}
            exercises={exercises}
            engineType={engineType as EngineType}
            params={params}
            synthSlug={synthSlug}
            setParam={setParam}
            playNote={playNote}
            getWaveform={getWaveform}
            onSlideChange={handleSlideChange}
          />
        </div>
      </div>
    </div>
  );
}

export function LessonPageClient(props: LessonPageClientProps) {
  return (
    <AudioProvider>
      <LessonPageInner {...props} />
    </AudioProvider>
  );
}
