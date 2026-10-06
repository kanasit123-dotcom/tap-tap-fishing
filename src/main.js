import { createIcons, Anchor, BookOpen, Volume2, VolumeX, Pause, Play, Fish, Trophy, Timer, X, RotateCcw, ArrowRight, Check, Music, Map as MapIcon, Sparkles } from 'lucide';
import { createGame } from './scene.js';
import { FishingRound, GOAL, MAP_PIECES } from './model.js';
import { SPECIES_BY_ID, ZONES, speciesWithArt } from './species.js';
import { loadProgress, saveProgress, recordCatch, recordTrip } from './progress.js';
import { FishingAudio } from './audio.js';
import { bindTapControl } from './input.js';
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

$('#app').innerHTML = `
  <header class="topbar">
    <div class="brand">${icon('anchor')}<div><h1>อ่าวสมบัติ</h1><span>TAP TAP FISHING</span></div></div>
    <div class="modes" role="group" aria-label="รูปแบบการเล่น">
      <button id="relaxed" aria-pressed="true">เล่นสบาย</button><button id="arcade" aria-pressed="false">อาร์เคด</button>
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
      <div class="score"><span class="score-icon">${icon('trophy')}</span><div><small>คะแนน</small><strong id="score">0</strong></div><span id="double" class="double-badge" hidden>x2</span></div>
      <div id="powers" class="powers" aria-label="ไอเทมที่ใช้ได้"></div>
      <div class="hud-right">
        <div id="timer" class="timer" hidden>${icon('timer')}<strong>1:30</strong></div>
        <div class="catch-count">${icon('fish')}<strong id="caught-count">0 / ${GOAL}</strong></div>
        <div class="maps" aria-label="แผนที่สมบัติ">${icon('map')}<strong id="maps">0/${MAP_PIECES}</strong></div>
      </div>
    </section>
    <div id="edge" class="edge-flash" hidden></div>
    <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
    <div class="phase-label"><div id="bonus" class="bonus-banner" role="status" hidden>${icon('sparkles')}<span id="bonus-label">ฝนสมบัติ!</span><strong id="bonus-time">20</strong></div><div id="fever" class="fever-banner" role="status" hidden><span>FEVER x2</span><strong id="fever-time">15</strong></div><span id="phase-text" role="status" aria-live="polite">ออกทะเลกัน!</span><span id="caught-name"></span></div>
    <div class="dock">
      <button id="cast" class="cast-button" disabled>${icon('anchor')}<span>หย่อนเบ็ด</span></button>
      <div class="reel-wrap">
        <output id="tap-count" aria-live="off"></output>
        <button id="reel" aria-label="รอกดึงปลา" data-tip="รอกดึงปลา" disabled>
          <span class="reel-progress"></span><span class="wheel"><span class="spoke s1"></span><span class="spoke s2"></span><span class="hub"></span><span class="handle"></span></span>
        </button>
      </div>
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
    this.round = this.makeRound('relaxed');
    this.scene = null;
    this.wheelAngle = 0;
    this.lastHUD = '';
    this.lastSecond = null;
    this.resumeOnClose = false;
    this.hookMessageCount = 0;
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

  makeRound(mode) {
    // Powers won on the lucky wheel are used up by the trip they start.
    const startPowers = this.progress.startPowers ?? {};
    this.progress.startPowers = {};
    if (Object.keys(startPowers).length) this.persist?.();
    this.startPowers = startPowers;
    return new FishingRound(mode, (species, round) => this.landed(species, round), { maps: this.progress.maps, bonusTurn: this.progress.bonusTurn, startPowers, rng: this.rng });
  }

  landed(species, round) {
    const landing = round.landing;
    for (const s of landing.all) recordCatch(this.progress, s.id);
    this.progress.maps = round.maps;
    this.progress.bonusTurn = round.bonusTurn;
    this.persist();
    this.audio.stop();
    this.audio.play(species.jackpot ? 'jackpot' : species.kind === 'item' ? 'treasure' : species.kind === 'junk' ? 'junk' : 'land');
    // Lower-priority messages first; item and jackpot messages below replace them.
    if (landing.combo >= 2) { this.audio.play('combo', { combo: landing.combo }); this.toast(`คอมโบ ${landing.combo}! อีกตัวเดียวได้ FEVER`); }
    if (species.prizes) this.toast(`เปิดหีบได้ ${landing.base} คะแนน!`);
    if (landing.feverStarted) { this.flashEdges('fever'); this.audio.play('fever'); this.toast('FEVER! คะแนน x2 อยู่ 15 วินาที'); }
    if (landing.extras.length) this.toast(`แหจับได้ ${landing.all.length} ตัว! ${landing.all.map((s) => s.name).join(' ')}`);
    const powerText = { net: 'ได้แห! ทอดครั้งต่อไปจับตัวข้างๆ ได้ด้วย', turbo: 'รอกเร็ว! 3 ครั้งถัดไปดึงง่ายขึ้น', goldhook: 'ตะขอทอง! ตะขอใหญ่ขึ้น 20 วินาที', spyglass: 'กล้องส่องทางไกล! เห็นสัตว์ลึกลับ 20 วินาที' };
    for (const power of landing.powers) { this.audio.play('powerup'); this.toast(powerText[power]); }
    if (species.effect === 'double') { this.audio.play('double'); this.toast('ครั้งต่อไปได้คะแนน x2!'); }
    if (species.effect === 'time' && round.mode === 'arcade') { this.audio.play('time'); this.toast('เวลา +10 วินาที!'); }
    if (species.effect === 'map') {
      this.audio.play('map');
      this.toast(landing.bonusStarted ? 'แผนที่ครบ 4 ชิ้น!' : `ได้แผนที่ ${round.maps}/${MAP_PIECES} ชิ้น`);
    }
    if (landing.multiplier > 1) this.toast(`คะแนน x${landing.multiplier} ได้ ${landing.points} คะแนน!`);
    if (species.kind === 'junk') this.toast('ได้รองเท้าเก่ามา ลองใหม่นะ!');
    if (species.jackpot) this.toast(`แจ็กพอต! ${species.name}`);
    if (landing.bonusStarted && landing.bonusKind === 'rain') {
      this.audio.play('bonus');
      this.audio.say('แผนที่ครบแล้ว ฝนสมบัติมาแล้ว');
    }
    if (landing.bonusStarted && landing.bonusKind === 'pirate') this.toast('แผนที่ครบ! เรือโจรสลัดกำลังมา');
    this.scene?.celebrate(species, landing);
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
        arrange: (id, extras) => this.scene.arrangeForTest(id, extras),
        setBonusTurn: (n) => { this.round.bonusTurn = n; },
        setPower: (name, value) => { this.round[name] = value; },
        setPirateTime: (seconds) => { if (this.round.pirate) this.round.pirate.time = seconds; },
        finishTrip: (ids) => { this.round.catches.push(...ids); this.round.tripCatches = 8; this.round.score += 123; this.round.phase = 'complete'; },
        setTimeOfDay: (time) => this.scene.setTimeOfDay(time),
        setLooks: (looks) => { this.progress.looks = { ...this.progress.looks, ...looks }; this.persist(); },
        spawnBoss: (id) => this.scene.spawnBossForTest(id),
        edgeVisible: () => !$('#edge').hidden,
        setCollection: (ids) => { for (const id of ids) this.progress.collection[id] = Math.max(1, this.progress.collection[id] ?? 0); this.persist(); },
        freezeShips: () => this.scene.pirate.freeze(),
        aimAt: (x) => { this.scene.pirate.testAimX = x; },
        release: () => this.scene.releaseTest(),
        expire: () => { this.round.remaining = 0.01; },
        setMaps: (n) => { this.round.maps = n; },
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
    const top = Math.min($('#cast').getBoundingClientRect().top, $('#reel').getBoundingClientRect().top);
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
    bindTapControl($('#cast'), () => this.round.phase === 'complete' ? this.startRound(this.round.mode) : this.cast());
    bindTapControl($('#reel'), (source) => this.reel(source), $('.reel-wrap'), { onRotate: (degrees) => this.turnWheel(degrees) });
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
    $('.stage').addEventListener('contextmenu', (event) => event.preventDefault());
    $('#modal').addEventListener('close', () => {
      if (this.resumeOnClose && this.round.phase !== 'complete') this.round.pause(false);
      this.resumeOnClose = false;
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

  cast() {
    if (!this.scene || this.failed || $('#modal').open) return;
    this.audio.unlock();
    if (this.round.phase === 'pirate') { this.fire(); return; }
    if (this.round.cast()) { this.audio.stop(); this.audio.play('cast'); this.renderHUD(); }
  }

  fire() {
    if (!this.round.fire()) return;
    this.audio.play('cannon');
    this.scene.pirate.fire(this.round.angle, (shot) => {
      const result = this.round.resolveShot(shot);
      this.onShot(result, shot);
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
  onTug(level) {
    this.tugs = (this.tugs ?? 0) + 1;
    const reel = $('#reel');
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

  onPirateStart() {
    this.audio.play('pirate');
    this.audio.say('เรือโจรสลัดมาแล้ว แตะเพื่อยิงปืนใหญ่ มีเวลา 30 วินาที');
    this.toast('เรือโจรสลัด! เล็งแล้วแตะยิงปืนใหญ่ให้ได้มากที่สุดใน 30 วินาที');
  }

  // The battle is over (time up and the last ball landed): sum up the loot.
  onPirateEnd() {
    const result = this.round.pirateResult;
    this.audio.play(result?.loot ? 'treasure' : 'miss');
    setTimeout(() => this.toast(result?.loot ? `ได้สมบัติจากเรือโจรสลัด ${result.loot} คะแนน!` : 'เรือโจรสลัดแล่นไปแล้ว ไว้ลองใหม่นะ'), 400);
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
  turnWheel(degrees) {
    if (this.round.phase !== 'reeling') return;
    this.wheelAngle += degrees;
    $('#reel').classList.add('cranking');
    $('#reel').style.setProperty('--wheel-angle', `${this.wheelAngle}deg`);
    clearTimeout(this.crankTimer);
    this.crankTimer = setTimeout(() => $('#reel').classList.remove('cranking'), 150);
  }

  reel(source = 'tap') {
    this.audio.unlock();
    if (!this.round.reel(performance.now())) return;
    if (source !== 'crank') this.wheelAngle += 55;
    $('#reel').style.setProperty('--wheel-angle', `${this.wheelAngle}deg`);
    $('#reel').classList.remove('tapped');
    void $('#reel').offsetWidth;
    $('#reel').classList.add('tapped');
    this.audio.play('tap', { progress: this.round.taps / this.round.requiredTaps });
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

  // Gold coins fly from a point in the sea (world coordinates) to the score box, which then bumps.
  flyCoins(worldX, worldY, count) {
    if (!this.scene || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const sea = $('#sea').getBoundingClientRect();
    const cam = this.scene.cameras.main;
    const k = cam.zoom / this.dpr;
    const sx = sea.left + (worldX - cam.worldView.x) * k;
    const sy = sea.top + (worldY - cam.worldView.y) * k;
    const target = $('.score-icon').getBoundingClientRect();
    const tx = target.left + target.width / 2;
    const ty = target.top + target.height / 2;
    let arrived = 0;
    for (let i = 0; i < count; i++) {
      const coin = document.createElement('span');
      coin.className = 'coin-fly';
      coin.style.backgroundImage = `url(${assetUrl('sprites/coin.webp')})`;
      const x = sx + (Math.random() - 0.5) * 40;
      const y = sy + (Math.random() - 0.5) * 24;
      coin.style.left = `${x - 8}px`;
      coin.style.top = `${y - 8}px`;
      coin.style.transitionDelay = `${i * 45}ms`;
      document.body.append(coin);
      requestAnimationFrame(() => requestAnimationFrame(() => { coin.style.transform = `translate(${tx - x}px, ${ty - y}px) scale(0.7)`; }));
      const done = () => {
        coin.remove();
        if (++arrived === count) {
          this.audio.play('coins', { count });
          const box = $('.score');
          box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
        }
      };
      coin.addEventListener('transitionend', done, { once: true });
      setTimeout(() => { if (coin.isConnected) done(); }, 1500 + i * 45);
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

  renderHUD() {
    if (!this.scene || this.failed) return;
    const r = this.round;
    const mystery = r.phase === 'reeling' && this.scene.caught?.getData('reveal') < 0.85;
    const seconds = Math.ceil(r.remaining);
    const bonus = Math.ceil(r.bonus);
    const fever = Math.ceil(r.fever);
    const pirate = r.pirate;
    const powers = `${r.netCharges},${r.turbo},${Math.ceil(r.goldHook)},${Math.ceil(r.spyglass)}`;
    const signature = `${r.phase}/${r.paused}/${r.score}/${r.tripCatches}/${r.catchId}/${r.taps}/${seconds}/${mystery}/${r.maps}/${r.doubleNext}/${bonus}/${fever}/${powers}/${pirate ? Math.ceil(pirate.time) : ''}`;
    if (signature === this.lastHUD) return;
    this.lastHUD = signature;
    $('#score').textContent = r.score;
    $('#caught-count').textContent = `${Math.min(r.tripCatches, GOAL)} / ${GOAL}`;
    $('#maps').textContent = `${r.maps}/${MAP_PIECES}`;
    $('#double').hidden = !r.doubleNext;
    $('#bonus').hidden = bonus <= 0 && !pirate;
    $('#bonus-label').textContent = pirate ? 'ยิงเรือโจรสลัด!' : 'ฝนสมบัติ!';
    $('#bonus-time').textContent = pirate ? `${Math.ceil(pirate.time)} วิ` : bonus;
    this.renderPowers(r);
    $('#fever').hidden = fever <= 0;
    $('#fever-time').textContent = fever;
    $('#timer').hidden = r.mode !== 'arcade';
    $('#timer strong').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    $('#timer').classList.toggle('urgent', seconds <= 15);
    if (r.mode === 'arcade' && seconds <= 10 && seconds > 0 && !r.paused && bonus <= 0 && this.lastSecond !== seconds && r.phase !== 'complete') this.audio.play('tick');
    this.lastSecond = seconds;
    const labels = { aim: 'ออกทะเลกัน!', casting: 'เบ็ดกำลังลง…', reeling: 'ติดเบ็ดแล้ว!', returning: 'ลองอีกครั้งได้เลย', celebrate: 'เยี่ยมเลย!', complete: 'กลับถึงฝั่งแล้ว', pirate: 'เล็งเป้าแล้วแตะยิง!' };
    $('#phase-text').textContent = labels[r.phase];
    $('#caught-name').textContent = r.catchId ? (mystery ? 'สัตว์ลึกลับ' : SPECIES_BY_ID[r.catchId].name) : '';
    $('#cast').disabled = r.paused || !(['aim', 'complete'].includes(r.phase) || (pirate && pirate.time > 0));
    $('#cast span').textContent = r.phase === 'complete' ? 'ออกเรืออีกครั้ง' : pirate ? 'ยิงปืนใหญ่' : 'หย่อนเบ็ด';
    $('#cast').classList.toggle('fire', Boolean(pirate));
    $('#reel').disabled = r.paused || r.phase !== 'reeling';
    $('#reel').classList.toggle('active', r.phase === 'reeling');
    $('#tap-count').textContent = r.phase === 'reeling' ? `${r.taps} / ${r.requiredTaps}` : '';
    $('#reel').style.setProperty('--progress', `${r.requiredTaps ? r.taps / r.requiredTaps * 100 : 0}%`);
    if (r.phase === 'complete' && recordTrip(this.progress, r)) { this.persist(); this.openReward(); }
  }

  // Small icons under the score for the power-ups that are ready or running.
  renderPowers(r) {
    const items = [
      ['net', r.netCharges, `x${r.netCharges}`, 'แห'],
      ['turbo-reel', r.turbo, `x${r.turbo}`, 'รอกเร็ว'],
      ['gold-hook', r.goldHook, `${Math.ceil(r.goldHook)}`, 'ตะขอทอง'],
      ['spyglass', r.spyglass, `${Math.ceil(r.spyglass)}`, 'กล้องส่องทางไกล'],
    ].filter(([, value]) => value > 0);
    $('#powers').innerHTML = items.map(([id, , label, name]) => `<span class="power" title="${name}"><img src="${assetUrl(`sprites/${id}.webp`)}" alt="${name}"><b>${label}</b></span>`).join('');
  }

  startRound(mode) {
    this.resumeOnClose = false;
    if ($('#modal').open) $('#modal').close();
    this.audio.stop();
    this.round = this.makeRound(mode);
    this.scene?.setTimeOfDay(timeOfDay(this.progress.trips));
    this.scene?.resetRound();
    this.announceTrip();
    this.wheelAngle = 0;
    $('#reel').style.setProperty('--wheel-angle', '0deg');
    for (const m of ['relaxed', 'arcade']) $(`#${m}`).setAttribute('aria-pressed', String(m === mode));
    this.lastHUD = ''; this.renderHUD();
  }

  changeMode(mode) {
    if (mode === this.round.mode) return;
    this.audio.unlock();
    if (this.round.casts && this.round.phase !== 'complete') {
      this.showDialog(`<h2 id="dialog-title">ออกเรือรอบใหม่?</h2><p>ของสะสมที่นำขึ้นเรือแล้วจะยังอยู่</p><div class="dialog-actions"><button id="keep" class="secondary">${icon('play')}เล่นต่อ</button><button id="new-mode" class="primary">${icon('rotate-ccw')}รอบใหม่</button></div>`);
      $('#keep').onclick = () => $('#modal').close();
      $('#new-mode').onclick = () => this.startRound(mode);
    } else this.startRound(mode);
  }

  pause() {
    if (!this.scene || $('#modal').open || this.round.phase === 'complete') return;
    this.showDialog(`<div class="dialog-emblem">${icon('anchor')}</div><h2 id="dialog-title">พักที่ท่าเรือ</h2><div class="dialog-actions"><button id="resume" class="primary">${icon('play')}เล่นต่อ</button><button id="restart" class="secondary">${icon('rotate-ccw')}เริ่มรอบใหม่</button></div>`);
    $('#resume').onclick = () => $('#modal').close();
    $('#restart').onclick = () => this.startRound(this.round.mode);
  }

  showDialog(html) {
    if (!$('#modal').open) this.resumeOnClose = !this.round.paused && this.round.phase !== 'complete';
    this.round.pause(true); this.audio.stop(); this.audio.duck(true);
    $('#modal-content').innerHTML = html;
    updateIcons();
    if (!$('#modal').open) $('#modal').showModal();
    this.lastHUD = ''; this.renderHUD();
  }

  openCollection() {
    const found = this.species.filter((s) => this.progress.collection[s.id]).length;
    const sections = ZONES.map((zone) => {
      const list = this.species.filter(zone.match);
      if (!list.length) return '';
      return `<h3 class="zone-title">${zone.name}</h3><div class="collection-grid">${list.map((s) => `<article class="collection-item ${this.progress.collection[s.id] ? '' : 'undiscovered'}">${art(s)}<h4>${s.name}</h4><span>${this.progress.collection[s.id] ? `${this.progress.collection[s.id]} ครั้ง` : 'ยังไม่พบ'}</span></article>`).join('')}</div>`;
    }).join('');
    this.showDialog(`<div class="dialog-heading"><div><small>สัตว์ทะเลและสมบัติ</small><h2 id="dialog-title">สมุดสะสม <span>${found} / ${this.species.length}</span></h2></div><button id="close-book" class="icon-button" aria-label="ปิดสมุดสะสม">${icon('x')}</button></div>${this.looksHtml()}${sections}`);
    $('#close-book').onclick = () => $('#modal').close();
    for (const button of document.querySelectorAll('.look:not([disabled])')) {
      button.onclick = () => {
        this.progress.looks = { ...this.progress.looks, [button.dataset.part]: button.dataset.look };
        this.persist();
        this.audio.play('powerup');
        this.openCollection();
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
    $('#again').onclick = () => this.startRound(r.mode);
    $('#reward-book').onclick = () => this.openCollection();
    $('#spin').onclick = () => this.spin();
  }

  wheelHtml() {
    const step = 360 / WHEEL.length;
    const colors = ['#ffd34d', '#4fb3e8', '#ff8a5c', '#7fd48a', '#e8433a', '#9b7be0', '#ffb347', '#3fc1b0'];
    const gradient = WHEEL.map((_, i) => `${colors[i % colors.length]} ${i * step}deg ${(i + 1) * step}deg`).join(', ');
    const labels = WHEEL.map((prize, i) => `<span class="seg" style="--a:${i * step + step / 2}deg"><span>${prize.art ? `<img src="${assetUrl(`sprites/${prize.art}.webp`)}" alt="">` : ''}<b>${prize.short ?? prize.label}</b></span></span>`).join('');
    return `<div class="lucky"><div class="lucky-box"><div class="lucky-pointer"></div><div id="lucky-wheel" class="lucky-wheel" style="background: conic-gradient(${gradient})">${labels}<span class="lucky-hub"></span></div></div><button id="spin" class="primary spin">${icon('sparkles')}หมุนวงล้อนำโชค</button><p id="prize" class="prize" aria-live="polite"></p></div>`;
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
      const message = applyPrize(this.progress, this.round, prize);
      this.persist();
      this.audio.play(prize.points >= 100 ? 'jackpot' : 'treasure');
      $('#prize').textContent = message;
      $('.reward-score').firstChild.textContent = this.round.score;
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

new FishingApp();
