import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SPECIES, SCHOOLS, ROW_POPULATIONS, LANES, ATLASES, SWIM_LOOP, spawnX, directionFor, wrapX, revealForRise } from '../src/species.js';
import { WORLD } from '../src/model.js';

test('generated PNG assets have the documented dimensions, transparency and hashes', () => {
  for (const [file, width, height, type, hash] of [
    ['cove.png', 1024, 1536, null, '047f24530850ff1e1ffbe16bc27ddbc4af8fa6ae7244a68572bebc15baf37887'],
    ['sea-creatures.png', 1536, 1024, 6, '6cebe4cdfb69e97bb1a63dbbe55bb42768622268a856bf9ee2f2bcfd3ea2c4bb'],
    ['deep-creatures.png', 1254, 1254, 6, '1079fd75608d1ec8afb0a2ec41f2397579221550db7644d2d9d757e803b39c58'],
  ]) {
    const png = readFileSync(new URL(`../public/assets/${file}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), width); assert.equal(png.readUInt32BE(20), height);
    if (type !== null) assert.equal(png[25], type);
    assert.equal(createHash('sha256').update(png).digest('hex'), hash);
  }
});

test('all twelve species have isolated valid atlas rectangles and reachable depth lanes', () => {
  assert.equal(SPECIES.length, 12); assert.equal(new Set(SPECIES.map((s) => s.id)).size, 12);
  for (const s of SPECIES) {
    const a = ATLASES[s.atlas]; const [x, y, w, h] = s.rect;
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= a.width && y + h <= a.height);
    assert.ok(LANES[s.lane] > WORLD.originY + WORLD.rest + 40 && LANES[s.lane] < WORLD.floor);
    assert.ok(Number.isSafeInteger(s.taps) && s.taps >= 6 && s.taps <= 19);
    assert.ok(Number.isSafeInteger(s.points) && s.points > 0);
    assert.ok(Math.abs(s.width / s.height - w / h) < 0.00001, 'preserve animal proportions');
    for (const other of SPECIES) {
      if (s === other || s.atlas !== other.atlas) continue;
      const [ox, oy, ow, oh] = other.rect;
      assert.ok(x + w <= ox || ox + ow <= x || y + h <= oy || oy + oh <= y, 'no source rectangle overlaps');
    }
  }
});

test('depth rows leave clear vertical gaps and swim with fixed horizontal spacing', () => {
  for (let lane = 0; lane < LANES.length; lane++) {
    const row = SPECIES.filter((s) => s.lane === lane);
    assert.equal(row.length, 2);
    assert.equal(row[0].speed, row[1].speed); assert.equal(directionFor(row[0]), directionFor(row[1]));
    const school = SCHOOLS.filter((s) => s.species.lane === lane);
    assert.equal(school.length, ROW_POPULATIONS[lane]);
    for (const { species, slot } of school) {
      const next = school[(slot + 1) % school.length];
      const spacing = wrapX(spawnX(next.species, next.slot) - spawnX(species, slot) + SWIM_LOOP.left) - SWIM_LOOP.left;
      assert.ok(Math.abs(spacing - SWIM_LOOP.width / school.length) < 0.00001);
      assert.ok(spacing - (species.width + next.species.width) / 2 > 20, 'leave gaps for deeper casts');
    }
    if (lane < LANES.length - 1) {
      const next = SPECIES.filter((s) => s.lane === lane + 1);
      assert.ok(LANES[lane + 1] - LANES[lane] - Math.max(...row.map((s) => s.height)) / 2 - Math.max(...next.map((s) => s.height)) / 2 >= 3);
    }
  }
  const top = SPECIES.filter((s) => s.lane <= 1);
  const deep = SPECIES.filter((s) => s.lane >= 4);
  assert.ok(Math.min(...deep.map((s) => s.width)) > Math.max(...top.map((s) => s.width)));
  assert.equal(SCHOOLS.length, 32);
});

test('deep silhouettes reveal gradually by physical rise, not by waiting or naming the catch', () => {
  assert.equal(revealForRise(4, 460, 460), 0);
  assert.equal(revealForRise(5, 530, 530), 0);
  assert.ok(revealForRise(4, 312, 460) > 0 && revealForRise(4, 312, 460) < 1);
  assert.equal(revealForRise(4, 164, 460), 1);
  assert.equal(revealForRise(5, 164, 530), 1);
  assert.equal(revealForRise(3, 413, 413), 1);
});

test('swim wrapping preserves overshoot and row spacing in either direction', () => {
  assert.equal(wrapX(SWIM_LOOP.right + 3), SWIM_LOOP.left + 3);
  assert.equal(wrapX(SWIM_LOOP.left - 2), SWIM_LOOP.right - 2);
  for (const s of SPECIES) for (const time of [0, 30, 90, 600]) {
    const x = wrapX(spawnX(s) + directionFor(s) * s.speed * time);
    assert.ok(x >= SWIM_LOOP.left && x < SWIM_LOOP.right);
  }
});
