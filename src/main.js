import { createIcons, Anchor, BookOpen, Volume2, VolumeX, Pause, Play, Fish, Trophy, Timer, X, RotateCcw, ArrowRight, Check, Music, Map as MapIcon, Sparkles } from 'lucide';
import { createGame } from './scene.js';
import { FishingRound, GOAL, MAP_PIECES, TIME_BONUS, BONUS_KINDS } from './model.js';
import { Match, TEAM_GOAL, originFor } from './match.js';
import { SPECIES_BY_ID, ZONES, speciesWithArt } from './species.js';
import { loadProgress, saveProgress, recordCatch, recordTrip, recordMatch } from './progress.js';
import { FishingAudio } from './audio.js';
import { bindTapControl } from './input.js';
import { STOP_SEGMENTS, STOP_SPINS, SEGMENT_DEGREES, segmentAt } from './stopwheel.js';
import { WHEEL, spinWheel, applyPrize, LOOKS, isUnlocked, zoneProgress, timeOfDay, TIME_NAMES } from './extras.js';
import './style.css';

const icons = { Anchor, BookOpen, Volume2, VolumeX, Pause, Play, Fish, Trophy, Timer, X, RotateCcw, ArrowRight, Check, Music, Map: MapIcon, Sparkles };
const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const updateIcons = () => createIcons({ icons, attrs: { 'stroke-width': 2.3 } });
const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const QA = import.meta.env.DEV && params.has('qa');
const assetUrl = (file) => `${import.meta.env.BASE_URL}assets/${file}`;

const art = (s) => {
  if (s.art?.kind === 'sprite') return `<img class="species-art" src="${assetUrl(s.art.file)}" alt="${s.name}" draggable="false">`;
  return `<span class="species-art emoji" role="img" aria-label="${s.name}">${s.emoji}</span>`;
};

// Seeded random numbers for repeatable QA runs (?qa=1&seed=7).
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Wheel of the stop-the-wheel stage: tiers of colour by prize, the golden jackpot stands out.
function stopWheelHtml() {
  const tint = (p) => p >= 100 ? '#ffd34d' : p >= 50 ? '#b69af0' : p >= 30 ? '#ff9d6e' : p >= 15 ? '#7fd48a' : '#9fd8e8';
  const gradient = STOP_SEGMENTS.map((seg, i) => `${tint(seg.points)} ${i * SEGMENT_DEGREES}deg ${(i + 1) * SEGMENT_DEGREES}deg`).join(', ');
  const labels = STOP_SEGMENTS.map((seg, i) => `<span class="seg" data-index="${i}" style="--a:${i * SEGMENT_DEGREES + SEGMENT_DEGREES / 2}deg"><span><b>${seg.jackpot ? '★' : ''}${seg.points}</b></span></span>`).join('');
  return `<div class="stopwheel-box lucky-box"><div class="lucky-pointer"></div><div id="sw-wheel" class="lucky-wheel" style="background: conic-gradient(${gradient})">${labels}<span class="lucky-hub"></span></div></div><div class="stopwheel-info"><b><span id="sw-owner"></span>ด่านวงล้อ <span id="sw-count">1/${STOP_SPINS}</span></b><strong id="sw-result" class="stopwheel-result"></strong></div>`;
}

// Everything that belongs to one player exists twice (ids of the second player end in 2); the second set is hidden
// until two players are playing. The first player's ids and look are exactly those of the one-player game.
const sfx = (i) => i ? '2' : '';
const scoreHtml = (i) => `<div class="score${i ? ' p2 p2only' : ''}" id="score-box${sfx(i)}"><span class="score-icon">${icon('trophy')}</span><div><small>คะแนน</small><strong id="score${sfx(i)}">0</strong></div><span id="double${sfx(i)}" class="double-badge" hidden>x2</span><span class="pmaps">${icon('map')}<b id="pmaps${sfx(i)}">0/${MAP_PIECES}</b></span></div><div id="powers${sfx(i)}" class="powers${i ? ' p2 p2only' : ''}" aria-label="ไอเทมที่ใช้ได้"></div>`;
const labelHtml = (i) => `<div class="phase-label${i ? ' p2 p2only' : ''}"><div id="bonus${sfx(i)}" class="bonus-banner" role="status" hidden>${icon('sparkles')}<span id="bonus-label${sfx(i)}">ฝนสมบัติ!</span><strong id="bonus-time${sfx(i)}">20</strong></div><div id="fever${sfx(i)}" class="fever-banner" role="status" hidden><span>FEVER x2</span><strong id="fever-time${sfx(i)}">15</strong></div><span id="phase-text${sfx(i)}" class="phase-text" role="status" aria-live="polite">ออกทะเลกัน!</span><span id="caught-name${sfx(i)}" class="caught-name"></span></div>`;
const dockHtml = (i) => `<button id="cast${sfx(i)}" class="cast-button${i ? ' p2 p2only' : ''}" disabled>${icon('anchor')}<span>หย่อนเบ็ด</span></button>
      <div id="reel-wrap${sfx(i)}" class="reel-wrap${i ? ' p2 p2only' : ''}">
        <output id="tap-count${sfx(i)}" class="tap-count" aria-live="off"></output>
        <button id="reel${sfx(i)}" class="reel" aria-label="รอกดึงปลา${i ? ' ผู้เล่น 2' : ''}" data-tip="รอกดึงปลา" disabled>
          <span class="reel-progress"></span><span class="wheel"><span class="spoke s1"></span><span class="spoke s2"></span><span class="hub"></span><span class="handle"></span></span>
        </button>
      </div>`;

