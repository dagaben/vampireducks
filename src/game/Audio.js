/**
 * Procedural day/night music beds via Web Audio API.
 * - Soft forest-ish pad during day
 * - Darker tense pad at night
 * - Mute toggle, pause/visibility suspend, resume on PLAY
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.isPlaying = false;
    this.isDay = true;
    this._nodes = null; // { oscs, gains, noise, noiseGain, lfo }
    this._visibilityHandler = null;
  }

  /** Call once on first user gesture (PLAY button). */
  async ensureStarted() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.22;
    this.master.connect(this.ctx.destination);

    this._visibilityHandler = () => {
      if (document.hidden) this.suspend();
      else if (this.isPlaying && !this.muted) this.resume();
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  setMuted(m) {
    this.muted = !!m;
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.22, this.ctx.currentTime, 0.05);
    }
    const btn = document.getElementById('mute-button');
    if (btn) btn.textContent = this.muted ? '🔇' : '🔊';
  }

  toggleMute() {
    this.setMuted(!this.muted);
  }

  /** Start or switch day/night bed. Safe to call repeatedly. */
  async play(isDay = true) {
    await this.ensureStarted();
    if (!this.ctx) return;
    this.isDay = isDay;
    this.isPlaying = true;

    if (this.ctx.state === 'suspended') await this.ctx.resume();

    this._stopNodes();
    this._buildBed(isDay);
  }

  setDayNight(isDay) {
    if (this.isDay === isDay && this._nodes) return;
    this.isDay = isDay;
    if (this.isPlaying) this.play(isDay);
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  async resume() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.isPlaying && !this._nodes) this._buildBed(this.isDay);
  }

  stop() {
    this.isPlaying = false;
    this._stopNodes();
    this.suspend();
  }

  _stopNodes() {
    if (!this._nodes) return;
    const now = this.ctx ? this.ctx.currentTime : 0;
    try {
      this._nodes.oscs.forEach((o) => {
        try { o.stop(now + 0.05); } catch (_) {}
        try { o.disconnect(); } catch (_) {}
      });
      if (this._nodes.noise) {
        try { this._nodes.noise.stop(now + 0.05); } catch (_) {}
        try { this._nodes.noise.disconnect(); } catch (_) {}
      }
      this._nodes.gains.forEach((g) => { try { g.disconnect(); } catch (_) {} });
      if (this._nodes.noiseGain) try { this._nodes.noiseGain.disconnect(); } catch (_) {}
      if (this._nodes.lfo) try { this._nodes.lfo.disconnect(); } catch (_) {}
    } catch (_) {}
    this._nodes = null;
  }

  _buildBed(isDay) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;

    // Three detuned sines for a soft pad
    const baseFreq = isDay ? 110 : 82; // A2 vs E2-ish
    const intervals = isDay ? [0, 7, 12] : [0, 3, 10]; // major-ish vs minor-ish
    const oscs = [];
    const gains = [];

    intervals.forEach((semi, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = baseFreq * Math.pow(2, semi / 12);
      osc.detune.value = (i - 1) * 6;

      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18 / intervals.length, t + 1.2);

      osc.connect(g);
      g.connect(this.master);
      osc.start(t);
      oscs.push(osc);
      gains.push(g);
    });

    // Gentle filtered noise for forest / wind texture
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.4;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = isDay ? 800 : 400;
    filter.Q.value = 0.7;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0;
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(isDay ? 0.04 : 0.055, t + 1.5);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.master);
    noise.start(t);

    // Slow amplitude LFO for breathing feel
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = isDay ? 0.08 : 0.12;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain);
    lfoGain.connect(this.master.gain);
    lfo.start(t);

    this._nodes = { oscs, gains, noise, noiseGain, lfo };
  }
}
