"use client";

import { useEffect, useState } from "react";
import { AudioProvider } from "@/providers/audio-provider";
import { ThemedSynthPanel } from "@/components/synths/themed-synth-panel";
import { useSynthEngine } from "@/hooks/use-synth-engine";
import type { EngineType } from "@/lib/synth-engine";
import type { Json } from "@/lib/supabase/types";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface SynthPageClientProps {
  synth: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    engineType: string;
    engineConfig: Json;
    defaultParams: Json;
    allParams: string[];
  };
  unlockedParams?: string[] | null;
  paramLessonMap: Record<string, string>;
}

function RotatePrompt() {
  return (
    <div style={{
      minHeight: 300,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 32,
      textAlign: "center",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      background: "var(--card)",
    }}>
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}>
        <rect x="8" y="14" width="20" height="32" rx="3" />
        <path d="M32 8l6 6-6 6M38 14H28" />
      </svg>
      <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 240 }}>
        Rotate to landscape to play this synth.
      </p>
    </div>
  );
}

function SynthPageInner({ synth, unlockedParams, paramLessonMap }: SynthPageClientProps) {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const check = () =>
      setIsPortrait(window.innerWidth < window.innerHeight && window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  const { params, isReady, setParam, noteOn, noteOff } = useSynthEngine({
    engineType: synth.engineType,
    engineConfig: synth.engineConfig,
    defaultParams: synth.defaultParams,
    allParams: synth.allParams,
  });

  return (
    <div className="space-y-4">
      <Link
        href="/collection"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Collection
      </Link>

      {isPortrait ? (
        <RotatePrompt />
      ) : (
        <ThemedSynthPanel
          engineType={synth.engineType as EngineType}
          params={params}
          onParamChange={setParam}
          onNoteOn={noteOn}
          onNoteOff={noteOff}
          unlockedParams={unlockedParams}
          paramLessonMap={paramLessonMap}
          isReady={isReady}
          synthName={synth.name}
        />
      )}
    </div>
  );
}

export function SynthPageClient({ synth, unlockedParams, paramLessonMap }: SynthPageClientProps) {
  return (
    <AudioProvider>
      <SynthPageInner synth={synth} unlockedParams={unlockedParams} paramLessonMap={paramLessonMap} />
    </AudioProvider>
  );
}
