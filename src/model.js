import { SPECIES_BY_ID } from './species.js';

export const WORLD = { width: 480, height: 760, originX: 240, originY: 132, rest: 32, floor: 565 };
export const GOAL = 8;
export const ROUND_SECONDS = 90;

export class FishingRound {
  constructor(mode = 'relaxed', onLand = () => {}) {
    this.mode = mode === 'arcade' ? 'arcade' : 'relaxed';
    this.onLand = onLand;
    this.phase = 'aim';
    this.paused = false;
    this.elapsed = 0;
    this.angle = 0;
    this.length = WORLD.rest;
    this.targetLength = WORLD.rest;
    this.remaining = ROUND_SECONDS;
    this.score = 0;
    this.catches = [];
    this.catchId = null;
    this.taps = 0;
    this.requiredTaps = 0;
    this.lastTap = -Infinity;
    this.celebration = 0;
    this.casts = 0;
  }

  get hook() {
    return { x: WORLD.originX + Math.sin(this.angle) * this.length, y: WORLD.originY + Math.cos(this.angle) * this.length };
  }

  cast() {
    if (this.paused || this.phase !== 'aim') return false;
    this.phase = 'casting';
    this.casts++;
    return true;
  }

  catch(id) {
    if (this.paused || this.phase !== 'casting' || !SPECIES_BY_ID[id]) return false;
    this.catchId = id;
    this.requiredTaps = SPECIES_BY_ID[id].taps + (this.hook.y > 400 ? 2 : 0);
    this.taps = 0;
    this.lastTap = -Infinity;
    this.targetLength = this.length;
    this.phase = 'reeling';
    return true;
  }

  reel(now) {
    if (this.paused || this.phase !== 'reeling' || !Number.isFinite(now) || now - this.lastTap < 70 || this.taps >= this.requiredTaps) return false;
    this.lastTap = now;
    this.taps++;
    this.targetLength = WORLD.rest + (this.targetLength - WORLD.rest) * (this.requiredTaps - this.taps) / (this.requiredTaps - this.taps + 1);
    return true;
  }

  pause(value = true) { this.paused = value; }

  tick(dt) {
    if (this.paused || this.phase === 'complete' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.1);
    this.elapsed += dt;
    if (this.mode === 'arcade') {
      this.remaining = Math.max(0, this.remaining - dt);
      // A fish already hooked may always be brought home, even after the clock ends.
      if (this.remaining === 0 && this.phase === 'aim') { this.phase = 'complete'; return; }
      if (this.remaining === 0 && this.phase === 'casting') this.phase = 'returning';
    }
    if (this.phase === 'aim') this.angle = Math.sin(this.elapsed * 1.12) * 0.67;
    if (this.phase === 'casting') {
      this.length += 245 * dt;
      const h = this.hook;
      if (h.y >= WORLD.floor || h.x <= 28 || h.x >= WORLD.width - 28) this.phase = 'returning';
    }
    if (this.phase === 'returning') {
      this.length = Math.max(WORLD.rest, this.length - 285 * dt);
      if (this.length === WORLD.rest) this.resetHook();
    }
    if (this.phase === 'reeling') {
      this.length = Math.max(this.targetLength, this.length - 390 * dt);
      if (this.taps === this.requiredTaps && this.length <= WORLD.rest + 0.1) {
        const species = SPECIES_BY_ID[this.catchId];
        this.score += species.points;
        this.catches.push(species.id);
        this.phase = 'celebrate';
        this.celebration = 1.05;
        this.onLand(species, this);
      }
    }
    if (this.phase === 'celebrate') {
      this.celebration -= dt;
      if (this.celebration <= 0) this.resetHook();
    }
  }

  resetHook() {
    this.catchId = null;
    this.length = WORLD.rest;
    this.targetLength = WORLD.rest;
    this.taps = 0;
    this.requiredTaps = 0;
    this.phase = this.catches.length >= GOAL || (this.mode === 'arcade' && this.remaining === 0) ? 'complete' : 'aim';
  }
}
