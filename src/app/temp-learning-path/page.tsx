"use client";

import { useCallback, useState } from "react";
import { AudioProvider, useAudioContext } from "@/providers/audio-provider";
import { useSynthEngine } from "@/hooks/use-synth-engine";
import { SYNTH_CONFIGS } from "@/components/synths/configs";
import { PathMap } from "./path-map";
import { NodeLesson } from "./node-lesson";
import { NodeCreate } from "./node-create";
import { NodeReview } from "./node-review";
import type { Phase, NodeStatus } from "./path-map";
import type { Slide } from "./node-lesson";

const CONFIG = SYNTH_CONFIGS["osci-mono"];

// ── Phase 1 lesson content ────────────────────────────────────────────────────

const WHAT_IS_SOUND_SLIDES: Slide[] = [
  {
    type: "visual",
    title: "What is Sound?",
    body: "Sound is created by vibration. When an object vibrates, it pushes air molecules back and forth, creating pressure waves that travel to your ears. A synthesizer creates these vibrations electronically.",
    visual: "static-sine",
  },
  {
    type: "visual",
    title: "The Waveform",
    body: "A waveform is a visual snapshot of how air pressure changes over time. The x-axis is time, the y-axis is pressure (amplitude). The shape of the waveform determines the timbre — the character — of the sound.",
    visual: "waveform",
  },
  {
    type: "mc",
    question: "What physically creates sound?",
    options: ["Vibration of air molecules", "Light waves", "Magnetic fields", "Electric current alone"],
    correctIndex: 0,
    explanation: "Vibration moves air molecules, creating pressure waves our ears detect as sound.",
  },
  {
    type: "mc",
    question: "What does the shape of a waveform tell us?",
    options: ["The timbre (tonal character) of the sound", "The volume only", "The pitch only", "Nothing useful"],
    correctIndex: 0,
    explanation: "Waveform shape = timbre. Same pitch, different shape = different sound character.",
  },
];

const SINE_SLIDES: Slide[] = [
  {
    type: "visual",
    title: "The Sine Wave",
    body: "The sine wave is the purest sound possible. It contains only a single frequency — the fundamental — with no harmonics. It sounds smooth, clean, and flute-like. Play a note to hear it.",
    visual: "static-sine",
  },
  {
    type: "visual",
    title: "Play It Live",
    body: "The waveform below animates in real time as you play. Notice the smooth, rounded curve — no sharp edges, no harmonics.",
    visual: "waveform",
  },
  {
    type: "mc",
    question: "How does a sine wave sound compared to other waveforms?",
    options: ["Pure and smooth", "Buzzy and hollow", "Bright and harsh", "Nasal and reedy"],
    correctIndex: 0,
    explanation: "No harmonics = pure tone. All other waveforms have harmonics that add colour/texture.",
  },
  {
    type: "mc",
    question: "How many harmonics does a pure sine wave contain?",
    options: ["Zero — only the fundamental frequency", "Two", "Many odd harmonics", "Infinite harmonics"],
    correctIndex: 0,
    explanation: "Sine = fundamental only. That's what makes it the 'building block' of all sounds.",
  },
];

const SQUARE_TRI_SAW_SLIDES: Slide[] = [
  {
    type: "visual",
    title: "Square Wave",
    body: "The square wave flips instantly between maximum and minimum. It contains only odd harmonics (1st, 3rd, 5th…). This gives it a hollow, woody, clarinet-like tone.",
    visual: "static-square",
  },
  {
    type: "visual",
    title: "Triangle Wave",
    body: "The triangle wave has linear slopes, like a mountain peak. Like the square, it contains only odd harmonics — but they fall off much faster, making it softer and more muted than the square.",
    visual: "static-triangle",
  },
  {
    type: "visual",
    title: "Sawtooth Wave",
    body: "The sawtooth ramps up then drops instantly. It contains ALL harmonics — both odd and even. This makes it the brightest, richest, harshest wave. It's the go-to for leads and basses.",
    visual: "static-saw",
  },
  {
    type: "mc",
    question: "Which waveform sounds most hollow and woody (like a clarinet)?",
    options: ["Square", "Sine", "Sawtooth", "Triangle"],
    correctIndex: 0,
    explanation: "Square wave contains only odd harmonics, giving it that hollow, reedy character.",
  },
  {
    type: "mc",
    question: "Which waveform contains both odd AND even harmonics?",
    options: ["Sawtooth", "Sine", "Square", "Triangle"],
    correctIndex: 0,
    explanation: "Sawtooth has all harmonics — that's why it sounds the richest and brightest.",
  },
  {
    type: "mc",
    question: "Triangle vs Square: the triangle sounds ___",
    options: ["Softer — harmonics roll off faster", "Harsher — more harmonics", "Identical — same shape", "Brighter — more highs"],
    correctIndex: 0,
    explanation: "Both have only odd harmonics, but triangle's decrease in amplitude much faster → softer.",
  },
];

