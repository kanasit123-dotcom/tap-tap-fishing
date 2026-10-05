import { SPECIES_BY_ID } from './species.js';

// origin = rod tip. rest = line length while aiming, leaving the hook just under the surface.
export const WORLD = { width: 480, height: 760, originX: 240, originY: 74, rest: 90, floor: 600 };
export const GOAL = 8;
export const ROUND_SECONDS = 90;
export const BONUS_SECONDS = 20;
export const MAP_PIECES = 4;
export const TIME_BONUS = 10;

export class FishingRound {
  constructor(mode = 'relaxed', onLand = () => {}, { maps = 0 } = {}) {
    this.mode = mode === 'arcade' ? 'arcade' : 'relaxed';
    this.onLand = onLand;
    this.phase = 'aim';
    this.paused = false;
    this.elapsed = 0;
    this.angle = 0;
    this.swing = 0.67;
    // The swing only advances while aiming, so after a cast it resumes from the same angle (like the cabinet).
    this.swingTime = 0;
    this.length = WORLD.rest;
    this.targetLength = WORLD.rest;
    this.remaining = ROUND_SECONDS;
    this.score = 0;
    this.catches = [];
    this.tripCatches = 0;
    this.catchId = null;
    this.taps = 0;
    this.requiredTaps = 0;
    this.lastTap = -Infinity;
    this.celebration = 0;
    this.casts = 0;
    this.bounds = { floor: WORLD.floor, left: 28, right: WORLD.width - 28 };
    this.maps = Number.isSafeInteger(maps) && maps > 0 ? maps % MAP_PIECES : 0;
    this.bonus = 0;
    this.doubleNext = false;
    this.hookedInBonus = false;
    this.landing = null;
  }

  get hook() {
    return { x: WORLD.originX + Math.sin(this.angle) * this.length, y: WORLD.originY + Math.cos(this.angle) * this.length };
  }

  setBounds({ floor, left, right }) {
    if ([floor, left, right].every(Number.isFinite) && right > left) this.bounds = { floor, left: left + 24, right: right - 24 };
  }

  cast() {
    if (this.paused || this.phase !== 'aim') return false;
    this.phase = 'casting';
    this.casts++;
    return true;
  }

  catch(id) {
    const species = SPECIES_BY_ID[id];
    if (this.paused || this.phase !== 'casting' || !species) return false;
    this.catchId = id;
    this.hookedInBonus = this.bonus > 0;
    // The treasure rain is a reward: everything comes up with half the taps.
    this.requiredTaps = this.hookedInBonus ? Math.max(3, Math.ceil(species.taps / 2)) : species.taps;
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

  get goalReached() { return this.tripCatches >= GOAL; }

  tick(dt) {
    if (this.paused || this.phase === 'complete' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.1);
    this.elapsed += dt;
    if (this.bonus > 0) this.bonus = Math.max(0, this.bonus - dt);
    // The arcade clock waits while the bonus stage is running.
    else if (this.mode === 'arcade') {
      this.remaining = Math.max(0, this.remaining - dt);
      // A fish already hooked may always be brought home, even after the clock ends.
      if (this.remaining === 0 && this.phase === 'aim') { this.phase = 'complete'; return; }
      if (this.remaining === 0 && this.phase === 'casting') this.phase = 'returning';
    }
    if (this.phase === 'aim' && this.bonus === 0 && this.goalReached) { this.phase = 'complete'; return; }
    if (this.phase === 'aim') {
      this.swingTime += dt;
      this.angle = Math.sin(this.swingTime * 1.12) * this.swing;
    }
    if (this.phase === 'casting') {
      this.length += 245 * dt;
      const h = this.hook;
      if (h.y >= this.bounds.floor || h.x <= this.bounds.left || h.x >= this.bounds.right) this.phase = 'returning';
    }
    if (this.phase === 'returning') {
      this.length = Math.max(WORLD.rest, this.length - 285 * dt);
      if (this.length === WORLD.rest) this.resetHook();
    }
    if (this.phase === 'reeling') {
      this.length = Math.max(this.targetLength, this.length - 390 * dt);
      if (this.taps === this.requiredTaps && this.length <= WORLD.rest + 0.1) this.land();
    }
    if (this.phase === 'celebrate') {
      this.celebration -= dt;
      if (this.celebration <= 0) this.resetHook();
    }
  }

  land() {
    const species = SPECIES_BY_ID[this.catchId];
    // A message bottle doubles the NEXT catch; the bottle itself is not doubled.
    const multiplier = this.doubleNext && species.effect !== 'double' ? 2 : 1;
    if (multiplier > 1) this.doubleNext = false;
    const points = species.points * multiplier;
    let bonusStarted = false;
    this.score += points;
    this.catches.push(species.id);
    if (!this.hookedInBonus) this.tripCatches++;
    if (species.effect === 'double') this.doubleNext = true;
    if (species.effect === 'time' && this.mode === 'arcade') this.remaining += TIME_BONUS;
    if (species.effect === 'map') {
      this.maps++;
      if (this.maps >= MAP_PIECES) { this.maps = 0; this.bonus = BONUS_SECONDS; bonusStarted = true; }
    }
    this.landing = { species, points, multiplier, bonusStarted };
    this.phase = 'celebrate';
    this.celebration = species.jackpot ? 1.8 : 1.05;
    this.onLand(species, this);
  }

  resetHook() {
    this.catchId = null;
    this.hookedInBonus = false;
    this.length = WORLD.rest;
    this.targetLength = WORLD.rest;
    this.taps = 0;
    this.requiredTaps = 0;
    const finished = this.goalReached || (this.mode === 'arcade' && this.remaining === 0);
    this.phase = finished && this.bonus === 0 ? 'complete' : 'aim';
  }
}
