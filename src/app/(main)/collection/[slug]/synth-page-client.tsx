"use client";

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

function SynthPageInner({ synth, unlockedParams, paramLessonMap }: SynthPageClientProps) {
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
