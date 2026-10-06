import { LANE_COUNT, SEABED, SPECIES } from './species.js';

// Average seconds of open water after a group has fully entered, per lane (top to seabed).
// The wait only counts down once a lane entrance is clear, so slow creatures do not set a beat.
// Divided by SWIM_PACE so a faster pace keeps the same number of creatures on screen.
export const SWIM_PACE = 1.12;   // overall swimming speed (user: "a little faster", 2026-10-05)
export const LANE_GAPS = [4.25, 4.25, 3.8, 4.2, 5, 5.8, 5].map((gap) => gap / SWIM_PACE);
export const MIN_GAP_PX = 36;
export const RARE_COOLDOWN = 60;
export const BOSS_FIRST = [15, 30];    // seconds until the first boss of a trip
export const BOSS_EVERY = [35, 55];    // seconds of open sea between one boss leaving and the next arriving
export const BOSS_LANE = 3;
// "New faces": creatures the player has never caught visit more often, so the rare ones are not left to luck in a short trip.
export const GUEST_FIRST = [12, 22];   // seconds until the first guest of a trip
export const GUEST_EVERY = [24, 36];   // seconds between guests
export const GUEST_RECENT = 45;        // a species seen this recently is not sent again as a guest
export const STRAY_SHARE = 0.15;  // relative chance of a neighbouring lane's animal straying into a lane
export const REPEAT_SHARE = 0.4;  // the species that arrived two groups ago is this much less likely to come next
const WAVES = {
  calm: { rate: 0.55, length: [6, 10] },
  normal: { rate: 1, length: [10, 18] },
  rush: { rate: 1.9, length: [4, 7] },
};
const zone = (lane) => lane <= 3 ? 'upper' : lane < SEABED ? 'deep' : 'seabed';

