import manifest from './art-manifest.js';

// Six swimming lanes plus the seabed, top to bottom. Real y positions come from layout.js.
export const LANE_COUNT = 7;
export const SEABED = 6;
export const MYSTERY_FROM = 4;

// The special creatures have a section of their own, so they never change what a depth section needs for the boat looks.
export const ZONES = [
  { id: 'shallow', name: 'น้ำตื้น', match: (s) => s.kind === 'animal' && !s.boss && !s.special && s.lane <= 1 },
  { id: 'middle', name: 'กลางน้ำ', match: (s) => s.kind === 'animal' && !s.boss && !s.special && (s.lane === 2 || s.lane === 3) },
  { id: 'deep', name: 'ทะเลลึก', match: (s) => s.kind === 'animal' && !s.boss && !s.special && (s.lane === 4 || s.lane === 5) },
  { id: 'seabed', name: 'พื้นทะเล', match: (s) => s.kind === 'animal' && !s.boss && !s.special && s.lane === SEABED },
  { id: 'special', name: 'ปลาพิเศษ', match: (s) => Boolean(s.special) },
  { id: 'boss', name: 'ยักษ์ใหญ่', match: (s) => Boolean(s.boss) },
  { id: 'treasure', name: 'สมบัติและของแปลก', match: (s) => s.kind !== 'animal' },
];

