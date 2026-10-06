import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SPECIES, LANE_COUNT, SEABED, ZONES, PROPS, isMystery, displaySize, revealForRise, speciesWithArt } from '../src/species.js';
import manifest from '../src/art-manifest.js';

const ORIGINAL_IDS = ['goldfish', 'clownfish', 'bluefish', 'angelfish', 'pufferfish', 'turtle', 'octopus', 'chest', 'seal', 'shark', 'anglerfish', 'giant-squid'];

function webpSize(buffer) {
  assert.equal(buffer.subarray(0, 4).toString(), 'RIFF'); assert.equal(buffer.subarray(8, 12).toString(), 'WEBP');
  const chunk = buffer.subarray(12, 16).toString();
  if (chunk === 'VP8X') return { size: [1 + buffer.readUIntLE(24, 3), 1 + buffer.readUIntLE(27, 3)], alpha: Boolean(buffer[20] & 0x10) };
  if (chunk === 'VP8L') { const b = buffer.readUInt32LE(21); return { size: [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1], alpha: true }; }
  return { size: [buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff], alpha: false };
}

test('catalog keeps every saved collection id and describes each creature completely', () => {
  const ids = SPECIES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ORIGINAL_IDS) assert.ok(ids.includes(id), `saved id ${id} still exists`);
  assert.ok(SPECIES.length >= 30);
  for (const s of SPECIES) {
    assert.ok(Number.isInteger(s.lane) && s.lane >= 0 && s.lane < LANE_COUNT, s.id);
    assert.ok(Number.isSafeInteger(s.points) && s.points > 0, s.id);
    assert.ok(Number.isSafeInteger(s.taps) && s.taps >= 4 && s.taps <= (s.boss ? 40 : 24), s.id);
    assert.ok(s.size > 20 && s.speed > 0 && s.weight > 0, s.id);
    assert.ok(s.group[0] >= 1 && s.group[1] >= s.group[0], s.id);
    assert.ok(['animal', 'item', 'junk'].includes(s.kind), s.id);
    assert.ok(s.emoji && s.name, s.id);
    assert.equal(ZONES.filter((zone) => zone.match(s)).length, 1, `${s.id} is in exactly one book section`);
  }
  for (const lane of Array.from({ length: LANE_COUNT }, (_, i) => i)) assert.ok(SPECIES.filter((s) => s.lane === lane).length >= 3);
  // As in the cabinets, treasure and special items float through the middle water, not along the seabed.
  const items = SPECIES.filter((s) => s.kind === 'item');
  assert.ok(items.length >= 6 && items.every((s) => s.lane >= 2 && s.lane <= 4), 'treasures in the middle lanes');
  assert.ok(SPECIES.some((s) => s.lane === SEABED && s.jackpot), 'the jackpot lobster still crawls on the seabed');
  for (const effect of ['double', 'time', 'map']) assert.ok(SPECIES.some((s) => s.effect === effect));
  assert.ok(SPECIES.some((s) => s.jackpot) && SPECIES.some((s) => s.kind === 'junk'));
  assert.ok(SPECIES.filter((s) => s.bonus).length >= 4, 'treasure rain has a pool');
});

test('every creature, the boat and both seas have processed artwork that exists with the recorded size', () => {
  // Only creatures still waiting for their sheet may lack a sprite (the fog horn, prompt M); production hides them.
  for (const s of SPECIES) assert.ok(s.art || s.id === 'horn', `${s.id} has a sprite in the manifest`);
  assert.equal(speciesWithArt(false).length, SPECIES.filter((s) => s.art).length);
  assert.ok(speciesWithArt(false).every((s) => s.art));
  assert.ok(manifest.sprites.boat && manifest.backgrounds.portrait && manifest.backgrounds.landscape);
  for (const id of Object.keys(manifest.sprites)) assert.ok(id === 'boat' || PROPS.includes(id) || SPECIES.some((s) => s.id === id), `${id} belongs to the catalog or the props`);
  for (const id of PROPS) assert.ok(manifest.sprites[id], `prop ${id} has artwork`);
  const entries = [...Object.entries(manifest.sprites), ...Object.entries(manifest.backgrounds)];
  for (const [id, entry] of entries) {
    const url = new URL(`../public/assets/${entry.file}`, import.meta.url);
    assert.ok(existsSync(url), entry.file);
    const { size, alpha } = webpSize(readFileSync(url));
    assert.deepEqual(size, [entry.w, entry.h], entry.file);
    if (manifest.sprites[id]) assert.ok(alpha, `${entry.file} keeps its transparency`);
  }
});

test('boat and background anchors lie inside their images in a sensible order', () => {
  const boat = manifest.sprites.boat;
  assert.equal(boat.holder.length, 2);
  assert.ok(boat.holder[0] > boat.w * 0.5 && boat.holder[0] < boat.w, 'rod holder is on the bow side (right)');
  assert.ok(boat.holder[1] > 0 && boat.waterline > boat.holder[1] && boat.waterline < boat.h, 'holder above the waterline above the keel');
  assert.ok(boat.w / boat.h > 1.5, 'side view of the boat');
  for (const bg of Object.values(manifest.backgrounds)) assert.ok(bg.waterline > 0.05 && bg.seabed > bg.waterline + 0.4 && bg.seabed < 0.95);
  assert.ok(manifest.backgrounds.portrait.h > manifest.backgrounds.portrait.w && manifest.backgrounds.landscape.w > manifest.backgrounds.landscape.h);
});

test('display sizes keep the artwork proportions and fit the lane height', () => {
  for (const s of SPECIES) {
    const art = s.art ?? { w: 128, h: 128 };
    const size = displaySize(s, art, 1, 50);
    assert.ok(Math.abs(size.width / size.height - art.w / art.h) < 1e-9);
    assert.ok(size.height <= 50 + 1e-9 && size.width <= s.size + 1e-9);
  }
});

test('every creature stays readable at its smallest on-screen size', () => {
  // Natural proportions: nothing is so tall or so wide that the lane clamp makes it tiny.
  for (const s of SPECIES) {
    if (s.boss || !s.art) continue;
    const size = displaySize(s, s.art, 0.8, 52);
    assert.ok(size.width >= 22 && size.height >= 16, `${s.id} shows ${size.width.toFixed(0)}x${size.height.toFixed(0)}`);
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
