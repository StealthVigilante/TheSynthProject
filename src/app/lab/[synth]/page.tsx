import { AudioProvider } from "@/providers/audio-provider";
import { OsciMono } from "@/components/synths/osci-mono";
import { OsciSub } from "@/components/synths/osci-sub";
import { OsciFM } from "@/components/synths/osci-fm";
import { OsciMod } from "@/components/synths/osci-mod";
import { OsciWave } from "@/components/synths/osci-wave";

const SYNTHS: Record<string, React.ComponentType> = {
  mono: OsciMono,
  sub: OsciSub,
  fm: OsciFM,
  mod: OsciMod,
  wave: OsciWave,
};

export default async function LabSynthPage({
  params,
}: {
  params: Promise<{ synth: string }>;
}) {
  const { synth } = await params;
  const SynthComponent = SYNTHS[synth];
  if (!SynthComponent) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Unknown synth: {synth}. Try: mono, sub, fm, mod, wave
      </div>
    );
  }
  return (
    <AudioProvider>
      <SynthComponent />
    </AudioProvider>
  );
}
