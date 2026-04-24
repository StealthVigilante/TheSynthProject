'use strict';

const IDLE = 0, ATTACK = 1, DECAY = 2, SUSTAIN = 3, RELEASE = 4;
const TWO_PI = 6.283185307179586;
const PI = 3.141592653589793;

// Allowed param keys — guards against message-injection overwriting internals
const PARAM_KEYS = new Set([
  'osc1Type','osc2Type','osc2Detune','oscMix',
  'ampAttack','ampDecay','ampSustain','ampRelease',
  'filterType','filterCutoff','filterResonance',
  'filterEnvEnabled','filterEnvAmount',
  'filterEnvAttack','filterEnvDecay','filterEnvSustain','filterEnvRelease',
  'lfoEnabled','lfoType','lfoRate','lfoDepth','lfoRoute',
]);

// ── Helpers ────────────────────────────────────────────────────────────────

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
    s = (p < 0.5 ? 1.0 : -1.0)
      + polyBlep(p, inc)
      - polyBlep((p + 0.5) % 1.0, inc);
  } else if (osc.type === 'triangle') {
    const square = (p < 0.5 ? 1.0 : -1.0)
      + polyBlep(p, inc)
      - polyBlep((p + 0.5) % 1.0, inc);
    osc.tri += 4.0 * inc * (square - osc.tri);
    s = osc.tri;
  } else {
    s = p * 2.0 - 1.0 - polyBlep(p, inc);
  }
  osc.phase = (p + inc) % 1.0;
  return s;
}

function makeOsc(type) {
  return { phase: Math.random() * 0.1, type, tri: 0.0 };
}

function makeEnv() {
  return { state: IDLE, value: 0.0, coeff: 0.0, target: 0.0 };
}

function stepEnv(env, decayTime, sustainLevel, sr) {
  if (env.state === IDLE) return 0.0;
  env.value += (env.target - env.value) * env.coeff;
  if (env.state === ATTACK) {
    if (env.value >= 1.0) {
      env.value = 1.0;
      env.state = DECAY;
      env.coeff = envCoeff(decayTime, sr);
      env.target = Math.max(sustainLevel, 1e-5);
    }
  } else if (env.state === DECAY) {
    if (env.value <= sustainLevel + 1e-4) {
      env.value = sustainLevel;
      env.state = SUSTAIN;
      env.coeff = 1.0;
      env.target = sustainLevel;
    }
  } else if (env.state === SUSTAIN) {
    env.value = sustainLevel;
  } else if (env.state === RELEASE) {
    if (env.value <= 1e-4) {
      env.value = 0.0;
      env.state = IDLE;
    }
  }
  return env.value;
}

function makeVoice() {
  return {
    osc1: makeOsc('sawtooth'),
    osc2: makeOsc('sawtooth'),
    ampEnv: makeEnv(),
    note: null,
    freq: 440.0,
    startSample: 0,
  };
}

// ── Processor ──────────────────────────────────────────────────────────────

class ClassicProProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.voices = Array.from({ length: 4 }, makeVoice);
    this.sampleCount = 0;

    this.osc1Type = 'sawtooth';
    this.osc2Type = 'sawtooth';
    this.osc2Detune = 7;
    this.oscMix = 0.5;

    this.ampAttack = 0.05;
    this.ampDecay = 0.2;
    this.ampSustain = 0.7;
    this.ampRelease = 0.5;

    this.filterType = 'lowpass';
    this.filterCutoff = 3000;
    this.filterResonance = 2.0;
    this.svfIc1 = 0.0;
    this.svfIc2 = 0.0;
    this.svfA1 = 0.0;
    this.svfA2 = 0.0;
    this.svfA3 = 0.0;
    this.svfK = 0.0;
    this.svfDirty = true;
    this._prevCutoff = -1;

    this.filterEnvEnabled = true;
    this.filterEnvAmount = 2000;
    this.filterEnvAttack = 0.1;
    this.filterEnvDecay = 0.3;
    this.filterEnvSustain = 0.3;
    this.filterEnvRelease = 0.4;
    this.filterEnv = makeEnv();
    this.filterEnvValue = 0.0;

    this.lfoEnabled = true;
    this.lfoType = 'sine';
    this.lfoRate = 4.0;
    this.lfoDepth = 30.0;
    this.lfoRoute = 'pitch';
    this.lfoPhase = 0.0;
    this.lfoValue = 0.0;

    this.polyEnabled = false;

    this.msgQueue = [];
    this.port.onmessage = (e) => this.msgQueue.push(e.data);
  }

  _computeSvf(cutoff) {
    const fc = Math.max(20, Math.min(cutoff, sampleRate * 0.49));
    const g = Math.tan(PI * fc / sampleRate);
    const k = 1.0 / Math.max(0.1, this.filterResonance);
    this.svfA1 = 1.0 / (1.0 + g * (g + k));
    this.svfA2 = g * this.svfA1;
    this.svfA3 = g * this.svfA2;
    this.svfK = k;
  }

  _svf(x) {
    const v3 = x - this.svfIc2;
    const v1 = this.svfA1 * this.svfIc1 + this.svfA2 * v3;
    const v2 = this.svfIc2 + this.svfA2 * this.svfIc1 + this.svfA3 * v3;
    this.svfIc1 = 2.0 * v1 - this.svfIc1;
    this.svfIc2 = 2.0 * v2 - this.svfIc2;
    if (this.filterType === 'highpass') return x - this.svfK * v1 - v2;
    if (this.filterType === 'bandpass') return v1;
    return v2;
  }

  _noteOn(note) {
    const freq = noteToFreq(note);
    let v;
    if (!this.polyEnabled) {
      v = this.voices[0];
    } else {
      v = this.voices.find(x => x.note === null);
      if (!v) {
        v = this.voices.reduce((a, b) => a.startSample < b.startSample ? a : b);
      }
    }
    v.osc1.phase = Math.random() * 0.1;
    v.osc1.type  = this.osc1Type;
    v.osc1.tri   = 0.0;
    v.osc2.phase = Math.random() * 0.1;
    v.osc2.type  = this.osc2Type;
    v.osc2.tri   = 0.0;
    v.freq = freq;
    v.note = note;
    v.startSample = this.sampleCount;
    v.ampEnv.state = ATTACK;
    v.ampEnv.value = 0.0;
    v.ampEnv.coeff = envCoeff(this.ampAttack, sampleRate);
    v.ampEnv.target = 1.0001;

    if (this.filterEnvEnabled) {
      this.filterEnv.state = ATTACK;
      this.filterEnv.value = 0.0;
      this.filterEnv.coeff = envCoeff(this.filterEnvAttack, sampleRate);
      this.filterEnv.target = 1.0001;
    }
  }

  _noteOff(note) {
    for (const v of this.voices) {
      if (v.note !== note) continue;
      v.note = null;
      v.ampEnv.state = RELEASE;
      v.ampEnv.coeff = envCoeff(this.ampRelease, sampleRate);
      v.ampEnv.target = 1e-5;
    }
    if (!this.voices.some(v => v.note !== null) && this.filterEnvEnabled) {
      this.filterEnv.state = RELEASE;
      this.filterEnv.coeff = envCoeff(this.filterEnvRelease, sampleRate);
      this.filterEnv.target = 1e-5;
    }
  }

  _handleMsg(m) {
    if (m.type === 'noteOn') { this._noteOn(m.note); return; }
    if (m.type === 'noteOff') { this._noteOff(m.note); return; }
    if (m.type === 'setPolyEnabled') {
      this.polyEnabled = m.value;
      for (const v of this.voices) {
        v.note = null;
        v.ampEnv.state = IDLE;
        v.ampEnv.value = 0.0;
      }
      return;
    }
    if (m.type === 'setParam' && PARAM_KEYS.has(m.key)) {
      this[m.key] = m.value;
      if (m.key === 'filterCutoff' || m.key === 'filterResonance') {
        this.svfDirty = true;
        this._prevCutoff = -1;
      }
      if (m.key === 'osc1Type') for (const v of this.voices) v.osc1.type = m.value;
      if (m.key === 'osc2Type') for (const v of this.voices) v.osc2.type = m.value;
    }
  }

  process(_inputs, outputs) {
    for (let qi = 0; qi < this.msgQueue.length; qi++) this._handleMsg(this.msgQueue[qi]);
    this.msgQueue.length = 0;

    const sr = sampleRate;
    const out0 = outputs[0];
    const L = out0[0];
    const R = out0.length > 1 ? out0[1] : out0[0];
    const n = L.length;

    // LFO — 32-sample control rate
    let lfoPitchCents = 0.0;
    let lfoFilterHz   = 0.0;
    let pitchRatio    = 1.0;
    let detuneRatio   = Math.pow(2, this.osc2Detune / 1200);

    for (let i = 0; i < n; i++) {
      if (i % 32 === 0) {
        const lfoSin = Math.sin(TWO_PI * this.lfoPhase);
        this.lfoValue = this.lfoEnabled
          ? (this.lfoType === 'square' ? Math.sign(lfoSin) : lfoSin)
          : 0.0;
        this.lfoPhase = (this.lfoPhase + this.lfoRate * 32 / sr) % 1.0;

        lfoPitchCents = (this.lfoEnabled && this.lfoRoute === 'pitch')
          ? this.lfoValue * this.lfoDepth : 0.0;
        lfoFilterHz = (this.lfoEnabled && this.lfoRoute === 'filter')
          ? this.lfoValue * this.lfoDepth * 20.0 : 0.0;

        pitchRatio  = Math.pow(2, lfoPitchCents / 1200);
        detuneRatio = Math.pow(2, (this.osc2Detune + lfoPitchCents) / 1200);
      }

      // Filter envelope — per sample
      this.filterEnvValue = this.filterEnvEnabled
        ? stepEnv(this.filterEnv, this.filterEnvDecay, this.filterEnvSustain, sr)
        : 0.0;

      const cutoff = Math.max(20, Math.min(
        this.filterCutoff + this.filterEnvValue * this.filterEnvAmount + lfoFilterHz,
        sr * 0.49,
      ));

      if (this.svfDirty || Math.abs(cutoff - this._prevCutoff) > 0.5) {
        this._computeSvf(cutoff);
        this._prevCutoff = cutoff;
        this.svfDirty = false;
      }

      let mix = 0.0;
      for (const v of this.voices) {
        if (v.ampEnv.state === IDLE) continue;
        const amp = stepEnv(v.ampEnv, this.ampDecay, this.ampSustain, sr);
        if (v.ampEnv.state === IDLE) continue;

        const s1 = oscNext(v.osc1, v.freq * pitchRatio  / sr);
        const s2 = oscNext(v.osc2, v.freq * detuneRatio / sr);
        mix += ((1.0 - this.oscMix) * s1 + this.oscMix * s2) * amp;
      }

      const s = this._svf(mix);
      L[i] = s;
      R[i] = s;
    }

    this.sampleCount += n;
    return true;
  }
}

registerProcessor('classic-pro-processor', ClassicProProcessor);
