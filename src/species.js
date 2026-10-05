import manifest from './art-manifest.js';

// Six swimming lanes plus the seabed, top to bottom. Real y positions come from layout.js.
export const LANE_COUNT = 7;
export const SEABED = 6;
export const MYSTERY_FROM = 4;

export const ZONES = [
  { id: 'shallow', name: 'น้ำตื้น', match: (s) => s.kind === 'animal' && s.lane <= 1 },
  { id: 'middle', name: 'กลางน้ำ', match: (s) => s.kind === 'animal' && (s.lane === 2 || s.lane === 3) },
  { id: 'deep', name: 'ทะเลลึก', match: (s) => s.kind === 'animal' && (s.lane === 4 || s.lane === 5) },
  { id: 'seabed', name: 'พื้นทะเล', match: (s) => s.kind === 'animal' && s.lane === SEABED },
  { id: 'treasure', name: 'สมบัติและของแปลก', match: (s) => s.kind !== 'animal' },
];

// size: display width (world px) at layout scale 1; speed: world px per second;
// weight: relative chance inside its lane; group: school size range; cooldown: seconds between appearances.
const catalog = [
  { id: 'sardine', name: 'ปลาซาร์ดีน', lane: 0, points: 3, taps: 5, size: 48, speed: 50, weight: 30, group: [4, 7], motion: 'school', emoji: '🐟' },
  { id: 'goldfish', name: 'ปลาทอง', lane: 0, points: 5, taps: 6, size: 50, speed: 34, weight: 22, group: [1, 3], bonus: 30, emoji: '🐠' },
  { id: 'clownfish', name: 'ปลาการ์ตูน', lane: 0, points: 8, taps: 7, size: 50, speed: 32, weight: 22, group: [1, 3], emoji: '🐠' },
  { id: 'butterflyfish', name: 'ปลาผีเสื้อ', lane: 0, points: 10, taps: 7, size: 52, speed: 30, weight: 16, group: [1, 2], emoji: '🐠' },
  { id: 'bottle', name: 'ขวดจดหมาย', kind: 'item', effect: 'double', lane: 0, points: 5, taps: 5, size: 46, speed: 16, weight: 5, motion: 'float', cooldown: 25, emoji: '🍾' },

  { id: 'bluefish', name: 'ปลาแทงฟ้า', lane: 1, points: 12, taps: 9, size: 60, speed: 36, weight: 26, group: [1, 3], emoji: '🐟' },
  { id: 'angelfish', name: 'ปลาเทวดา', lane: 1, points: 15, taps: 10, size: 58, speed: 26, weight: 22, group: [1, 2], emoji: '🐠' },
  { id: 'parrotfish', name: 'ปลานกแก้ว', lane: 1, points: 14, taps: 9, size: 66, speed: 30, weight: 22, group: [1, 2], emoji: '🐟' },
  { id: 'seahorse', name: 'ม้าน้ำ', lane: 1, points: 16, taps: 8, size: 30, speed: 14, weight: 14, group: [1, 2], motion: 'bob', emoji: '🦄' },

  { id: 'pufferfish', name: 'ปลาปักเป้า', lane: 2, points: 18, taps: 11, size: 58, speed: 20, weight: 26, group: [1, 2], emoji: '🐡' },
  { id: 'jellyfish', name: 'แมงกะพรุน', lane: 2, points: 12, taps: 8, size: 46, speed: 12, weight: 22, group: [1, 3], motion: 'pulse', noFlip: true, emoji: '🪼' },
  { id: 'turtle', name: 'เต่าทะเล', lane: 2, points: 22, taps: 12, size: 90, speed: 24, weight: 18, emoji: '🐢' },
  { id: 'lionfish', name: 'ปลาสิงโต', lane: 2, points: 24, taps: 12, size: 70, speed: 18, weight: 16, emoji: '🐠' },

  { id: 'octopus', name: 'หมึกสาย', lane: 3, points: 28, taps: 14, size: 74, speed: 22, weight: 24, motion: 'pulse', emoji: '🐙' },
  { id: 'seal', name: 'แมวน้ำ', lane: 3, points: 26, taps: 13, size: 104, speed: 40, weight: 20, emoji: '🦭' },
  { id: 'tuna', name: 'ปลาทูน่า', lane: 3, points: 30, taps: 14, size: 100, speed: 52, weight: 20, group: [2, 3], motion: 'school', emoji: '🐟' },
  { id: 'ray', name: 'ปลากระเบน', lane: 3, points: 32, taps: 15, size: 96, speed: 28, weight: 16, motion: 'glide', emoji: '🐟' },

  { id: 'shark', name: 'ฉลาม', lane: 4, points: 34, taps: 16, size: 140, speed: 34, weight: 28, emoji: '🦈' },
  { id: 'moray', name: 'ปลาไหลมอเรย์', lane: 4, points: 36, taps: 16, size: 130, speed: 24, weight: 22, motion: 'eel', emoji: '🐍' },
  { id: 'anglerfish', name: 'ปลาตกเบ็ด', lane: 4, points: 38, taps: 17, size: 96, speed: 16, weight: 22, emoji: '🐟' },
  { id: 'swordfish', name: 'ปลากระโทงดาบ', lane: 4, points: 42, taps: 18, size: 150, speed: 60, weight: 10, emoji: '🐟' },

  { id: 'grouper', name: 'ปลาเก๋ายักษ์', lane: 5, points: 40, taps: 18, size: 120, speed: 18, weight: 30, emoji: '🐟' },
  { id: 'giant-squid', name: 'หมึกยักษ์', lane: 5, points: 44, taps: 19, size: 130, speed: 26, weight: 26, emoji: '🦑' },
  { id: 'hammerhead', name: 'ฉลามหัวค้อน', lane: 5, points: 46, taps: 20, size: 150, speed: 32, weight: 18, emoji: '🦈' },

  { id: 'starfish', name: 'ปลาดาว', lane: 6, points: 10, taps: 7, size: 44, speed: 13, weight: 24, group: [1, 2], motion: 'spin', noFlip: true, emoji: '⭐' },
  { id: 'crab', name: 'ปูทะเล', lane: 6, points: 15, taps: 9, size: 54, speed: 20, weight: 30, group: [1, 2], motion: 'crawl', noFlip: true, emoji: '🦀' },
  { id: 'lobster-king', name: 'ราชากุ้งมังกร', lane: 6, points: 150, taps: 24, size: 104, speed: 18, weight: 1.2, motion: 'crawl', rare: true, jackpot: true, emoji: '🦞' },
  { id: 'boot', name: 'รองเท้าบูทเก่า', kind: 'junk', lane: 6, points: 1, taps: 4, size: 50, speed: 18, weight: 10, motion: 'drift', emoji: '👢' },
  { id: 'coins', name: 'ถุงเหรียญทอง', kind: 'item', lane: 6, points: 30, taps: 12, size: 48, speed: 18, weight: 10, motion: 'drift', bonus: 30, emoji: '💰' },
  { id: 'pearl', name: 'หอยมุก', kind: 'item', lane: 6, points: 50, taps: 14, size: 52, speed: 18, weight: 7, motion: 'drift', bonus: 18, emoji: '🦪' },
  { id: 'chest', name: 'หีบสมบัติ', kind: 'item', lane: 6, points: 40, taps: 16, size: 76, speed: 18, weight: 7, motion: 'drift', bonus: 14, emoji: '🧰' },
  { id: 'map', name: 'แผนที่สมบัติ', kind: 'item', effect: 'map', lane: 6, points: 20, taps: 10, size: 50, speed: 18, weight: 15, motion: 'drift', cooldown: 30, emoji: '🗺️' },
  { id: 'watch', name: 'นาฬิกาพก', kind: 'item', effect: 'time', lane: 6, points: 10, taps: 8, size: 48, speed: 18, weight: 7, motion: 'drift', cooldown: 25, arcadeOnly: true, emoji: '⏱️' },
  { id: 'crown', name: 'มงกุฎทองคำ', kind: 'item', lane: 6, points: 80, taps: 18, size: 58, speed: 18, weight: 2, motion: 'drift', rare: true, jackpot: true, bonus: 5, emoji: '👑' },
];

