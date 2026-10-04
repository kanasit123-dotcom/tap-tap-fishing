import test from 'node:test';
import assert from 'node:assert/strict';
import { FishingAudio } from '../src/audio.js';

function context() {
  const starts = []; const stops = [];
  const param = { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
  return {
    state: 'suspended', currentTime: 0, destination: {}, starts, stops,
    resume() { return Promise.resolve().then(() => { this.state = 'running'; }); },
    createGain() { return { gain: { ...param }, connect() {}, disconnect() {} }; },
    createAnalyser() { return { fftSize: 256, connect() {}, getByteTimeDomainData(values) { values.fill(128); } }; },
    createOscillator() { return { frequency: { ...param }, connect() {}, disconnect() {}, start: (t) => starts.push(t), stop: (t) => stops.push(t) }; },
  };
}

test('gesture schedules the first sound while async AudioContext resume is still pending', async (t) => {
  const old = globalThis.window; const ctx = context(); let created = 0;
  globalThis.window = { AudioContext: class { constructor() { created++; return ctx; } } };
  t.after(() => { if (old === undefined) delete globalThis.window; else globalThis.window = old; });
  const audio = new FishingAudio(); audio.unlock();
  assert.equal(ctx.state, 'suspended'); audio.play('cast');
  assert.equal(ctx.starts.length, 2);
  await Promise.resolve(); assert.equal(ctx.state, 'running');
  audio.unlock(); assert.equal(created, 1);
  audio.stop(); assert.equal(audio.nodes.size, 0);
});

test('muted audio does not construct a context; turning it off stops scheduled effects', (t) => {
  const old = globalThis.window; const ctx = context(); let created = 0;
  globalThis.window = { AudioContext: class { constructor() { created++; return ctx; } } };
  t.after(() => { if (old === undefined) delete globalThis.window; else globalThis.window = old; });
  const audio = new FishingAudio(false); audio.unlock(); audio.play('tap'); assert.equal(created, 0);
  audio.toggle(); audio.play('tap'); assert.equal(ctx.starts.length, 1);
  audio.toggle(); const stops = ctx.stops.length; audio.play('land');
  assert.equal(ctx.starts.length, 1); assert.ok(stops >= 2); assert.equal(audio.nodes.size, 0);
});

test('narration needs an available Thai voice and cancels previous speech before new speech', (t) => {
  const old = globalThis.window; const oldUtterance = globalThis.SpeechSynthesisUtterance;
  const calls = []; let voices = [];
  globalThis.window = { speechSynthesis: { getVoices: () => voices, cancel: () => calls.push('cancel'), speak: (s) => calls.push(s) } };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  t.after(() => {
    if (old === undefined) delete globalThis.window; else globalThis.window = old;
    if (oldUtterance === undefined) delete globalThis.SpeechSynthesisUtterance; else globalThis.SpeechSynthesisUtterance = oldUtterance;
  });
  const audio = new FishingAudio(); audio.context = context();
  audio.say('test'); assert.equal(calls.length, 0);
  voices = [{ lang: 'th-TH' }]; audio.say('test');
  assert.equal(calls[0], 'cancel'); assert.equal(calls[1].lang, 'th-TH'); assert.equal(calls[1].rate, 0.85);
  audio.stop(); assert.equal(calls.at(-1), 'cancel');
});
