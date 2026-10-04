import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SPECIES, ATLASES, LANE_COUNT, SEABED, ZONES, isMystery, displaySize, revealForRise, speciesWithArt } from '../src/species.js';
import manifest from '../src/art-manifest.js';

const ORIGINAL_IDS = ['goldfish', 'clownfish', 'bluefish', 'angelfish', 'pufferfish', 'turtle', 'octopus', 'chest', 'seal', 'shark', 'anglerfish', 'giant-squid'];

test('legacy PNG atlases keep their documented dimensions, transparency and hashes', () => {
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

test('catalog keeps every saved collection id and describes each creature completely', () => {
  const ids = SPECIES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ORIGINAL_IDS) assert.ok(ids.includes(id), `saved id ${id} still exists`);
  assert.ok(SPECIES.length >= 30);
  for (const s of SPECIES) {
    assert.ok(Number.isInteger(s.lane) && s.lane >= 0 && s.lane < LANE_COUNT, s.id);
    assert.ok(Number.isSafeInteger(s.points) && s.points > 0, s.id);
    assert.ok(Number.isSafeInteger(s.taps) && s.taps >= 4 && s.taps <= 24, s.id);
    assert.ok(s.size > 20 && s.speed > 0 && s.weight > 0, s.id);
    assert.ok(s.group[0] >= 1 && s.group[1] >= s.group[0], s.id);
    assert.ok(['animal', 'item', 'junk'].includes(s.kind), s.id);
    assert.ok(s.emoji && s.name, s.id);
    assert.equal(ZONES.filter((zone) => zone.match(s)).length, 1, `${s.id} is in exactly one book section`);
  }
  for (const lane of Array.from({ length: LANE_COUNT }, (_, i) => i)) assert.ok(SPECIES.filter((s) => s.lane === lane).length >= 3);
  assert.ok(SPECIES.filter((s) => s.lane === SEABED && s.kind === 'item').length >= 5, 'treasures on the seabed');
  for (const effect of ['double', 'time', 'map']) assert.ok(SPECIES.some((s) => s.effect === effect));
  assert.ok(SPECIES.some((s) => s.jackpot) && SPECIES.some((s) => s.kind === 'junk'));
  assert.ok(SPECIES.filter((s) => s.bonus).length >= 4, 'treasure rain has a pool');
});

test('legacy atlas rectangles are valid and isolated until the redrawn art replaces them', () => {
  for (const s of SPECIES.filter((x) => x.legacy)) {
    const [atlas, x, y, w, h] = s.legacy;
    const a = ATLASES[atlas];
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= a.width && y + h <= a.height, s.id);
    for (const other of SPECIES.filter((o) => o !== s && o.legacy?.[0] === atlas)) {
      const [, ox, oy, ow, oh] = other.legacy;
      assert.ok(x + w <= ox || ox + ow <= x || y + h <= oy || oy + oh <= y, `${s.id} and ${other.id} do not overlap`);
    }
  }
  assert.deepEqual(SPECIES.filter((s) => s.legacy).map((s) => s.id).sort(), [...ORIGINAL_IDS].sort());
});

test('processed artwork in the manifest exists on disk with the recorded size', () => {
  const webp = (buffer) => {
    assert.equal(buffer.subarray(0, 4).toString(), 'RIFF'); assert.equal(buffer.subarray(8, 12).toString(), 'WEBP');
    const chunk = buffer.subarray(12, 16).toString();
    if (chunk === 'VP8X') return [1 + buffer.readUIntLE(24, 3), 1 + buffer.readUIntLE(27, 3)];
    if (chunk === 'VP8L') { const b = buffer.readUInt32LE(21); return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1]; }
    return [buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff];
  };
  const entries = [...Object.values(manifest.sprites ?? {}), ...Object.values(manifest.backgrounds ?? {})];
  for (const entry of entries) {
    const url = new URL(`../public/assets/${entry.file}`, import.meta.url);
    assert.ok(existsSync(url), entry.file);
    const buffer = readFileSync(url);
    if (entry.file.endsWith('.webp')) assert.deepEqual(webp(buffer), [entry.w, entry.h], entry.file);
  }
  for (const bg of Object.values(manifest.backgrounds ?? {})) assert.ok(bg.waterline > 0 && bg.seabed > bg.waterline && bg.seabed < 1);
  if (manifest.sprites?.boat) assert.ok(manifest.sprites.boat.holder?.length === 2 && manifest.sprites.boat.waterline > manifest.sprites.boat.holder[1]);
  for (const id of Object.keys(manifest.sprites ?? {})) assert.ok(['boat', 'hook'].includes(id) || SPECIES.some((s) => s.id === id), `${id} belongs to the catalog`);
  // Production shows only creatures with real artwork; DEV QA fills the rest with emoji.
  assert.ok(speciesWithArt(false).every((s) => s.art));
  assert.equal(speciesWithArt(true).length, SPECIES.length);
});

test('display sizes keep the artwork proportions and fit the lane height', () => {
  for (const s of SPECIES) {
    const art = s.art ?? { w: 128, h: 128 };
    const size = displaySize(s, art, 1, 50);
    assert.ok(Math.abs(size.width / size.height - art.w / art.h) < 1e-9);
    assert.ok(size.height <= 50 + 1e-9 && size.width <= s.size + 1e-9);
  }
});

test('deep silhouettes reveal gradually by physical rise, not by waiting or naming the catch', () => {
  const shark = SPECIES.find((s) => s.id === 'shark');
  const crab = SPECIES.find((s) => s.id === 'crab');
  const turtle = SPECIES.find((s) => s.id === 'turtle');
  const chest = SPECIES.find((s) => s.id === 'chest');
  assert.ok(isMystery(shark) && isMystery(crab) && !isMystery(turtle) && !isMystery(chest));
  assert.equal(revealForRise(shark, 460, 460, 164), 0);
  assert.ok(revealForRise(shark, 312, 460, 164) > 0 && revealForRise(shark, 312, 460, 164) < 1);
  assert.equal(revealForRise(shark, 164, 460, 164), 1);
  assert.equal(revealForRise(turtle, 413, 413, 164), 1);
});