// Artwork comes from tools/sprites.py (art/incoming -> public/assets/sprites). A creature without a sprite
// stays out of the sea and the book in production; DEV QA (?qa=1) draws an emoji for it instead.
function artFor(s) {
  const sprite = manifest.sprites?.[s.id];
  return sprite ? { kind: 'sprite', key: `sp-${s.id}`, file: sprite.file, w: sprite.w, h: sprite.h } : null;
}

export const SPECIES = catalog.map((s) => ({ kind: 'animal', group: [1, 1], motion: 'swim', ...s, art: artFor(s) }));
export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
export const PLACEHOLDER_ART = { kind: 'emoji', w: 128, h: 128 };

// Species without finished artwork stay out of the sea and the book (DEV QA can draw emoji instead).
export const speciesWithArt = (placeholders = false) => SPECIES.filter((s) => s.art || placeholders);
export const isMystery = (s) => s.kind === 'animal' && s.lane >= MYSTERY_FROM;
export const isTreasure = (s) => s.kind === 'item';

// Display size in world px: keep the art's aspect ratio and stay inside the lane height.
export function displaySize(s, art, scale = 1, maxHeight = Infinity) {
  const ratio = art.h / art.w;
  let width = s.size * scale;
  if (width * ratio > maxHeight) width = maxHeight / ratio;
  return { width, height: width * ratio };
}

// Deep silhouettes regain their colours while they physically rise towards the surface.
export function revealForRise(species, hookY, caughtY, surfaceY) {
  if (!isMystery(species)) return 1;
  const rise = (caughtY - hookY) / Math.max(1, caughtY - surfaceY);
  return Math.max(0, Math.min(1, (rise - 0.2) / 0.65));
}
