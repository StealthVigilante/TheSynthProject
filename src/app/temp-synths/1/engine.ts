import { getAudioContext, noteNameToFreq, buildReverb } from "../audio-ctx";

export class Synth1Engine {
  private ctx: AudioContext;
  private osc: OscillatorNode | null = null;
  private envGain: GainNode;
  private filter: BiquadFilterNode;
  private dryGain: GainNode;
  private reverbWet: GainNode;
  private reverb: { input: GainNode; output: GainNode };
  private analyser: AnalyserNode;
  private buf: Float32Array;
  private fftBuf: Float32Array;

  waveform: OscillatorType = "sine";
  filterFreq = 4000;
  attack = 0.02;
  release = 0.5;
  reverbOn = false;

  constructor() {
    this.ctx = getAudioContext();

    this.envGain = this.ctx.createGain();
    this.envGain.gain.value = 0;

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = this.filterFreq;

    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 1;

    this.reverbWet = this.ctx.createGain();
    this.reverbWet.gain.value = 0;

    this.reverb = buildReverb(this.ctx);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.buf = new Float32Array(this.analyser.fftSize);
    this.fftBuf = new Float32Array(this.analyser.frequencyBinCount);

    // Wire up
    this.envGain.connect(this.filter);
    this.filter.connect(this.dryGain);
    this.filter.connect(this.reverbWet);
    this.dryGain.connect(this.analyser);
    this.reverbWet.connect(this.reverb.input);
    this.reverb.output.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  noteOn(note: string, velocity = 0.8): void {
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.osc?.stop();
    this.osc?.disconnect();
    const osc = this.ctx.createOscillator();
    osc.type = this.waveform;
    osc.frequency.value = noteNameToFreq(note);
    osc.connect(this.envGain);
    osc.start();
    this.osc = osc;

    const now = this.ctx.currentTime;
    this.envGain.gain.cancelScheduledValues(now);
    this.envGain.gain.setValueAtTime(0, now);
    this.envGain.gain.linearRampToValueAtTime(velocity, now + this.attack);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  noteOff(_: string): void {
    const now = this.ctx.currentTime;
    const held = this.envGain.gain.value;
    this.envGain.gain.cancelScheduledValues(now);
    this.envGain.gain.setValueAtTime(held, now);
    this.envGain.gain.linearRampToValueAtTime(0, now + this.release);
    this.osc?.stop(now + this.release + 0.05);
    // Keep reference so noteOn can disconnect the decaying oscillator
  }

  setWaveform(t: OscillatorType): void {
    this.waveform = t;
    if (this.osc) this.osc.type = t;
  }

  setFilterFreq(hz: number): void {
    this.filterFreq = hz;
    this.filter.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.01);
  }

  setAttack(s: number): void { this.attack = s; }
  setRelease(s: number): void { this.release = s; }

  setReverb(on: boolean): void {
    this.reverbOn = on;
    const now = this.ctx.currentTime;
    this.dryGain.gain.setTargetAtTime(on ? 0.65 : 1, now, 0.02);
    this.reverbWet.gain.setTargetAtTime(on ? 0.5 : 0, now, 0.02);
  }

  getWaveform(): Float32Array {
    this.analyser.getFloatTimeDomainData(this.buf);
    return this.buf;
  }

  getFFT(): Float32Array {
    this.analyser.getFloatFrequencyData(this.fftBuf);
    return this.fftBuf;
  }

  get sampleRate(): number {
    return this.ctx.sampleRate;
  }

  get fftSize(): number {
    return this.analyser.fftSize;
  }

  dispose(): void {
    this.osc?.stop();
    this.osc?.disconnect();
    this.envGain.disconnect();
    this.filter.disconnect();
    this.dryGain.disconnect();
    this.reverbWet.disconnect();
    this.reverb.input.disconnect();
    this.reverb.output.disconnect();
    this.analyser.disconnect();
  }
}
