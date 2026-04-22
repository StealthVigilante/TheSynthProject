import { getAudioContext, noteNameToFreq, buildReverb } from "../audio-ctx";

export class Synth2Engine {
  private ctx: AudioContext;
  private osc: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private oscGain: GainNode;
  private subGain: GainNode;
  private envGain: GainNode;
  private filter: BiquadFilterNode;
  private master: GainNode;
  private reverbSend: GainNode;
  private reverb: { input: GainNode; output: GainNode };
  private delayNode: DelayNode;
  private delayFeedback: GainNode;
  private delaySend: GainNode;
  private analyser: AnalyserNode;
  private compressor: DynamicsCompressorNode;
  private masterGain: GainNode;
  private buf: Float32Array;
  private fftBuf: Float32Array;

  waveform: OscillatorType = "sawtooth";
  subEnabled = false;
  cutoff = 3000;
  resonance = 1;
  attack = 0.05;
  sustainOn = true;
  release = 0.6;
  reverbOn = false;
  delayAmount = 0;

  private currentNote: string | null = null;

  constructor() {
    this.ctx = getAudioContext();

    this.oscGain = this.ctx.createGain();
    this.oscGain.gain.value = 0.8;

    this.subGain = this.ctx.createGain();
    this.subGain.gain.value = 0;

    this.envGain = this.ctx.createGain();
    this.envGain.gain.value = 0;

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = this.cutoff;
    this.filter.Q.value = this.resonance;

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;

    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = 0;
    this.reverb = buildReverb(this.ctx);

    this.delayNode = this.ctx.createDelay(1);
    this.delayNode.delayTime.value = 0.25;
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.35;
    this.delaySend = this.ctx.createGain();
    this.delaySend.gain.value = 0;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.buf = new Float32Array(this.analyser.fftSize);
    this.fftBuf = new Float32Array(this.analyser.frequencyBinCount);

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;

    // Wire
    this.oscGain.connect(this.envGain);
    this.subGain.connect(this.envGain);
    this.envGain.connect(this.filter);
    this.filter.connect(this.master);

    // Reverb send
    this.filter.connect(this.reverbSend);
    this.reverbSend.connect(this.reverb.input);
    this.reverb.output.connect(this.master);

    // Delay send with feedback loop
    this.filter.connect(this.delaySend);
    this.delaySend.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.master);

    this.master.connect(this.analyser);
    this.analyser.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  noteOn(note: string, velocity = 0.8): void {
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.osc?.stop();
    this.osc?.disconnect();
    this.osc = null;
    this.subOsc?.stop();
    this.subOsc?.disconnect();
    this.subOsc = null;

    const freq = noteNameToFreq(note);

    const osc = this.ctx.createOscillator();
    osc.type = this.waveform;
    osc.frequency.value = freq;
    osc.connect(this.oscGain);
    osc.start();
    this.osc = osc;

    if (this.subEnabled) {
      const sub = this.ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.value = freq / 2;
      sub.connect(this.subGain);
      sub.start();
      this.subOsc = sub;
      this.subGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.01);
    }

    this.currentNote = note;
    const now = this.ctx.currentTime;
    this.envGain.gain.cancelScheduledValues(now);
    this.envGain.gain.setValueAtTime(0, now);
    this.envGain.gain.linearRampToValueAtTime(velocity, now + this.attack);
    if (!this.sustainOn) {
      this.envGain.gain.linearRampToValueAtTime(0, now + this.attack + this.release);
    }
  }

  noteOff(note: string): void {
    if (note !== this.currentNote) return;
    const now = this.ctx.currentTime;
    this.envGain.gain.cancelAndHoldAtTime(now);
    this.envGain.gain.linearRampToValueAtTime(0, now + this.release);
    const stopAt = now + this.release + 0.05;
    this.osc?.stop(stopAt);
    this.osc?.disconnect();
    this.osc = null;
    this.subOsc?.stop(stopAt);
    this.subOsc?.disconnect();
    this.subOsc = null;
  }

  setWaveform(t: OscillatorType): void {
    this.waveform = t;
    if (this.osc) this.osc.type = t;
  }

  setSubEnabled(on: boolean): void {
    this.subEnabled = on;
    this.subGain.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.02);
  }

  setCutoff(hz: number): void {
    this.cutoff = hz;
    this.filter.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.01);
  }

  setResonance(q: number): void {
    this.resonance = q;
    this.filter.Q.setTargetAtTime(q, this.ctx.currentTime, 0.01);
  }

  setAttack(s: number): void { this.attack = s; }
  setSustain(on: boolean): void { this.sustainOn = on; }
  setRelease(s: number): void { this.release = s; }

  setReverb(on: boolean): void {
    this.reverbOn = on;
    const now = this.ctx.currentTime;
    this.reverbSend.gain.setTargetAtTime(on ? 0.5 : 0, now, 0.02);
    this.master.gain.setTargetAtTime(on ? 0.7 : 0.8, now, 0.02);
  }

  setDelay(amount: number): void {
    this.delayAmount = amount;
    this.delaySend.gain.setTargetAtTime(amount * 0.6, this.ctx.currentTime, 0.02);
  }

  setVolume(v: number): void {
    this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01);
  }

  getWaveform(): Float32Array {
    this.analyser.getFloatTimeDomainData(this.buf as any);
    return this.buf;
  }

  getFFT(): Float32Array {
    this.analyser.getFloatFrequencyData(this.fftBuf as any);
    return this.fftBuf;
  }

  get sampleRate(): number { return this.ctx.sampleRate; }
  get fftSize(): number { return this.analyser.fftSize; }

  dispose(): void {
    this.osc?.stop();
    this.osc?.disconnect();
    this.subOsc?.stop();
    this.subOsc?.disconnect();
    this.oscGain.disconnect();
    this.subGain.disconnect();
    this.envGain.disconnect();
    this.filter.disconnect();
    this.master.disconnect();
    this.reverbSend.disconnect();
    this.reverb.input.disconnect();
    this.reverb.output.disconnect();
    this.delaySend.disconnect();
    this.delayNode.disconnect();
    this.delayFeedback.disconnect();
    this.analyser.disconnect();
    this.compressor.disconnect();
    this.masterGain.disconnect();
  }
}
