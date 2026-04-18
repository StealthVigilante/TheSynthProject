import * as Tone from "tone";
import { createInstrument, setParam, getParam, type ToneInstrument } from "./factory";
import type { EngineType, ParamValues, SynthModelConfig } from "./types";
import type { Json } from "@/lib/supabase/types";

export class SynthEngine {
  private instrument: ToneInstrument | null = null;
  private analyser: Tone.Analyser | null = null;
  private fftAnalyser: Tone.Analyser | null = null;
  private _params: ParamValues = {};
  private _engineType: EngineType = "MonoSynth";
  private activeNotes = new Set<string>();

  get params(): ParamValues {
    return { ...this._params };
  }

  get engineType(): EngineType {
    return this._engineType;
  }

  get isLoaded(): boolean {
    return this.instrument !== null;
  }

  /**
   * Initialize the synth engine with a model config.
   */
  init(config: SynthModelConfig): void {
    this.dispose();

    this._engineType = config.engineType;
    this._params = { ...config.defaultParams };

    // GrainPlayer not supported for note-based playing
    if (config.engineType === "GrainPlayer") {
      return;
    }

    this.instrument = createInstrument(
      config.engineType,
      config.engineConfig
    );

    // Create analysers for waveform and spectrum visualization
    this.analyser = new Tone.Analyser("waveform", 1024);
    this.fftAnalyser = new Tone.Analyser("fft", 1024);

    this.instrument.connect(this.analyser);
    this.instrument.connect(this.fftAnalyser);
    this.instrument.toDestination();

    // Apply default params
    for (const [key, value] of Object.entries(this._params)) {
      if (key === "volume") {
        this.instrument.volume.value = value as number;
      } else {
        setParam(this.instrument, key, value);
      }
    }
  }

  /**
   * Initialize from raw DB fields.
   */
  initFromDb(
    engineType: string,
    engineConfig: Json,
    defaultParams: Json,
    allParams: string[]
  ): void {
    this.init({
      id: "",
      name: "",
      slug: "",
      description: null,
      engineType: engineType as EngineType,
      engineConfig,
      defaultParams: (defaultParams ?? {}) as Record<string, number | string>,
      allParams,
    });
  }

  /**
   * Set a single parameter value.
   */
  setParam(key: string, value: number | string): void {
    this._params[key] = value;
    if (!this.instrument) return;

    if (key === "volume") {
      this.instrument.volume.value = value as number;
    } else {
      setParam(this.instrument, key, value);
    }
  }

  /**
   * Get a parameter value (from internal state, falling back to instrument).
   */
  getParam(key: string): number | string | undefined {
    if (key in this._params) return this._params[key];
    if (!this.instrument) return undefined;
    return getParam(this.instrument, key);
  }

  /**
   * Set all parameters at once (e.g., loading a patch).
   */
  setAllParams(params: ParamValues): void {
    for (const [key, value] of Object.entries(params)) {
      this.setParam(key, value);
    }
  }

  /**
   * Trigger a note on.
   */
  noteOn(note: string, velocity = 0.8): void {
    if (!this.instrument) return;
    this.activeNotes.add(note);

    if ("triggerAttack" in this.instrument) {
      this.instrument.triggerAttack(note, Tone.now(), velocity);
    }
  }

  /**
   * Trigger a note off.
   */
  noteOff(note: string): void {
    if (!this.instrument) return;
    this.activeNotes.delete(note);

    if ("triggerRelease" in this.instrument) {
      this.instrument.triggerRelease(Tone.now());
    }
  }

  /**
   * Trigger attack + release for a short note.
   */
  playNote(note: string, duration = "8n", velocity = 0.8): void {
    if (!this.instrument) return;

    if ("triggerAttackRelease" in this.instrument) {
      this.instrument.triggerAttackRelease(note, duration, Tone.now(), velocity);
    }
  }

  /**
   * Get waveform data for visualization.
   */
  getWaveform(): Float32Array {
    if (!this.analyser) return new Float32Array(1024);
    return this.analyser.getValue() as Float32Array;
  }

  /**
   * Get FFT data for spectrum visualization.
   */
  getSpectrum(): Float32Array {
    if (!this.fftAnalyser) return new Float32Array(1024);
    return this.fftAnalyser.getValue() as Float32Array;
  }

  /**
   * Release all active notes.
   */
  panic(): void {
    for (const note of this.activeNotes) {
      this.noteOff(note);
    }
    this.activeNotes.clear();
  }

  /**
   * Clean up all Tone.js resources.
   */
  dispose(): void {
    this.panic();
    this.instrument?.dispose();
    this.analyser?.dispose();
    this.fftAnalyser?.dispose();
    this.instrument = null;
    this.analyser = null;
    this.fftAnalyser = null;
    this._params = {};
  }
}
