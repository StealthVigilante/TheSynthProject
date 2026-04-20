// src/app/temp-synths/3/engine.ts
import { getAudioContext, noteNameToFreq } from "../audio-ctx";

export class Synth3Engine {
  private ctx: AudioContext;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private osc1Gain: GainNode;
  private osc2Gain: GainNode;
  private filter: BiquadFilterNode;
  private ampEnvGain: GainNode;
  private master: GainNode;
  private analyser: AnalyserNode;
  private buf: Float32Array;

  // LFO
  private lfo: OscillatorNode;
  private lfoDepthGain: GainNode;
  private lfoPitchGate: GainNode;  // → osc.detune
  private lfoFilterGate: GainNode; // → filter.frequency

  // Params
  osc1Type: OscillatorType = "sawtooth";
  osc2Type: OscillatorType = "sawtooth";
  osc2Detune = 7;
  oscMix = 0.5;

  filterType: BiquadFilterType = "lowpass";
  filterCutoff = 3000;
  filterResonance = 2;

  ampAttack = 0.05;
  ampDecay = 0.2;
  ampSustain = 0.7;
  ampRelease = 0.5;

  filterEnvAmount = 2000;
  filterEnvAttack = 0.1;
  filterEnvDecay = 0.3;
  filterEnvSustain = 0.3;
  filterEnvRelease = 0.4;

  lfoType: OscillatorType = "sine";
  lfoRate = 4;
  lfoDepth = 30;
  lfoRoute: "pitch" | "filter" = "pitch";

  private currentStopTime = 0;

  constructor() {
    this.ctx = getAudioContext();

    this.osc1Gain = this.ctx.createGain();
    this.osc1Gain.gain.value = 1 - this.oscMix;

    this.osc2Gain = this.ctx.createGain();
    this.osc2Gain.gain.value = this.oscMix;

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = this.filterType;
    this.filter.frequency.value = this.filterCutoff;
    this.filter.Q.value = this.filterResonance;

    this.ampEnvGain = this.ctx.createGain();
    this.ampEnvGain.gain.value = 0;

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.buf = new Float32Array(this.analyser.fftSize);

    // LFO setup
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = this.lfoType;
    this.lfo.frequency.value = this.lfoRate;

    this.lfoDepthGain = this.ctx.createGain();
    this.lfoDepthGain.gain.value = this.lfoDepth;

    this.lfoPitchGate = this.ctx.createGain();
    this.lfoPitchGate.gain.value = 1; // active (pitch route by default)

    this.lfoFilterGate = this.ctx.createGain();
    this.lfoFilterGate.gain.value = 0; // inactive

    this.lfo.connect(this.lfoDepthGain);
    this.lfoDepthGain.connect(this.lfoPitchGate);
    this.lfoDepthGain.connect(this.lfoFilterGate);
    this.lfoFilterGate.connect(this.filter.frequency);

    this.lfo.start();

    // Main signal chain
    this.osc1Gain.connect(this.filter);
    this.osc2Gain.connect(this.filter);
    this.filter.connect(this.ampEnvGain);
    this.ampEnvGain.connect(this.master);
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  noteOn(note: string, velocity = 0.8): void {
    if (this.ctx.state === "suspended") void this.ctx.resume();
    // Stop previous oscs cleanly
    this.osc1?.stop();
    this.osc1?.disconnect();
    this.osc2?.stop();
    this.osc2?.disconnect();

    const freq = noteNameToFreq(note);
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    osc1.type = this.osc1Type;
    osc1.frequency.value = freq;
    osc1.connect(this.osc1Gain);

    const osc2 = this.ctx.createOscillator();
    osc2.type = this.osc2Type;
    osc2.frequency.value = freq;
    osc2.detune.value = this.osc2Detune;
    osc2.connect(this.osc2Gain);

    // Connect LFO pitch gate to new oscs
    if (this.lfoRoute === "pitch") {
      try { this.lfoPitchGate.disconnect(); } catch { /* no prior connection */ }
      this.lfoPitchGate.connect(osc1.detune);
      this.lfoPitchGate.connect(osc2.detune);
    }

    osc1.start(now);
    osc2.start(now);
    this.osc1 = osc1;
    this.osc2 = osc2;

    // Amp envelope
    this.ampEnvGain.gain.cancelScheduledValues(now);
    this.ampEnvGain.gain.setValueAtTime(0, now);
    this.ampEnvGain.gain.linearRampToValueAtTime(velocity, now + this.ampAttack);
    this.ampEnvGain.gain.linearRampToValueAtTime(
      velocity * this.ampSustain,
      now + this.ampAttack + this.ampDecay
    );

    // Filter envelope
    const base = this.filterCutoff;
    const peak = base + this.filterEnvAmount;
    const sus = base + this.filterEnvAmount * this.filterEnvSustain;
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(base, now);
    this.filter.frequency.linearRampToValueAtTime(peak, now + this.filterEnvAttack);
    this.filter.frequency.linearRampToValueAtTime(sus, now + this.filterEnvAttack + this.filterEnvDecay);
  }

  noteOff(_note: string): void {
    const now = this.ctx.currentTime;

    // Amp release
    this.ampEnvGain.gain.cancelAndHoldAtTime(now);
    this.ampEnvGain.gain.linearRampToValueAtTime(0, now + this.ampRelease);

    // Filter release
    this.filter.frequency.cancelAndHoldAtTime(now);
    this.filter.frequency.linearRampToValueAtTime(this.filterCutoff, now + this.filterEnvRelease);

    const stopAt = now + Math.max(this.ampRelease, this.filterEnvRelease) + 0.05;
    this.currentStopTime = stopAt;
    this.osc1?.stop(stopAt);
    this.osc1?.disconnect();
    this.osc2?.stop(stopAt);
    this.osc2?.disconnect();
    this.osc1 = null;
    this.osc2 = null;
  }

  setOsc1Type(t: OscillatorType): void {
    this.osc1Type = t;
    if (this.osc1) this.osc1.type = t;
  }

  setOsc2Type(t: OscillatorType): void {
    this.osc2Type = t;
    if (this.osc2) this.osc2.type = t;
  }

  setOsc2Detune(cents: number): void {
    this.osc2Detune = cents;
    if (this.osc2) this.osc2.detune.setTargetAtTime(cents, this.ctx.currentTime, 0.01);
  }

  setOscMix(mix: number): void {
    this.oscMix = mix;
    this.osc1Gain.gain.setTargetAtTime(1 - mix, this.ctx.currentTime, 0.01);
    this.osc2Gain.gain.setTargetAtTime(mix, this.ctx.currentTime, 0.01);
  }

  setFilterType(t: BiquadFilterType): void {
    this.filterType = t;
    this.filter.type = t;
  }

  setFilterCutoff(hz: number): void {
    this.filterCutoff = hz;
    this.filter.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.01);
  }

