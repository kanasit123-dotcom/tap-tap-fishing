import { SPECIES_BY_ID } from './species.js';

// origin = rod tip. rest = line length while aiming, leaving the hook just under the surface.
export const WORLD = { width: 480, height: 760, originX: 240, originY: 74, rest: 90, floor: 600 };
export const GOAL = 8;
export const ROUND_SECONDS = 90;
export const BONUS_SECONDS = 20;
export const MAP_PIECES = 4;
export const TIME_BONUS = 10;
// Fever: three catches in a row without a miss (an old boot breaks the run) doubles every catch for a while.
export const COMBO_FOR_FEVER = 3;
export const FEVER_SECONDS = 15;
// Power-ups (caught like treasure, then active): net = the next catch also scoops up to NET_EXTRA creatures
// next to the hook; turbo = the next TURBO_CATCHES catches drop faster and need half the taps;
// golden hook = bigger hook for POWER_SECONDS; spyglass = deep silhouettes show their colours for POWER_SECONDS.
export const NET_EXTRA = 2;
export const TURBO_CATCHES = 3;
export const POWER_SECONDS = 20;
// Pirate mini-game (every other completed map): fire PIRATE_SHOTS cannonballs at pirate ships for treasure.
export const PIRATE_SHOTS = 10;
export const PIRATE_HIT = { small: 15, medium: 20, large: 25 };
export const PIRATE_DEFEAT = { small: 25, medium: 50, large: 100 };
export const PIRATE_HP = { small: 1, medium: 2, large: 3 };

