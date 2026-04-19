// src/app/temp-synths/audio-ctx.ts
let _ctx: AudioContext | null = null;

/**
 * Returns the shared AudioContext. Must be called from inside a user-gesture
 * event handler (e.g. noteOn). Calling before a gesture creates the context in
 * a suspended state — audio will not play until the user interacts.
 */
export function getAudioContext(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === "suspended") void _ctx.resume();
  return _ctx;
}

export function noteNameToFreq(note: string): number {
  const MAP: Record<string, number> = {
    C: 0, "C#": 1, D: 2, "D#": 3, E: 4,
    F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
  };
  const m = note.match(/^([A-G]#?)(\d+)$/);
  if (!m) return 440;
  return 440 * Math.pow(2, (parseInt(m[2]) - 4) + (MAP[m[1]] - 9) / 12);
}

export function buildReverb(ctx: AudioContext): { input: GainNode; output: GainNode } {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const times = [0.029, 0.037, 0.041, 0.043];
  const gains = [0.85, 0.83, 0.81, 0.79];
  times.forEach((t, i) => {
    const d = ctx.createDelay(1);
    d.delayTime.value = t;
    const fb = ctx.createGain();
    fb.gain.value = gains[i];
    input.connect(d);
    d.connect(fb);
    fb.connect(d);
    fb.connect(output);
  });
  return { input, output };
}
