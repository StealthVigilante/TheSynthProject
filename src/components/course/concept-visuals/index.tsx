"use client";
import type { ConceptVisualKey } from "@/lib/course/types";
import { VibratingString } from "./vibrating-string";
import { AmplitudeVsFrequency } from "./amplitude-vs-frequency";
import { WaveformMorph } from "./waveform-morph";
import { OctaveKeyboard } from "./octave-keyboard";
import { EnvelopeShape } from "./envelope-shape";
import { FilterSweep } from "./filter-sweep";

export function ConceptVisual({ visual }: { visual: ConceptVisualKey }) {
  switch (visual) {
    case "vibrating-string": return <VibratingString />;
    case "amplitude-vs-frequency": return <AmplitudeVsFrequency />;
    case "waveform-morph": return <WaveformMorph />;
    case "octave-keyboard": return <OctaveKeyboard />;
    case "envelope-shape": return <EnvelopeShape />;
    case "filter-sweep": return <FilterSweep />;
  }
}