$('#app').innerHTML = `
  <header class="topbar">
    <div class="brand">${icon('anchor')}<div><h1>อ่าวสมบัติ</h1><span>TAP TAP FISHING</span></div></div>
    <div class="mode-row">
      <div class="modes" role="group" aria-label="รูปแบบการเล่น">
        <button id="relaxed" aria-pressed="true">เล่นสบาย</button><button id="arcade" aria-pressed="false">อาร์เคด</button>
      </div>
      <div class="modes players" role="group" aria-label="จำนวนผู้เล่น">
        <button id="solo" aria-pressed="true">1 คน</button><button id="duo" aria-pressed="false">2 คน</button>
      </div>
    </div>
    <nav aria-label="เครื่องมือเกม">
      <button id="collection" class="icon-button" aria-label="สมุดสะสม" data-tip="สมุดสะสม">${icon('book-open')}</button>
      <button id="music" class="icon-button" aria-label="ปิดเพลง" data-tip="เพลง" aria-pressed="true">${icon('music')}</button>
      <button id="sound" class="icon-button" aria-label="ปิดเสียง" data-tip="เสียง" aria-pressed="true">${icon('volume-2')}</button>
      <button id="pause" class="icon-button" aria-label="พักเกม" data-tip="พักเกม">${icon('pause')}</button>
    </nav>
  </header>
  <main class="stage" aria-label="ทะเลสำหรับตกปลา">
    <div id="sea" role="img" aria-label="เรือตกปลาและสัตว์ทะเลว่ายหลายชั้น"></div>
    <div class="loading" role="status">กำลังออกเรือ…</div>
    <section class="hud" aria-label="ผลการเล่น">
      ${scoreHtml(0)}
      <div class="hud-right">
        <span id="kind-chip" class="kind-chip p2only"></span>
        <div id="timer" class="timer" hidden>${icon('timer')}<strong>1:30</strong></div>
        <div class="catch-count">${icon('fish')}<strong id="caught-count">0 / ${GOAL}</strong></div>
        <div class="maps" aria-label="แผนที่สมบัติ">${icon('map')}<strong id="maps">0/${MAP_PIECES}</strong></div>
      </div>
      ${scoreHtml(1)}
    </section>
    <div id="edge" class="edge-flash" hidden></div>
    <div id="stopwheel" class="stopwheel" hidden aria-live="polite">${stopWheelHtml()}</div>
    <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
    ${labelHtml(0)}
    ${labelHtml(1)}
    <div class="dock">
      ${dockHtml(0)}
      ${dockHtml(1)}
    </div>
    <div id="save-warning" class="save-warning" role="status" hidden>เครื่องนี้ยังบันทึกของสะสมไม่ได้</div>
  </main>
  <dialog id="modal" aria-labelledby="dialog-title"><div id="modal-content"></div></dialog>
`;
updateIcons();

