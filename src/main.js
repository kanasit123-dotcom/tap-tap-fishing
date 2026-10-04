import { createIcons, Anchor, BookOpen, Volume2, VolumeX, Pause, Play, Fish, Trophy, Timer, X, RotateCcw, ArrowRight, Check } from 'lucide';
import { createGame } from './scene.js';
import { FishingRound, GOAL } from './model.js';
import { SPECIES, SPECIES_BY_ID } from './species.js';
import { loadProgress, saveProgress, recordCatch, recordTrip } from './progress.js';
import { FishingAudio } from './audio.js';
import './style.css';

const icons = { Anchor, BookOpen, Volume2, VolumeX, Pause, Play, Fish, Trophy, Timer, X, RotateCcw, ArrowRight, Check };
const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const updateIcons = () => createIcons({ icons, attrs: { 'stroke-width': 2.3 } });
const $ = (selector) => document.querySelector(selector);
const art = (s) => `<span class="species-art" role="img" aria-label="${s.name}" style="background-position:${s.frame % 4 * 100 / 3}% ${Math.floor(s.frame / 4) * 100}%"></span>`;

$('#app').innerHTML = `
  <header class="topbar">
    <div class="brand">${icon('anchor')}<div><h1>อ่าวสมบัติ</h1><span>TAP TAP FISHING</span></div></div>
    <div class="modes" role="group" aria-label="รูปแบบการเล่น">
      <button id="relaxed" aria-pressed="true">เล่นสบาย</button><button id="arcade" aria-pressed="false">อาร์เคด</button>
    </div>
    <nav aria-label="เครื่องมือเกม">
      <button id="collection" class="icon-button" aria-label="สมุดสะสม" data-tip="สมุดสะสม">${icon('book-open')}</button>
      <button id="sound" class="icon-button" aria-label="ปิดเสียง" data-tip="เสียง" aria-pressed="true">${icon('volume-2')}</button>
      <button id="pause" class="icon-button" aria-label="พักเกม" data-tip="พักเกม">${icon('pause')}</button>
    </nav>
  </header>
  <main class="stage" aria-label="ทะเลสำหรับตกปลา">
    <div id="sea" role="img" aria-label="เรือตกปลาและสัตว์ทะเลว่ายหลายชั้น"></div>
    <div class="loading" role="status">กำลังออกเรือ…</div>
    <section class="hud" aria-label="ผลการเล่น">
      <div class="score"><span class="score-icon">${icon('trophy')}</span><div><small>คะแนน</small><strong id="score">0</strong></div></div>
      <div class="catch-count">${icon('fish')}<strong id="caught-count">0 / ${GOAL}</strong></div>
      <div id="timer" class="timer" hidden>${icon('timer')}<strong>1:30</strong></div>
    </section>
    <div class="phase-label"><span id="phase-text" role="status" aria-live="polite">ออกทะเลกัน!</span><span id="caught-name"></span></div>
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
    this.audio = new FishingAudio(this.progress.sound);
    this.round = this.makeRound('relaxed');
    this.scene = null;
    this.wheelAngle = 0;
    this.lastHUD = '';
    this.resumeOnClose = false;
    this.hookMessageCount = 0;
    this.syncSound();
    this.bindControls();
    this.game = createGame(this);
    this.resizeObserver = new ResizeObserver(() => this.measure());
    this.resizeObserver.observe($('.stage'));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
    window.addEventListener('blur', () => this.pause());
    window.addEventListener('pagehide', () => this.audio.stop());
  }

  makeRound(mode) {
    return new FishingRound(mode, (species) => {
      recordCatch(this.progress, species.id);
      this.persist();
      this.audio.stop(); this.audio.play('land');
      this.scene?.celebrate(species);
    });
  }

  ready(scene) {
    this.scene = scene;
    $('.loading').hidden = !this.failed;
    $('#sea canvas').setAttribute('aria-hidden', 'true');
    this.measure(); this.renderHUD();
    scene.scale.on('resize', () => this.measure());
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('qa')) {
      window.__FISHING_QA__ = {
        snapshot: () => this.scene.snapshot(),
        arrange: (id) => this.scene.arrangeForTest(id),
        expire: () => { this.round.remaining = 0.01; },
      };
    }
  }

  assetError() {
    $('.loading').textContent = 'โหลดภาพไม่สำเร็จ กรุณาเปิดเกมใหม่';
    this.failed = true;
  }

  measure() {
    requestAnimationFrame(() => {
      const canvas = $('#sea canvas');
      if (!canvas) return;
      const stage = $('.stage').getBoundingClientRect();
      $('.stage').style.setProperty('--scene-width', `${Math.min(stage.width, stage.height * 480 / 760)}px`);
      $('.stage').style.setProperty('--scene-gap', '0px');
      $('.stage').style.setProperty('--scene-top', '0px');
    });
  }

  persist() { $('#save-warning').hidden = saveProgress(this.storage, this.progress); }

  bindControls() {
    const activate = (button, fn) => {
      button.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || button.disabled) return;
        event.preventDefault(); fn();
      });
      button.addEventListener('click', (event) => { if (event.detail === 0 && !button.disabled) fn(); });
      button.addEventListener('keydown', (event) => { if (event.repeat && (event.key === ' ' || event.key === 'Enter')) event.preventDefault(); });
    };
    activate($('#cast'), () => this.round.phase === 'complete' ? this.startRound(this.round.mode) : this.cast());
    activate($('#reel'), () => this.reel());
    $('#pause').onclick = () => this.pause();
    $('#collection').onclick = () => { this.audio.unlock(); this.openCollection(); };
    $('#sound').onclick = () => {
      this.progress.sound = this.audio.toggle(); this.persist(); this.syncSound();
    };
    for (const mode of ['relaxed', 'arcade']) $(`#${mode}`).onclick = () => this.changeMode(mode);
    $('.stage').addEventListener('contextmenu', (event) => event.preventDefault());
    $('#modal').addEventListener('close', () => {
      if (this.resumeOnClose && this.round.phase !== 'complete') this.round.pause(false);
      this.resumeOnClose = false;
      this.lastHUD = ''; this.renderHUD();
    });
  }

  syncSound() {
    $('#sound').innerHTML = icon(this.audio.enabled ? 'volume-2' : 'volume-x');
    $('#sound').setAttribute('aria-label', this.audio.enabled ? 'ปิดเสียง' : 'เปิดเสียง');
    $('#sound').setAttribute('aria-pressed', String(this.audio.enabled));
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
    this.audio.play('tap');
    if (navigator.vibrate) navigator.vibrate(8);
    this.renderHUD();
  }

  onHook() {
    this.audio.play('hook');
    if (this.hookMessageCount++ < 2) this.audio.say('ติดเบ็ดแล้ว แตะรอกซ้ำ ๆ เพื่อดึงขึ้นมา');
    this.renderHUD();
  }

  renderHUD() {
    if (!this.scene || this.failed) return;
    const r = this.round;
    const signature = `${r.phase}/${r.paused}/${r.score}/${r.catches.length}/${r.catchId}/${r.taps}/${Math.ceil(r.remaining)}`;
    if (signature === this.lastHUD) return;
    this.lastHUD = signature;
    $('#score').textContent = r.score;
    $('#caught-count').textContent = `${r.catches.length} / ${GOAL}`;
    $('#timer').hidden = r.mode !== 'arcade';
    const seconds = Math.ceil(r.remaining);
    $('#timer strong').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    $('#timer').classList.toggle('urgent', seconds <= 15);
    const labels = { aim: 'ออกทะเลกัน!', casting: 'เบ็ดกำลังลง…', reeling: 'ติดเบ็ดแล้ว!', returning: 'ลองอีกครั้งได้เลย', celebrate: 'เยี่ยมเลย!', complete: 'กลับถึงฝั่งแล้ว' };
    $('#phase-text').textContent = labels[r.phase];
    $('#caught-name').textContent = r.catchId ? SPECIES_BY_ID[r.catchId].name : '';
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
    this.round.pause(true); this.audio.stop();
    $('#modal-content').innerHTML = html;
    updateIcons();
    if (!$('#modal').open) $('#modal').showModal();
    this.lastHUD = ''; this.renderHUD();
  }

  openCollection() {
    const found = SPECIES.filter((s) => this.progress.collection[s.id]).length;
    this.showDialog(`<div class="dialog-heading"><div><small>สัตว์ทะเลและสมบัติ</small><h2 id="dialog-title">สมุดสะสม <span>${found} / 8</span></h2></div><button id="close-book" class="icon-button" aria-label="ปิดสมุดสะสม">${icon('x')}</button></div><div class="collection-grid">${SPECIES.map((s) => `<article class="collection-item ${this.progress.collection[s.id] ? '' : 'undiscovered'}">${art(s)}<h3>${s.name}</h3><span>${this.progress.collection[s.id] ? `${this.progress.collection[s.id]} ครั้ง` : 'ยังไม่พบ'}</span></article>`).join('')}</div>`);
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