// size: display width (world px) at layout scale 1; speed: world px per second;
// weight: relative chance inside its lane; group: school size range; cooldown: seconds between appearances.
const catalog = [
  // Shallow: small fish alone or in pairs, sardines in a small school.
  { id: 'sardine', name: 'ปลาซาร์ดีน', lane: 0, points: 3, taps: 5, size: 48, speed: 46, weight: 14, group: [3, 4], motion: 'school', emoji: '🐟' },
  { id: 'goldfish', name: 'ปลาทอง', lane: 0, points: 5, taps: 6, size: 50, speed: 34, weight: 22, group: [1, 2], bonus: 30, emoji: '🐠' },
  { id: 'clownfish', name: 'ปลาการ์ตูน', lane: 0, points: 8, taps: 7, size: 50, speed: 32, weight: 22, group: [1, 2], emoji: '🐠' },
  { id: 'mackerel', name: 'ปลาทู', lane: 0, points: 4, taps: 5, size: 52, speed: 44, weight: 16, group: [2, 4], motion: 'school', emoji: '🐟' },
  { id: 'yellow-tang', name: 'ปลาขี้ตังเบ็ดเหลือง', lane: 0, points: 9, taps: 7, size: 50, speed: 30, weight: 18, group: [1, 2], emoji: '🐠' },
  { id: 'damselfish', name: 'ปลาสลิดหินฟ้า', lane: 0, points: 6, taps: 6, size: 38, speed: 38, weight: 16, group: [1, 3], emoji: '🐟' },
  { id: 'butterflyfish', name: 'ปลาผีเสื้อ', lane: 0, points: 10, taps: 7, size: 52, speed: 30, weight: 18, group: [1, 2], emoji: '🐠' },

  { id: 'bluefish', name: 'ปลาแทงฟ้า', lane: 1, points: 12, taps: 9, size: 60, speed: 36, weight: 24, group: [1, 2], emoji: '🐟' },
  { id: 'angelfish', name: 'ปลาเทวดา', lane: 1, points: 15, taps: 10, size: 58, speed: 26, weight: 22, group: [1, 2], emoji: '🐠' },
  { id: 'parrotfish', name: 'ปลานกแก้ว', lane: 1, points: 14, taps: 9, size: 66, speed: 30, weight: 22, group: [1, 2], emoji: '🐟' },
  { id: 'moorish-idol', name: 'ปลาผีเสื้อเทวรูป', lane: 1, points: 15, taps: 9, size: 60, speed: 26, weight: 18, group: [1, 2], emoji: '🐠' },
  { id: 'seahorse', name: 'ม้าน้ำ', lane: 1, points: 16, taps: 8, size: 30, speed: 14, weight: 14, group: [1, 2], motion: 'bob', emoji: '🦄' },

  // Middle water: animals, plus treasure and special items floating by (as in the arcade cabinets).
  { id: 'pufferfish', name: 'ปลาปักเป้า', lane: 2, points: 18, taps: 11, size: 58, speed: 20, weight: 24, group: [1, 2], emoji: '🐡' },
  { id: 'jellyfish', name: 'แมงกะพรุน', lane: 2, points: 12, taps: 8, size: 46, speed: 12, weight: 20, group: [1, 2], motion: 'pulse', noFlip: true, emoji: '🪼' },
  { id: 'turtle', name: 'เต่าทะเล', lane: 2, points: 22, taps: 12, size: 90, speed: 24, weight: 18, emoji: '🐢' },
  { id: 'lionfish', name: 'ปลาสิงโต', lane: 2, points: 24, taps: 12, size: 70, speed: 18, weight: 16, emoji: '🐠' },
  { id: 'cuttlefish', name: 'หมึกกระดอง', lane: 2, points: 20, taps: 11, size: 66, speed: 20, weight: 18, motion: 'glide', emoji: '🦑' },
  { id: 'batfish', name: 'ปลาค้างคาว', lane: 2, points: 20, taps: 11, size: 62, speed: 18, weight: 16, emoji: '🐟' },
  { id: 'bottle', name: 'ขวดจดหมาย', kind: 'item', effect: 'double', lane: 2, points: 5, taps: 5, size: 46, speed: 20, weight: 5, motion: 'float', cooldown: 25, emoji: '🍾' },
  { id: 'coins', name: 'ถุงเหรียญทอง', kind: 'item', lane: 2, points: 30, taps: 12, size: 48, speed: 22, weight: 8, motion: 'float', bonus: 30, emoji: '💰' },

  { id: 'net', name: 'แห', kind: 'item', effect: 'net', lane: 2, points: 10, taps: 6, size: 54, speed: 20, weight: 4, motion: 'float', cooldown: 35, emoji: '🕸️' },
  { id: 'turbo-reel', name: 'รอกเร็ว', kind: 'item', effect: 'turbo', lane: 2, points: 10, taps: 6, size: 50, speed: 22, weight: 4, motion: 'float', cooldown: 35, emoji: '🎣' },
  { id: 'octopus', name: 'หมึกสาย', lane: 3, points: 28, taps: 14, size: 74, speed: 22, weight: 22, motion: 'pulse', emoji: '🐙' },
  { id: 'seal', name: 'แมวน้ำ', lane: 3, points: 26, taps: 13, size: 104, speed: 40, weight: 20, emoji: '🦭' },
  { id: 'tuna', name: 'ปลาทูน่า', lane: 3, points: 30, taps: 14, size: 100, speed: 52, weight: 18, group: [2, 3], motion: 'school', emoji: '🐟' },
  { id: 'ray', name: 'ปลากระเบน', lane: 3, points: 32, taps: 15, size: 96, speed: 28, weight: 16, motion: 'glide', emoji: '🐟' },
  { id: 'barracuda', name: 'ปลาสาก', lane: 3, points: 30, taps: 14, size: 110, speed: 56, weight: 16, emoji: '🐟' },
  { id: 'dolphin', name: 'โลมา', lane: 3, points: 45, taps: 16, size: 120, speed: 64, weight: 6, cooldown: 30, emoji: '🐬' },
  { id: 'pearl', name: 'หอยมุก', kind: 'item', lane: 3, points: 50, taps: 14, size: 52, speed: 20, weight: 6, motion: 'float', bonus: 18, emoji: '🦪' },
  { id: 'map', name: 'แผนที่สมบัติ', kind: 'item', effect: 'map', lane: 3, points: 20, taps: 10, size: 50, speed: 20, weight: 12, motion: 'float', cooldown: 30, emoji: '🗺️' },
  { id: 'watch', name: 'นาฬิกาพก', kind: 'item', effect: 'time', lane: 3, points: 10, taps: 8, size: 48, speed: 22, weight: 7, motion: 'float', cooldown: 25, arcadeOnly: true, emoji: '⏱️' },

  { id: 'gold-hook', name: 'ตะขอทอง', kind: 'item', effect: 'goldhook', lane: 3, points: 10, taps: 6, size: 40, speed: 20, weight: 4, motion: 'float', cooldown: 35, emoji: '🪝' },
  { id: 'horn', name: 'แตรหมอก', kind: 'item', effect: 'horn', lane: 4, points: 10, taps: 8, size: 56, speed: 20, weight: 3, motion: 'float', cooldown: 70, emoji: '📯' },
  { id: 'spyglass', name: 'กล้องส่องทางไกล', kind: 'item', effect: 'spyglass', lane: 4, points: 10, taps: 6, size: 58, speed: 20, weight: 4, motion: 'float', cooldown: 35, emoji: '🔭' },
  { id: 'shark', name: 'ฉลาม', lane: 4, points: 34, taps: 16, size: 140, speed: 34, weight: 26, emoji: '🦈' },
  { id: 'moray', name: 'ปลาไหลมอเรย์', lane: 4, points: 36, taps: 16, size: 130, speed: 24, weight: 20, motion: 'eel', emoji: '🐍' },
  { id: 'anglerfish', name: 'ปลาตกเบ็ด', lane: 4, points: 38, taps: 17, size: 96, speed: 16, weight: 20, emoji: '🐟' },
  { id: 'swordfish', name: 'ปลากระโทงดาบ', lane: 4, points: 42, taps: 18, size: 150, speed: 60, weight: 10, emoji: '🐟' },
  { id: 'chest', name: 'หีบสมบัติ', kind: 'item', prizes: [[30, 4], [40, 3], [60, 2], [100, 1]], lane: 4, points: 40, taps: 16, size: 76, speed: 18, weight: 7, motion: 'float', bonus: 14, emoji: '🧰' },
  { id: 'crown', name: 'มงกุฎทองคำ', kind: 'item', lane: 4, points: 80, taps: 18, size: 58, speed: 20, weight: 0.8, motion: 'float', rare: true, jackpot: true, bonus: 5, emoji: '👑' },

  { id: 'grouper', name: 'ปลาเก๋ายักษ์', lane: 5, points: 40, taps: 18, size: 120, speed: 18, weight: 30, emoji: '🐟' },
  { id: 'giant-squid', name: 'หมึกยักษ์', lane: 5, points: 44, taps: 19, size: 130, speed: 26, weight: 26, emoji: '🦑' },
  { id: 'hammerhead', name: 'ฉลามหัวค้อน', lane: 5, points: 46, taps: 20, size: 150, speed: 32, weight: 18, emoji: '🦈' },

  { id: 'manta', name: 'กระเบนราหู', lane: 5, points: 50, taps: 20, size: 150, speed: 26, weight: 14, motion: 'glide', emoji: '🐟' },
  { id: 'whale-shark', name: 'ฉลามวาฬ', lane: 5, points: 90, taps: 22, size: 190, speed: 22, weight: 4, cooldown: 40, emoji: '🦈' },

  // Special creatures (own book section "ปลาพิเศษ"; weights are small, and creatures never caught visit on their own anyway).
  { id: 'leafy-dragon', name: 'มังกรทะเลใบไม้', special: true, lane: 1, points: 32, taps: 10, size: 62, speed: 14, weight: 8, motion: 'bob', emoji: '🐉' },
  { id: 'nautilus', name: 'หอยงวงช้าง', special: true, lane: 3, points: 42, taps: 14, size: 84, speed: 16, weight: 9, motion: 'pulse', emoji: '🐚' },
  { id: 'sunfish', big: true, name: 'ปลาโมลา', special: true, lane: 4, points: 55, taps: 17, size: 118, speed: 18, weight: 8, emoji: '🐟' },
  { id: 'coelacanth', big: true, name: 'ปลาซีลาแคนท์', special: true, lane: 5, points: 85, taps: 20, size: 140, speed: 18, weight: 5, cooldown: 40, emoji: '🐟' },
  { id: 'oarfish', big: true, name: 'ปลาริบบิ้นยักษ์', special: true, lane: 5, points: 70, taps: 20, size: 190, speed: 24, weight: 6, motion: 'glide', emoji: '🐍' },
  { id: 'giant-octopus', big: true, name: 'หมึกยักษ์ลายจุด', special: true, lane: 5, points: 75, taps: 22, size: 150, speed: 20, weight: 6, motion: 'pulse', emoji: '🐙' },
  { id: 'mantis-shrimp', name: 'กั้งตั๊กแตน', special: true, lane: 6, points: 40, taps: 14, size: 60, speed: 13, weight: 8, motion: 'crawl', noFlip: true, emoji: '🦐' },
  { id: 'giant-crayfish', name: 'กุ้งก้ามกรามยักษ์', special: true, lane: 6, points: 110, taps: 22, size: 110, speed: 15, weight: 3, motion: 'crawl', cooldown: 45, emoji: '🦞' },

  // Bosses: never in the normal mix; the spawner sends one every two to three minutes.
  { id: 'boss-whale', name: 'วาฬสีน้ำเงิน', lane: 3, points: 200, taps: 30, size: 300, speed: 21, weight: 1, boss: true, emoji: '🐋' },
  { id: 'boss-kraken', name: 'คราเคน', lane: 3, points: 180, taps: 28, size: 260, speed: 27, weight: 1, boss: true, motion: 'pulse', emoji: '🐙' },
  { id: 'boss-helicoprion', name: 'ปลาฟันก้นหอยโบราณ', lane: 3, points: 220, taps: 30, size: 250, speed: 23, weight: 1, boss: true, emoji: '🦈' },
  { id: 'boss-dunkleosteus', name: 'ปลาเกราะยักษ์โบราณ', lane: 3, points: 240, taps: 32, size: 270, speed: 25, weight: 1, boss: true, emoji: '🐟' },
  { id: 'boss-seal', name: 'แมวน้ำยักษ์', lane: 3, points: 190, taps: 28, size: 280, speed: 30, weight: 1, boss: true, emoji: '🦭' },
  { id: 'boss-turtle', name: 'เต่าทะเลยักษ์', lane: 3, points: 210, taps: 30, size: 280, speed: 22, weight: 1, boss: true, emoji: '🐢' },
  { id: 'boss-marlin', name: 'ราชาปลากระโทงทอง', lane: 3, points: 250, taps: 32, size: 280, speed: 30, weight: 1, boss: true, emoji: '🐟' },

  // Seabed: crawlers, the jackpot lobster and the odd old boot.
  { id: 'starfish', name: 'ปลาดาว', lane: 6, points: 10, taps: 7, size: 44, speed: 13, weight: 24, group: [1, 2], motion: 'spin', noFlip: true, emoji: '⭐' },
  { id: 'crab', name: 'ปูทะเล', lane: 6, points: 15, taps: 9, size: 54, speed: 20, weight: 30, group: [1, 2], motion: 'crawl', noFlip: true, emoji: '🦀' },
  { id: 'lobster-king', name: 'ราชากุ้งมังกร', lane: 6, points: 150, taps: 24, size: 104, speed: 18, weight: 0.35, motion: 'crawl', rare: true, jackpot: true, emoji: '🦞' },
  { id: 'hermit-crab', name: 'ปูเสฉวน', lane: 6, points: 12, taps: 8, size: 50, speed: 12, weight: 20, group: [1, 2], motion: 'crawl', emoji: '🦀' },
  { id: 'horseshoe-crab', name: 'แมงดาทะเล', lane: 6, points: 25, taps: 12, size: 70, speed: 14, weight: 14, motion: 'crawl', emoji: '🦀' },
  { id: 'boot', name: 'รองเท้าบูทเก่า', kind: 'junk', lane: 6, points: 1, taps: 4, size: 50, speed: 18, weight: 4, motion: 'drift', cooldown: 35, emoji: '👢' },
];

