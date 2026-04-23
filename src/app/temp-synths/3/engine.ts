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
  private compressor: DynamicsCompressorNode;
  private masterGain: GainNode;
  private buf: Float32Array;
  private fftBuf: Float32Array;

  // LFO
  private lfo: OscillatorNode;
  private lfoDepthGain: GainNode;
  private lfoPitchGate: GainNode;  // → osc.detune
  private lfoFilterGate: GainNode; // → filter.frequency

  // Poly voice pool
  private readonly MAX_VOICES = 4;
  private polyVoices: Array<{
    osc1: OscillatorNode | null;
    osc2: OscillatorNode | null;
    osc1Mix: GainNode;
    osc2Mix: GainNode;
    ampEnv: GainNode;
    note: string | null;
    startTime: number;
  }> = [];

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
  lfoEnabled = true;
  filterEnvEnabled = true;
  polyEnabled = false;

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

    // Pre-create poly voice nodes; all ampEnv → filter
    for (let i = 0; i < this.MAX_VOICES; i++) {
      const osc1Mix = this.ctx.createGain();
      osc1Mix.gain.value = 1 - this.oscMix;
      const osc2Mix = this.ctx.createGain();
      osc2Mix.gain.value = this.oscMix;
      const ampEnv = this.ctx.createGain();
      ampEnv.gain.value = 0;
      osc1Mix.connect(ampEnv);
      osc2Mix.connect(ampEnv);
      ampEnv.connect(this.filter);
      this.polyVoices.push({ osc1: null, osc2: null, osc1Mix, osc2Mix, ampEnv, note: null, startTime: 0 });
    }

    // Main signal chain
    this.osc1Gain.connect(this.filter);
    this.osc2Gain.connect(this.filter);
    this.filter.connect(this.ampEnvGain);
    this.ampEnvGain.connect(this.master);
    this.master.connect(this.analyser);
    this.analyser.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  noteOn(note: string, velocity = 0.8): void {
    if (this.ctx.state === "suspended") void this.ctx.resume();
    if (this.polyEnabled) { this.polyNoteOn(note, velocity); return; }
    // Stop previous oscs cleanly
    try { this.osc1?.stop(); } catch { /* already stopped */ }
    this.osc1?.disconnect();
    try { this.osc2?.stop(); } catch { /* already stopped */ }
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
    if (this.filterEnvEnabled) {
      const base = this.filterCutoff;
      const peak = base + this.filterEnvAmount;
      const sus = base + this.filterEnvAmount * this.filterEnvSustain;
      this.filter.frequency.cancelScheduledValues(now);
      this.filter.frequency.setValueAtTime(base, now);
      this.filter.frequency.linearRampToValueAtTime(peak, now + this.filterEnvAttack);
      this.filter.frequency.linearRampToValueAtTime(sus, now + this.filterEnvAttack + this.filterEnvDecay);
    }
  }

  noteOff(_note: string): void {
    if (this.polyEnabled) { this.polyNoteOff(_note); return; }
    const now = this.ctx.currentTime;

    // Amp release
    this.ampEnvGain.gain.cancelAndHoldAtTime(now);
    this.ampEnvGain.gain.linearRampToValueAtTime(0, now + this.ampRelease);

    // Filter release
    if (this.filterEnvEnabled) {
      this.filter.frequency.cancelAndHoldAtTime(now);
      this.filter.frequency.linearRampToValueAtTime(this.filterCutoff, now + this.filterEnvRelease);
    }

    const stopAt = now + this.ampRelease + (this.filterEnvEnabled ? Math.max(0, this.filterEnvRelease - this.ampRelease) : 0) + 0.05;
    this.osc1?.stop(stopAt);
    this.osc2?.stop(stopAt);
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
    for (const v of this.polyVoices) {
      v.osc1Mix.gain.setTargetAtTime(1 - mix, this.ctx.currentTime, 0.01);
      v.osc2Mix.gain.setTargetAtTime(mix, this.ctx.currentTime, 0.01);
    }
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
      }
    } else {
      this.lfoPitchGate.gain.setTargetAtTime(0, now, 0.02);
      this.lfoFilterGate.gain.setTargetAtTime(1, now, 0.02);
    }
    // Update depth scaling
    this.setLfoDepth(this.lfoDepth);
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

  setVolume(v: number): void {
    this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01);
  }

  private polyNoteOn(note: string, velocity: number): void {
    const now = this.ctx.currentTime;
    const freq = noteNameToFreq(note);

    // Find free voice or steal oldest
    let voice = this.polyVoices.find(v => v.note === null);
    if (!voice) {
      voice = this.polyVoices.reduce((a, b) => a.startTime < b.startTime ? a : b);
      // Quick release on stolen voice
      voice.ampEnv.gain.cancelAndHoldAtTime(now);
      voice.ampEnv.gain.linearRampToValueAtTime(0, now + 0.02);
      try { voice.osc1?.stop(now + 0.02); } catch { /* ok */ }
      try { voice.osc2?.stop(now + 0.02); } catch { /* ok */ }
      voice.osc1 = null;
      voice.osc2 = null;
    }

    const osc1 = this.ctx.createOscillator();
    osc1.type = this.osc1Type;
    osc1.frequency.value = freq;
    osc1.connect(voice.osc1Mix);

    const osc2 = this.ctx.createOscillator();
    osc2.type = this.osc2Type;
    osc2.frequency.value = freq;
    osc2.detune.value = this.osc2Detune;
    osc2.connect(voice.osc2Mix);

    if (this.lfoEnabled && this.lfoRoute === "pitch") {
      this.lfoPitchGate.connect(osc1.detune);
      this.lfoPitchGate.connect(osc2.detune);
    }

    osc1.start(now);
    osc2.start(now);
    voice.osc1 = osc1;
    voice.osc2 = osc2;
    voice.note = note;
    voice.startTime = now;

    // Amp envelope
    voice.ampEnv.gain.cancelScheduledValues(now);
    voice.ampEnv.gain.setValueAtTime(0, now);
    voice.ampEnv.gain.linearRampToValueAtTime(velocity, now + this.ampAttack);
    voice.ampEnv.gain.linearRampToValueAtTime(velocity * this.ampSustain, now + this.ampAttack + this.ampDecay);

    // Filter envelope (shared — retrigger on each new note)
    if (this.filterEnvEnabled) {
      const base = this.filterCutoff;
      const peak = base + this.filterEnvAmount;
      const sus = base + this.filterEnvAmount * this.filterEnvSustain;
      this.filter.frequency.cancelScheduledValues(now);
      this.filter.frequency.setValueAtTime(base, now);
      this.filter.frequency.linearRampToValueAtTime(peak, now + this.filterEnvAttack);
      this.filter.frequency.linearRampToValueAtTime(sus, now + this.filterEnvAttack + this.filterEnvDecay);
    }
  }

  private polyNoteOff(note: string): void {
    const voice = this.polyVoices.find(v => v.note === note);
    if (!voice) return;
    const now = this.ctx.currentTime;

    voice.ampEnv.gain.cancelAndHoldAtTime(now);
    voice.ampEnv.gain.linearRampToValueAtTime(0, now + this.ampRelease);

    if (this.filterEnvEnabled) {
      this.filter.frequency.cancelAndHoldAtTime(now);
      this.filter.frequency.linearRampToValueAtTime(this.filterCutoff, now + this.filterEnvRelease);
    }

    const stopAt = now + this.ampRelease + 0.05;
    try { voice.osc1?.stop(stopAt); } catch { /* ok */ }
    try { voice.osc2?.stop(stopAt); } catch { /* ok */ }
    voice.osc1 = null;
    voice.osc2 = null;
    voice.note = null;
  }

  getFilterFreq(): number {
    return this.filter.frequency.value;
  }

  setLfoEnabled(on: boolean): void {
    this.lfoEnabled = on;
    if (on) {
      this.setLfoDepth(this.lfoDepth);
      const now = this.ctx.currentTime;
      this.lfoPitchGate.gain.setTargetAtTime(this.lfoRoute === "pitch" ? 1 : 0, now, 0.02);
      this.lfoFilterGate.gain.setTargetAtTime(this.lfoRoute === "filter" ? 1 : 0, now, 0.02);
    } else {
      this.lfoDepthGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    }
  }

  setFilterEnvEnabled(on: boolean): void {
    this.filterEnvEnabled = on;
    if (!on) {
      const now = this.ctx.currentTime;
      this.filter.frequency.cancelScheduledValues(now);
      this.filter.frequency.setTargetAtTime(this.filterCutoff, now, 0.01);
    }
  }

  setPolyEnabled(on: boolean): void {
    this.polyEnabled = on;
    if (!on) {
      const now = this.ctx.currentTime;
      for (const v of this.polyVoices) {
        if (v.note === null) continue;
        v.ampEnv.gain.cancelAndHoldAtTime(now);
        v.ampEnv.gain.linearRampToValueAtTime(0, now + 0.05);
        try { v.osc1?.stop(now + 0.05); } catch { /* ok */ }
        try { v.osc2?.stop(now + 0.05); } catch { /* ok */ }
        v.osc1 = null;
        v.osc2 = null;
        v.note = null;
      }
    }
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
    this.compressor.disconnect();
    this.masterGain.disconnect();
    for (const v of this.polyVoices) {
      try { v.osc1?.stop(); } catch { /* ok */ }
      v.osc1?.disconnect();
      try { v.osc2?.stop(); } catch { /* ok */ }
      v.osc2?.disconnect();
      v.osc1Mix.disconnect();
      v.osc2Mix.disconnect();
      v.ampEnv.disconnect();
    }
  }
}
