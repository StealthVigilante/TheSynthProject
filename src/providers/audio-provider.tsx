"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface AudioContextValue {
  isStarted: boolean;
  startAudio: () => Promise<void>;
}

const AudioContext = createContext<AudioContextValue>({
  isStarted: false,
  startAudio: async () => {},
});

export function AudioProvider({ children }: { children: ReactNode }) {
  const [isStarted, setIsStarted] = useState(false);
  const startingRef = useRef(false);

  const startAudio = useCallback(async () => {
    if (isStarted || startingRef.current) return;
    startingRef.current = true;

    try {
      const Tone = await import("tone");
      await Tone.start();
      setIsStarted(true);
    } catch (err) {
      console.error("Failed to start audio context:", err);
    } finally {
      startingRef.current = false;
    }
  }, [isStarted]);

  return (
    <AudioContext value={{ isStarted, startAudio }}>
      {children}
    </AudioContext>
  );
}

export function useAudioContext() {
  return useContext(AudioContext);
}
