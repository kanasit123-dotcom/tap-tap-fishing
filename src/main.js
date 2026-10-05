import { createIcons, Anchor, BookOpen, Volume2, VolumeX, Pause, Play, Fish, Trophy, Timer, X, RotateCcw, ArrowRight, Check, Music, Map as MapIcon, Sparkles } from 'lucide';
import { createGame } from './scene.js';
import { FishingRound, GOAL, MAP_PIECES } from './model.js';
import { SPECIES_BY_ID, ZONES, speciesWithArt } from './species.js';
import { loadProgress, saveProgress, recordCatch, recordTrip } from './progress.js';
import { FishingAudio } from './audio.js';
import { bindTapControl } from './input.js';
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
      <div class="hud-right">
        <div id="timer" class="timer" hidden>${icon('timer')}<strong>1:30</strong></div>
        <div class="catch-count">${icon('fish')}<strong id="caught-count">0 / ${GOAL}</strong></div>
        <div class="maps" aria-label="แผนที่สมบัติ">${icon('map')}<strong id="maps">0/${MAP_PIECES}</strong></div>
      </div>
    </section>
    <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
    <div class="phase-label"><div id="bonus" class="bonus-banner" role="status" hidden>${icon('sparkles')}<span>ฝนสมบัติ!</span><strong id="bonus-time">20</strong></div><span id="phase-text" role="status" aria-live="polite">ออกทะเลกัน!</span><span id="caught-name"></span></div>
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
    return new FishingRound(mode, (species, round) => this.landed(species, round), { maps: this.progress.maps });
  }

  landed(species, round) {
    const landing = round.landing;
    recordCatch(this.progress, species.id);
    this.progress.maps = round.maps;
    this.persist();
    this.audio.stop();
    this.audio.play(species.jackpot ? 'jackpot' : species.kind === 'item' ? 'treasure' : species.kind === 'junk' ? 'junk' : 'land');
    if (species.effect === 'double') { this.audio.play('double'); this.toast('ครั้งต่อไปได้คะแนน x2!'); }
    if (species.effect === 'time' && round.mode === 'arcade') { this.audio.play('time'); this.toast('เวลา +10 วินาที!'); }
    if (species.effect === 'map') {
      this.audio.play('map');
      this.toast(landing.bonusStarted ? 'แผนที่ครบ 4 ชิ้น!' : `ได้แผนที่ ${round.maps}/${MAP_PIECES} ชิ้น`);
    }
    if (landing.multiplier > 1) this.toast(`คะแนน x2 ได้ ${landing.points} คะแนน!`);
    if (species.kind === 'junk') this.toast('ได้รองเท้าเก่ามา ลองใหม่นะ!');
    if (species.jackpot) this.toast(`แจ็กพอต! ${species.name}`);
    if (landing.bonusStarted) {
      this.audio.play('bonus');
      this.audio.say('แผนที่ครบแล้ว ฝนสมบัติมาแล้ว');
    }
    this.scene?.celebrate(species, landing);
  }

  ready(scene) {
    this.scene = scene;
    $('.loading').hidden = !this.failed;
    $('#sea canvas').setAttribute('aria-hidden', 'true');
    this.measure(); this.renderHUD();
    if (QA) {
      window.__FISHING_QA__ = {
        snapshot: () => this.scene.snapshot(),
        arrange: (id) => this.scene.arrangeForTest(id),
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

  measure() {
    requestAnimationFrame(() => {
      const canvas = $('#sea canvas');
      if (!canvas) return;
      const stage = $('.stage').getBoundingClientRect();
      $('.stage').style.setProperty('--scene-width', `${Math.min(stage.width, stage.height * 480 / 760)}px`);
      $('.stage').style.setProperty('--scene-gap', '0px');
      $('.stage').style.setProperty('--scene-top', '0px');
      // Phaser can record a rotated container's new size without resizing the canvas (iPad rotation):
      // refresh it whenever the canvas and its container disagree.
      const sea = $('#sea');
      const size = this.game.scale.gameSize;
      if (Math.abs(size.width - sea.clientWidth) > 1 || Math.abs(size.height - sea.clientHeight) > 1) {
        this.game.scale.getParentBounds();
        this.game.scale.refresh();
      }
      this.scene?.relayout();
    });
  }

  persist() { $('#save-warning').hidden = saveProgress(this.storage, this.progress); }

  bindControls() {
    bindTapControl($('#cast'), () => this.round.phase === 'complete' ? this.startRound(this.round.mode) : this.cast());
    bindTapControl($('#reel'), () => this.reel(), $('.reel-wrap'));
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
    if (this.round.cast()) { this.audio.stop(); this.audio.play('cast'); this.renderHUD(); }
  }

  reel() {
    this.audio.unlock();
    if (!this.round.reel(performance.now())) return;
    this.wheelAngle += 55;
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
    if (this.hookMessageCount++ < 2) this.audio.say('ติดเบ็ดแล้ว แตะรอกซ้ำ ๆ เพื่อดึงขึ้นมา');
    this.renderHUD();
  }

  onMiss() { this.audio.play('miss'); }

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
    const signature = `${r.phase}/${r.paused}/${r.score}/${r.tripCatches}/${r.catchId}/${r.taps}/${seconds}/${mystery}/${r.maps}/${r.doubleNext}/${bonus}`;
    if (signature === this.lastHUD) return;
    this.lastHUD = signature;
    $('#score').textContent = r.score;
    $('#caught-count').textContent = `${Math.min(r.tripCatches, GOAL)} / ${GOAL}`;
    $('#maps').textContent = `${r.maps}/${MAP_PIECES}`;
    $('#double').hidden = !r.doubleNext;
    $('#bonus').hidden = bonus <= 0;
    $('#bonus-time').textContent = bonus;
    $('#timer').hidden = r.mode !== 'arcade';
    $('#timer strong').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    $('#timer').classList.toggle('urgent', seconds <= 15);
    if (r.mode === 'arcade' && seconds <= 10 && seconds > 0 && !r.paused && bonus <= 0 && this.lastSecond !== seconds && r.phase !== 'complete') this.audio.play('tick');
    this.lastSecond = seconds;
    const labels = { aim: 'ออกทะเลกัน!', casting: 'เบ็ดกำลังลง…', reeling: 'ติดเบ็ดแล้ว!', returning: 'ลองอีกครั้งได้เลย', celebrate: 'เยี่ยมเลย!', complete: 'กลับถึงฝั่งแล้ว' };
    $('#phase-text').textContent = labels[r.phase];
    $('#caught-name').textContent = r.catchId ? (mystery ? 'สัตว์ลึกลับ' : SPECIES_BY_ID[r.catchId].name) : '';
    $('#cast').disabled = r.paused || !['aim', 'complete'].includes(r.phase);
    $('#cast span').textContent = r.phase === 'complete' ? 'ออกเรืออีกครั้ง' : 'หย่อนเบ็ด';
    $('#reel').disabled = r.paused || r.phase !== 'reeling';
    $('#reel').classList.toggle('active', r.phase === 'reeling');
    $('#tap-count').textContent = r.phase === 'reeling' ? `${r.taps} / ${r.requiredTaps}` : '';
    $('#reel').style.setProperty('--progress', `${r.requiredTaps ? r.taps / r.requiredTaps * 100 : 0}%`);
    if (r.phase === 'complete' && recordTrip(this.progress, r)) { this.persist(); this.openReward(); }
  }

  startRound(mode) {
    this.resumeOnClose = false;
    if ($('#modal').open) $('#modal').close();
    this.audio.stop();
    this.round = this.makeRound(mode);
    this.scene?.resetRound();
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
    this.showDialog(`<div class="dialog-heading"><div><small>สัตว์ทะเลและสมบัติ</small><h2 id="dialog-title">สมุดสะสม <span>${found} / ${this.species.length}</span></h2></div><button id="close-book" class="icon-button" aria-label="ปิดสมุดสะสม">${icon('x')}</button></div>${sections}`);
    $('#close-book').onclick = () => $('#modal').close();
  }

  openReward() {
    const r = this.round;
    const unique = [...new Set(r.catches)].map((id) => SPECIES_BY_ID[id]);
    this.showDialog(`<div class="dialog-emblem gold">${icon('trophy')}</div><h2 id="dialog-title">นักสำรวจอ่าวสมบัติ!</h2><div class="reward-score">${r.score}<span>คะแนน</span></div><p>นำขึ้นเรือ ${r.catches.length} รายการ · สถิติสูงสุด ${this.progress.best[r.mode]} คะแนน</p><div class="catch-strip">${unique.map((s) => art(s)).join('')}</div><div class="dialog-actions"><button id="again" class="primary">${icon('anchor')}ออกเรืออีกครั้ง</button><button id="reward-book" class="secondary">${icon('book-open')}สมุดสะสม</button></div>`);
    $('#again').onclick = () => this.startRound(r.mode);
    $('#reward-book').onclick = () => this.openCollection();
  }
}

new FishingApp();
