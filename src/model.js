import { SPECIES_BY_ID } from './species.js';
import { StopWheel } from './stopwheel.js';
import { difficultyOf, scaledTaps } from './difficulty.js';

// origin = rod tip. rest = line length while aiming, leaving the hook just under the surface.
export const WORLD = { width: 480, height: 760, originX: 240, originY: 74, rest: 90, floor: 600 };
export const GOAL = 8;
export const ROUND_SECONDS = 90;
export const BONUS_SECONDS = 20;
export const MAP_PIECES = 4;
export const BONUS_KINDS = ['pirate', 'rain', 'wheel'];
export const TIME_BONUS = 10;
// Fever: three catches in a row without a miss (an old boot breaks the run) doubles every catch for a while.
export const COMBO_FOR_FEVER = 3;
export const FEVER_SECONDS = 15;
// Power-ups (caught like treasure, then active): net = the next catch also scoops up to NET_EXTRA creatures
// next to the hook; turbo = the next TURBO_CATCHES catches drop faster and need half the taps;
// golden hook = bigger hook for POWER_SECONDS; spyglass = deep silhouettes show their colours for POWER_SECONDS;
// fog horn = blown at once: the next giant boss is called to the sea right away.
export const NET_EXTRA = 2;
export const TURBO_CATCHES = 3;
export const POWER_SECONDS = 20;
// Pirate mini-game (every other completed map), like the cabinet: unlimited cannonballs for PIRATE_SECONDS,
// then back to fishing. A short reload keeps the fire rate (and the points) sensible.
export const PIRATE_SECONDS = 30;
export const PIRATE_RELOAD = 0.45;
export const PIRATE_HIT = { small: 5, medium: 7, large: 9 };
export const PIRATE_DEFEAT = { small: 15, medium: 30, large: 60 };
export const PIRATE_HP = { small: 1, medium: 2, large: 3 };

export class FishingRound {
  // originX: where this player's rod tip hangs (two boats share the sea); goalCheck: the trip ends when this says so
  // instead of at GOAL catches of this player's own (two players share one goal).
  constructor(mode = 'relaxed', onLand = () => {}, { maps = 0, bonusTurn = 0, startPowers = {}, rng = Math.random, originX = WORLD.originX, goalCheck = null, difficulty = 'normal' } = {}) {
    this.rng = rng;
    this.level = difficultyOf(difficulty);   // taps, hook swing and arcade clock follow the level chosen in the settings
    this.originX = originX;
    this.goalCheck = goalCheck;
    this.waiting = false;         // another player is in a bonus stage: this player's game is held (the clock too)
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
    this.remaining = this.level.seconds;
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
    // Completed maps take turns: the pirate battle, the treasure rain, then the stop-the-wheel stage.
    this.bonusTurn = Number.isSafeInteger(bonusTurn) && bonusTurn > 0 ? bonusTurn % BONUS_KINDS.length : 0;
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
    this.hornCalls = 0;          // fog horns blown this trip (each one calls the next giant at once)
    this.pirate = null;          // { time, cooldown, flying, shots, streak, loot, hits } while the battle runs
    this.pirateQueued = false;
    this.stopWheel = null;       // the stop-the-wheel stage while phase is 'wheel'
    this.wheelQueued = false;
    this.wheelResult = null;
    if (startPowers.net) this.netCharges = 1;
    if (startPowers.turbo) this.turbo = TURBO_CATCHES;
    if (startPowers.goldhook) this.goldHook = POWER_SECONDS;
  }

  get hook() {
    return { x: this.originX + Math.sin(this.angle) * this.length, y: WORLD.originY + Math.cos(this.angle) * this.length };
  }

  setBounds({ floor, left, right }) {
    if ([floor, left, right].every(Number.isFinite) && right > left) this.bounds = { floor, left: left + 24, right: right - 24 };
  }

  cast() {
    if (this.paused || this.waiting || this.phase !== 'aim') return false;
    this.phase = 'casting';
    this.casts++;
    return true;
  }

  // extraIds: creatures next to the hook that a net scoops up together with the hooked one.
  catch(id, extraIds = []) {
    const species = SPECIES_BY_ID[id];
    if (this.paused || this.waiting || this.phase !== 'casting' || !species) return false;
    this.catchId = id;
    this.extraIds = this.netCharges > 0 ? extraIds.filter((x) => SPECIES_BY_ID[x]).slice(0, NET_EXTRA) : [];
    if (this.extraIds.length) this.netCharges--;
    this.hookedInBonus = this.bonus > 0;
    const taps = scaledTaps(Math.max(species.taps, ...this.extraIds.map((x) => SPECIES_BY_ID[x].taps)), this.level);
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
    if (this.paused || this.waiting || this.phase !== 'reeling' || !Number.isFinite(now) || now - this.lastTap < 70 || this.taps >= this.requiredTaps) return false;
    this.lastTap = now;
    this.taps++;
    this.targetLength = WORLD.rest + (this.targetLength - WORLD.rest) * (this.requiredTaps - this.taps) / (this.requiredTaps - this.taps + 1);
    return true;
  }

  // Points of one landed creature: fixed, or drawn from its prize list (the treasure chest is a surprise).
  pointsFor(species) {
    if (!species.prizes) return species.points;
    const total = species.prizes.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = this.rng() * total;
    for (const [points, weight] of species.prizes) if ((roll -= weight) < 0) return points;
    return species.prizes.at(-1)[0];
  }

  // ---- pirate battle ----
  fire() {
    const p = this.pirate;
    if (this.paused || this.waiting || this.phase !== 'pirate' || !p || p.time <= 0 || p.cooldown > 0) return false;
    p.cooldown = PIRATE_RELOAD;
    p.flying++;
    p.shots++;
    return true;
  }

