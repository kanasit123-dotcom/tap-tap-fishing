import { LANE_COUNT, SEABED, SPECIES } from './species.js';

// Average seconds of open water after a group has fully entered, per lane (top to seabed).
// The wait only counts down once a lane entrance is clear, so slow creatures do not set a beat.
// Groups arrive from both sides, so each side's gaps are about twice a one-way stream's.
export const LANE_GAPS = [8.5, 8.5, 7.6, 8.4, 10, 11.6, 10];
export const MIN_GAP_PX = 36;
export const RARE_COOLDOWN = 60;
export const STRAY_SHARE = 0.15;  // relative chance of a neighbouring lane's animal straying into a lane
export const REPEAT_SHARE = 0.4;  // the species that arrived two groups ago is this much less likely to come next
const WAVES = {
  calm: { rate: 0.55, length: [6, 10] },
  normal: { rate: 1, length: [10, 18] },
  rush: { rate: 1.9, length: [4, 7] },
};
const zone = (lane) => lane <= 3 ? 'upper' : lane < SEABED ? 'deep' : 'seabed';

// Decides when and what enters each lane. It knows nothing about Phaser: the scene reports how much room is
// left at each lane entrance (per side) and turns the returned orders into sprites.
// Gaps are random (exponential), the sea alternates calm/normal/rush waves, each group picks a side, a depth
// inside its band and its own slow up-and-down wander, schools vary in size, shape and speed, neighbouring
// lanes' animals sometimes stray in, the same species rarely arrives twice in a row, and rare treasures have
// cooldowns, so creatures never arrive as ruled rows on a fixed beat.
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
    this.history = Array.from({ length: LANE_COUNT }, () => []);   // last species ids per lane, newest first
    this.side = [];        // side chosen for each lane's next group (kept until that entrance is clear)
    this.lastRare = -Infinity;
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
    // The species that just arrived never comes straight back in the same lane; the one before is less likely.
    const [last, before] = this.history[lane];
    const list = this.species
      .filter((s) => s.lane === lane || (s.kind === 'animal' && Math.abs(s.lane - lane) === 1 && zone(s.lane) === zone(lane) && zone(lane) !== 'seabed'))
      .filter((s) => !s.arcadeOnly || this.mode === 'arcade')
      .filter((s) => !s.cooldown || this.time - (this.lastSeen[s.id] ?? -Infinity) >= s.cooldown)
      .filter((s) => !s.rare || this.time - this.lastRare >= RARE_COOLDOWN)
      .map((s) => ({ species: s, weight: s.weight * (s.lane === lane ? 1 : STRAY_SHARE) * (s.id === before ? REPEAT_SHARE : 1) }));
    const fresh = list.filter((item) => item.species.id !== last);
    return fresh.length ? fresh : list;
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

  // lanes[i] = { count, span, sides: { 1: { tailGap, tailSpeed }, -1: {...} } }: creatures in the lane, the
  // crossing width, and per entry side the room in px between that edge and the nearest creature still entering
  // from it, plus that creature's speed. Side 1 is the left edge (swimming right), -1 the right edge.
  tick(dt, lanes) {
    if (!Number.isFinite(dt) || dt <= 0) return [];
    this.time += dt;
    if (this.time >= this.wave.until) this.nextWave();
    const orders = [];
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const state = lanes[lane] ?? emptyLane();
      const open = [1, -1].filter((side) => (state.sides?.[side]?.tailGap ?? Infinity) >= MIN_GAP_PX);
      if (!open.length) continue;
      this.wait[lane] -= dt * this.rate(lane);
      if (this.wait[lane] > 0) continue;
      // Each group picks its own side at random and waits for that entrance if it is busy, so sides are
      // independent coin flips rather than a forced left/right alternation.
      this.side[lane] ??= this.rng() < 0.5 ? 1 : -1;
      const dir = this.side[lane];
      if (!open.includes(dir)) continue;
      this.side[lane] = undefined;
      const species = this.pick(this.candidates(lane));
      if (!species) { this.wait[lane] = 1; continue; }
      if (!this.available.has(species.id)) { this.wait[lane] = this.gap(lane); continue; }
      orders.push(this.order(species, lane, dir, state));
      this.lastSeen[species.id] = this.time;
      this.history[lane] = [species.id, this.history[lane][0]];
      if (species.rare) this.lastRare = this.time;
      this.wait[lane] = this.gap(lane);
    }
    return orders;
  }

  order(species, lane, dir, state) {
    const [min, max] = species.group;
    const extra = this.wave.kind === 'rush' && lane === this.wave.rushLane && max > 2 ? 3 : 0;
    const count = this.bonus ? 1 : min + Math.floor(this.rng() * (max - min + 1 + extra));
    // Treasure rain items drift faster than they crawl along the seabed, so the rain stays lively.
    let speed = (this.bonus ? Math.max(species.speed, 26) : species.speed) * this.between(0.8, 1.25);
    // Do not let a faster group catch the previous one from the same side while both are on screen.
    const tail = state.sides?.[dir];
    if (tail && Number.isFinite(tail.tailGap) && tail.tailSpeed > 0) {
      const room = Math.max(1, (state.span ?? 600) - tail.tailGap);
      speed = Math.min(speed, tail.tailSpeed * (1 + Math.max(0, tail.tailGap - MIN_GAP_PX) / room));
    }
    // Depth inside the band (fraction of the lane spacing) and a slow shared wander, so groups never line up.
    const band = lane === SEABED ? 0 : 1;
    // Seabed things sit at slightly different distances on the sand (lower = nearer) instead of one line.
    const depth = band ? this.between(-0.3, 0.3) : this.between(0, 0.14);
    const wander = band * this.between(0.04, 0.16);
    const wanderRate = this.between(0.15, 0.4);
    const wanderPhase = this.rng() * Math.PI * 2;
    // Schools swim close together; other groups are loose, with uneven spacing.
    const tight = species.motion === 'school';
    const members = [];
    let offset = 0;
    for (let i = 0; i < count; i++) {
      members.push({
        offset,
        dy: depth + (i ? band * this.between(tight ? -0.16 : -0.22, tight ? 0.16 : 0.22) : 0),
        phase: this.rng() * Math.PI * 2,
        wander, wanderRate, wanderPhase,
        speedMul: i ? this.between(tight ? 0.99 : 0.97, tight ? 1.01 : 1.03) : 1,
      });
      offset += species.size * (tight ? this.between(0.75, 1.25) : this.between(1, 2.6));
    }
    return { species, lane, dir, speed, members };
  }
}

export const emptyLane = (span = 600) => ({ count: 0, span, sides: { 1: { tailGap: Infinity, tailSpeed: 0 }, [-1]: { tailGap: Infinity, tailSpeed: 0 } } });
