// Every sound is synthesised with Web Audio (no audio files): sea ambience, a soft island
// music loop and fishing effects (rod whoosh, line ratchet, reel clicks, splashes, fanfares).
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const rand = (min, max) => min + Math.random() * (max - min);

// Eight bars of eighth notes over C - Am - F - G, two bars each. null = rest.
const MELODY = [
  76, null, 79, null, 81, 79, 76, null, 74, null, 76, null, 72, null, null, null,
  72, null, 76, null, 81, null, 79, 76, 79, null, null, null, 76, null, null, null,
  81, null, 84, null, 81, 79, null, 76, 79, null, 81, null, null, null, null, null,
  79, 76, 74, null, 76, null, 79, null, 74, null, null, null, null, null, null, null,
];
const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
const BASS = [36, 33, 29, 31];
const STEPS = MELODY.length;
const REEL_SCALE = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96];

export class FishingAudio {
  constructor(enabled = true, { music = true, now = () => globalThis.performance?.now?.() ?? Date.now() } = {}) {
    this.enabled = enabled;
    this.musicOn = music;
    this.now = now;
    this.context = null;
    this.nodes = new Set();      // short effects, cut by stop()
    this.background = new Set(); // ambience and music notes
    this.stale = false;
    this.clock = null;
    this.contexts = 0;
    this.line = 'aim';
    this.bonus = false;
    this.ducked = false;
  }

  // Call from a user gesture. iOS needs the context created/resumed inside the gesture, and a
  // context that went quiet after the app was hidden is rebuilt (WebKit bugs 291892/263627).
  unlock() {
    if (!this.enabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch { /* older Safari */ }
      if (!this.context || this.stale || ['closed', 'interrupted'].includes(this.context.state) || this.clockStuck()) this.build(AudioContext);
      if (this.context.state !== 'running') this.context.resume?.()?.catch?.(() => {});
      this.clock = { time: this.context.currentTime, at: this.now() };
      this.startLoops();
    } catch { /* Silent play is still available on unsupported devices. */ }
  }

  clockStuck() {
    const ctx = this.context;
    return Boolean(ctx && ctx.state === 'running' && this.clock && this.now() - this.clock.at > 400 && ctx.currentTime - this.clock.time < 0.05);
  }

  build(AudioContext) {
    this.teardown();
    try { this.context?.close?.(); } catch { /* already closed */ }
    const ctx = this.context = new AudioContext();
    this.contexts++;
    this.stale = false;
    this.clock = null;
    this.master = this.gain(0.85, ctx.destination);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.master.connect(this.analyser);
    this.sfxBus = this.gain(1, this.master);
    this.ambientBus = this.gain(0.55, this.master);
    this.musicBus = this.gain(this.musicOn ? 0.5 : 0, this.master);
    this.whiteNoise = this.noiseBuffer(2, false);
    this.brownNoise = this.noiseBuffer(4, true);
  }

  gain(value, destination) {
    const node = this.context.createGain();
    node.gain.value = value;
    if (destination) node.connect(destination);
    return node;
  }

