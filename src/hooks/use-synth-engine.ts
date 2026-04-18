"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SynthEngine, type ParamValues, type SynthModelConfig } from "@/lib/synth-engine";
import { useAudioContext } from "@/providers/audio-provider";
import type { Json } from "@/lib/supabase/types";
import type { EngineType } from "@/lib/synth-engine";

interface UseSynthEngineOptions {
  engineType: string;
  engineConfig: Json;
  defaultParams: Json;
  allParams: string[];
}

export function useSynthEngine(options: UseSynthEngineOptions) {
  const engineRef = useRef<SynthEngine | null>(null);
  const [params, setParams] = useState<ParamValues>(
    (options.defaultParams ?? {}) as ParamValues
  );
  const [isReady, setIsReady] = useState(false);
  const { isStarted, startAudio } = useAudioContext();

  // Initialize engine
  useEffect(() => {
    const engine = new SynthEngine();
    engineRef.current = engine;

    if (isStarted) {
      engine.initFromDb(
        options.engineType,
        options.engineConfig,
        options.defaultParams,
        options.allParams
      );
      setParams(engine.params);
      setIsReady(true);
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
      setIsReady(false);
    };
  }, [isStarted, options.engineType, options.engineConfig, options.defaultParams, options.allParams]);

  const ensureAudio = useCallback(async () => {
    if (!isStarted) {
      await startAudio();
    }
  }, [isStarted, startAudio]);

  const setParam = useCallback(
    (key: string, value: number | string) => {
      engineRef.current?.setParam(key, value);
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const noteOn = useCallback(
    async (note: string, velocity = 0.8) => {
      await ensureAudio();
      // Re-init if engine was created before audio started
      if (engineRef.current && !engineRef.current.isLoaded && isStarted) {
        engineRef.current.initFromDb(
          options.engineType,
          options.engineConfig,
          options.defaultParams,
          options.allParams
        );
        setIsReady(true);
      }
      engineRef.current?.noteOn(note, velocity);
    },
    [ensureAudio, isStarted, options.engineType, options.engineConfig, options.defaultParams, options.allParams]
  );

  const noteOff = useCallback((note: string) => {
    engineRef.current?.noteOff(note);
  }, []);

  const playNote = useCallback(
    async (note: string, duration = "8n", velocity = 0.8) => {
      await ensureAudio();
      engineRef.current?.playNote(note, duration, velocity);
    },
    [ensureAudio]
  );

  const panic = useCallback(() => {
    engineRef.current?.panic();
  }, []);

  const getWaveform = useCallback(() => {
    return engineRef.current?.getWaveform() ?? new Float32Array(1024);
  }, []);

  const getSpectrum = useCallback(() => {
    return engineRef.current?.getSpectrum() ?? new Float32Array(1024);
  }, []);

  return {
    engine: engineRef.current,
    params,
    isReady,
    setParam,
    noteOn,
    noteOff,
    playNote,
    panic,
    getWaveform,
    getSpectrum,
  };
}