  setFilterResonance(q: number): void {
    this.filterResonance = q;
    this.filter.Q.setTargetAtTime(q, this.ctx.currentTime, 0.01);
  }

  setAmpAttack(s: number): void { this.ampAttack = s; }
  setAmpDecay(s: number): void { this.ampDecay = s; }
  setAmpSustain(v: number): void { this.ampSustain = v; }
  setAmpRelease(s: number): void { this.ampRelease = s; }

  setFilterEnvAmount(hz: number): void { this.filterEnvAmount = hz; }
  setFilterEnvAttack(s: number): void { this.filterEnvAttack = s; }
  setFilterEnvDecay(s: number): void { this.filterEnvDecay = s; }
  setFilterEnvSustain(v: number): void { this.filterEnvSustain = v; }
  setFilterEnvRelease(s: number): void { this.filterEnvRelease = s; }

  setLfoType(t: OscillatorType): void {
    this.lfoType = t;
    this.lfo.type = t;
  }

  setLfoRate(hz: number): void {
    this.lfoRate = hz;
    this.lfo.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.01);
  }

  setLfoDepth(depth: number): void {
    this.lfoDepth = depth;
    // Scale: pitch → cents (0-200), filter → Hz (0-2000)
    const scale = this.lfoRoute === "pitch" ? 2 : 20;
    this.lfoDepthGain.gain.setTargetAtTime(depth * scale, this.ctx.currentTime, 0.01);
  }

  setLfoRoute(route: "pitch" | "filter"): void {
    this.lfoRoute = route;
    const now = this.ctx.currentTime;
    if (route === "pitch") {
      this.lfoFilterGate.gain.setTargetAtTime(0, now, 0.02);
      this.lfoPitchGate.gain.setTargetAtTime(1, now, 0.02);
      // Reconnect to current oscs if playing
      if (this.osc1 && this.osc2) {
        try { this.lfoPitchGate.disconnect(); } catch { /* ok */ }
        this.lfoPitchGate.connect(this.osc1.detune);
        this.lfoPitchGate.connect(this.osc2.detune);
        // Reconnect filter gate to filter (was disconnected)
        this.lfoFilterGate.connect(this.filter.frequency);
      }
    } else {
      this.lfoPitchGate.gain.setTargetAtTime(0, now, 0.02);
      this.lfoFilterGate.gain.setTargetAtTime(1, now, 0.02);
    }
    // Update depth scaling
    this.setLfoDepth(this.lfoDepth);
  }

  getWaveform(): Float32Array {
    this.analyser.getFloatTimeDomainData(this.buf);
    return this.buf;
  }

  dispose(): void {
    this.osc1?.stop();
    this.osc1?.disconnect();
    this.osc2?.stop();
    this.osc2?.disconnect();
    this.lfo.stop();
    this.lfo.disconnect();
    this.lfoDepthGain.disconnect();
    this.lfoPitchGate.disconnect();
    this.lfoFilterGate.disconnect();
    this.osc1Gain.disconnect();
    this.osc2Gain.disconnect();
    this.filter.disconnect();
    this.ampEnvGain.disconnect();
    this.master.disconnect();
    this.analyser.disconnect();
  }
}
