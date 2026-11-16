// Zero-dependency Web Audio API procedural synthesizer for DON'T SCAN IT v3.0
import { saveManager } from "./SaveManager.js";
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = Number.isFinite(saveManager.state.settings.volume) ? saveManager.state.settings.volume : 0.7;
    this.masterGain = null;
    this.humOsc = null;
    this.subOsc = null;
    this.humGain = null;
    this.voicePlayback = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : this.volume;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.humGain && this.ctx) {
      this.humGain.gain.setTargetAtTime(this.muted ? 0 : 0.032, this.ctx.currentTime, 0.05);
    }
    if (this.muted && this.voicePlayback) {
      this.voicePlayback.stop();
      this.voicePlayback.destroy();
      this.voicePlayback = null;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  playCustomerVoice(scene, audioKey) {
    if (this.muted || !scene || !audioKey) return;
    try {
      if (this.voicePlayback) {
        this.voicePlayback.stop();
        this.voicePlayback.destroy();
        this.voicePlayback = null;
      }
      if (!scene.cache.audio.exists(audioKey)) return;
      const voice = scene.sound.add(audioKey, { volume: 0.85 });
      this.voicePlayback = voice;
      voice.once("complete", () => {
        if (this.voicePlayback === voice) {
          voice.destroy();
          this.voicePlayback = null;
        }
      });
      voice.play();
    } catch (error) {
      this.voicePlayback = null;
    }
  }

  playIntroBassSwell() {
    this.init();
    if (!this.ctx || this.muted) return;
    try {
      const now = this.ctx.currentTime;
      [45, 67.5, 90, 135].forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = idx % 2 === 0 ? "sawtooth" : "triangle";
        osc.frequency.setValueAtTime(f * 0.96, now);
        osc.frequency.exponentialRampToValueAtTime(f * 1.02, now + 2.4);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(90, now);
        filter.frequency.exponentialRampToValueAtTime(480, now + 1.4);
        filter.frequency.exponentialRampToValueAtTime(110, now + 2.8);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.14, now + 1.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.9);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc.start(now);
        osc.stop(now + 2.95);
      });
    } catch (e) {}
  }

  startAmbientHum() {
    this.init();
    if (!this.ctx || this.humOsc) return;
    try {
      const now = this.ctx.currentTime;
      this.humOsc = this.ctx.createOscillator();
      this.subOsc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      this.humGain = this.ctx.createGain();

      this.humOsc.type = "sawtooth";
      this.humOsc.frequency.setValueAtTime(60, now);
      this.subOsc.type = "sine";
      this.subOsc.frequency.setValueAtTime(120, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(220, now);

      this.humGain.gain.setValueAtTime(this.muted ? 0 : 0.032, now);

      this.humOsc.connect(filter);
      this.subOsc.connect(filter);
      filter.connect(this.humGain);
      this.humGain.connect(this.masterGain || this.ctx.destination);

      this.humOsc.start(now);
      this.subOsc.start(now);
    } catch (e) {}
  }

  stopAmbientHum() {
    try {
      if (this.humOsc) {
        this.humOsc.stop();
        this.humOsc.disconnect();
        this.humOsc = null;
      }
      if (this.subOsc) {
        this.subOsc.stop();
        this.subOsc.disconnect();
        this.subOsc = null;
      }
    } catch (e) {}
  }

  playStoreBell() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    [880, 1174, 1568].forEach((frequency, index) => {
      const start = now + index * 0.075;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, start);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.995, start + 0.12);
      gain.gain.setValueAtTime(0.11, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.52);
      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.53);
    });
  }

  playRegisterRattle() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const length = Math.floor(this.ctx.sampleRate * 0.22);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.075));
    }
    const noise = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1350, now);
    filter.Q.setValueAtTime(0.8, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);
    noise.start(now);
  }

  playRadioStatic() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const length = Math.floor(this.ctx.sampleRate * 0.34);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.08 ? 1 : 0.22);
    }
    const noise = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2300, now);
    filter.Q.setValueAtTime(0.7, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);
    noise.start(now);
  }

  playMenuHover() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.045);
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g);
    g.connect(this.masterGain || this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  // V3.0: Scale measurement digital beep
  playScaleBeep() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1320, now);
    osc.frequency.setValueAtTime(1760, now + 0.05);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g);
    g.connect(this.masterGain || this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  // V3.0: Cash register coin chime for bribes, collector sales & shop purchases
  playCoinChime() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    [987.77, 1318.51].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      g.gain.setValueAtTime(0.18, now + idx * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.28);
      osc.connect(g);
      g.connect(this.masterGain || this.ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.3);
    });
  }

  // V3.0: Retro dual-tone desk phone ring
  playPhoneRing() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    for (let burst = 0; burst < 2; burst++) {
      const start = now + burst * 0.24;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc1.type = "square";
      osc2.type = "square";
      osc1.frequency.setValueAtTime(780, start);
      osc2.frequency.setValueAtTime(1020, start);
      g.gain.setValueAtTime(0.1, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc1.connect(g);
      osc2.connect(g);
      g.connect(this.masterGain || this.ctx.destination);
      osc1.start(start);
      osc2.start(start);
      osc1.stop(start + 0.19);
      osc2.stop(start + 0.19);
    }
  }

  // V3.0: Mechanical breaker box switch click
  playBreakerClick(pitchMult = 1.0) {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(420 * pitchMult, now);
    osc.frequency.exponentialRampToValueAtTime(140 * pitchMult, now + 0.07);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(this.masterGain || this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  // V3.0: Approaching footsteps in the dark during blackout
  playFootstepThud() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.18);
    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g);
    g.connect(this.masterGain || this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  playBeep(isError = false) {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (!isError) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(2200, now);
      osc.frequency.setValueAtTime(2750, now + 0.04);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } else {
      for (const freq of [92, 128, 184]) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq * 0.7, now + 0.42);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.44);
      }
    }
  }

  playShotgun() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.55);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.14));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1450, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.54);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);
    noise.start(now);

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(155, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.38);
    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    sub.connect(subGain);
    subGain.connect(this.masterGain || this.ctx.destination);
    sub.start(now);
    sub.stop(now + 0.4);
  }

  playTaser() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 9; i++) {
      const t = now + i * 0.036;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(950 + Math.random() * 2200, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.03);
      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.032);
    }
  }

  playHolyWater(withCatHiss = false) {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    const makeSpray = (startOffset, dur) => {
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * (dur * 0.6)));
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(3200, now + startOffset);
      bp.Q.setValueAtTime(1.8, now + startOffset);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.32, now + startOffset);
      g.gain.exponentialRampToValueAtTime(0.01, now + startOffset + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain || this.ctx.destination);
      src.start(now + startOffset);
    };

    makeSpray(0, 0.13);
    makeSpray(0.15, 0.17);

    if (withCatHiss) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1500, now + 0.24);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.68);
      g.gain.setValueAtTime(0.18, now + 0.24);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(g);
      g.connect(this.masterGain || this.ctx.destination);
      osc.start(now + 0.24);
      osc.stop(now + 0.7);
    }
  }

  playShutterSlam() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    [200, 330, 510, 780].forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? "square" : "triangle";
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.35, now + 0.45);
      g.gain.setValueAtTime(0.16, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(g);
      g.connect(this.masterGain || this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.46);
    });
  }

  playFlickerBuzz() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(110, now);
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g);
    g.connect(this.masterGain || this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playJumpscare() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    [390, 585, 830, 1240, 1720].forEach((cf) => {
      const carrier = this.ctx.createOscillator();
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const outGain = this.ctx.createGain();

      carrier.type = "sawtooth";
      carrier.frequency.setValueAtTime(cf, now);
      carrier.frequency.exponentialRampToValueAtTime(cf * 1.45, now + 0.3);
      carrier.frequency.exponentialRampToValueAtTime(cf * 0.6, now + 1.35);

      mod.type = "square";
      mod.frequency.setValueAtTime(42 + Math.random() * 35, now);
      modGain.gain.setValueAtTime(280, now);

      outGain.gain.setValueAtTime(0.18, now);
      outGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(outGain);
      outGain.connect(this.masterGain || this.ctx.destination);

      mod.start(now);
      carrier.start(now);
      mod.stop(now + 1.42);
      carrier.stop(now + 1.42);
    });
  }

  playSiren() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.linearRampToValueAtTime(980, now + 0.35);
    osc.frequency.linearRampToValueAtTime(620, now + 0.7);
    osc.frequency.linearRampToValueAtTime(980, now + 1.05);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
    osc.connect(g);
    g.connect(this.masterGain || this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.16);
  }

  playVictoryChime() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((n, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(n, now + idx * 0.14);
      g.gain.setValueAtTime(0.2, now + idx * 0.14);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.5);
      osc.connect(g);
      g.connect(this.masterGain || this.ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.52);
    });
  }
}

export const soundManager = new SoundManager();