const REVIEW_QUESTIONS = [
  { concept: "sine", question: "The sine wave sounds…", options: ["Pure and smooth", "Buzzy and hollow", "Bright and harsh", "Nasal"], correctIndex: 0 },
  { concept: "sine", question: "How many harmonics does a sine wave have?", options: ["Zero (fundamental only)", "Odd harmonics only", "Even harmonics only", "All harmonics"], correctIndex: 0 },
  { concept: "square", question: "The square wave contains which harmonics?", options: ["Odd only", "Even only", "All", "None"], correctIndex: 0 },
  { concept: "square", question: "Which waveform sounds hollow like a clarinet?", options: ["Square", "Sawtooth", "Sine", "Triangle"], correctIndex: 0 },
  { concept: "triangle", question: "How does triangle compare to square in brightness?", options: ["Softer — harmonics fall off faster", "Brighter — more harmonics", "Same brightness", "No difference"], correctIndex: 0 },
  { concept: "sawtooth", question: "The sawtooth wave contains…", options: ["All harmonics (odd + even)", "Odd harmonics only", "Only the fundamental", "Even harmonics only"], correctIndex: 0 },
  { concept: "sawtooth", question: "Which waveform is best for bright leads and basses?", options: ["Sawtooth", "Sine", "Triangle", "Square"], correctIndex: 0 },
  { concept: "harmonics", question: "What are harmonics?", options: ["Multiples of the fundamental frequency", "Types of filters", "Volume settings", "Waveform colours"], correctIndex: 0 },
];

// ── Phase definitions ─────────────────────────────────────────────────────────

const PHASES_BASE: Phase[] = [
  {
    id: "oscillators",
    label: "Oscillators",
    milestone: "Oscillators Mastered",
    nodes: [
      { id: "what-is-sound", type: "lesson", title: "What is Sound?", subtitle: "Vibration & waveforms", status: "available" },
      { id: "sine-wave", type: "lesson", title: "Sine Wave", subtitle: "The pure tone", status: "locked" },
      { id: "square-tri-saw", type: "lesson", title: "Square, Triangle & Saw", subtitle: "Harmonics & character", status: "locked" },
      { id: "match-waveform", type: "create", title: "Listen & Match", subtitle: "Ear training", status: "locked" },
      { id: "phase-1-review", type: "review", title: "Phase 1 Review", subtitle: "5 questions", status: "locked" },
    ],
  },
  {
    id: "filters",
    label: "Filters",
    milestone: "Filters Mastered",
    nodes: [
      { id: "lpf", type: "lesson", title: "Low-Pass Filter", subtitle: "Coming soon", status: "locked" },
      { id: "resonance", type: "lesson", title: "Resonance", subtitle: "Coming soon", status: "locked" },
      { id: "filter-create", type: "create", title: "Sculpt the Sound", subtitle: "Coming soon", status: "locked" },
      { id: "phase-2-review", type: "review", title: "Phase 2 Review", subtitle: "Coming soon", status: "locked" },
    ],
  },
  {
    id: "adsr-amp",
    label: "ADSR Amplitude",
    milestone: "Amplitude Envelope Mastered",
    nodes: [
      { id: "adsr-intro", type: "lesson", title: "The Envelope", subtitle: "Coming soon", status: "locked" },
      { id: "attack", type: "lesson", title: "Attack", subtitle: "Coming soon", status: "locked" },
      { id: "decay-sustain", type: "lesson", title: "Decay & Sustain", subtitle: "Coming soon", status: "locked" },
      { id: "release", type: "lesson", title: "Release", subtitle: "Coming soon", status: "locked" },
      { id: "adsr-create", type: "create", title: "Shape the Sound", subtitle: "Coming soon", status: "locked" },
    ],
  },
  {
    id: "adsr-filter",
    label: "Filter Envelope",
    milestone: "Filter Envelope Mastered",
    nodes: [
      { id: "filter-env", type: "lesson", title: "Filter Envelope", subtitle: "Coming soon", status: "locked" },
      { id: "filter-env-create", type: "create", title: "Wah & Zap", subtitle: "Coming soon", status: "locked" },
    ],
  },
];

const PHASE1_ORDER = ["what-is-sound", "sine-wave", "square-tri-saw", "match-waveform", "phase-1-review"];

// ── Main component ────────────────────────────────────────────────────────────

