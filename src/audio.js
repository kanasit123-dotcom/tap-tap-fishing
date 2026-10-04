export class FishingAudio {
  constructor(enabled = true) { this.enabled = enabled; this.context = null; this.nodes = new Set(); }
  unlock() {
    if (!this.enabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context ||= new AudioContext();
      if (!this.master) {
        this.master = this.context.createGain();
        this.master.gain.value = 0.7;
        this.master.connect(this.context.destination);
        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = 256;
        this.master.connect(this.analyser);
      }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch { /* Silent play is still available on unsupported devices. */ }
  }
  tone(frequency, duration = 0.1, offset = 0, type = 'sine') {
    if (!this.enabled || !this.context || this.context.state === 'closed') return;
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + offset;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.8, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.1, start + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain); gain.connect(this.master);
    this.nodes.add(oscillator);
    oscillator.onended = () => { this.nodes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start); oscillator.stop(start + duration + 0.01);
  }
  play(event) {
    if (event === 'cast') { this.tone(440, 0.13); this.tone(220, 0.18, 0.07); }
    if (event === 'tap') this.tone(650, 0.07, 0, 'triangle');
    if (event === 'hook') [523, 659, 784].forEach((f, i) => this.tone(f, 0.15, i * 0.09));
    if (event === 'land') [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.2, i * 0.1));
    if (event === 'miss') this.tone(280, 0.12);
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
  stop() {
    window.speechSynthesis?.cancel();
    for (const node of this.nodes) { try { node.stop(); } catch {} }
    this.nodes.clear();
  }
  level() {
    if (!this.analyser) return 0;
    const values = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(values);
    return Math.max(...values.map((v) => Math.abs(v - 128)));
  }
  toggle() { this.enabled = !this.enabled; if (!this.enabled) this.stop(); else this.unlock(); return this.enabled; }
}