  noiseBuffer(seconds, brown) {
    const ctx = this.context;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * white) / 1.02; data[i] = last * 3.5; } else data[i] = white;
    }
    return buffer;
  }

  ready() { return this.enabled && this.context && this.context.state !== 'closed'; }

  track(source, chain, background) {
    const set = background ? this.background : this.nodes;
    set.add(source);
    source.onended = () => { set.delete(source); for (const node of [source, ...chain]) { try { node.disconnect(); } catch { /* gone */ } } };
  }

  // One oscillator voice with an attack/decay envelope.
  tone({ freq, end = freq, type = 'sine', time, at = 0, dur = 0.15, vol = 0.1, attack = 0.006, bus = this.sfxBus, lowpass, background = false }) {
    if (!this.ready()) return;
    const ctx = this.context;
    const t = time ?? ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (end !== freq) osc.frequency.exponentialRampToValueAtTime(end, t + dur);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(vol, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env);
    const chain = [env];
    if (lowpass) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = lowpass;
      env.connect(filter); filter.connect(bus); chain.push(filter);
    } else env.connect(bus);
    this.track(osc, chain, background);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  // Filtered noise burst: splashes, whooshes, clicks, shakers.
  noise({ time, at = 0, dur = 0.2, vol = 0.1, type = 'bandpass', freq = 1000, end = freq, q = 1, attack = 0.004, bus = this.sfxBus, background = false }) {
    if (!this.ready()) return;
    const ctx = this.context;
    const t = time ?? ctx.currentTime + at;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    source.buffer = this.whiteNoise;
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (end !== freq) filter.frequency.exponentialRampToValueAtTime(end, t + dur);
    filter.Q.value = q;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(vol, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    source.connect(filter); filter.connect(env); env.connect(bus);
    this.track(source, [filter, env], background);
    source.start(t, Math.random() * 1.5);
    source.stop(t + dur + 0.03);
  }

  marimba(midi, options) {
    this.tone({ ...options, freq: hz(midi), dur: options.dur ?? 0.45, attack: 0.004 });
    this.tone({ ...options, freq: hz(midi) * 4, dur: 0.07, vol: (options.vol ?? 0.1) * 0.22, attack: 0.002 });
  }

  click(options) { this.noise({ dur: 0.014, vol: 0.18, freq: 3800, q: 3.5, attack: 0.001, ...options }); }

  shimmer(count = 10, at = 0, vol = 0.035) {
    for (let i = 0; i < count; i++) this.tone({ freq: rand(2200, 3600), at: at + rand(0, 0.6), dur: 0.18, vol });
  }

  arpeggio(notes, at = 0, gap = 0.08, vol = 0.12) {
    notes.forEach((note, i) => this.marimba(note, { at: at + i * gap, vol }));
  }

  play(event, detail = {}) {
    if (!this.ready()) return;
    const effect = EFFECTS[event];
    if (effect) effect.call(this, detail);
  }

  // Background loops and the scheduler that feeds ambience, music and the line ratchet.
  startLoops() {
    if (!this.ready()) return;
    const ctx = this.context;
    if (!this.loops) {
      try {
        const swell = this.gain(0.35, this.ambientBus);
        const wash = this.gain(0.08, this.ambientBus);
        const deep = ctx.createBufferSource();
        deep.buffer = this.brownNoise; deep.loop = true;
        const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 480;
        deep.connect(low); low.connect(swell);
        const surf = ctx.createBufferSource();
        surf.buffer = this.whiteNoise; surf.loop = true;
        const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 1500; band.Q.value = 0.6;
        surf.connect(band); band.connect(wash);
        deep.start(); surf.start(0, 0.7);
        this.loops = { sources: [deep, surf], nodes: [swell, wash, low, band], swell, wash, nextSwell: 0, nextBubble: ctx.currentTime + 1, nextGull: ctx.currentTime + rand(6, 14) };
      } catch { this.loops = { sources: [], nodes: [], nextSwell: Infinity, nextBubble: Infinity, nextGull: Infinity }; }
    }
    if (!this.timer) {
      this.timer = globalThis.setInterval(() => this.pump(), 50);
      this.timer?.unref?.();
    }
  }

  pump() {
    const ctx = this.context;
    if (!this.ready() || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const horizon = now + 0.25;
    try {
      this.ambience(now);
      this.musicStep(now, horizon);
      this.lineStep(now, horizon);
    } catch { /* keep the game running even if one voice fails */ }
  }

  ambience(now) {
    const loops = this.loops;
    if (!loops) return;
    if (now >= loops.nextSwell && loops.swell) {
      const level = rand(0.22, 0.7);
      loops.swell.gain.setTargetAtTime(level, now, 1.4);
      loops.wash.gain.setTargetAtTime(level * 0.3, now + 0.3, 0.9);
      loops.nextSwell = now + rand(2.5, 6.5);
    }
    if (now >= loops.nextBubble) {
      const count = 1 + Math.floor(Math.random() * 4);
      let t = now + 0.05;
      for (let i = 0; i < count; i++) {
        const f = rand(330, 820);
        this.tone({ freq: f, end: f * 2.4, time: t, dur: rand(0.04, 0.09), vol: 0.03, bus: this.ambientBus, background: true });
        t += rand(0.05, 0.16);
      }
      loops.nextBubble = now + rand(1.5, 5);
    }
    if (now >= loops.nextGull && this.night) loops.nextGull = now + rand(15, 34);
    if (now >= loops.nextGull) {
      const cries = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < cries; i++) this.gull(now + 0.1 + i * rand(0.38, 0.55));
      loops.nextGull = now + rand(15, 34);
    }
  }

  gull(t) {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const vibrato = ctx.createOscillator();
    const depth = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    const top = rand(1900, 2300);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(top * 0.72, t);
    osc.frequency.linearRampToValueAtTime(top, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(top * 0.55, t + 0.38);
    vibrato.frequency.value = 27; depth.gain.value = 55;
    vibrato.connect(depth); depth.connect(osc.frequency);
    filter.type = 'bandpass'; filter.frequency.value = 1900; filter.Q.value = 2.2;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.022, t + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    osc.connect(filter); filter.connect(env); env.connect(this.ambientBus);
    this.track(osc, [filter, env, vibrato, depth], true);
    vibrato.start(t); osc.start(t);
    vibrato.stop(t + 0.45); osc.stop(t + 0.45);
  }

  musicStep(now, horizon) {
    if (!this.musicOn || this.ducked) { this.song = null; return; }
    if (!this.song || this.song.time < now - 0.3) this.song = { step: 0, loop: 0, time: now + 0.08 };
    const song = this.song;
    while (song.time < horizon) {
      this.musicNote(song.step, song.time, song.loop);
      song.time += 60 / (this.bonus ? 126 : this.fever ? 112 : 96) / 2;
      if (++song.step >= STEPS) { song.step = 0; song.loop++; }
    }
  }

  musicNote(step, time, loop) {
    const bar = Math.floor(step / 8);
    const beat = step % 8;
    const chord = Math.floor(bar / 2);
    const bus = this.musicBus;
    if (beat === 0) {
      this.tone({ freq: hz(BASS[chord]), type: 'triangle', time, dur: 0.42, vol: 0.16, bus, background: true });
      this.tone({ freq: hz(BASS[chord]), time, dur: 0.5, vol: 0.09, bus, background: true });
    }
    if (beat === 4) this.tone({ freq: hz(BASS[chord] + 7), type: 'triangle', time, dur: 0.36, vol: 0.12, bus, background: true });
    if (beat === 2 || beat === 6) CHORDS[chord].forEach((note, i) => this.tone({ freq: hz(note), type: 'triangle', time: time + i * 0.012, dur: 0.22, vol: 0.04, bus, lowpass: 2200, background: true }));
    this.noise({ time, dur: 0.035, vol: beat % 2 ? 0.018 : 0.01, type: 'highpass', freq: 7000, bus, background: true });
    const note = MELODY[step];
    // The second pass of the loop is sparser so the tune does not tire out.
    if (note && (this.bonus || loop % 2 === 0 || bar % 2 === 0)) this.marimba(note + (this.bonus ? 12 : 0), { time, vol: 0.075, bus, background: true });
  }

  // The reel's ratchet clicks while line runs out (casting) or winds back after a miss.
  setLine(phase) { this.line = phase; }

  lineStep(now, horizon) {
    const rate = this.line === 'casting' ? 15 : this.line === 'returning' ? 24 : 0;
    if (rate) {
      if (!this.lineNext || this.lineNext < now) this.lineNext = now;
      while (this.lineNext < horizon) { this.click({ time: this.lineNext, vol: this.line === 'casting' ? 0.06 : 0.08 }); this.lineNext += 1 / rate; }
    } else this.lineNext = 0;
    if (this.line === 'reeling') {
      if (!this.nextStruggle || this.nextStruggle < now - 1) this.nextStruggle = now + 0.6;
      if (now >= this.nextStruggle) { EFFECTS.struggle.call(this); this.nextStruggle = now + rand(0.7, 1.5); }
    }
  }

  setBonus(on) { this.bonus = on; }

  setFever(on) { this.fever = on; }

  setNight(on) { this.night = on; }

  // Quieter sea and no music while a dialog is open.
  duck(on) {
    this.ducked = on;
    if (!this.ready()) return;
    const now = this.context.currentTime;
    this.ambientBus.gain.setTargetAtTime(on ? 0.18 : 0.55, now, 0.2);
    this.musicBus.gain.setTargetAtTime(on || !this.musicOn ? 0 : 0.5, now, 0.2);
  }

  toggleMusic() {
    this.musicOn = !this.musicOn;
    this.song = null;
    if (this.ready()) this.musicBus.gain.setTargetAtTime(this.musicOn && !this.ducked ? 0.5 : 0, this.context.currentTime, 0.15);
    return this.musicOn;
  }

  say(text) {
    if (!this.enabled || !window.speechSynthesis || !this.context) return;
    const synth = window.speechSynthesis;
    const voice = synth.getVoices().find((v) => /^th(?:-|_)/i.test(v.lang));
    if (!voice) return;
    synth.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'th-TH'; speech.voice = voice; speech.rate = 0.85;
    synth.speak(speech);
  }

  // Cut speech and short effects (not the sea or the music).
  stop() {
    window.speechSynthesis?.cancel();
    for (const node of this.nodes) { try { node.stop(); } catch { /* already stopped */ } }
    this.nodes.clear();
  }

  teardown() {
    if (this.timer) { globalThis.clearInterval(this.timer); this.timer = null; }
    for (const node of [...(this.loops?.sources ?? []), ...this.background]) { try { node.stop(); } catch { /* stopped */ } }
    for (const node of this.loops?.nodes ?? []) { try { node.disconnect(); } catch { /* gone */ } }
    this.background.clear();
    this.loops = null;
    this.song = null;
    this.lineNext = 0;
  }

  // Page hidden: stop scheduling and mark the context for a rebuild on the next tap.
  suspend() {
    this.stop();
    this.teardown();
    try { this.context?.suspend?.()?.catch?.(() => {}); } catch { /* closed */ }
    if (this.context) this.stale = true;
  }

  level() {
    if (!this.analyser) return 0;
    const values = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(values);
    return Math.max(...values.map((v) => Math.abs(v - 128)));
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stop();
      this.teardown();
      try { this.master?.gain.setValueAtTime(0, this.context.currentTime); } catch { /* no context */ }
    } else {
      try { this.master?.gain.setValueAtTime(0.85, this.context.currentTime); } catch { /* no context */ }
      this.unlock();
    }
    return this.enabled;
  }
}

