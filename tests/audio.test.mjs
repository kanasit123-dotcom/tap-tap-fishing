import test from 'node:test';
import assert from 'node:assert/strict';
import { FishingAudio } from '../src/audio.js';

function param(value = 1) {
  return { value, events: [], setValueAtTime(v, t) { this.events.push(['set', v, t]); }, linearRampToValueAtTime(v, t) { this.events.push(['linear', v, t]); },
    exponentialRampToValueAtTime(v, t) { this.events.push(['exp', v, t]); }, setTargetAtTime(v, t) { this.events.push(['target', v, t]); this.value = v; } };
}

// Enough of the Web Audio API to see what the engine schedules.
function fakeContext() {
  const ctx = {
    state: 'suspended', currentTime: 0, sampleRate: 8000, destination: {}, starts: [], stops: [], gains: [], closed: false,
    resume() { return Promise.resolve().then(() => { this.state = 'running'; }); },
    suspend() { return Promise.resolve().then(() => { this.state = 'suspended'; }); },
    close() { this.closed = true; this.state = 'closed'; },
    createGain() { const g = { gain: param(1), connect() {}, disconnect() {} }; ctx.gains.push(g); return g; },
    createBiquadFilter() { return { type: '', frequency: param(350), Q: param(1), connect() {}, disconnect() {} }; },
    createAnalyser() { return { fftSize: 256, connect() {}, getByteTimeDomainData(values) { values.fill(128); } }; },
    createBuffer(_channels, length) { const data = new Float32Array(length); return { getChannelData: () => data }; },
    createOscillator() { return { type: 'sine', frequency: param(440), connect() {}, disconnect() {}, start: (t) => ctx.starts.push(['osc', t]), stop: (t) => ctx.stops.push(t) }; },
    createBufferSource() { return { buffer: null, loop: false, connect() {}, disconnect() {}, start: (t) => ctx.starts.push(['noise', t]), stop: (t) => ctx.stops.push(t) }; },
  };
  return ctx;
}

function install(t, contexts) {
  const old = globalThis.window;
  globalThis.window = { AudioContext: class { constructor() { const ctx = fakeContext(); contexts.push(ctx); return ctx; } } };
  t.after(() => { if (old === undefined) delete globalThis.window; else globalThis.window = old; });
}

test('a gesture builds one context, starts the sea, and plays effects while resume is pending', async (t) => {
  const contexts = []; install(t, contexts);
  const audio = new FishingAudio(); audio.unlock();
  t.after(() => audio.teardown());
  const ctx = contexts[0];
  assert.equal(ctx.state, 'suspended');
  const loops = ctx.starts.length; assert.ok(loops >= 2, 'wave and surf loops');
  audio.play('cast'); assert.ok(ctx.starts.length > loops);
  await Promise.resolve(); assert.equal(ctx.state, 'running');
  audio.unlock(); assert.equal(contexts.length, 1);
  audio.stop(); assert.equal(audio.nodes.size, 0);
});

test('every fishing event schedules sound', (t) => {
  const contexts = []; install(t, contexts);
  const audio = new FishingAudio(); audio.unlock(); t.after(() => audio.teardown());
  const ctx = contexts[0];
  for (const event of ['cast', 'tap', 'hook', 'struggle', 'splash', 'land', 'treasure', 'jackpot', 'junk', 'map', 'double', 'time', 'bonus', 'miss', 'tick']) {
    const before = ctx.starts.length; audio.play(event, { progress: 0.5 });
    assert.ok(ctx.starts.length > before, event);
  }
});

test('the scheduler adds ambience, music, and line clicks only when wanted', async (t) => {
  const contexts = []; install(t, contexts);
  const audio = new FishingAudio(); audio.unlock(); t.after(() => audio.teardown());
  const ctx = contexts[0]; await Promise.resolve();
  audio.pump(); const withMusic = audio.background.size; assert.ok(withMusic > 0, 'music notes queued');
  audio.toggleMusic(); assert.equal(audio.musicOn, false);
  assert.equal(audio.musicBus.gain.value, 0);
  audio.background.clear(); ctx.currentTime = 10; audio.loops.nextBubble = audio.loops.nextGull = Infinity;
  audio.pump(); assert.equal(audio.background.size, 0, 'no music while it is off');
  audio.setLine('casting'); const before = ctx.starts.length; audio.pump();
  assert.ok(ctx.starts.length - before >= 3, 'ratchet clicks while the line runs out');
  audio.setLine('aim'); ctx.currentTime = 11; const idle = ctx.starts.length; audio.pump(); assert.equal(ctx.starts.length, idle);
  audio.toggleMusic(); assert.equal(audio.musicBus.gain.value, 0.5);
  audio.duck(true); assert.equal(audio.musicBus.gain.value, 0); audio.duck(false); assert.equal(audio.musicBus.gain.value, 0.5);
});

test('muted audio does not construct a context; turning it off stops everything', (t) => {
  const contexts = []; install(t, contexts);
  const audio = new FishingAudio(false); audio.unlock(); audio.play('tap'); assert.equal(contexts.length, 0);
  audio.toggle(); assert.equal(contexts.length, 1); t.after(() => audio.teardown());
  audio.play('tap'); assert.ok(audio.nodes.size > 0); assert.ok(audio.timer);
  audio.toggle(); assert.equal(audio.nodes.size, 0); assert.equal(audio.timer, null); assert.equal(audio.loops, null);
  const starts = contexts[0].starts.length; audio.play('land'); assert.equal(contexts[0].starts.length, starts);
});

test('after the page is hidden, or the clock stalls, the next gesture rebuilds the context', async (t) => {
  let clock = 0; const contexts = []; install(t, contexts);
  const audio = new FishingAudio(true, { now: () => clock }); audio.unlock(); t.after(() => audio.teardown());
  await Promise.resolve();
  audio.suspend(); assert.equal(audio.timer, null);
  audio.unlock(); assert.equal(contexts.length, 2); assert.ok(contexts[0].closed);
  await Promise.resolve(); clock += 1000; audio.unlock();
  assert.equal(contexts.length, 3, 'a running context whose time never moved is replaced');
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
  const audio = new FishingAudio(); audio.context = fakeContext();
  audio.say('test'); assert.equal(calls.length, 0);
  voices = [{ lang: 'th-TH' }]; audio.say('test');
  assert.equal(calls[0], 'cancel'); assert.equal(calls[1].lang, 'th-TH'); assert.equal(calls[1].rate, 0.85);
  audio.stop(); assert.equal(calls.at(-1), 'cancel');
});