class FishingApp {
  constructor() {
    try { this.storage = window.localStorage; }
    catch { this.storage = { getItem: () => null, setItem: () => { throw new Error('Storage unavailable'); } }; }
    this.progress = loadProgress(this.storage);
    this.species = speciesWithArt(QA);
    this.rng = QA && params.has('seed') ? seeded(Number(params.get('seed'))) : Math.random;
    this.dpr = this.pixelRatio();
    this.audio = new FishingAudio(this.progress.sound, { music: this.progress.music });
    this.mode = 'relaxed';
    this.players = 1;
    this.matchKind = 'coop';
    this.rounds = this.makeRounds('relaxed', 1, 'coop');
    this.scene = null;
    this.wheelAngles = [0, 0];
    this.lastHUD = '';
    this.lastSecond = null;
    this.hookMessageCount = 0;
    this.rewardView = null;      // reopens the trip-end dialog (the book opened from it returns there)
    this.wheelPrize = null;      // the trip-end wheel was spun: its prize text
    this.syncSound();
    this.bindControls();
    this.game = createGame(this);
    this.resizeObserver = new ResizeObserver(() => this.measure());
    this.resizeObserver.observe($('.stage'));
    // iOS only unlocks Web Audio from certain gestures; listen to all of them.
    for (const type of ['pointerup', 'touchend', 'click', 'keydown']) document.addEventListener(type, () => this.audio.unlock(), { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.pause(); this.audio.suspend(); } });
    window.addEventListener('blur', () => this.pause());
    window.addEventListener('pagehide', () => this.audio.suspend());
  }

  now() { return performance.now(); }

  // Player 1's round (the one-player game, and what the single-player tests read).
  get round() { return this.rounds[0]; }
  get wheelAngle() { return this.wheelAngles[0]; }
  get twoPlayers() { return this.players === 2; }

  // Creatures not caught yet: the sea sends these as visitors, so a rare one is not left to luck in a short trip.
  wantedIds() { return this.species.filter((s) => !this.progress.collection[s.id]).map((s) => s.id); }

  // One round per player. Two players share one Match (one goal, bonus stages in turns); each keeps a rod tip of their own.
  makeRounds(mode, players, kind) {
    // Powers won on the lucky wheel are used up by the trip they start (both boats carry them).
    const startPowers = this.progress.startPowers ?? {};
    this.progress.startPowers = {};
    if (Object.keys(startPowers).length) this.persist?.();
    this.startPowers = startPowers;
    this.mode = mode === 'arcade' ? 'arcade' : 'relaxed';
    this.players = players === 2 ? 2 : 1;
    this.matchKind = kind === 'versus' ? 'versus' : 'coop';
    const rounds = Array.from({ length: this.players }, (_, i) => new FishingRound(this.mode, (species, round) => this.landed(species, round), {
      // Only the one-player game carries its map pieces from trip to trip.
      maps: this.players === 1 ? this.progress.maps : 0,
      bonusTurn: (this.progress.bonusTurn + i) % BONUS_KINDS.length,
      startPowers, rng: this.rng, originX: originFor(this.players, i),
    }));
    this.match = this.players === 2 ? new Match(rounds, this.matchKind) : null;
    return rounds;
  }

  landed(species, round) {
    const landing = round.landing;
    const player = this.rounds.indexOf(round);
    // With two players every message says whose it is.
    const say = (text) => this.toast(this.twoPlayers ? `ผู้เล่น ${player + 1}: ${text}` : text);
    for (const s of landing.all) recordCatch(this.progress, s.id);
    if (!this.twoPlayers) { this.progress.maps = round.maps; this.progress.bonusTurn = round.bonusTurn; }
    this.persist();
    this.audio.stop();
    this.audio.play(species.jackpot ? 'jackpot' : species.kind === 'item' ? 'treasure' : species.kind === 'junk' ? 'junk' : 'land');
    // Lower-priority messages first; item and jackpot messages below replace them.
    if (landing.combo >= 2) { this.audio.play('combo', { combo: landing.combo }); say(`คอมโบ ${landing.combo}! อีกตัวเดียวได้ FEVER`); }
    if (species.prizes) say(`เปิดหีบได้ ${landing.base} คะแนน!`);
    if (landing.feverStarted) { this.flashEdges('fever'); this.audio.play('fever'); say('FEVER! คะแนน x2 อยู่ 15 วินาที'); }
    if (landing.extras.length) say(`แหจับได้ ${landing.all.length} ตัว! ${landing.all.map((s) => s.name).join(' ')}`);
    const powerText = { net: 'ได้แห! ทอดครั้งต่อไปจับตัวข้างๆ ได้ด้วย', turbo: 'รอกเร็ว! 3 ครั้งถัดไปดึงง่ายขึ้น', goldhook: 'ตะขอทอง! ตะขอใหญ่ขึ้น 20 วินาที', spyglass: 'กล้องส่องทางไกล! เห็นสัตว์ลึกลับ 20 วินาที' };
    for (const power of landing.powers) {
      if (power === 'horn') {
        this.audio.play('horn');
        if (this.scene?.hornCall()) say('แตรหมอกดังก้อง! ปลายักษ์ตัวต่อไปจะตามมาทันที');
      } else { this.audio.play('powerup'); say(powerText[power]); }
    }
    if (species.effect === 'double') { this.audio.play('double'); say('ครั้งต่อไปได้คะแนน x2!'); }
    if (species.effect === 'time' && round.mode === 'arcade') {
      // One shared clock for two players: the watch gives both boats the extra time.
      for (const other of this.rounds) if (other !== round) other.remaining += TIME_BONUS;
      this.audio.play('time'); say('เวลา +10 วินาที!');
    }
    if (species.effect === 'map') {
      this.audio.play('map');
      say(landing.bonusStarted ? 'แผนที่ครบ 4 ชิ้น!' : `ได้แผนที่ ${round.maps}/${MAP_PIECES} ชิ้น`);
    }
    if (landing.multiplier > 1) say(`คะแนน x${landing.multiplier} ได้ ${landing.points} คะแนน!`);
    if (species.kind === 'junk') say('ได้รองเท้าเก่ามา ลองใหม่นะ!');
    if (species.jackpot) say(`แจ็กพอต! ${species.name}`);
    if (landing.bonusStarted && landing.bonusKind === 'rain') {
      this.audio.play('bonus');
      this.audio.say('แผนที่ครบแล้ว ฝนสมบัติมาแล้ว');
    }
    if (landing.bonusStarted && landing.bonusKind === 'pirate') say('แผนที่ครบ! เรือโจรสลัดกำลังมา');
    if (landing.bonusStarted && this.twoPlayers) setTimeout(() => this.toast(`ผู้เล่น ${player + 1} เล่นด่านโบนัส อีกคนรอสักครู่นะ`), 1700);
    this.scene?.celebrate(this.scene.rigs[player], species, landing);
  }

  ready(scene) {
    this.scene = scene;
    $('.loading').hidden = !this.failed;
    $('#sea canvas').setAttribute('aria-hidden', 'true');
    scene.setTimeOfDay(timeOfDay(this.progress.trips));
    this.measure(); this.renderHUD();
    this.announceTrip();
    if (QA) {
      window.__FISHING_QA__ = {
        snapshot: () => this.scene.snapshot(),
        arrange: (id, extras, player = 0, keep = false) => this.scene.arrangeForTest(id, extras, player, keep),
        setBonusTurn: (n, player = 0) => { this.rounds[player].bonusTurn = n; },
        setPower: (name, value, player = 0) => { this.rounds[player][name] = value; },
        setPirateTime: (seconds, player = 0) => { if (this.rounds[player].pirate) this.rounds[player].pirate.time = seconds; },
        finishTrip: (ids, player = 0) => { const r = this.rounds[player]; r.catches.push(...ids); r.tripCatches = 8; r.score += 123; r.phase = 'complete'; },
        setTimeOfDay: (time) => this.scene.setTimeOfDay(time),
        setLooks: (looks) => { this.progress.looks = { ...this.progress.looks, ...looks }; this.persist(); },
        spawnBoss: (id) => this.scene.spawnBossForTest(id),
        edgeVisible: () => !$('#edge').hidden,
        stopWheelVisible: () => !$('#stopwheel').hidden,
        setCollection: (ids) => { for (const id of ids) this.progress.collection[id] = Math.max(1, this.progress.collection[id] ?? 0); this.persist(); },
        freezeShips: () => this.scene.pirate.freeze(),
        aimAt: (x) => { this.scene.pirate.testAimX = x; },
        release: () => this.scene.releaseTest(),
        expire: (player = 0) => { this.rounds[player].remaining = 0.01; },
        setMaps: (n, player = 0) => { this.rounds[player].maps = n; },
        scene: () => this.scene,
      };
    }
  }

  assetError() {
    $('.loading').textContent = 'โหลดภาพไม่สำเร็จ กรุณาเปิดเกมใหม่';
    this.failed = true;
  }

  // Top of the cast/reel controls, in CSS px from the top of the sea.
  dockTop() {
    const stage = $('.stage').getBoundingClientRect();
    const top = Math.min($('#cast').getBoundingClientRect().top, $('#reel').getBoundingClientRect().top);   // the second player's controls sit on the same rows
    return top - stage.top;
  }

  // Canvas backing pixels: CSS size x device pixel ratio (capped at 2 to keep phones fast), so sprites are
  // drawn at the screen's real resolution instead of being blown up by the browser.
  pixelRatio() { return Math.min(2, Math.max(1, window.devicePixelRatio || 1)); }

  seaSize() {
    const sea = $('#sea');
    // A hidden page reports 0x0: use the nominal sea size until it is visible.
    const css = sea.clientWidth > 0 && sea.clientHeight > 0 ? [sea.clientWidth, sea.clientHeight] : [480, 760];
    return { css, width: Math.round(css[0] * this.dpr), height: Math.round(css[1] * this.dpr) };
  }

  // Sizes the canvas ourselves (Phaser scale mode NONE with zoom 1/dpr). This also covers iPad rotation,
  // where Phaser's own RESIZE mode could keep the old canvas size.
  fitCanvas() {
    this.dpr = this.pixelRatio();
    const scale = this.game.scale;
    const size = this.seaSize();
    if (scale.zoom !== 1 / this.dpr) scale.setZoom(1 / this.dpr);
    if (scale.gameSize.width !== size.width || scale.gameSize.height !== size.height) scale.resize(size.width, size.height);
    scale.canvas.style.width = `${size.css[0]}px`;
    scale.canvas.style.height = `${size.css[1]}px`;
  }

  measure() {
    requestAnimationFrame(() => {
      const canvas = $('#sea canvas');
      if (!canvas) return;
      const stage = $('.stage').getBoundingClientRect();
      $('.stage').style.setProperty('--scene-width', `${Math.min(stage.width, stage.height * 480 / 760)}px`);
      $('.stage').style.setProperty('--scene-gap', '0px');
      $('.stage').style.setProperty('--scene-top', '0px');
      this.fitCanvas();
      this.scene?.relayout();
    });
  }

  persist() { $('#save-warning').hidden = saveProgress(this.storage, this.progress); }

  bindControls() {
    for (let i = 0; i < 2; i++) {
      bindTapControl($(`#cast${sfx(i)}`), () => this.castPress(i));
      bindTapControl($(`#reel${sfx(i)}`), (source) => this.reel(source, i), $(`#reel-wrap${sfx(i)}`), { onRotate: (degrees) => this.turnWheel(degrees, i) });
    }
    $('#pause').onclick = () => this.pause();
    $('#collection').onclick = () => { this.audio.unlock(); this.openCollection(); };
    $('#sound').onclick = () => {
      this.progress.sound = this.audio.toggle(); this.persist(); this.syncSound();
    };
    $('#music').onclick = () => {
      this.audio.unlock();
      this.progress.music = this.audio.toggleMusic(); this.persist(); this.syncSound();
    };
    for (const mode of ['relaxed', 'arcade']) $(`#${mode}`).onclick = () => this.changeMode(mode);
    $('#solo').onclick = () => { this.audio.unlock(); this.changePlayers(1); };
    $('#duo').onclick = () => { this.audio.unlock(); this.openDuoChooser(); };
    $('.stage').addEventListener('contextmenu', (event) => event.preventDefault());
    $('#modal').addEventListener('close', () => {
      // Every dialog pauses the game. Closing it always gives the game back, also after a finished trip (otherwise the
      // "sail again" button stays dead: the book opened from the trip-end dialog used to leave the game paused for good).
      for (const round of this.rounds) round.pause(false);
      this.audio.duck(false);
      this.lastHUD = ''; this.renderHUD();
    });
  }

  syncSound() {
    $('#sound').innerHTML = icon(this.audio.enabled ? 'volume-2' : 'volume-x');
    $('#sound').setAttribute('aria-label', this.audio.enabled ? 'ปิดเสียง' : 'เปิดเสียง');
    $('#sound').setAttribute('aria-pressed', String(this.audio.enabled));
    $('#music').setAttribute('aria-label', this.audio.musicOn ? 'ปิดเพลง' : 'เปิดเพลง');
    $('#music').setAttribute('aria-pressed', String(this.audio.musicOn));
    $('#music').classList.toggle('off', !this.audio.musicOn || !this.audio.enabled);
    updateIcons();
  }

  // The big button: start another trip when this player is done and the whole trip is over, else cast / fire / stop.
  castPress(i) {
    const round = this.rounds[i];
    if (round.phase === 'complete') {
      if (!this.twoPlayers || this.match.finished) this.startRound(this.mode);
      return;
    }
    this.cast(i);
  }

  // A tap on the sea: player 1's boat on the left half, player 2's on the right half when two are playing.
  seaTap(worldX) { this.cast(this.twoPlayers && worldX >= 240 ? 1 : 0); }

  cast(i = 0) {
    if (!this.scene || this.failed || $('#modal').open) return;
    const round = this.rounds[i];
    this.audio.unlock();
    if (round.phase === 'pirate') { this.fire(i); return; }
    if (round.phase === 'wheel') { if (round.stopTheWheel()) { this.audio.play('hit'); this.renderHUD(); } return; }
    if (round.cast()) { this.audio.stop(); this.audio.play('cast'); this.renderHUD(); }
  }

  fire(i = 0) {
    const round = this.rounds[i];
    if (!round.fire()) return;
    this.audio.play('cannon');
    this.scene.pirate.fire(round.angle, (shot) => {
      const result = round.resolveShot(shot);
      this.onShot(result, shot, i);
      return result;
    });
    this.renderHUD();
  }

  // Start-of-trip message: time of day and powers won on the wheel.
  announceTrip() {
    const time = timeOfDay(this.progress.trips);
    const names = { net: 'แห', turbo: 'รอกเร็ว', goldhook: 'ตะขอทอง' };
    const powers = Object.keys(this.startPowers ?? {}).map((k) => names[k]);
    const parts = [];
    if (time !== 'day') parts.push(`ออกเรือ${TIME_NAMES[time]}`);
    if (powers.length) parts.push(`มี${powers.join(' ')}ติดเรือมาด้วย!`);
    if (parts.length) setTimeout(() => this.toast(parts.join(' · ')), 400);
  }

  // LED-style flashing frame around the sea for big moments.
  flashEdges(kind) {
    const edge = $('#edge');
    edge.className = `edge-flash ${kind}`;
    edge.hidden = false;
    void edge.offsetWidth;
    edge.classList.add('on');
    clearTimeout(this.edgeTimer);
    this.edgeTimer = setTimeout(() => { edge.hidden = true; edge.classList.remove('on'); }, kind === 'boss' ? 2600 : 1400);
  }

  // A heavy fish fights back: the wheel and its ring shake (decorative parts only), with a thump and a buzz.
  onTug(level, i = 0) {
    this.tugs = (this.tugs ?? 0) + 1;
    const reel = $(`#reel${sfx(i)}`);
    reel.classList.remove('tug'); void reel.offsetWidth; reel.classList.add('tug');
    this.audio.play('tug', { level });
    if (navigator.vibrate) navigator.vibrate(level > 1 ? [30, 40, 30, 40, 30] : [30, 40, 30]);
  }

  onBossWarning() {
    this.flashEdges('boss');
    this.audio.play('siren');
    this.audio.play('boss');
    this.toast('ปลายักษ์กำลังมา! แตะรอกเยอะหน่อยนะ');
    this.audio.say('ปลายักษ์กำลังมา');
  }

  onPirateStart(i = 0) {
    this.audio.play('pirate');
    this.audio.say('เรือโจรสลัดมาแล้ว แตะเพื่อยิงปืนใหญ่ มีเวลา 30 วินาที');
    this.toast(`${this.twoPlayers ? `ผู้เล่น ${i + 1}: ` : ''}เรือโจรสลัด! เล็งแล้วแตะยิงปืนใหญ่ให้ได้มากที่สุดใน 30 วินาที`);
  }

  // The battle is over (time up and the last ball landed): sum up the loot.
  onPirateEnd(i = 0) {
    const result = this.rounds[i]?.pirateResult;
    this.audio.play(result?.loot ? 'treasure' : 'miss');
    const who = this.twoPlayers ? `ผู้เล่น ${i + 1}: ` : '';
    setTimeout(() => this.toast(result?.loot ? `${who}ได้สมบัติจากเรือโจรสลัด ${result.loot} คะแนน!` : 'เรือโจรสลัดแล่นไปแล้ว ไว้ลองใหม่นะ'), 400);
    this.lastHUD = '';
    this.renderHUD();
  }

  onShot(result, shot) {
    if (!result) return;
    if (shot.hit) {
      this.audio.play('hit');
      if (shot.sunk) this.toast(`เรือโจรสลัดทิ้งสมบัติหนีไป! +${result.points}`);
      else this.toast(result.streak >= 2 ? `โดนติดกัน ${result.streak} ลูก! +${result.points}` : `โดน! +${result.points}`);
    }
    this.lastHUD = '';
    this.renderHUD();
  }

  // The wheel follows a cranking finger; a tap gives it a quick 55 degree spin.
  turnWheel(degrees, i = 0) {
    if (this.rounds[i].phase !== 'reeling') return;
    this.wheelAngles[i] += degrees;
    const reel = $(`#reel${sfx(i)}`);
    reel.classList.add('cranking');
    reel.style.setProperty('--wheel-angle', `${this.wheelAngles[i]}deg`);
    clearTimeout(this.crankTimers?.[i]);
    (this.crankTimers ??= [])[i] = setTimeout(() => reel.classList.remove('cranking'), 150);
  }

  reel(source = 'tap', i = 0) {
    const round = this.rounds[i];
    this.audio.unlock();
    if (!round.reel(performance.now())) return;
    if (source !== 'crank') this.wheelAngles[i] += 55;
    const reel = $(`#reel${sfx(i)}`);
    reel.style.setProperty('--wheel-angle', `${this.wheelAngles[i]}deg`);
    reel.classList.remove('tapped');
    void reel.offsetWidth;
    reel.classList.add('tapped');
    this.audio.play('tap', { progress: round.taps / round.requiredTaps });
    if (navigator.vibrate) navigator.vibrate(8);
    this.renderHUD();
  }

  onHook() {
    this.audio.play('hook');
    if (this.hookMessageCount < 2) this.toast('แตะรอกรัวๆ หรือลากนิ้ววนรอบรอก ครึ่งรอบดึงได้ 1 ครั้ง');
    if (this.hookMessageCount++ < 2) this.audio.say('ติดเบ็ดแล้ว แตะรอก หรือหมุนรอก เพื่อดึงขึ้นมา');
    this.renderHUD();
  }

  onMiss() { this.audio.play('miss'); }

  // Gold coins fly from a point in the sea (world coordinates) to that player's score box, which then bumps.
  flyCoins(worldX, worldY, count, i = 0) {
    if (!this.scene || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const sea = $('#sea').getBoundingClientRect();
    const cam = this.scene.cameras.main;
    const k = cam.zoom / this.dpr;
    const sx = sea.left + (worldX - cam.worldView.x) * k;
    const sy = sea.top + (worldY - cam.worldView.y) * k;
    const box = $(`#score-box${sfx(i)}`);
    const target = box.querySelector('.score-icon').getBoundingClientRect();
    const tx = target.left + target.width / 2;
    const ty = target.top + target.height / 2;
    let arrived = 0;
    for (let n = 0; n < count; n++) {
      const coin = document.createElement('span');
      coin.className = 'coin-fly';
      coin.style.backgroundImage = `url(${assetUrl('sprites/coin.webp')})`;
      const x = sx + (Math.random() - 0.5) * 40;
      const y = sy + (Math.random() - 0.5) * 24;
      coin.style.left = `${x - 8}px`;
      coin.style.top = `${y - 8}px`;
      coin.style.transitionDelay = `${n * 45}ms`;
      document.body.append(coin);
      requestAnimationFrame(() => requestAnimationFrame(() => { coin.style.transform = `translate(${tx - x}px, ${ty - y}px) scale(0.7)`; }));
      const done = () => {
        coin.remove();
        if (++arrived === count) {
          this.audio.play('coins', { count });
          box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
        }
      };
      coin.addEventListener('transitionend', done, { once: true });
      setTimeout(() => { if (coin.isConnected) done(); }, 1500 + n * 45);
    }
  }

  toast(text) {
    const toast = $('#toast');
    toast.textContent = text;
    toast.hidden = false;
    toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
  }

  hudSignature(r, i) {
    const mystery = r.phase === 'reeling' && this.scene.rigs[i].caught?.getData('reveal') < 0.85;
    const wheel = r.phase === 'wheel' ? r.stopWheel : null;
    const powers = `${r.netCharges},${r.turbo},${Math.ceil(r.goldHook)},${Math.ceil(r.spyglass)}`;
    return `${r.phase}/${r.paused}/${r.waiting}/${r.score}/${r.tripCatches}/${r.catchId}/${r.taps}/${Math.ceil(r.remaining)}/${mystery}/${r.maps}/${r.doubleNext}/${Math.ceil(r.bonus)}/${Math.ceil(r.fever)}/${powers}/${r.pirate ? Math.ceil(r.pirate.time) : ''}/${wheel ? `${wheel.spin}${wheel.state}` : ''}`;
  }

  renderHUD() {
    if (!this.scene || this.failed) return;
    const signature = `${this.players}/${this.matchKind}/${this.match?.catches ?? ''}/${this.match?.bonusPoints ?? ''}/${this.rounds.map((r, i) => this.hudSignature(r, i)).join('|')}`;
    if (signature === this.lastHUD) return;
    this.lastHUD = signature;
    this.rounds.forEach((r, i) => this.renderPlayer(r, i));
    // Shared parts of the HUD.
    const r = this.round;
    const seconds = Math.ceil(r.remaining);
    $('#caught-count').textContent = this.twoPlayers ? `${Math.min(this.match.catches, TEAM_GOAL)} / ${TEAM_GOAL}` : `${Math.min(r.tripCatches, GOAL)} / ${GOAL}`;
    $('#maps').textContent = `${r.maps}/${MAP_PIECES}`;
    $('#kind-chip').textContent = this.matchKind === 'versus' ? 'แข่งกัน' : 'ช่วยกัน';
    $('#timer').hidden = r.mode !== 'arcade';
    $('#timer strong').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    $('#timer').classList.toggle('urgent', seconds <= 15);
    const busy = this.rounds.some((x) => x.bonus > 0 || x.phase === 'pirate' || x.phase === 'wheel' || x.waiting);
    if (r.mode === 'arcade' && seconds <= 10 && seconds > 0 && !r.paused && !busy && this.lastSecond !== seconds && !this.rounds.every((x) => x.phase === 'complete')) this.audio.play('tick');
    this.lastSecond = seconds;
    if (this.match) { if (this.match.finished && recordMatch(this.progress, this.match)) { this.persist(); this.openMatchReward(); } }
    else if (r.phase === 'complete' && recordTrip(this.progress, r)) { this.persist(); this.openReward(); }
  }

  // One player's score, banners, labels and controls.
  renderPlayer(r, i) {
    const q = (id) => $(`#${id}${sfx(i)}`);
    const mystery = r.phase === 'reeling' && this.scene.rigs[i].caught?.getData('reveal') < 0.85;
    const bonus = Math.ceil(r.bonus);
    const fever = Math.ceil(r.fever);
    const pirate = r.pirate;
    const wheel = r.phase === 'wheel' ? r.stopWheel : null;
    q('score').textContent = r.score;
    q('pmaps').textContent = `${r.maps}/${MAP_PIECES}`;
    q('double').hidden = !r.doubleNext;
    q('bonus').hidden = bonus <= 0 && !pirate && !wheel;
    q('bonus-label').textContent = pirate ? 'ยิงเรือโจรสลัด!' : wheel ? 'วงล้อนำโชค!' : 'ฝนสมบัติ!';
    q('bonus-time').textContent = pirate ? `${Math.ceil(pirate.time)} วิ` : wheel ? `${wheel.spin + 1}/${STOP_SPINS}` : bonus;
    this.renderPowers(r, i);
    q('fever').hidden = fever <= 0;
    q('fever-time').textContent = fever;
    const labels = { aim: 'ออกทะเลกัน!', casting: 'เบ็ดกำลังลง…', reeling: 'ติดเบ็ดแล้ว!', returning: 'ลองอีกครั้งได้เลย', celebrate: 'เยี่ยมเลย!', complete: 'กลับถึงฝั่งแล้ว', pirate: 'เล็งเป้าแล้วแตะยิง!', wheel: 'กดหยุดให้ตรงช่องรางวัลใหญ่!' };
    const finishedAlone = r.phase === 'complete' && this.twoPlayers && !this.match.finished;
    q('phase-text').textContent = r.waiting ? 'รอเพื่อนเล่นด่านโบนัส…' : finishedAlone ? 'ครบแล้ว รอเพื่อน…' : labels[r.phase];
    q('caught-name').textContent = r.catchId ? (mystery ? 'สัตว์ลึกลับ' : SPECIES_BY_ID[r.catchId].name) : '';
    const canAct = ['aim'].includes(r.phase) || (r.phase === 'complete' && !finishedAlone) || (pirate && pirate.time > 0) || wheel?.state === 'spinning';
    q('cast').disabled = r.paused || r.waiting || !canAct;
    q('cast').querySelector('span').textContent = r.waiting || finishedAlone ? 'รอเพื่อน…' : r.phase === 'complete' ? 'ออกเรืออีกครั้ง' : pirate ? 'ยิงปืนใหญ่' : wheel ? 'หยุด!' : 'หย่อนเบ็ด';
    q('cast').classList.toggle('fire', Boolean(pirate) || Boolean(wheel));
    q('reel').disabled = r.paused || r.waiting || r.phase !== 'reeling';
    q('reel').classList.toggle('active', r.phase === 'reeling');
    q('tap-count').textContent = r.phase === 'reeling' ? `${r.taps} / ${r.requiredTaps}` : '';
    q('reel').style.setProperty('--progress', `${r.requiredTaps ? r.taps / r.requiredTaps * 100 : 0}%`);
  }

  // The stop-the-wheel stage lives in a DOM overlay: follow the rules' wheel every frame, with ticks, results and messages.
  // (Two players: only the one who completed the map plays it.)
  frameStopWheel() {
    const index = this.rounds.findIndex((x) => x.phase === 'wheel' && x.stopWheel);
    const r = this.rounds[index] ?? null;
    const w = r?.stopWheel ?? null;
    const box = $('#stopwheel');
    const who = (text) => this.twoPlayers ? `ผู้เล่น ${(index >= 0 ? index : this.wheelOwner ?? 0) + 1}: ${text}` : text;
    if (!w) {
      if (!box.hidden) {
        box.hidden = true;
        const result = this.rounds[this.wheelOwner ?? 0].wheelResult;
        this.audio.play(result?.total ? 'treasure' : 'miss');
        setTimeout(() => this.toast(result?.total ? who(`ได้ ${result.total} คะแนนจากวงล้อนำโชค!`) : 'ไว้ลองใหม่นะ'), 300);
        this.lastHUD = ''; this.renderHUD();
      }
      return;
    }
    if (box.hidden) {
      box.hidden = false;
      this.wheelOwner = index;
      this.wheelSeen = 0; this.wheelSegment = -1;
      this.audio.play('bonus');
      this.toast(who('ด่านวงล้อ! แตะ หยุด! ให้ตรงช่องรางวัลใหญ่ มี 3 รอบ'));
      this.audio.say('แผนที่ครบแล้ว กดหยุดวงล้อให้ตรงช่องรางวัลใหญ่');
    }
    $('#sw-wheel').style.transform = `rotate(${w.angle}deg)`;
    $('#sw-count').textContent = `${w.spin + 1}/${STOP_SPINS}`;
    $('#sw-owner').textContent = this.twoPlayers ? `ผู้เล่น ${index + 1} · ` : '';
    const segment = segmentAt(w.angle);
    if (segment !== this.wheelSegment) {
      this.wheelSegment = segment;
      if (w.state !== 'show' && performance.now() - (this.lastWheelTick ?? 0) > 70) { this.lastWheelTick = performance.now(); this.audio.play('tick'); }
    }
    const out = $('#sw-result');
    if (w.results.length > this.wheelSeen) {
      this.wheelSeen = w.results.length;
      const last = w.results.at(-1);
      out.textContent = last.jackpot ? `แจ็กพอต! +${last.points}` : `+${last.points}`;
      out.classList.toggle('jackpot', last.jackpot);
      this.audio.play(last.jackpot ? 'jackpot' : last.points >= 30 ? 'treasure' : 'land');
      for (const el of document.querySelectorAll('#sw-wheel .seg')) el.classList.toggle('win', Number(el.dataset.index) === last.index);
    }
    if (w.state === 'spinning') { out.textContent = ''; out.classList.remove('jackpot'); for (const el of document.querySelectorAll('#sw-wheel .seg.win')) el.classList.remove('win'); }
    this.lastHUD = ''; this.renderHUD();
  }

  // Small icons under the score for the power-ups that are ready or running.
  renderPowers(r, i = 0) {
    const items = [
      ['net', r.netCharges, `x${r.netCharges}`, 'แห'],
      ['turbo-reel', r.turbo, `x${r.turbo}`, 'รอกเร็ว'],
      ['gold-hook', r.goldHook, `${Math.ceil(r.goldHook)}`, 'ตะขอทอง'],
      ['spyglass', r.spyglass, `${Math.ceil(r.spyglass)}`, 'กล้องส่องทางไกล'],
    ].filter(([, value]) => value > 0);
    $(`#powers${sfx(i)}`).innerHTML = items.map(([id, , label, name]) => `<span class="power" title="${name}"><img src="${assetUrl(`sprites/${id}.webp`)}" alt="${name}"><b>${label}</b></span>`).join('');
  }

  // Starts a trip. The mode, the number of players and the kind of two-player game default to what is selected now.
  startRound(mode = this.mode, players = this.players, kind = this.matchKind) {
    this.rewardView = null; this.wheelPrize = null;
    if ($('#modal').open) $('#modal').close();
    this.audio.stop();
    this.rounds = this.makeRounds(mode, players, kind);
    document.body.classList.toggle('two-players', this.twoPlayers);
    this.scene?.setTimeOfDay(timeOfDay(this.progress.trips));
    this.scene?.resetRound();
    this.announceTrip();
    this.wheelAngles = [0, 0];
    for (let i = 0; i < 2; i++) $(`#reel${sfx(i)}`).style.setProperty('--wheel-angle', '0deg');
    for (const m of ['relaxed', 'arcade']) $(`#${m}`).setAttribute('aria-pressed', String(m === this.mode));
    $('#score-box small').textContent = this.twoPlayers ? 'ผู้เล่น 1' : 'คะแนน';
    $('#score-box2 small').textContent = 'ผู้เล่น 2';
    if (this.twoPlayers) setTimeout(() => this.toast('เล่น 2 คน: ผู้เล่น 1 ซ้ายสีแดง · ผู้เล่น 2 ขวาสีน้ำเงิน · ใครได้แผนที่ครบเล่นด่านโบนัส อีกคนรอ'), 500);
    $('#solo').setAttribute('aria-pressed', String(!this.twoPlayers));
    $('#duo').setAttribute('aria-pressed', String(this.twoPlayers));
    this.lastHUD = ''; this.renderHUD();
  }

  // A trip is under way (something was cast and it is not over): changing it asks first.
  tripUnderway() { return this.rounds.some((r) => r.casts) && !this.rounds.every((r) => r.phase === 'complete'); }

  changeMode(mode) {
    if (mode === this.mode) return;
    this.audio.unlock();
    this.confirmNewTrip(() => this.startRound(mode));
  }

  changePlayers(players, kind = this.matchKind) {
    if (players === this.players && (players === 1 || kind === this.matchKind)) { if ($('#modal').open) $('#modal').close(); return; }
    this.confirmNewTrip(() => this.startRound(this.mode, players, kind));
  }

  confirmNewTrip(go) {
    if (this.tripUnderway()) {
      this.showDialog(`<h2 id="dialog-title">ออกเรือรอบใหม่?</h2><p>ของสะสมที่นำขึ้นเรือแล้วจะยังอยู่</p><div class="dialog-actions"><button id="keep" class="secondary">${icon('play')}เล่นต่อ</button><button id="new-mode" class="primary">${icon('rotate-ccw')}รอบใหม่</button></div>`);
      $('#keep').onclick = () => $('#modal').close();
      $('#new-mode').onclick = go;
    } else go();
  }

  // Two players: choose to help each other (one team score) or to race (the higher score wins).
  openDuoChooser() {
    this.showDialog(`<div class="dialog-emblem">${icon('anchor')}</div><h2 id="dialog-title">เล่น 2 คน</h2><p>ใช้เครื่องเดียวกัน คนละฝั่ง ผลัดกันเล่นด่านโบนัส</p><div class="dialog-actions duo-choice"><button id="pick-coop" class="primary">ช่วยกัน<small>คะแนนรวมเป็นของทีม</small></button><button id="pick-versus" class="primary versus">แข่งกัน<small>ใครได้คะแนนมากกว่าชนะ</small></button></div><div class="dialog-actions"><button id="pick-cancel" class="secondary">${icon('x')}ยกเลิก</button></div>`);
    $('#pick-coop').onclick = () => this.changePlayers(2, 'coop');
    $('#pick-versus').onclick = () => this.changePlayers(2, 'versus');
    $('#pick-cancel').onclick = () => $('#modal').close();
  }

  pause() {
    if (!this.scene || $('#modal').open || this.rounds.every((r) => r.phase === 'complete')) return;
    this.showDialog(`<div class="dialog-emblem">${icon('anchor')}</div><h2 id="dialog-title">พักที่ท่าเรือ</h2><div class="dialog-actions"><button id="resume" class="primary">${icon('play')}เล่นต่อ</button><button id="restart" class="secondary">${icon('rotate-ccw')}เริ่มรอบใหม่</button></div>`);
    $('#resume').onclick = () => $('#modal').close();
    $('#restart').onclick = () => this.startRound();
  }

  showDialog(html) {
    for (const round of this.rounds) round.pause(true);
    this.audio.stop(); this.audio.duck(true);
    $('#modal-content').innerHTML = html;
    updateIcons();
    if (!$('#modal').open) $('#modal').showModal();
    this.lastHUD = ''; this.renderHUD();
  }

  // back: the dialog to return to when the book is closed (the trip-end dialog), else the book just closes.
  openCollection(back = null) {
    const found = this.species.filter((s) => this.progress.collection[s.id]).length;
    const sections = ZONES.map((zone) => {
      const list = this.species.filter(zone.match);
      if (!list.length) return '';
      return `<h3 class="zone-title">${zone.name}</h3><div class="collection-grid">${list.map((s) => `<article class="collection-item ${this.progress.collection[s.id] ? '' : 'undiscovered'}">${art(s)}<h4>${s.name}</h4><span>${this.progress.collection[s.id] ? `${this.progress.collection[s.id]} ครั้ง` : 'ยังไม่พบ'}</span></article>`).join('')}</div>`;
    }).join('');
    this.showDialog(`<div class="dialog-heading"><div><small>สัตว์ทะเลและสมบัติ</small><h2 id="dialog-title">สมุดสะสม <span>${found} / ${this.species.length}</span></h2></div><button id="close-book" class="icon-button" aria-label="ปิดสมุดสะสม">${icon('x')}</button></div>${this.looksHtml()}${sections}`);
    $('#close-book').onclick = () => back ? back() : $('#modal').close();
    for (const button of document.querySelectorAll('.look:not([disabled])')) {
      button.onclick = () => {
        this.progress.looks = { ...this.progress.looks, [button.dataset.part]: button.dataset.look };
        this.persist();
        // Mark the choice in place. Drawing the whole book again under the finger made the panel jump back to the top
        // and, reported on a phone, stop answering until the page was reloaded.
        for (const other of document.querySelectorAll(`.look[data-part="${button.dataset.part}"]`)) {
          const chosen = other === button;
          other.classList.toggle('active', chosen);
          other.setAttribute('aria-pressed', String(chosen));
        }
        this.audio.play('powerup');
      };
    }
  }

  // Unlockable boat looks: finish a book section to unlock its look.
  looksHtml() {
    const parts = { rod: 'คันเบ็ด', hook: 'ตะขอ', boat: 'แต่งเรือ' };
    const rows = Object.entries(LOOKS).map(([part, options]) => `<div class="look-row"><span class="look-part">${parts[part]}</span>${options.map((look) => {
      const unlocked = isUnlocked(look, ZONES, this.species, this.progress.collection);
      const active = this.progress.looks?.[part] === look.id;
      const zone = ZONES.find((z) => z.id === look.zone);
      const prog = zone ? zoneProgress(zone, this.species, this.progress.collection) : null;
      return `<button class="look ${active ? 'active' : ''}" data-part="${part}" data-look="${look.id}" aria-pressed="${active}" ${unlocked ? '' : 'disabled'}>${unlocked ? '' : '🔒 '}${look.name}${unlocked ? '' : `<small>จับ${zone.name}ให้ครบ ${prog.found}/${prog.total}</small>`}</button>`;
    }).join('')}</div>`).join('');
    return `<section class="looks"><h3 class="zone-title">ตกแต่งเรือ</h3>${rows}</section>`;
  }

  openReward() {
    const r = this.round;
    const unique = [...new Set(r.catches)].map((id) => SPECIES_BY_ID[id]);
    this.showDialog(`<div class="reward"><div class="reward-main"><div class="dialog-emblem gold">${icon('trophy')}</div><h2 id="dialog-title">นักสำรวจอ่าวสมบัติ!</h2><div class="reward-score">${r.score}<span>คะแนน</span></div><p>นำขึ้นเรือ ${r.catches.length} รายการ · สถิติสูงสุด ${this.progress.best[r.mode]} คะแนน</p><div class="catch-strip">${unique.map((s) => art(s)).join('')}</div></div><div class="reward-side">${this.wheelHtml()}<div class="dialog-actions"><button id="again" class="primary">${icon('anchor')}ออกเรืออีกครั้ง</button><button id="reward-book" class="secondary">${icon('book-open')}สมุดสะสม</button></div></div></div>`);
    this.rewardView = () => this.openReward();
    $('#again').onclick = () => this.startRound(r.mode);
    $('#reward-book').onclick = () => this.openCollection(this.rewardView);
    $('#spin').onclick = () => this.spin();
  }

  // The end of a two-player trip: team score (co-op) or the two scores with the winner (race), then one wheel spin for the team / winner.
  openMatchReward() {
    const m = this.match;
    const unique = [...new Set(this.rounds.flatMap((r) => r.catches))].map((id) => SPECIES_BY_ID[id]);
    const total = this.rounds.reduce((sum, r) => sum + r.catches.length, 0);
    const versus = m.kind === 'versus';
    const title = !versus ? 'ทีมนักสำรวจอ่าวสมบัติ!' : m.winner < 0 ? 'เสมอกัน! เก่งทั้งคู่' : `ผู้เล่น ${m.winner + 1} ชนะ!`;
    const duo = m.scores.map((score, i) => `<div class="duo p${i + 1}${versus && m.winner === i ? ' winner' : ''}"><small>ผู้เล่น ${i + 1}${versus && m.winner === i ? ' 👑' : ''}</small><strong id="duo-score${i}">${score + (versus && m.spinner === i ? m.bonusPoints : 0)}</strong></div>`).join('');
    const teamScore = !versus ? `<div class="reward-score" id="team-score">${m.total}<span>คะแนนทีม</span></div>` : '';
    const note = versus ? 'ผู้ชนะได้หมุนวงล้อนำโชค' : 'ทีมได้หมุนวงล้อนำโชค';
    this.showDialog(`<div class="reward"><div class="reward-main"><div class="dialog-emblem gold">${icon('trophy')}</div><h2 id="dialog-title">${title}</h2>${teamScore}<div class="duo-scores">${duo}</div><p>นำขึ้นเรือ ${total} รายการ · ${note}</p><div class="catch-strip">${unique.map((s) => art(s)).join('')}</div></div><div class="reward-side">${this.wheelHtml()}<div class="dialog-actions"><button id="again" class="primary">${icon('anchor')}ออกเรืออีกครั้ง</button><button id="reward-book" class="secondary">${icon('book-open')}สมุดสะสม</button></div></div></div>`);
    this.rewardView = () => this.openMatchReward();
    $('#again').onclick = () => this.startRound();
    $('#reward-book').onclick = () => this.openCollection(this.rewardView);
    $('#spin').onclick = () => this.spin();
  }

  wheelHtml() {
    const step = 360 / WHEEL.length;
    const colors = ['#ffd34d', '#4fb3e8', '#ff8a5c', '#7fd48a', '#e8433a', '#9b7be0', '#ffb347', '#3fc1b0'];
    const gradient = WHEEL.map((_, i) => `${colors[i % colors.length]} ${i * step}deg ${(i + 1) * step}deg`).join(', ');
    const labels = WHEEL.map((prize, i) => `<span class="seg" style="--a:${i * step + step / 2}deg"><span>${prize.art ? `<img src="${assetUrl(`sprites/${prize.art}.webp`)}" alt="">` : ''}<b>${prize.short ?? prize.label}</b></span></span>`).join('');
    const spun = this.wheelPrize !== null;
    return `<div class="lucky"><div class="lucky-box"><div class="lucky-pointer"></div><div id="lucky-wheel" class="lucky-wheel" style="background: conic-gradient(${gradient})">${labels}<span class="lucky-hub"></span></div></div><button id="spin" class="primary spin" ${spun ? 'disabled' : ''}>${icon(spun ? 'check' : 'sparkles')}${spun ? 'หมุนแล้ว' : 'หมุนวงล้อนำโชค'}</button><p id="prize" class="prize" aria-live="polite">${spun ? this.wheelPrize : ''}</p></div>`;
  }

  spin() {
    const button = $('#spin');
    if (!button || button.disabled) return;
    button.disabled = true;
    this.audio.unlock();
    const index = spinWheel(this.rng);
    const step = 360 / WHEEL.length;
    const turn = 360 * 5 + (360 - (index * step + step / 2));
    const wheel = $('#lucky-wheel');
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Ticks that slow down with the wheel.
    let delay = 60;
    let elapsed = 0;
    const tick = () => { if (elapsed > 2900 || calm) return; this.audio.play('tick'); elapsed += delay; delay *= 1.12; this.wheelTimer = setTimeout(tick, delay); };
    tick();
    const finish = () => {
      clearTimeout(this.wheelTimer);
      const prize = WHEEL[index];
      let message;
      if (this.match) {
        // Two players: the prize is the team's (or the winner's); points are not a personal best, so they stay out of the records.
        const pseudo = { score: 0, mode: this.mode };
        message = applyPrize(this.progress, pseudo, prize, { record: false });
        this.match.bonusPoints += pseudo.score;
        if (pseudo.score) {
          const spinner = this.match.spinner;
          const shown = $(`#duo-score${spinner}`);
          // In a race the spinner's own box grows; a team keeps the players' boxes and grows the team total.
          if (shown && this.match.kind === 'versus') shown.textContent = this.match.scores[spinner] + this.match.bonusPoints;
          const team = $('#team-score');
          if (team) team.firstChild.textContent = this.match.total;
        }
      } else {
        message = applyPrize(this.progress, this.round, prize);
        $('.reward-score').firstChild.textContent = this.round.score;
      }
      this.persist();
      this.audio.play(prize.points >= 100 ? 'jackpot' : 'treasure');
      $('#prize').textContent = message;
      this.wheelPrize = message;
      button.innerHTML = `${icon('check')}หมุนแล้ว`;
      updateIcons();
      this.lastHUD = ''; this.renderHUD();
    };
    wheel.style.transition = calm ? 'none' : '';
    requestAnimationFrame(() => { wheel.style.transform = `rotate(${turn}deg)`; });
    if (calm) finish();
    else {
      wheel.addEventListener('transitionend', finish, { once: true });
      this.wheelFallback = setTimeout(() => { if (!$('#prize')?.textContent && $('#lucky-wheel') === wheel) finish(); }, 4200);
    }
  }
}

const app = new FishingApp();

// Offline play: a production build keeps the whole game on the device (tools/sw.template.js).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'offline-ready') app.toast('เกมนี้เล่นได้แม้ไม่มีอินเทอร์เน็ตแล้ว');
  });
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
}