// Decides when and what enters each lane. It knows nothing about Phaser: the scene reports how much room is
// left at each lane entrance and turns the returned orders into sprites.
// As in the arcade cabinets, every creature in a lane swims the same way for the whole trip and neighbouring
// lanes alternate (which way the top lane goes is random per trip). Within that, gaps are random (exponential),
// the sea alternates calm/normal/rush waves, each group takes its own depth inside the band and a slow
// up-and-down wander, schools vary in size, shape and speed, neighbouring lanes' animals sometimes stray in,
// the same species never arrives twice in a row, and rare treasures have cooldowns.
export class Spawner {
  // species: creatures that have artwork (and may appear). Odds always come from the full catalog, so a
  // creature still waiting for its artwork leaves its slot empty instead of crowding the lane with the rest.
  // wanted: () => ids of creatures the player has not caught yet (they get visits from the guest rule).
  constructor({ species = SPECIES, catalog = SPECIES, mode = 'relaxed', rng = Math.random, wanted = () => [], speedScale = 1 } = {}) {
    this.species = catalog;
    this.speedScale = Number.isFinite(speedScale) && speedScale > 0 ? speedScale : 1;   // the difficulty: how fast creatures swim
    this.wanted = wanted;
    this.available = new Set(species.map((s) => s.id));
    this.mode = mode;
    this.rng = rng;
    this.time = 0;
    this.bonus = false;
    this.lastSeen = {};
    this.history = Array.from({ length: LANE_COUNT }, () => []);   // last species ids per lane, newest first
    // One direction per lane for the whole trip; neighbouring lanes alternate. 1 = swims right (enters left).
    const first = this.rng() < 0.5 ? 1 : -1;
    this.dir = Array.from({ length: LANE_COUNT }, (_, lane) => lane % 2 ? -first : first);
    this.lastRare = -Infinity;
    this.wait = LANE_GAPS.map((gap) => this.rng() * gap);
    this.wave = { kind: 'normal', until: this.between(...WAVES.normal.length), rushLane: -1 };
    this.bossIn = this.between(...BOSS_FIRST);
    this.guestIn = this.between(...GUEST_FIRST);
    this.bossWaiting = false;
    this.nextBoss = null;
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
      .filter((s) => !s.boss)
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
    // Faster creatures cross sooner, so the gaps shrink with them and the sea keeps the same number of creatures on screen.
    const mean = LANE_GAPS[lane] * (this.bonus ? 0.4 : 1) / this.speedScale;
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
    const boss = this.bossTick(dt, lanes);
    if (boss) orders.push(boss);
    const guest = this.guestTick(dt, lanes);
    if (guest) orders.push(guest);
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const state = lanes[lane] ?? emptyLane();
      const dir = this.dir[lane];
      if ((state.sides?.[dir]?.tailGap ?? Infinity) < MIN_GAP_PX) continue;
      // A boss waiting for a clear road keeps its lane free of newcomers, so the road clears.
      if (lane === BOSS_LANE && this.bossWaiting) continue;
      this.wait[lane] -= dt * this.rate(lane);
      if (this.wait[lane] > 0) continue;
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

  // The fog horn: the next boss comes as soon as the sea is free of the current one (not during the treasure rain).
  callBoss() { this.bossIn = 0; this.nextBoss = null; }

  // Bosses and creatures that are new to the player are the visitors the player has not caught yet.
  isWanted(species) { return this.wantedSet?.has(species.id) ?? false; }

  refreshWanted() { this.wantedSet = new Set(this.wanted()); }

  // A boss (with artwork) crosses the middle of the sea about once a minute and a half, never during the treasure rain.
  // It swims at its own pace: when the creature ahead is slower it waits for a clear road instead of crawling behind it.
  bossTick(dt, lanes) {
    // Not waiting for a clear road any more when the treasure rain starts or another giant is already here
    // (a boss that was waiting would otherwise keep its lane shut for the whole rain).
    if (this.bonus || (lanes[BOSS_LANE]?.bosses ?? 0) > 0) { this.bossWaiting = false; return null; }
    this.bossIn -= dt;
    if (this.bossIn > 0) return null;
    const bosses = this.species.filter((s) => s.boss && this.available.has(s.id));
    if (!bosses.length) { this.bossIn = 60; return null; }
    const dir = this.dir[BOSS_LANE];
    const state = lanes[BOSS_LANE];
    if ((state?.sides?.[dir]?.tailGap ?? Infinity) < MIN_GAP_PX) { this.bossWaiting = true; return null; }
    if (!this.nextBoss || !bosses.includes(this.nextBoss)) {
      this.refreshWanted();
      // A boss never comes twice in a row, and one the player has not caught yet is four times as likely.
      const pool = bosses.filter((s) => s.id !== this.lastBoss);
      const list = (pool.length ? pool : bosses).map((species) => ({ species, weight: this.isWanted(species) ? 4 : 1 }));
      this.nextBoss = this.pick(list);
    }
    const species = this.nextBoss;
    const speed = species.speed * SWIM_PACE * this.speedScale;
    // Faster than the creature ahead: it must be far enough ahead that the boss cannot catch it before it leaves.
    const tail = state?.sides?.[dir];
    if (tail && Number.isFinite(tail.tailGap) && tail.tailSpeed > 0 && speed > tail.tailSpeed) {
      const span = state.span ?? 600;
      const k = speed / tail.tailSpeed - 1;
      if (tail.tailGap < (MIN_GAP_PX + k * span) / (1 + k)) { this.bossWaiting = true; return null; }
    }
    this.bossWaiting = false;
    this.nextBoss = null;
    this.lastBoss = species.id;
    this.bossIn = this.between(...BOSS_EVERY);
    this.lastSeen[species.id] = this.time;
    // Nothing follows right behind it; the creature after it would catch up with the slower ones.
    this.wait[BOSS_LANE] = Math.max(this.wait[BOSS_LANE], 7);
    return { species, lane: BOSS_LANE, dir, speed, boss: true,
      members: [{ offset: 0, dy: 0, phase: this.rng() * Math.PI * 2, wander: 0, wanderRate: 0.2, wanderPhase: 0, speedMul: 1 }] };
  }

  // Every half minute or so one creature the player has never caught swims in on its own, whatever its usual odds.
  // Rare ones are favoured: their natural chance is so small that a short trip would otherwise never show them.
  guestTick(dt, lanes) {
    if (this.bonus) return null;
    this.guestIn -= dt;
    if (this.guestIn > 0) return null;
    this.refreshWanted();
    const list = this.species
      .filter((s) => !s.boss && this.isWanted(s) && this.available.has(s.id))
      .filter((s) => !s.arcadeOnly || this.mode === 'arcade')
      .filter((s) => this.time - (this.lastSeen[s.id] ?? -Infinity) >= GUEST_RECENT)
      .filter((s) => (lanes[s.lane]?.sides?.[this.dir[s.lane]]?.tailGap ?? Infinity) >= MIN_GAP_PX)
      .map((s) => ({ species: s, weight: s.rare ? 8 : s.weight < 8 ? 4 : s.weight < 15 ? 2 : 1 }));
    if (!list.length) { this.guestIn = 4; return null; }
    const species = this.pick(list);
    const lane = species.lane;
    this.guestIn = this.between(...GUEST_EVERY);
    this.lastSeen[species.id] = this.time;
    this.history[lane] = [species.id, this.history[lane][0]];
    if (species.rare) this.lastRare = this.time;
    this.wait[lane] = Math.max(this.wait[lane], this.gap(lane));
    return this.order(species, lane, this.dir[lane], lanes[lane] ?? emptyLane(), true);
  }

  order(species, lane, dir, state, solo = false) {
    const [min, max] = species.group;
    const extra = this.wave.kind === 'rush' && lane === this.wave.rushLane && max > 2 ? 3 : 0;
    const count = this.bonus || solo ? 1 : min + Math.floor(this.rng() * (max - min + 1 + extra));
    // Treasure rain items drift faster than they crawl along the seabed, so the rain stays lively.
    let speed = (this.bonus ? Math.max(species.speed, 26) : species.speed) * SWIM_PACE * this.speedScale * this.between(0.8, 1.25);
    // Do not let a faster group catch the previous one while both are on screen.
    const tail = state.sides?.[dir];
    if (tail && Number.isFinite(tail.tailGap) && tail.tailSpeed > 0) {
      const room = Math.max(1, (state.span ?? 600) - tail.tailGap);
      speed = Math.min(speed, tail.tailSpeed * (1 + Math.max(0, tail.tailGap - MIN_GAP_PX) / room));
    }
    // Depth inside the band (fraction of the lane spacing) and a slow shared wander, so groups never line up.
    const band = lane === SEABED ? 0 : 1;
    // Seabed things sit at slightly different distances on the sand (lower = nearer) instead of one line.
    // Kept small enough that each lane still reads as its own row (neighbouring rows swim the other way).
    const depth = band ? this.between(-0.14, 0.14) : this.between(0, 0.12);
    const wander = band * this.between(0.03, 0.08);
    const wanderRate = this.between(0.15, 0.4);
    const wanderPhase = this.rng() * Math.PI * 2;
    // Schools swim close together; other groups are loose, with uneven spacing.
    const tight = species.motion === 'school';
    const members = [];
    let offset = 0;
    for (let i = 0; i < count; i++) {
      members.push({
        offset,
        dy: depth + (i ? band * this.between(tight ? -0.1 : -0.12, tight ? 0.1 : 0.12) : 0),
        phase: this.rng() * Math.PI * 2,
        wander, wanderRate, wanderPhase,
        speedMul: i ? this.between(tight ? 0.99 : 0.97, tight ? 1.01 : 1.03) : 1,
      });
      offset += species.size * (tight ? this.between(0.75, 1.25) : this.between(1, 2.6));
    }
    return { species, lane, dir, speed, members };
  }
}

export const emptyLane = (span = 600) => ({ count: 0, bosses: 0, span, sides: { 1: { tailGap: Infinity, tailSpeed: 0 }, [-1]: { tailGap: Infinity, tailSpeed: 0 } } });
