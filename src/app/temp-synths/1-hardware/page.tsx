"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Knob } from "@/components/synth/knob";
import { Fader } from "@/components/synth/fader";
import { PianoKeyboard } from "@/components/synth/piano-keyboard";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { WaveformCanvas } from "../waveform-canvas";
import { SpectrumCanvas } from "../spectrum-canvas";
import { SynthShell } from "@/components/synths/shared/synth-shell";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Synth1Engine } from "../1/engine";

const MOBILE_THEME = { bg: "#0a0a0a", border: "#1e1e1e", panel: "#0f0f0f" };

const KEY_NOTE_MAP: Record<string, [string, number]> = {
  a: ["C", 0],  w: ["C#", 0], s: ["D", 0],  e: ["D#", 0],
  d: ["E", 0],  f: ["F", 0],  t: ["F#", 0], g: ["G", 0],
  y: ["G#", 0], h: ["A", 0],  u: ["A#", 0], j: ["B", 0],
  k: ["C", 1],  o: ["C#", 1], l: ["D", 1],  p: ["D#", 1],
  ";": ["E", 1],
};

const TABS = [
  { id: "osc" as const, label: "OSC" },
  { id: "filter" as const, label: "FILTER" },
  { id: "env" as const, label: "ENV" },
  { id: "fx" as const, label: "FX" },
];

export default function Synth1HardwarePage() {
  const engineRef = useRef<Synth1Engine | null>(null);
  const { isMobile, mobileKeyWidth } = useBreakpoint();

  const [analyserInfo, setAnalyserInfo] = useState({ sampleRate: 44100, fftSize: 1024 });
  const [waveform, setWaveformState] = useState<string>("sine");
  const [filterFreq, setFilterFreqState] = useState(4000);
  const [attack, setAttackState] = useState(0.02);
  const [release, setReleaseState] = useState(0.5);
  const [reverb, setReverbState] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [startOctave, setStartOctave] = useState(3);
  const startOctaveRef = useRef(startOctave);
  useEffect(() => { startOctaveRef.current = startOctave; }, [startOctave]);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"osc" | "filter" | "env" | "fx">("osc");
  const [currentNote, setCurrentNote] = useState<string | null>(null);

  useEffect(() => {
    engineRef.current = new Synth1Engine();
    setAnalyserInfo({
      sampleRate: engineRef.current.sampleRate,
      fftSize: engineRef.current.fftSize,
    });
    return () => engineRef.current?.dispose();
  }, []);

  const noteOn = useCallback((note: string, vel: number) => {
    engineRef.current?.noteOn(note, vel);
    setCurrentNote(note);
  }, []);

  const noteOff = useCallback((note: string) => {
    engineRef.current?.noteOff(note);
    setCurrentNote(null);
  }, []);

  const getWaveform = useCallback((): Float32Array => {
    return engineRef.current?.getWaveform() ?? new Float32Array(1024);
  }, []);

  const getFFT = useCallback((): Float32Array => {
    return engineRef.current?.getFFT() ?? new Float32Array(512);
  }, []);

  const handleWaveform = useCallback((v: string) => {
    setWaveformState(v);
    engineRef.current?.setWaveform(v as OscillatorType);
  }, []);

  const handleFilterFreq = useCallback((hz: number) => {
    setFilterFreqState(hz);
    engineRef.current?.setFilterFreq(hz);
  }, []);

  const handleAttack = useCallback((s: number) => {
    setAttackState(s);
    engineRef.current?.setAttack(s);
  }, []);

  const handleRelease = useCallback((s: number) => {
    setReleaseState(s);
    engineRef.current?.setRelease(s);
  }, []);

  const handleReverb = useCallback(() => {
    setReverbState((prev) => {
      const next = !prev;
      engineRef.current?.setReverb(next);
      return next;
    });
  }, []);

  const handleVolume = useCallback((v: number) => {
    setVolumeState(v);
    engineRef.current?.setVolume(v);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const heldKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const entry = KEY_NOTE_MAP[e.key.toLowerCase()];
      if (!entry) return;
      e.preventDefault();
      if (heldKeys.has(e.key.toLowerCase())) return;
      heldKeys.add(e.key.toLowerCase());
      const [name, offset] = entry;
      const note = `${name}${startOctaveRef.current + offset}`;
      noteOn(note, 0.8);
      setActiveNotes((prev) => new Set([...prev, note]));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const entry = KEY_NOTE_MAP[e.key.toLowerCase()];
      if (!entry) return;
      heldKeys.delete(e.key.toLowerCase());
      const [name, offset] = entry;
      const note = `${name}${startOctaveRef.current + offset}`;
      noteOff(note);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isMobile, noteOn, noteOff]);

  return <div style={{ color: "#fff", padding: 40 }}>WIP</div>;
}
