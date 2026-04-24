import { getAudioContext } from "../audio-ctx";

export class ClassicProEngine {
  private ctx: AudioContext;
  private workletNode: AudioWorkletNode;
  private analyser: AnalyserNode;
  private compressor: DynamicsCompressorNode;
  private masterGain: GainNode;
  private convolver: ConvolverNode;
  private reverbWetGain: GainNode;
  private delayNode: DelayNode;
  private delayFeedback: GainNode;
  private delayWetGain: GainNode;

  private waveformBuf: Float32Array;
  private fftBuf: Float32Array;

  // Mirrored locally for main-thread math (getFilterFreq, spectrum display)
  filterCutoff = 3000;
  private lfoEnabled = true;
  private lfoType: OscillatorType = "sine";
  private lfoRate = 4;
  private lfoDepth = 30;
  private lfoRoute: "pitch" | "filter" = "pitch";
  private lfoStartTime = 0;

  reverbEnabled = false;
  reverbAmount = 0.3;
  delayEnabled = false;
  delayAmount = 0.3;

  private constructor(
    ctx: AudioContext,
    workletNode: AudioWorkletNode,
    analyser: AnalyserNode,
    compressor: DynamicsCompressorNode,
    masterGain: GainNode,
    convolver: ConvolverNode,
    reverbWetGain: GainNode,
    delayNode: DelayNode,
    delayFeedback: GainNode,
    delayWetGain: GainNode,
  ) {
    this.ctx = ctx;
    this.workletNode = workletNode;
    this.analyser = analyser;
    this.compressor = compressor;
    this.masterGain = masterGain;
    this.convolver = convolver;
    this.reverbWetGain = reverbWetGain;
    this.delayNode = delayNode;
    this.delayFeedback = delayFeedback;
    this.delayWetGain = delayWetGain;
    this.waveformBuf = new Float32Array(analyser.fftSize);
    this.fftBuf = new Float32Array(analyser.frequencyBinCount);
    this.lfoStartTime = ctx.currentTime;
  }

  static async create(): Promise<ClassicProEngine> {
    const ctx = getAudioContext();
    await ctx.audioWorklet.addModule("/worklets/classic-pro-processor.js");

    const workletNode = new AudioWorkletNode(ctx, "classic-pro-processor");

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.8;

    // Main chain: worklet → analyser → compressor → masterGain → destination
    workletNode.connect(analyser);
    analyser.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Reverb: parallel wet send off masterGain
    const convolver = ctx.createConvolver();
    convolver.buffer = ClassicProEngine._buildIR(ctx);
    const reverbWetGain = ctx.createGain();
    reverbWetGain.gain.value = 0;
    masterGain.connect(reverbWetGain);
    reverbWetGain.connect(convolver);
    convolver.connect(ctx.destination);

    // Delay: parallel wet send with feedback loop
    const delayNode = ctx.createDelay(2.0);
    delayNode.delayTime.value = 0.375;
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.4;
    const delayWetGain = ctx.createGain();
    delayWetGain.gain.value = 0;
    masterGain.connect(delayNode);
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(delayWetGain);
    delayWetGain.connect(ctx.destination);

    return new ClassicProEngine(
      ctx, workletNode, analyser, compressor, masterGain,
      convolver, reverbWetGain, delayNode, delayFeedback, delayWetGain,
    );
  }

