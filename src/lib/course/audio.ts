"use client";

import { StarterProEngine } from "@/app/temp-synths/1-pro/engine";
import type { Note, PatchPreset } from "./types";

let engine: StarterProEngine | null = null;
let initPromise: Promise<StarterProEngine> | null = null;

export class CourseAudioEngine {
  static async start(): Promise<StarterProEngine> {
    if (engine) return engine;
    if (!initPromise) {
      initPromise = StarterProEngine.create().then((e) => {
        engine = e;
        return e;
      });
    }
    return initPromise;
  }

  static isReady(): boolean {
    return engine !== null;
  }

  static dispose(): void {
    engine?.dispose();
    engine = null;
    initPromise = null;
  }

  static setPatch(patch: PatchPreset): void {
    if (!engine) return;
    if (patch.waveform !== undefined) engine.setWaveform(patch.waveform);
    if (patch.filterFreq !== undefined) engine.setFilterFreq(patch.filterFreq);
    if (patch.attack !== undefined) engine.setAttack(patch.attack);
    if (patch.release !== undefined) engine.setRelease(patch.release);
    if (patch.reverb !== undefined) engine.setReverb(patch.reverb);
    if (patch.volume !== undefined) engine.setVolume(patch.volume);
  }

  static playNote(note: Note, durationMs = 400): void {
    if (!engine) return;
    engine.noteOn(note, 0.8);
    window.setTimeout(() => engine?.noteOff(note), durationMs);
  }

  static playSequence(notes: Note[], gapMs = 350, durationMs = 300): void {
    if (!engine) return;
    notes.forEach((n, i) => {
      window.setTimeout(() => CourseAudioEngine.playNote(n, durationMs), i * gapMs);
    });
  }

  static noteOn(note: Note, velocity = 0.8): void {
    engine?.noteOn(note, velocity);
  }

  static noteOff(note: Note): void {
    engine?.noteOff(note);
  }

  static getFFT(): Float32Array {
    return engine?.getFFT() ?? new Float32Array();
  }

  static getWaveform(): Float32Array {
    return engine?.getWaveform() ?? new Float32Array();
  }

  static get sampleRate(): number {
    return engine?.sampleRate ?? 44100;
  }
}
