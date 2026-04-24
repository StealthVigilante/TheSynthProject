import { getAudioContext } from "../audio-ctx";

export class StarterProEngine {
  private ctx: AudioContext;
  private workletNode: AudioWorkletNode;
  private analyser: AnalyserNode;
  private compressor: DynamicsCompressorNode;
  private masterGain: GainNode;
  private convolver: ConvolverNode;
  private reverbWetGain: GainNode;

  private waveformBuf: Float32Array;
  private fftBuf: Float32Array;

  private constructor(
    ctx: AudioContext,
    workletNode: AudioWorkletNode,
    analyser: AnalyserNode,
    compressor: DynamicsCompressorNode,
    masterGain: GainNode,
    convolver: ConvolverNode,
    reverbWetGain: GainNode,
  ) {
    this.ctx          = ctx;
    this.workletNode  = workletNode;
    this.analyser     = analyser;
    this.compressor   = compressor;
    this.masterGain   = masterGain;
    this.convolver    = convolver;
    this.reverbWetGain = reverbWetGain;
    this.waveformBuf  = new Float32Array(analyser.fftSize);
    this.fftBuf       = new Float32Array(analyser.frequencyBinCount);
  }

  static async create(): Promise<StarterProEngine> {
    const ctx = getAudioContext();
    await ctx.audioWorklet.addModule('/worklets/starter-pro-processor.js');

    const workletNode = new AudioWorkletNode(ctx, 'starter-pro-processor');

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value      = 12;
    compressor.ratio.value     = 12;
    compressor.attack.value    = 0.003;
    compressor.release.value   = 0.25;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.8;

    // Main chain: workletNode → analyser → compressor → masterGain → destination
    workletNode.connect(analyser);
    analyser.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Reverb: parallel wet send off masterGain
    const convolver = ctx.createConvolver();
    convolver.buffer = StarterProEngine._buildIR(ctx);
    const reverbWetGain = ctx.createGain();
    reverbWetGain.gain.value = 0;
    masterGain.connect(reverbWetGain);
    reverbWetGain.connect(convolver);
    convolver.connect(ctx.destination);

    return new StarterProEngine(
      ctx, workletNode, analyser, compressor, masterGain, convolver, reverbWetGain,
    );
  }

  private static _buildIR(ctx: AudioContext, duration = 2.5, decay = 2.5): AudioBuffer {
    const sr  = ctx.sampleRate;
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

  private _param(key: string, value: number | string): void {
    this._send({ type: 'setParam', key, value });
  }

  // ── Note events ─────────────────────────────────────────────────────────────

  noteOn(note: string, velocity = 0.8): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    this._send({ type: 'noteOn', note, velocity });
  }

  noteOff(note: string): void {
    this._send({ type: 'noteOff', note });
  }

  // ── Parameters ──────────────────────────────────────────────────────────────

  setWaveform(t: OscillatorType): void { this._param('waveform', t); }
  setFilterFreq(hz: number): void      { this._param('filterFreq', hz); }
  setAttack(s: number): void           { this._param('attack', s); }
  setRelease(s: number): void          { this._param('release', s); }

  setReverb(on: boolean): void {
    this.reverbWetGain.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.02);
  }

  setVolume(v: number): void {
    this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01);
  }

  // ── Visualisation ────────────────────────────────────────────────────────────

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

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  dispose(): void {
    this.workletNode.disconnect();
    this.analyser.disconnect();
    this.compressor.disconnect();
    this.masterGain.disconnect();
    this.reverbWetGain.disconnect();
    this.convolver.disconnect();
  }
}
