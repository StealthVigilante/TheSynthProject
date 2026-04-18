"use client";

import { useMemo, useState } from "react";
import { Knob } from "./knob";
import { Fader } from "./fader";
import { WaveformSelect } from "./waveform-select";
import { WaveformDisplay } from "./waveform-display";
import { SpectrumDisplay } from "./spectrum-display";
import { PianoKeyboard } from "./piano-keyboard";
import { getParamDefs, groupParamDefs, type ParamValues, type EngineType } from "@/lib/synth-engine";
import { useKeyboard } from "@/hooks/use-keyboard";
import { Separator } from "@/components/ui/separator";
import { useAudioContext } from "@/providers/audio-provider";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";

interface SynthPanelProps {
  engineType: EngineType;
  params: ParamValues;
  onParamChange: (key: string, value: number | string) => void;
  onNoteOn: (note: string, velocity: number) => void;
  onNoteOff: (note: string) => void;
  getWaveform: () => Float32Array;
  getSpectrum: () => Float32Array;
  unlockedParams?: string[] | null;
  isReady: boolean;
}

export function SynthPanel({
  engineType,
  params,
  onParamChange,
  onNoteOn,
  onNoteOff,
  getWaveform,
  getSpectrum,
  unlockedParams,
  isReady,
}: SynthPanelProps) {
  const [activeNotes] = useState(() => new Set<string>());
  const { isStarted, startAudio } = useAudioContext();

  const paramDefs = useMemo(() => getParamDefs(engineType), [engineType]);
  const paramGroups = useMemo(() => groupParamDefs(paramDefs), [paramDefs]);

  const handleNoteOn = (note: string, velocity: number) => {
    activeNotes.add(note);
    onNoteOn(note, velocity);
  };

  const handleNoteOff = (note: string) => {
    activeNotes.delete(note);
    onNoteOff(note);
  };

  useKeyboard({
    onNoteOn: handleNoteOn,
    onNoteOff: handleNoteOff,
    enabled: isReady,
  });

  const isParamLocked = (key: string): boolean => {
    if (!unlockedParams) return false;
    return !unlockedParams.includes(key);
  };

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-12">
        <Volume2 className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center">
          Click to enable audio and start playing
        </p>
        <Button onClick={startAudio} size="lg">
          Enable Audio
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Visualizers */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="mb-1 block text-xs text-muted-foreground">Waveform</span>
          <WaveformDisplay getData={getWaveform} height={80} />
        </div>
        <div>
          <span className="mb-1 block text-xs text-muted-foreground">Spectrum</span>
          <SpectrumDisplay getData={getSpectrum} height={80} />
        </div>
      </div>

      <Separator />

      {/* Parameter groups */}
      <div className="space-y-4">
        {Array.from(paramGroups.entries()).map(([group, defs]) => (
          <div key={group}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {group}
            </h3>
            <div className="flex flex-wrap items-end gap-4">
              {defs.map((def) => {
                const locked = isParamLocked(def.key);
                const currentValue = params[def.key] ?? def.defaultValue;

                if (def.type === "select" && def.options) {
                  return (
                    <WaveformSelect
                      key={def.key}
                      value={String(currentValue)}
                      options={def.options}
                      onChange={(v) => onParamChange(def.key, v)}
                      label={def.label}
                      disabled={locked}
                    />
                  );
                }

                if (def.type === "fader") {
                  return (
                    <Fader
                      key={def.key}
                      value={Number(currentValue)}
                      min={def.min}
                      max={def.max}
                      step={def.step}
                      label={def.label}
                      unit={def.unit}
                      onChange={(v) => onParamChange(def.key, v)}
                      locked={locked}
                    />
                  );
                }

                return (
                  <Knob
                    key={def.key}
                    value={Number(currentValue)}
                    min={def.min}
                    max={def.max}
                    step={def.step}
                    label={def.label}
                    unit={def.unit}
                    onChange={(v) => onParamChange(def.key, v)}
                    locked={locked}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Keyboard */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Play with your QWERTY keyboard or click the keys below
          </span>
        </div>
        <PianoKeyboard
          onNoteOn={handleNoteOn}
          onNoteOff={handleNoteOff}
          activeNotes={activeNotes}
          startOctave={3}
          octaves={3}
        />
      </div>
    </div>
  );
}
