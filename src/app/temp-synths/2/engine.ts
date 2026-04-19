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
  private buf: Float32Array;

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
    this.analyser.fftSize = 1024;
    this.buf = new Float32Array(this.analyser.fftSize);

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
    this.analyser.connect(this.ctx.destination);
  }

  noteOn(note: string, velocity = 0.8): void {
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.osc?.stop();
    this.osc?.disconnect();
    this.subOsc?.stop();
    this.subOsc?.disconnect();

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
      this.subGain.gain.value = 0.5;
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
    const held = this.envGain.gain.value;
    this.envGain.gain.cancelScheduledValues(now);
    this.envGain.gain.setValueAtTime(held, now);
    this.envGain.gain.linearRampToValueAtTime(0, now + this.release);
    const stopAt = now + this.release + 0.05;
    this.osc?.stop(stopAt);
    this.subOsc?.stop(stopAt);
    // Keep references for cleanup on next noteOn
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

  getWaveform(): Float32Array {
    this.analyser.getFloatTimeDomainData(this.buf);
    return this.buf;
  }

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
  }
}
