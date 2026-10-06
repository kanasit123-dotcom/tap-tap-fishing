// Three levels of difficulty, chosen in the settings (the pause dialog). They never make a fish escape: relaxed play stays forgiving.
//  taps: how many taps a catch needs (x); fishSpeed: how fast the creatures swim (x); swing: how fast the hook swings (x);
//  seconds: the arcade clock. A level applies from the next trip.
export const DIFFICULTIES = {
  easy: { id: 'easy', name: 'ง่าย', hint: 'ปลาว่ายช้า ตะขอแกว่งช้า แตะรอกน้อยลง เหมาะกับเด็กเล็ก', taps: 0.7, fishSpeed: 0.85, swing: 0.8, seconds: 120 },
  normal: { id: 'normal', name: 'ปกติ', hint: 'แบบที่เล่นกันมา', taps: 1, fishSpeed: 1, swing: 1, seconds: 90 },
  hard: { id: 'hard', name: 'ยาก', hint: 'ปลาว่ายเร็ว ตะขอแกว่งเร็ว ต้องแตะรอกมากขึ้น เวลาอาร์เคดสั้นลง', taps: 1.3, fishSpeed: 1.2, swing: 1.2, seconds: 75 },
};
export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES);
export const difficultyOf = (id) => DIFFICULTIES[id] ?? DIFFICULTIES.normal;
export const sanitizeDifficulty = (id) => DIFFICULTIES[id] ? id : 'normal';

// Taps a catch needs at a level: the normal number is untouched; at least 3 so a catch is never a single poke.
export const scaledTaps = (taps, level) => level.taps === 1 ? taps : Math.max(3, Math.round(taps * level.taps));