  // The scene reports where the cannonball landed: { hit, kind, sunk }.
  resolveShot({ hit = false, kind = 'small', sunk = false } = {}) {
    const p = this.pirate;
    if (!p || p.flying <= 0) return null;
    p.flying--;
    let points = 0;
    if (hit && PIRATE_HIT[kind]) {
      p.streak++;
      p.hits++;
      const streak = p.streak >= 3 ? 2 : p.streak === 2 ? 1.5 : 1;
      points = Math.round((PIRATE_HIT[kind] + (sunk ? PIRATE_DEFEAT[kind] : 0)) * streak);
      this.score += points;
      p.loot += points;
    } else p.streak = 0;
    // The battle ends when the time is up and the last ball has landed.
    const ended = p.time <= 0 && p.flying === 0;
    const result = { points, streak: p.streak, ended, loot: p.loot, hits: p.hits };
    if (ended) this.endPirate();
    return result;
  }

  endPirate() {
    const p = this.pirate;
    this.pirateResult = p ? { loot: p.loot, hits: p.hits, shots: p.shots } : null;
    this.pirate = null;
    this.phase = this.goalReached || (this.mode === 'arcade' && this.remaining === 0) ? 'complete' : 'aim';
  }

  // ---- stop-the-wheel stage ----
  // The player taps: the spinning wheel settles on whichever prize is under the pointer.
  stopTheWheel() {
    if (this.paused || this.waiting || this.phase !== 'wheel' || !this.stopWheel) return false;
    return this.stopWheel.stop();
  }

  endWheel() {
    const w = this.stopWheel;
    this.wheelResult = w ? { total: w.total, results: [...w.results] } : null;
    this.stopWheel = null;
    this.phase = this.goalReached || (this.mode === 'arcade' && this.remaining === 0) ? 'complete' : 'aim';
  }

  pause(value = true) { this.paused = value; }

  get goalReached() { return this.goalCheck ? this.goalCheck(this) : this.tripCatches >= GOAL; }

  swingAim(dt) {
    this.swingTime += dt;
    this.angle = Math.sin(this.swingTime * 1.12 * this.level.swing) * this.swing;
  }

  tick(dt) {
    if (this.paused || this.waiting || this.phase === 'complete' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.1);
    this.elapsed += dt;
    if (this.fever > 0) this.fever = Math.max(0, this.fever - dt);
    if (this.goldHook > 0) this.goldHook = Math.max(0, this.goldHook - dt);
    if (this.spyglass > 0) this.spyglass = Math.max(0, this.spyglass - dt);
    if (this.bonus > 0) this.bonus = Math.max(0, this.bonus - dt);
    // The arcade clock waits while a bonus stage (treasure rain or pirate battle) is running.
    else if (this.mode === 'arcade' && this.phase !== 'pirate' && this.phase !== 'wheel') {
      this.remaining = Math.max(0, this.remaining - dt);
      // A fish already hooked may always be brought home, even after the clock ends.
      if (this.remaining === 0 && this.phase === 'aim') { this.phase = 'complete'; return; }
      if (this.remaining === 0 && this.phase === 'casting') { this.phase = 'returning'; this.combo = 0; }
    }
    if (this.phase === 'aim' && this.bonus === 0 && this.goalReached) { this.phase = 'complete'; return; }
    if (this.phase === 'aim' || this.phase === 'pirate') this.swingAim(dt);
    if (this.phase === 'pirate' && this.pirate) {
      this.pirate.time = Math.max(0, this.pirate.time - dt);
      this.pirate.cooldown = Math.max(0, this.pirate.cooldown - dt);
      if (this.pirate.time <= 0 && this.pirate.flying === 0) this.endPirate();
    }
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
    if (this.phase === 'wheel' && this.stopWheel) {
      const result = this.stopWheel.tick(dt);
      if (result) this.score += result.points;
      if (this.stopWheel.done) this.endWheel();
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
    const base = all.reduce((sum, s) => sum + this.pointsFor(s), 0);
    const points = base * multiplier;
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
      if (s.effect === 'horn') { this.hornCalls++; powers.push('horn'); }
      if (s.effect === 'map' && !bonusStarted) {
        this.maps++;
        if (this.maps >= MAP_PIECES) {
          this.maps = 0;
          bonusStarted = true;
          bonusKind = BONUS_KINDS[this.bonusTurn % BONUS_KINDS.length];
          this.bonusTurn = (this.bonusTurn + 1) % BONUS_KINDS.length;
          if (bonusKind === 'rain') this.bonus = BONUS_SECONDS;
          else if (bonusKind === 'pirate') this.pirateQueued = true;
          else this.wheelQueued = true;
        }
      }
    }
    let feverStarted = false;
    if (species.kind === 'junk') this.combo = 0;
    else if (this.fever === 0 && ++this.combo >= COMBO_FOR_FEVER) { this.combo = 0; this.fever = FEVER_SECONDS; feverStarted = true; }
    this.landing = { species, extras: all.slice(1), all, base, points, multiplier, bonusStarted, bonusKind, feverStarted, combo: this.combo, powers };
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
    if (this.wheelQueued) {
      this.wheelQueued = false;
      this.stopWheel = new StopWheel(this.rng);
      this.phase = 'wheel';
      return;
    }
    if (this.pirateQueued) {
      this.pirateQueued = false;
      this.pirate = { time: PIRATE_SECONDS, cooldown: 0, flying: 0, shots: 0, streak: 0, loot: 0, hits: 0 };
      this.phase = 'pirate';
      return;
    }
    const finished = this.goalReached || (this.mode === 'arcade' && this.remaining === 0);
    this.phase = finished && this.bonus === 0 ? 'complete' : 'aim';
  }
}