// Artwork comes from tools/sprites.py (art/incoming -> public/assets/sprites). A creature without a sprite
// stays out of the sea and the book in production; DEV QA (?qa=1) draws an emoji for it instead.
function artFor(s) {
  const sprite = manifest.sprites?.[s.id];
  return sprite ? { kind: 'sprite', key: `sp-${s.id}`, file: sprite.file, w: sprite.w, h: sprite.h } : null;
}

export const SPECIES = catalog.map((s) => ({ kind: 'animal', group: [1, 1], motion: 'swim', ...s, art: artFor(s) }));
// Artwork used by the pirate battle and effects; not part of the collection book.
export const PROPS = ['pirate-small', 'pirate-medium', 'pirate-large', 'cannon', 'cannonball', 'float-chest', 'barrel', 'coin'];
export const propArt = (id) => manifest.sprites?.[id] ? { key: `sp-${id}`, ...manifest.sprites[id] } : null;
export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
export const PLACEHOLDER_ART = { kind: 'emoji', w: 128, h: 128 };

// Species without finished artwork stay out of the sea and the book (DEV QA can draw emoji instead).
export const speciesWithArt = (placeholders = false) => SPECIES.filter((s) => s.art || placeholders);
// How hard a creature fights on the line: 0 none, 1 big fish, 2 giants and bosses. Drives the reel shake and sounds only.
export const tugLevel = (s) => s.boss || s.taps >= 20 ? 2 : s.taps >= 14 ? 1 : 0;
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