function LearningPath() {
  const { startAudio } = useAudioContext();

  const { params, setParam, noteOn, noteOff, playNote, getWaveform } = useSynthEngine({
    engineType: CONFIG.engineType,
    engineConfig: CONFIG.engineConfig,
    defaultParams: CONFIG.defaultParams,
    allParams: CONFIG.allParams,
  });

  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());
  const [activeNodeId, setActiveNodeId] = useState<string | null>("what-is-sound");
  const [mistakeLog, setMistakeLog] = useState<Record<string, number>>({});
  const [masteryLevel, setMasteryLevel] = useState<Record<string, number>>({});

  const phases = PHASES_BASE.map((phase) => ({
    ...phase,
    nodes: phase.nodes.map((node) => {
      if (completedNodes.has(node.id)) return { ...node, status: "completed" as NodeStatus };
      if (PHASE1_ORDER.includes(node.id)) {
        const idx = PHASE1_ORDER.indexOf(node.id);
        if (idx === 0) return { ...node, status: "available" as NodeStatus };
        const prev = PHASE1_ORDER[idx - 1];
        return { ...node, status: completedNodes.has(prev) ? ("available" as NodeStatus) : ("locked" as NodeStatus) };
      }
      return node;
    }),
  }));

  const handleNodeClick = useCallback(
    (id: string) => {
      startAudio();
      setActiveNodeId((prev) => (prev === id ? null : id));
    },
    [startAudio]
  );

  const handleConcept = useCallback((concept: string, correct: boolean) => {
    if (correct) {
      setMasteryLevel((prev) => {
        const streak = (prev[concept] ?? 0) + 1;
        if (streak >= 3) {
          setMistakeLog((m) => { const next = { ...m }; delete next[concept]; return next; });
          return { ...prev, [concept]: 0 };
        }
        return { ...prev, [concept]: streak };
      });
    } else {
      setMasteryLevel((prev) => ({ ...prev, [concept]: 0 }));
      setMistakeLog((prev) => ({ ...prev, [concept]: (prev[concept] ?? 0) + 1 }));
    }
  }, []);

  const handleComplete = useCallback((nodeId: string) => {
    setCompletedNodes((prev) => new Set([...prev, nodeId]));
    setActiveNodeId(null);
  }, []);

  function renderPanel(nodeId: string) {
    switch (nodeId) {
      case "what-is-sound":
        return (
          <NodeLesson
            slides={WHAT_IS_SOUND_SLIDES}
            getWaveform={getWaveform}
            onConcept={handleConcept}
            onComplete={() => handleComplete("what-is-sound")}
          />
        );
      case "sine-wave":
        return (
          <NodeLesson
            slides={SINE_SLIDES}
            getWaveform={getWaveform}
            onConcept={handleConcept}
            onComplete={() => handleComplete("sine-wave")}
          />
        );
      case "square-tri-saw":
        return (
          <NodeLesson
            slides={SQUARE_TRI_SAW_SLIDES}
            getWaveform={getWaveform}
            onConcept={handleConcept}
            onComplete={() => handleComplete("square-tri-saw")}
          />
        );
      case "match-waveform":
        return (
          <NodeCreate
            instruction="Listen to the target sound, then select the matching waveform on the synth below and play a note to compare. Click Check when you're happy."
            targetParams={{ "oscillator.type": "square" }}
            enabledParams={["oscillator.type"]}
            params={params}
            onChange={setParam}
            onNoteOn={(note, vel) => noteOn(note, vel)}
            onNoteOff={noteOff}
            playNote={playNote}
            getWaveform={getWaveform}
            onConcept={handleConcept}
            onComplete={() => handleComplete("match-waveform")}
          />
        );
      case "phase-1-review":
        return (
          <NodeReview
            questions={REVIEW_QUESTIONS}
            mistakeLog={mistakeLog}
            masteryLevel={masteryLevel}
            onConcept={handleConcept}
            onComplete={() => handleComplete("phase-1-review")}
          />
        );
      default:
        return (
          <div style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>
            Coming soon — this phase is not yet implemented.
          </div>
        );
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--background)",
        color: "var(--foreground)",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 48,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 12,
          position: "sticky",
          top: 0,
          background: "var(--background)",
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
          Learning Path
        </span>
        <span style={{ color: "var(--border)" }}>·</span>
        <span style={{ fontSize: 13 }}>Osci Mono</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted-foreground)" }}>
          {completedNodes.size} / {PHASE1_ORDER.length} Phase 1
        </span>
      </div>

      {/* Path */}
      <div style={{ padding: "24px 16px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <PathMap
            phases={phases}
            activeNodeId={activeNodeId}
            completedNodes={completedNodes}
            onNodeClick={handleNodeClick}
            renderPanel={renderPanel}
          />
        </div>
      </div>
    </div>
  );
}

export default function TempLearningPathPage() {
  return (
    <AudioProvider>
      <LearningPath />
    </AudioProvider>
  );
}
