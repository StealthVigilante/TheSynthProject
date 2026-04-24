'use strict';

const IDLE = 0, ATTACK = 1, HOLD = 2, RELEASE = 3;
const TWO_PI = 6.283185307179586;
const PI = 3.141592653589793;
const SVF_K = Math.SQRT2; // Q = 0.7071 — Butterworth, no resonance peak

const PARAM_KEYS = new Set(['waveform', 'filterFreq', 'attack', 'release']);

function noteToFreq(note) {
  const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const m = note.match(/^([A-G]#?)(\d+)$/);
  if (!m) return 440;
  return 440 * Math.pow(2, (NAMES.indexOf(m[1]) - 9 + (parseInt(m[2], 10) - 4) * 12) / 12);
}

function envCoeff(t, sr) {
  return t <= 0 ? 1.0 : 1.0 - Math.exp(-1.0 / (t * sr));
}

function polyBlep(phase, inc) {
  if (phase < inc) {
    const t = phase / inc;
    return t + t - t * t - 1.0;
  }
  if (phase > 1.0 - inc) {
    const t = (phase - 1.0) / inc;
    return t * t + t + t + 1.0;
  }
  return 0.0;
}

function oscNext(osc, inc) {
  const p = osc.phase;
  let s;
  if (osc.type === 'sine') {
    s = Math.sin(TWO_PI * p);
  } else if (osc.type === 'square') {
    s = (p < 0.5 ? 1.0 : -1.0) + polyBlep(p, inc) - polyBlep((p + 0.5) % 1.0, inc);
  } else if (osc.type === 'triangle') {
    const sq = (p < 0.5 ? 1.0 : -1.0) + polyBlep(p, inc) - polyBlep((p + 0.5) % 1.0, inc);
    osc.tri += 4.0 * inc * (sq - osc.tri);
    s = osc.tri;
  } else {
    s = p * 2.0 - 1.0 - polyBlep(p, inc); // sawtooth
  }
  osc.phase = (p + inc) % 1.0;
  return s;
}

class StarterProProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.voice = {
      osc: { phase: 0.0, tri: 0.0, type: 'sawtooth' },
      env: { state: IDLE, value: 0.0, coeff: 0.0, target: 0.0 },
      freq: 440.0,
    };

    this.waveform  = 'sawtooth';
    this.filterFreq = 3000;
    this.attack    = 0.05;
    this.release   = 0.5;

    this.svfIc1 = 0.0;
    this.svfIc2 = 0.0;
    this.svfA1  = 0.0;
    this.svfA2  = 0.0;
    this.svfA3  = 0.0;
    this.svfDirty   = true;
    this._prevCutoff = -1;

    this.msgQueue = [];
    this.port.onmessage = (e) => this.msgQueue.push(e.data);
  }

  _computeSvf(cutoff) {
    const fc = Math.max(20, Math.min(cutoff, sampleRate * 0.49));
    const g  = Math.tan(PI * fc / sampleRate);
    const a1 = 1.0 / (1.0 + g * (g + SVF_K));
    this.svfA1 = a1;
    this.svfA2 = g * a1;
    this.svfA3 = g * this.svfA2;
  }

  _svfLowpass(x) {
    const v3 = x - this.svfIc2;
    const v1 = this.svfA1 * this.svfIc1 + this.svfA2 * v3;
    const v2 = this.svfIc2 + this.svfA2 * this.svfIc1 + this.svfA3 * v3;
    this.svfIc1 = 2.0 * v1 - this.svfIc1;
    this.svfIc2 = 2.0 * v2 - this.svfIc2;
    return v2;
  }

  _handleMsg(m) {
    if (m.type === 'noteOn') {
      this.voice.freq       = noteToFreq(m.note);
      this.voice.osc.phase  = 0.0;
      this.voice.osc.tri    = 0.0;
      this.voice.osc.type   = this.waveform;
      const env = this.voice.env;
      env.state  = ATTACK;
      env.value  = 0.0;
      env.target = 1.0001;
      env.coeff  = envCoeff(this.attack, sampleRate);
      return;
    }
    if (m.type === 'noteOff') {
      const env = this.voice.env;
      if (env.state === ATTACK || env.state === HOLD) {
        env.state  = RELEASE;
        env.target = 0.00001;
        env.coeff  = envCoeff(this.release, sampleRate);
      }
      return;
    }
    if (m.type === 'setParam' && PARAM_KEYS.has(m.key)) {
      this[m.key] = m.value;
      if (m.key === 'filterFreq') {
        this.svfDirty    = true;
        this._prevCutoff = -1;
      }
      if (m.key === 'waveform') {
        this.voice.osc.type = m.value;
      }
    }
  }

  process(_inputs, outputs) {
    for (let qi = 0; qi < this.msgQueue.length; qi++) this._handleMsg(this.msgQueue[qi]);
    this.msgQueue.length = 0;

    const out0 = outputs[0];
    const L = out0[0];
    const R = out0.length > 1 ? out0[1] : out0[0];
    const n = L.length;

    for (let i = 0; i < n; i++) {
      const env = this.voice.env;

      if (env.state !== HOLD) {
        env.value += (env.target - env.value) * env.coeff;
      }

      if (env.state === ATTACK && env.value >= 1.0) {
        env.value = 1.0;
        env.state = HOLD;
      } else if (env.state === HOLD) {
        env.value = 1.0;
      } else if (env.state === RELEASE && env.value <= 0.0001) {
        env.value = 0.0;
        env.state = IDLE;
      }

      if (env.state === IDLE) {
        L[i] = 0.0;
        R[i] = 0.0;
        continue;
      }

      if (this.svfDirty || Math.abs(this.filterFreq - this._prevCutoff) > 0.5) {
        this._computeSvf(this.filterFreq);
        this._prevCutoff = this.filterFreq;
        this.svfDirty    = false;
      }

      const inc      = this.voice.freq / sampleRate;
      const raw      = oscNext(this.voice.osc, inc);
      const filtered = this._svfLowpass(raw);
      L[i] = filtered * env.value;
      R[i] = filtered * env.value;
    }

    return true;
  }
}

registerProcessor('starter-pro-processor', StarterProProcessor);
