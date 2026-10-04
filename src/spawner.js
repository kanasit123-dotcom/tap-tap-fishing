import { LANE_COUNT, SPECIES } from './species.js';

// Average seconds of open water after a group has fully entered, per lane (top to seabed).
// The wait only counts down once the lane entrance is clear, so slow creatures do not set a beat.
export const LANE_GAPS = [2.6, 3.2, 3.8, 4.2, 5, 5.8, 3.2];
export const MIN_GAP_PX = 36;
export const RARE_COOLDOWN = 40;
const WAVES = {
  calm: { rate: 0.55, length: [6, 10] },
  normal: { rate: 1, length: [10, 18] },
  rush: { rate: 1.9, length: [4, 7] },
};

// Decides when and what enters each lane. It knows nothing about Phaser: the scene reports
// how much room is left at each lane entrance and turns the returned orders into sprites.
// Gaps are random (exponential), the sea alternates calm/normal/rush waves, schools vary in size
// and speed, and rare treasures have cooldowns, so creatures never arrive on a fixed beat.
export class Spawner {
  // species: creatures that have artwork (and may appear). Odds always come from the full catalog, so a
  // creature still waiting for its artwork leaves its slot empty instead of crowding the lane with the rest.
  constructor({ species = SPECIES, catalog = SPECIES, mode = 'relaxed', rng = Math.random } = {}) {
    this.species = catalog;
    this.available = new Set(species.map((s) => s.id));
    this.mode = mode;
    this.rng = rng;
    this.time = 0;
    this.bonus = false;
    this.lastSeen = {};
    this.lastRare = -Infinity;
    this.dir = Array.from({ length: LANE_COUNT }, (_, lane) => lane % 2 ? -1 : 1);
    this.wait = LANE_GAPS.map((gap) => this.rng() * gap);
    this.wave = { kind: 'normal', until: this.between(...WAVES.normal.length), rushLane: -1 };
  }

  between(min, max) { return min + this.rng() * (max - min); }

  setBonus(on) {
    this.bonus = on;
    // Start the treasure rain at once, then fall back to ordinary timing when it ends.
    this.wait = this.wait.map((wait) => on ? this.rng() * 0.6 : Math.max(wait, 1));
  }

  nextWave() {
    const kind = this.wave.kind !== 'normal' ? 'normal' : ['rush', 'calm', 'normal'][Math.floor(this.rng() * 3)];
    this.wave = { kind, until: this.time + this.between(...WAVES[kind].length), rushLane: kind === 'rush' ? Math.floor(this.rng() * 4) : -1 };
  }

  rate(lane) {
    if (this.bonus) return 1.7;
    const { kind, rushLane } = this.wave;
    return kind === 'rush' && lane !== rushLane && lane !== rushLane + 1 ? 1 : WAVES[kind].rate;
  }

  candidates(lane) {
    if (this.bonus) {
      // Treasure rain: gold fish and treasures float through every lane.
      return this.species.filter((s) => s.bonus && (!s.rare || this.time - this.lastRare >= RARE_COOLDOWN))
        .map((s) => ({ species: s, weight: s.bonus }));
    }
    return this.species
      .filter((s) => s.lane === lane && (!s.arcadeOnly || this.mode === 'arcade'))
      .filter((s) => !s.cooldown || this.time - (this.lastSeen[s.id] ?? -Infinity) >= s.cooldown)
      .filter((s) => !s.rare || this.time - this.lastRare >= RARE_COOLDOWN)
      .map((s) => ({ species: s, weight: s.weight }));
  }

  pick(list) {
    const total = list.reduce((sum, item) => sum + item.weight, 0);
    let roll = this.rng() * total;
    for (const item of list) if ((roll -= item.weight) < 0) return item.species;
    return list.at(-1)?.species ?? null;
  }

  // Exponential gaps feel like a natural sea: mostly short waits, sometimes a long lull.
  gap(lane) {
    const mean = LANE_GAPS[lane] * (this.bonus ? 0.4 : 1);
    const sample = -Math.log(1 - this.rng() * 0.999) * mean;
    return Math.min(mean * 3, Math.max(mean * 0.25, sample));
  }

  // lanes[i] = { count, tailGap, tailSpeed, span }: creatures in the lane, room in px between the
  // entry edge and the nearest creature still entering, that creature's speed, and the crossing width.
  tick(dt, lanes) {
    if (!Number.isFinite(dt) || dt <= 0) return [];
    this.time += dt;
    if (this.time >= this.wave.until) this.nextWave();
    const orders = [];
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const state = lanes[lane] ?? { count: 0, tailGap: Infinity, tailSpeed: 0, span: 600 };
      if (state.tailGap < MIN_GAP_PX) continue;
      this.wait[lane] -= dt * this.rate(lane);
      if (this.wait[lane] > 0) continue;
      const species = this.pick(this.candidates(lane));
      if (!species) { this.wait[lane] = 1; continue; }
      if (!this.available.has(species.id)) { this.wait[lane] = this.gap(lane); continue; }
      // A lane only changes direction while it is empty, so creatures never meet head-on.
      if (!state.count && this.rng() < 0.3) this.dir[lane] *= -1;
      const order = this.order(species, lane, state);
      orders.push(order);
      this.lastSeen[species.id] = this.time;
      if (species.rare) this.lastRare = this.time;
      this.wait[lane] = this.gap(lane);
    }
    return orders;
  }

  order(species, lane, state) {
    const [min, max] = species.group;
    const extra = this.wave.kind === 'rush' && lane === this.wave.rushLane && max > 2 ? 3 : 0;
    const count = this.bonus ? 1 : min + Math.floor(this.rng() * (max - min + 1 + extra));
    // Treasure rain items drift faster than they crawl along the seabed, so the rain stays lively.
    let speed = (this.bonus ? Math.max(species.speed, 26) : species.speed) * this.between(0.85, 1.2);
    // Do not let a faster group catch the previous one while both are still on screen.
    if (state.count && Number.isFinite(state.tailGap) && state.tailSpeed > 0) {
      const room = Math.max(1, state.span - state.tailGap);
      speed = Math.min(speed, state.tailSpeed * (1 + Math.max(0, state.tailGap - MIN_GAP_PX) / room));
    }
    const members = [];
    let offset = 0;
    for (let i = 0; i < count; i++) {
      members.push({ offset, dy: i ? this.between(-0.28, 0.28) : this.between(-0.12, 0.12), phase: this.rng() * Math.PI * 2 });
      offset += species.size * this.between(0.95, 1.5);
    }
    return { species, lane, dir: this.dir[lane], speed, members };
  }
}
