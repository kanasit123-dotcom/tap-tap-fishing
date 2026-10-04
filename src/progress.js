import { SPECIES } from './species.js';

export const STORAGE_KEY = 'tap-tap-fishing-v1';
export const freshProgress = () => ({ version: 1, collection: {}, best: { relaxed: 0, arcade: 0 }, trips: 0, sound: true });
const count = (n) => Number.isSafeInteger(n) && n >= 0 ? n : 0;

export function loadProgress(storage) {
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY));
    if (raw?.version !== 1) return freshProgress();
    return {
      version: 1,
      collection: Object.fromEntries(SPECIES.map((s) => [s.id, count(raw.collection?.[s.id])])),
      best: { relaxed: count(raw.best?.relaxed), arcade: count(raw.best?.arcade) },
      trips: count(raw.trips), sound: raw.sound !== false,
    };
  } catch { return freshProgress(); }
}

export function saveProgress(storage, progress) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(progress)); return true; }
  catch { return false; }
}

export function recordCatch(progress, id) {
  if (!SPECIES.some((s) => s.id === id)) return;
  progress.collection[id] = count(progress.collection[id]) + 1;
}

export function recordTrip(progress, round) {
  if (round.phase !== 'complete' || round.recorded) return false;
  round.recorded = true;
  progress.best[round.mode] = Math.max(progress.best[round.mode], round.score);
  progress.trips++;
  return true;
}
