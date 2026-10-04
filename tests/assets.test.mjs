import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SPECIES, LANES } from '../src/species.js';
import { WORLD } from '../src/model.js';

test('generated PNG assets have the documented dimensions, transparency and hashes', () => {
  for (const [file, width, height, type, hash] of [
    ['cove.png', 1024, 1536, null, '047f24530850ff1e1ffbe16bc27ddbc4af8fa6ae7244a68572bebc15baf37887'],
    ['sea-creatures.png', 1536, 1024, 6, '6cebe4cdfb69e97bb1a63dbbe55bb42768622268a856bf9ee2f2bcfd3ea2c4bb'],
  ]) {
    const png = readFileSync(new URL(`../public/assets/${file}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), width); assert.equal(png.readUInt32BE(20), height);
    if (type !== null) assert.equal(png[25], type);
    assert.equal(createHash('sha256').update(png).digest('hex'), hash);
  }
});

test('all eight species occupy unique valid atlas frames and reachable depth lanes', () => {
  assert.equal(SPECIES.length, 8); assert.equal(new Set(SPECIES.map((s) => s.id)).size, 8);
  assert.deepEqual(SPECIES.map((s) => s.frame), [0, 1, 2, 3, 4, 5, 6, 7]);
  for (const s of SPECIES) {
    assert.ok(LANES[s.lane] > WORLD.originY + WORLD.rest + 40 && LANES[s.lane] < WORLD.floor);
    assert.ok(Number.isSafeInteger(s.taps) && s.taps >= 6 && s.taps <= 16);
    assert.ok(Number.isSafeInteger(s.points) && s.points > 0);
  }
});
