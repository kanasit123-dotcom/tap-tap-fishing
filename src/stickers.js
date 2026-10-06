// Sixteen collectible stickers for things achieved in the game. Pure rules: they say which sticker an achievement earns;
// the app shows them in the book and awards them. Pictures: art/incoming/sheet-l-stickers.png (prompt Q), in this order.
import { zoneProgress } from './extras.js';

export const STICKERS = [
  { id: 'first-catch', art: 'st-first-catch', name: 'ปลาตัวแรก', how: 'จับสัตว์ทะเลตัวแรก' },
  { id: 'shallow', art: 'st-shallow', name: 'เจ้าน้ำตื้น', how: 'จับสัตว์น้ำตื้นให้ครบ', zone: 'shallow' },
  { id: 'middle', art: 'st-middle', name: 'เจ้ากลางน้ำ', how: 'จับสัตว์กลางน้ำให้ครบ', zone: 'middle' },
  { id: 'deep', art: 'st-deep', name: 'เจ้าทะเลลึก', how: 'จับสัตว์ทะเลลึกให้ครบ', zone: 'deep' },
  { id: 'seabed', art: 'st-seabed', name: 'เจ้าพื้นทราย', how: 'จับสัตว์พื้นทะเลให้ครบ', zone: 'seabed' },
  { id: 'giants', art: 'st-giants', name: 'เพื่อนยักษ์ใหญ่', how: 'จับปลายักษ์ให้ครบทุกตัว', zone: 'boss' },
  { id: 'special', art: 'st-special', name: 'นักสะสมของแปลก', how: 'จับปลาพิเศษให้ครบ', zone: 'special' },
  { id: 'fever', art: 'st-fever', name: 'ไฟลุก!', how: 'จับติดกัน 3 ตัวจนเข้า FEVER' },
  { id: 'jackpot', art: 'st-jackpot', name: 'แจ็กพอต!', how: 'จับมงกุฎทองคำหรือราชากุ้งมังกร' },
  { id: 'pirate', art: 'st-pirate', name: 'นักล่าโจรสลัด', how: 'ยิงเรือโจรสลัดจนทิ้งสมบัติหนี' },
  { id: 'wheel', art: 'st-wheel', name: 'ดาววงล้อ', how: 'หยุดวงล้อให้ตรงช่อง ★100' },
  { id: 'duo', art: 'st-duo', name: 'เพื่อนร่วมเรือ', how: 'เล่น 2 คนจนจบรอบ' },
  { id: 'horn', art: 'st-horn', name: 'เสียงแตรหมอก', how: 'จับแตรหมอกและเป่า' },
  { id: 'daily', art: 'st-daily', name: 'ภารกิจครบมือ', how: 'ทำภารกิจประจำวันครบ 3 ข้อ' },
  { id: 'night', art: 'st-night', name: 'นักเดินเรือกลางคืน', how: 'ออกเรือตอนกลางคืน' },
  { id: 'all', art: 'st-all', name: 'ราชานักสะสม', how: 'จับสัตว์ทะเลและสมบัติครบทุกชนิด' },
];
export const STICKER_IDS = STICKERS.map((s) => s.id);
export const STICKER_BY_ID = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

// Stickers the collection earns: the first catch, every finished book section, and the whole book.
// species: the creatures that can appear (with artwork); zones: the book sections (species.js ZONES).
export function earnedByCollection(collection, species, zones) {
  const earned = [];
  if (species.some((s) => collection[s.id] > 0)) earned.push('first-catch');
  for (const sticker of STICKERS) {
    if (!sticker.zone) continue;
    const zone = zones.find((z) => z.id === sticker.zone);
    if (!zone) continue;
    const { found, total } = zoneProgress(zone, species, collection);
    if (total > 0 && found === total) earned.push(sticker.id);
  }
  if (species.length && species.every((s) => collection[s.id] > 0)) earned.push('all');
  return earned;
}

// Stickers a landing earns right away (a FEVER, a jackpot creature, the fog horn).
export function earnedByLanding(landing) {
  const earned = [];
  if (landing.feverStarted) earned.push('fever');
  if (landing.all.some((s) => s.jackpot)) earned.push('jackpot');
  if (landing.powers?.includes('horn')) earned.push('horn');
  return earned;
}

// Gives stickers to the progress; returns the ones that were new.
export function award(progress, ids) {
  const fresh = [];
  for (const id of ids) {
    if (!STICKER_BY_ID[id] || progress.stickers[id]) continue;
    progress.stickers[id] = true;
    fresh.push(id);
  }
  return fresh;
}

// As saved: only known stickers, each simply earned (true).
export const sanitizeStickers = (raw) => Object.fromEntries(STICKER_IDS.filter((id) => raw?.[id] === true).map((id) => [id, true]));