const EFFECTS = {
  cast() {
    this.noise({ dur: 0.34, vol: 0.16, freq: 2600, end: 480, q: 1.2 });
    this.tone({ freq: 190, end: 120, dur: 0.12, vol: 0.06, at: 0.02 });
  },
  tap({ progress = 0 } = {}) {
    for (let i = 0; i < 4; i++) this.click({ at: i * 0.024, vol: 0.2 - i * 0.03 });
    this.noise({ dur: 0.09, vol: 0.05, type: 'highpass', freq: 2500, at: 0.01 });
    const note = REEL_SCALE[Math.round(Math.max(0, Math.min(1, progress)) * (REEL_SCALE.length - 1))];
    this.marimba(note, { at: 0.02, vol: 0.06, dur: 0.25 });
  },
  hook() {
    this.tone({ freq: 150, end: 55, dur: 0.22, vol: 0.34 });
    this.noise({ dur: 0.26, vol: 0.12, type: 'lowpass', freq: 1500, end: 500 });
    this.tone({ freq: 196, end: 240, type: 'triangle', dur: 0.36, vol: 0.09 });
    this.arpeggio([79, 84], 0.12, 0.09, 0.09);
  },
  struggle() {
    this.noise({ dur: 0.1, vol: 0.06, freq: 900, end: 1700, q: 1.5 });
    this.noise({ dur: 0.08, vol: 0.05, freq: 1200, end: 700, q: 1.5, at: 0.11 });
  },
  splash() {
    this.noise({ dur: 0.55, vol: 0.22, freq: 2800, end: 450, q: 0.8 });
    this.noise({ dur: 0.3, vol: 0.12, type: 'lowpass', freq: 900, at: 0.02 });
    for (let i = 0; i < 6; i++) this.tone({ freq: rand(1400, 2600), at: rand(0.12, 0.55), dur: 0.05, vol: 0.035 });
  },
  land() { this.arpeggio([72, 76, 79, 84]); this.arpeggio([88, 91], 0.34, 0.07, 0.08); },
  treasure() { this.shimmer(12); this.arpeggio([76, 79, 84, 88], 0.05); },
  jackpot() {
    this.arpeggio([72, 76, 79, 84, 88], 0, 0.1, 0.13);
    [84, 88, 91].forEach((note) => this.marimba(note, { at: 0.55, vol: 0.1, dur: 0.9 }));
    this.shimmer(18, 0.1); this.shimmer(12, 0.7);
  },
  junk() {
    [[330, 300], [294, 262], [247, 185]].forEach(([from, to], i) => this.tone({ freq: from, end: to, type: 'sawtooth', at: i * 0.22, dur: i === 2 ? 0.55 : 0.24, vol: 0.06, lowpass: 900 }));
  },
  map() {
    for (const at of [0, 0.07, 0.15]) this.noise({ at, dur: 0.08, vol: 0.06, freq: 3500, q: 0.5 });
    this.arpeggio([79, 86], 0.2, 0.1, 0.1);
  },
  double() { this.arpeggio([84, 91, 96], 0, 0.1, 0.1); this.shimmer(6, 0.2); },
  time() {
    this.tone({ freq: 1100, dur: 0.05, vol: 0.14 });
    this.tone({ freq: 800, dur: 0.05, vol: 0.14, at: 0.25 });
    this.arpeggio([84, 88], 0.5, 0.08, 0.1);
  },
  bonus() {
    for (let i = 0; i < 16; i++) this.noise({ at: 0.8 * (1 - (1 - i / 16) ** 1.6), dur: 0.06, vol: 0.08, type: 'lowpass', freq: 900 });
    this.arpeggio([72, 76, 79, 84, 88, 91], 0.85, 0.08, 0.12);
    this.shimmer(16, 1.1);
  },
  miss() {
    this.tone({ freq: 320, end: 170, dur: 0.25, vol: 0.09 });
    for (let i = 0; i < 3; i++) { const f = rand(400, 700); this.tone({ freq: f, end: f * 2.2, at: 0.1 + i * 0.09, dur: 0.06, vol: 0.03 }); }
  },
  tick() { this.tone({ freq: 1500, dur: 0.035, vol: 0.05 }); },
  combo({ combo = 1 } = {}) { this.marimba(79 + combo * 3, { vol: 0.09, dur: 0.3 }); },
  fever() {
    this.arpeggio([72, 76, 79, 84, 88, 91, 96], 0, 0.06, 0.11);
    this.noise({ dur: 0.6, vol: 0.08, freq: 1800, end: 5200, q: 0.7, at: 0.05 });
    this.shimmer(14, 0.35);
  },
  cannon() {
    this.tone({ freq: 110, end: 38, dur: 0.45, vol: 0.4 });
    this.noise({ dur: 0.5, vol: 0.28, type: 'lowpass', freq: 1400, end: 220 });
    this.noise({ dur: 0.18, vol: 0.12, freq: 3000, end: 900, q: 0.6, at: 0.01 });
  },
  hit() {
    for (const at of [0, 0.05, 0.11]) this.noise({ at, dur: 0.09, vol: 0.14, freq: 900, end: 400, q: 2 });
    this.arpeggio([79, 84, 88], 0.12, 0.07, 0.1);
  },
  pirate() {
    [[62, 0], [66, 0.18], [69, 0.36], [74, 0.6]].forEach(([note, at]) => this.marimba(note, { at, vol: 0.12, dur: 0.5 }));
    this.tone({ freq: 147, type: 'sawtooth', dur: 0.9, vol: 0.05, lowpass: 700, at: 0.6 });
  },
  siren() {
    for (let i = 0; i < 6; i++) this.tone({ freq: i % 2 ? 520 : 740, end: i % 2 ? 740 : 520, type: 'sawtooth', at: i * 0.32, dur: 0.3, vol: 0.05, lowpass: 1800 });
  },
  tug({ level = 1 } = {}) {
    this.tone({ freq: 90 + level * 20, end: 55, dur: 0.16, vol: 0.2 + level * 0.06 });
    this.noise({ dur: 0.14, vol: 0.08 + level * 0.03, type: 'lowpass', freq: 700, end: 220 });
    this.noise({ dur: 0.07, vol: 0.05, freq: 1500, end: 900, q: 2, at: 0.1 });
  },
  boss() {
    for (const [at, f] of [[0, 98], [0.55, 98], [1.1, 131]]) this.tone({ freq: f, type: 'sawtooth', at, dur: 0.5, vol: 0.09, lowpass: 600 });
    this.noise({ dur: 1.4, vol: 0.06, type: 'lowpass', freq: 300, end: 120 });
  },
  powerup() { this.arpeggio([76, 83, 88, 95], 0, 0.05, 0.09); this.shimmer(8, 0.15); },
  coins({ count = 6 } = {}) {
    for (let i = 0; i < Math.min(count, 8); i++) this.tone({ freq: 2600 + i * 140, at: i * 0.045, dur: 0.07, vol: 0.05 });
  },
};
