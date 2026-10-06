import test from 'node:test';
import assert from 'node:assert/strict';
import { STICKERS, STICKER_IDS, STICKER_BY_ID, earnedByCollection, earnedByLanding, award, sanitizeStickers } from '../src/stickers.js';
import { SPECIES, SPECIES_BY_ID, ZONES, speciesWithArt } from '../src/species.js';
import { freshProgress, loadProgress, saveProgress, resetProgress } from '../src/progress.js';
import manifest from '../src/art-manifest.js';

const withArt = speciesWithArt(false);
const catchAll = (list) => Object.fromEntries(list.map((s) => [s.id, 1]));
const landing = (ids, extra = {}) => ({ all: ids.map((id) => SPECIES_BY_ID[id]), powers: [], feverStarted: false, ...extra });
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('sixteen stickers, each with its own picture, in the order of the picture sheet', () => {
  assert.equal(STICKERS.length, 16);
  assert.equal(new Set(STICKER_IDS).size, 16);
  assert.deepEqual(STICKERS.map((s) => s.art), ['st-first-catch', 'st-shallow', 'st-middle', 'st-deep', 'st-seabed', 'st-giants', 'st-special', 'st-fever', 'st-jackpot', 'st-pirate', 'st-wheel', 'st-duo', 'st-horn', 'st-daily', 'st-night', 'st-all']);
  for (const s of STICKERS) { assert.ok(manifest.sprites[s.art], `${s.id} picture`); assert.ok(s.name.length >= 3 && s.how.length >= 6, s.id); if (s.zone) assert.ok(ZONES.some((z) => z.id === s.zone), `${s.id} zone`); }
});

test('the collection earns the first catch, each finished book section and the whole book', () => {
  assert.deepEqual(earnedByCollection({}, withArt, ZONES), []);
  assert.deepEqual(earnedByCollection({ goldfish: 1 }, withArt, ZONES), ['first-catch']);
  const shallow = withArt.filter(ZONES.find((z) => z.id === 'shallow').match);
  const nearly = catchAll(shallow.slice(1));
  assert.deepEqual(earnedByCollection(nearly, withArt, ZONES), ['first-catch'], 'one short of a section earns no section sticker');
  assert.deepEqual(earnedByCollection(catchAll(shallow), withArt, ZONES), ['first-catch', 'shallow']);
  for (const sticker of STICKERS.filter((s) => s.zone)) {
    const zone = ZONES.find((z) => z.id === sticker.zone);
    assert.ok(earnedByCollection(catchAll(withArt.filter(zone.match)), withArt, ZONES).includes(sticker.id), sticker.id);
  }
  const everything = earnedByCollection(catchAll(withArt), withArt, ZONES);
  assert.equal(everything.length, 1 + STICKERS.filter((s) => s.zone).length + 1);
  assert.ok(everything.includes('all'));
  assert.ok(!earnedByCollection(catchAll(withArt.slice(1)), withArt, ZONES).includes('all'));
});

test('the special creatures have their own section, so they never change what the boat looks need', () => {
  const special = withArt.filter((s) => s.special);
  assert.equal(special.length, 8);
  for (const id of ['shallow', 'middle', 'deep', 'seabed']) assert.ok(!withArt.filter(ZONES.find((z) => z.id === id).match).some((s) => s.special), id);
  assert.deepEqual(special.map((s) => s.id).sort(), ['coelacanth', 'giant-crayfish', 'giant-octopus', 'leafy-dragon', 'mantis-shrimp', 'nautilus', 'oarfish', 'sunfish']);
});

test('a landing earns FEVER, jackpot and fog-horn stickers', () => {
  assert.deepEqual(earnedByLanding(landing(['goldfish'])), []);
  assert.deepEqual(earnedByLanding(landing(['goldfish'], { feverStarted: true })), ['fever']);
  assert.deepEqual(earnedByLanding(landing(['crown'])), ['jackpot']);
  assert.deepEqual(earnedByLanding(landing(['lobster-king'])), ['jackpot']);
  assert.deepEqual(earnedByLanding(landing(['horn'], { powers: ['horn'] })), ['horn']);
  assert.deepEqual(earnedByLanding(landing(['crown', 'goldfish'], { feverStarted: true })).sort(), ['fever', 'jackpot']);
});

test('awarding gives each sticker once and ignores unknown names', () => {
  const progress = freshProgress();
  assert.deepEqual(award(progress, ['fever', 'duo']), ['fever', 'duo']);
  assert.deepEqual(award(progress, ['fever', 'night', 'nonsense']), ['night']);
  assert.deepEqual(progress.stickers, { fever: true, duo: true, night: true });
});

test('stickers are saved, damaged saves lose only the broken part, and "clear everything" removes them', () => {
  const store = memory(); const progress = freshProgress();
  award(progress, ['pirate', 'all']); saveProgress(store, progress);
  assert.deepEqual(loadProgress(store).stickers, { pirate: true, all: true });
  assert.deepEqual(sanitizeStickers({ pirate: true, ghost: true, fever: 'yes', wheel: 1 }), { pirate: true });
  assert.deepEqual(sanitizeStickers(null), {}); assert.deepEqual(sanitizeStickers('x'), {});
  assert.deepEqual(resetProgress(progress).stickers, {});
  assert.ok(STICKER_BY_ID.pirate.how.includes('โจรสลัด'));
});