export class FishingRound {
  constructor(mode = 'relaxed', onLand = () => {}, { maps = 0, bonusTurn = 0 } = {}) {
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
    this.extraIds = [];
    this.taps = 0;
    this.requiredTaps = 0;
    this.lastTap = -Infinity;
    this.celebration = 0;
    this.casts = 0;
    this.bounds = { floor: WORLD.floor, left: 28, right: WORLD.width - 28 };
    this.maps = Number.isSafeInteger(maps) && maps > 0 ? maps % MAP_PIECES : 0;
    // Completed maps alternate between the pirate battle (even) and the treasure rain (odd).
    this.bonusTurn = Number.isSafeInteger(bonusTurn) && bonusTurn > 0 ? bonusTurn % 2 : 0;
    this.bonus = 0;
    this.doubleNext = false;
    this.hookedInBonus = false;
    this.landing = null;
    this.combo = 0;
    this.fever = 0;
    this.netCharges = 0;
    this.turbo = 0;
    this.goldHook = 0;
    this.spyglass = 0;
    this.pirate = null;          // { shots, ball, streak, loot, hits } while the battle runs
    this.pirateQueued = false;
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

  // extraIds: creatures next to the hook that a net scoops up together with the hooked one.
  catch(id, extraIds = []) {
    const species = SPECIES_BY_ID[id];
    if (this.paused || this.phase !== 'casting' || !species) return false;
    this.catchId = id;
    this.extraIds = this.netCharges > 0 ? extraIds.filter((x) => SPECIES_BY_ID[x]).slice(0, NET_EXTRA) : [];
    if (this.extraIds.length) this.netCharges--;
    this.hookedInBonus = this.bonus > 0;
    const taps = Math.max(species.taps, ...this.extraIds.map((x) => SPECIES_BY_ID[x].taps));
    // The treasure rain and the turbo reel both halve the taps.
    const half = this.hookedInBonus || this.turbo > 0;
    if (this.turbo > 0) this.turbo--;
    this.requiredTaps = half ? Math.max(3, Math.ceil(taps / 2)) : taps;
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

  // ---- pirate battle ----
  fire() {
    const p = this.pirate;
    if (this.paused || this.phase !== 'pirate' || !p || p.ball || p.shots <= 0) return false;
    p.shots--;
    p.ball = true;
    return true;
  }

  // The scene reports where the cannonball landed: { hit, kind, sunk }.
  resolveShot({ hit = false, kind = 'small', sunk = false } = {}) {
    const p = this.pirate;
    if (!p || !p.ball) return null;
    p.ball = false;
    let points = 0;
    if (hit && PIRATE_HIT[kind]) {
      p.streak++;
      p.hits++;
      const streak = p.streak >= 3 ? 2 : p.streak === 2 ? 1.5 : 1;
      points = Math.round((PIRATE_HIT[kind] + (sunk ? PIRATE_DEFEAT[kind] : 0)) * streak);
      this.score += points;
      p.loot += points;
    } else p.streak = 0;
    const ended = p.shots <= 0;
    const result = { points, streak: p.streak, ended, loot: p.loot, hits: p.hits };
    if (ended) this.endPirate();
    return result;
  }

  endPirate() {
    this.pirate = null;
    this.phase = this.goalReached || (this.mode === 'arcade' && this.remaining === 0) ? 'complete' : 'aim';
  }

  pause(value = true) { this.paused = value; }

  get goalReached() { return this.tripCatches >= GOAL; }

  swingAim(dt) {
    this.swingTime += dt;
    this.angle = Math.sin(this.swingTime * 1.12) * this.swing;
  }

  tick(dt) {
    if (this.paused || this.phase === 'complete' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.1);
    this.elapsed += dt;
    if (this.fever > 0) this.fever = Math.max(0, this.fever - dt);
    if (this.goldHook > 0) this.goldHook = Math.max(0, this.goldHook - dt);
    if (this.spyglass > 0) this.spyglass = Math.max(0, this.spyglass - dt);
    if (this.bonus > 0) this.bonus = Math.max(0, this.bonus - dt);
    // The arcade clock waits while a bonus stage (treasure rain or pirate battle) is running.
    else if (this.mode === 'arcade' && this.phase !== 'pirate') {
      this.remaining = Math.max(0, this.remaining - dt);
      // A fish already hooked may always be brought home, even after the clock ends.
      if (this.remaining === 0 && this.phase === 'aim') { this.phase = 'complete'; return; }
      if (this.remaining === 0 && this.phase === 'casting') { this.phase = 'returning'; this.combo = 0; }
    }
    if (this.phase === 'aim' && this.bonus === 0 && this.goalReached) { this.phase = 'complete'; return; }
    if (this.phase === 'aim' || this.phase === 'pirate') this.swingAim(dt);
    if (this.phase === 'casting') {
      this.length += 245 * (this.turbo > 0 ? 1.6 : 1) * dt;
      const h = this.hook;
      // A cast that comes back empty ends the combo.
      if (h.y >= this.bounds.floor || h.x <= this.bounds.left || h.x >= this.bounds.right) { this.phase = 'returning'; this.combo = 0; }
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
    const all = [species, ...this.extraIds.map((id) => SPECIES_BY_ID[id])];
    // A message bottle doubles the NEXT catch; the bottle itself is not doubled. Fever doubles on top of that.
    const bottle = this.doubleNext && !all.some((s) => s.effect === 'double') ? 2 : 1;
    if (bottle > 1) this.doubleNext = false;
    const multiplier = bottle * (this.fever > 0 ? 2 : 1);
    const points = all.reduce((sum, s) => sum + s.points, 0) * multiplier;
    let bonusStarted = false;
    let bonusKind = null;
    const powers = [];
    this.score += points;
    for (const s of all) {
      this.catches.push(s.id);
      if (!this.hookedInBonus) this.tripCatches++;
      if (s.effect === 'double') this.doubleNext = true;
      if (s.effect === 'time' && this.mode === 'arcade') this.remaining += TIME_BONUS;
      if (s.effect === 'net') { this.netCharges = Math.min(2, this.netCharges + 1); powers.push('net'); }
      if (s.effect === 'turbo') { this.turbo = TURBO_CATCHES; powers.push('turbo'); }
      if (s.effect === 'goldhook') { this.goldHook = POWER_SECONDS; powers.push('goldhook'); }
      if (s.effect === 'spyglass') { this.spyglass = POWER_SECONDS; powers.push('spyglass'); }
      if (s.effect === 'map' && !bonusStarted) {
        this.maps++;
        if (this.maps >= MAP_PIECES) {
          this.maps = 0;
          bonusStarted = true;
          bonusKind = this.bonusTurn % 2 === 0 ? 'pirate' : 'rain';
          this.bonusTurn = (this.bonusTurn + 1) % 2;
          if (bonusKind === 'rain') this.bonus = BONUS_SECONDS;
          else this.pirateQueued = true;
        }
      }
    }
    let feverStarted = false;
    if (species.kind === 'junk') this.combo = 0;
    else if (this.fever === 0 && ++this.combo >= COMBO_FOR_FEVER) { this.combo = 0; this.fever = FEVER_SECONDS; feverStarted = true; }
    this.landing = { species, extras: all.slice(1), all, points, multiplier, bonusStarted, bonusKind, feverStarted, combo: this.combo, powers };
    this.phase = 'celebrate';
    this.celebration = all.some((s) => s.jackpot) ? 1.8 : 1.05;
    this.onLand(species, this);
  }

  resetHook() {
    this.catchId = null;
    this.extraIds = [];
    this.hookedInBonus = false;
    this.length = WORLD.rest;
    this.targetLength = WORLD.rest;
    this.taps = 0;
    this.requiredTaps = 0;
    if (this.pirateQueued) {
      this.pirateQueued = false;
      this.pirate = { shots: PIRATE_SHOTS, ball: false, streak: 0, loot: 0, hits: 0 };
      this.phase = 'pirate';
      return;
    }
    const finished = this.goalReached || (this.mode === 'arcade' && this.remaining === 0);
    this.phase = finished && this.bonus === 0 ? 'complete' : 'aim';
  }
}
