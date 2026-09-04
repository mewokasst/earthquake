// quake.js
// Generates a full ground-acceleration time history up front (sampled at the
// physics dt), then integrates it once for ground velocity and once more for
// ground displacement — used to actually move the ground plane, rather than
// faking it with a raw sine, per the "integration matters for teaching" note.

const G = 9.80665; // m/s^2

class GroundMotion {
  /**
   * @param {object} p  { pgaG, freqHz, durationS, waveform }  waveform: 'sine'|'ricker'|'noise'
   * @param {number} dt fixed physics timestep (s)
   */
  constructor(p, dt) {
    this.dt = dt;
    this.duration = p.durationS;
    this.freqHz = p.freqHz;
    this.pga = p.pgaG * G;
    this.waveform = p.waveform;
    this.steps = Math.max(2, Math.round(this.duration / dt));

    this.accel = new Float64Array(this.steps);
    this.vel = new Float64Array(this.steps);
    this.disp = new Float64Array(this.steps);

    this._generateAccel();
    this._integrate();
  }

  _envelope(t) {
    const rampT = Math.min(1.5, this.duration * 0.15);
    if (rampT <= 0) return 1;
    if (t < rampT) return 0.5 - 0.5 * Math.cos(Math.PI * t / rampT);
    if (t > this.duration - rampT) {
      const tail = this.duration - t;
      return 0.5 - 0.5 * Math.cos(Math.PI * tail / rampT);
    }
    return 1;
  }

  _generateAccel() {
    const f = this.freqHz;
    if (this.waveform === 'sine') {
      for (let n = 0; n < this.steps; n++) {
        const t = n * this.dt;
        this.accel[n] = this.pga * Math.sin(2 * Math.PI * f * t) * this._envelope(t);
      }
    } else if (this.waveform === 'ricker') {
      // Single Ricker (Mexican-hat) pulse, centered mid-duration.
      const t0 = this.duration / 2;
      for (let n = 0; n < this.steps; n++) {
        const t = n * this.dt;
        const arg = Math.pow(Math.PI * f * (t - t0), 2);
        this.accel[n] = this.pga * (1 - 2 * arg) * Math.exp(-arg);
      }
    } else {
      // Filtered noise: white noise -> 2nd-order biquad bandpass centered on f,
      // then normalized to PGA and shaped with the standard envelope.
      const white = new Float64Array(this.steps);
      for (let n = 0; n < this.steps; n++) white[n] = Math.random() * 2 - 1;
      const filtered = this._bandpass(white, f, 1 / this.dt);
      let peak = 0;
      for (let n = 0; n < this.steps; n++) peak = Math.max(peak, Math.abs(filtered[n]));
      const scale = peak > 1e-9 ? this.pga / peak : 0;
      for (let n = 0; n < this.steps; n++) {
        const t = n * this.dt;
        this.accel[n] = filtered[n] * scale * this._envelope(t);
      }
    }
  }

  // Standard RBJ-cookbook biquad bandpass (constant skirt gain), applied
  // forward+backward (zero-phase) so the shake doesn't drift toward one side.
  _bandpass(x, f0, fs) {
    const Q = 1.4;
    const w0 = 2 * Math.PI * f0 / fs;
    const alpha = Math.sin(w0) / (2 * Q);
    const cosw0 = Math.cos(w0);

    const b0 = alpha, b1 = 0, b2 = -alpha;
    const a0 = 1 + alpha, a1 = -2 * cosw0, a2 = 1 - alpha;
    const nb0 = b0 / a0, nb1 = b1 / a0, nb2 = b2 / a0, na1 = a1 / a0, na2 = a2 / a0;

    const applyOnce = (input) => {
      const out = new Float64Array(input.length);
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let n = 0; n < input.length; n++) {
        const xn = input[n];
        const yn = nb0 * xn + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
        out[n] = yn;
        x2 = x1; x1 = xn; y2 = y1; y1 = yn;
      }
      return out;
    };

    let out = applyOnce(x);
    out.reverse();
    out = applyOnce(out);
    out.reverse();
    return out;
  }

  _integrate() {
    // Trapezoidal integration, with a gentle linear detrend on the resulting
    // velocity/displacement so idealized synthetic signals don't wander offscreen.
    let v = 0;
    for (let n = 1; n < this.steps; n++) {
      v += 0.5 * (this.accel[n] + this.accel[n - 1]) * this.dt;
      this.vel[n] = v;
    }
    this._detrend(this.vel);

    let d = 0;
    this.disp[0] = 0;
    for (let n = 1; n < this.steps; n++) {
      d += 0.5 * (this.vel[n] + this.vel[n - 1]) * this.dt;
      this.disp[n] = d;
    }
    this._detrend(this.disp);
  }

  _detrend(arr) {
    const n = arr.length;
    if (n < 2) return;
    const end = arr[n - 1], start = arr[0];
    const slope = (end - start) / (n - 1);
    for (let i = 0; i < n; i++) arr[i] -= start + slope * i;
  }

  sampleIndex(step) {
    const i = Math.min(step, this.steps - 1);
    return { accel: this.accel[i], vel: this.vel[i], disp: this.disp[i] };
  }

  totalSteps() { return this.steps; }
}