  private static _buildIR(ctx: AudioContext, duration = 2.5, decay = 2.5): AudioBuffer {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const buf = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  private _send(msg: Record<string, unknown>): void {
    this.workletNode.port.postMessage(msg);
  }

  private _param(key: string, value: number | string | boolean): void {
    this._send({ type: "setParam", key, value });
  }

  // ── Note events ───────────────────────────────────────────────────────────

  noteOn(note: string, velocity = 0.8): void {
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this._send({ type: "noteOn", note, velocity });
  }

  noteOff(note: string): void {
    this._send({ type: "noteOff", note });
  }

  // ── Oscillator ────────────────────────────────────────────────────────────

  setOsc1Type(t: OscillatorType): void { this._param("osc1Type", t); }
  setOsc2Type(t: OscillatorType): void { this._param("osc2Type", t); }
  setOsc2Detune(cents: number): void   { this._param("osc2Detune", cents); }
  setOscMix(mix: number): void         { this._param("oscMix", mix); }

  // ── Filter ────────────────────────────────────────────────────────────────

  setFilterType(t: BiquadFilterType): void { this._param("filterType", t); }

  setFilterCutoff(hz: number): void {
    this.filterCutoff = hz;
    this._param("filterCutoff", hz);
  }

  setFilterResonance(q: number): void { this._param("filterResonance", q); }

  // ── Amp ADSR ──────────────────────────────────────────────────────────────

  setAmpAttack(s: number): void  { this._param("ampAttack", s); }
  setAmpDecay(s: number): void   { this._param("ampDecay", s); }
  setAmpSustain(v: number): void { this._param("ampSustain", v); }
  setAmpRelease(s: number): void { this._param("ampRelease", s); }

  // ── Filter envelope ───────────────────────────────────────────────────────

  setFilterEnvEnabled(on: boolean): void  { this._param("filterEnvEnabled", on); }
  setFilterEnvAmount(hz: number): void    { this._param("filterEnvAmount", hz); }
  setFilterEnvAttack(s: number): void     { this._param("filterEnvAttack", s); }
  setFilterEnvDecay(s: number): void      { this._param("filterEnvDecay", s); }
  setFilterEnvSustain(v: number): void    { this._param("filterEnvSustain", v); }
  setFilterEnvRelease(s: number): void    { this._param("filterEnvRelease", s); }

  // ── LFO ───────────────────────────────────────────────────────────────────

  setLfoType(t: OscillatorType): void {
    this.lfoType = t;
    this._param("lfoType", t);
  }

  setLfoRate(hz: number): void {
    this.lfoRate = hz;
    this._param("lfoRate", hz);
  }

  setLfoDepth(depth: number): void {
    this.lfoDepth = depth;
    this._param("lfoDepth", depth);
  }

  setLfoRoute(route: "pitch" | "filter"): void {
    this.lfoRoute = route;
    this._param("lfoRoute", route);
  }

  setLfoEnabled(on: boolean): void {
    this.lfoEnabled = on;
    this._param("lfoEnabled", on);
  }

  // ── Poly ──────────────────────────────────────────────────────────────────

  setPolyEnabled(on: boolean): void {
    this._send({ type: "setPolyEnabled", value: on });
  }

  // ── Volume ────────────────────────────────────────────────────────────────

  setVolume(v: number): void {
    this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01);
  }

  // ── FX ────────────────────────────────────────────────────────────────────

  setReverbEnabled(on: boolean): void {
    this.reverbEnabled = on;
    this.reverbWetGain.gain.setTargetAtTime(on ? this.reverbAmount : 0, this.ctx.currentTime, 0.02);
  }

  setReverbAmount(amount: number): void {
    this.reverbAmount = amount;
    if (this.reverbEnabled) {
      this.reverbWetGain.gain.setTargetAtTime(amount, this.ctx.currentTime, 0.01);
    }
  }

  setDelayEnabled(on: boolean): void {
    this.delayEnabled = on;
    this.delayWetGain.gain.setTargetAtTime(on ? this.delayAmount : 0, this.ctx.currentTime, 0.02);
  }

  setDelayAmount(amount: number): void {
    this.delayAmount = amount;
    if (this.delayEnabled) {
      this.delayWetGain.gain.setTargetAtTime(amount, this.ctx.currentTime, 0.01);
    }
  }

  // ── Visualisation helpers ─────────────────────────────────────────────────

  getFilterFreq(): number {
    if (this.lfoEnabled && this.lfoRoute === "filter") {
      const t = this.ctx.currentTime - this.lfoStartTime;
      const phase = 2 * Math.PI * this.lfoRate * t;
      const lfoVal = this.lfoType === "square" ? Math.sign(Math.sin(phase)) : Math.sin(phase);
      return this.filterCutoff + lfoVal * this.lfoDepth * 20;
    }
    return this.filterCutoff;
  }

  getWaveform(): Float32Array {
    this.analyser.getFloatTimeDomainData(this.waveformBuf as unknown as Float32Array<ArrayBuffer>);
    return this.waveformBuf;
  }

  getFFT(): Float32Array {
    this.analyser.getFloatFrequencyData(this.fftBuf as unknown as Float32Array<ArrayBuffer>);
    return this.fftBuf;
  }

  get sampleRate(): number { return this.ctx.sampleRate; }
  get fftSize(): number    { return this.analyser.fftSize; }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  dispose(): void {
    this.workletNode.disconnect();
    this.analyser.disconnect();
    this.compressor.disconnect();
    this.masterGain.disconnect();
    this.reverbWetGain.disconnect();
    this.convolver.disconnect();
    this.delayNode.disconnect();
    this.delayFeedback.disconnect();
    this.delayWetGain.disconnect();
  }
}
