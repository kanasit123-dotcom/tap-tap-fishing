import Phaser from 'phaser';
import { SPECIES_BY_ID, SEABED, LANE_COUNT, PLACEHOLDER_ART, isMystery, isTreasure, displaySize, revealForRise } from './species.js';
import { computeLayout, backgroundPlacement, BG_EDGE, WATERLINE } from './layout.js';
import { Spawner } from './spawner.js';
import { WORLD } from './model.js';
import manifest from './art-manifest.js';

const asset = (file) => `${import.meta.env.BASE_URL}assets/${file}`;
// The rod sits in a holder on the boat; its tip is the pivot the hook swings from.
// ROD_BUTT is where the drawn boat's holder goes; a boat image moves it to its own holder tube.
const ROD_BUTT = { x: 196, y: 108 };
const BOAT_WIDTH = 180;
const BOAT_HOLDER_X = 204;
const ROD_TIP = { x: WORLD.originX, y: WORLD.originY };
const SURFACE_Y = WORLD.originY + WORLD.rest;
const WARM_UP_SECONDS = 26;

export class CoveScene extends Phaser.Scene {
  constructor(controller) {
    super('cove');
    this.controller = controller;
    this.caught = null;
    this.bonusActive = false;
    this.qaHold = false;
  }

  preload() {
    for (const [name, bg] of Object.entries(manifest.backgrounds ?? {})) this.load.image(`bg-${name}`, asset(bg.file));
    for (const s of this.controller.species) if (s.art?.kind === 'sprite') this.load.image(s.art.key, asset(s.art.file));
    if (manifest.sprites?.boat?.holder) this.load.image('boat', asset(manifest.sprites.boat.file));
    if (manifest.sprites?.hook) this.load.image('hook-art', asset(manifest.sprites.hook.file));
    this.load.on('loaderror', () => this.controller.assetError());
  }

  create() {
    this.textures.createCanvas('sky', 4, 256);
    this.sky = this.add.image(240, 0, 'sky').setOrigin(0.5, 0).setDepth(-4);
    this.bgTiles = [];
    this.registerArt();
    this.makeHookTexture();
    this.makeGlintTexture();
    this.rays = Array.from({ length: 5 }, (_, i) => this.add.graphics().setDepth(-1).setBlendMode(Phaser.BlendModes.ADD).setData('phase', i * 1.7));
    this.plankton = Array.from({ length: 26 }, (_, i) => this.add.circle(0, 0, 0.8 + (i % 3) * 0.5, 0xe9fbff, 0.32).setDepth(1).setData('seed', i));
    this.bubbles = Array.from({ length: 16 }, (_, i) => this.add.circle(0, 0, 1.4 + i % 3, 0xffffff, 0.16).setStrokeStyle(1, 0xffffff, 0.35).setDepth(2).setData('seed', i));
    this.bonusGlow = this.add.rectangle(240, 380, 480, 760, 0xffd34d, 0.1).setDepth(3).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.fishes = this.physics.add.group();
    this.line = this.add.graphics().setDepth(12);
    this.boat = this.makeBoat();
    this.rod = this.add.graphics().setDepth(17);
    this.water = this.add.graphics().setDepth(18);
    this.hook = this.physics.add.image(240, SURFACE_Y, this.textures.exists('hook-art') ? 'hook-art' : 'hook').setDepth(15);
    this.hook.setDisplaySize(19, 30);
    this.hook.body.setAllowGravity(false);
    this.hook.body.setSize(this.hook.width * 0.8, this.hook.height * 0.62, true);
    this.physics.add.overlap(this.hook, this.fishes, (_hook, fish) => this.hooked(fish),
      (_hook, fish) => !this.controller.round.paused && this.controller.round.phase === 'casting' && !fish.getData('caught'));
    this.time0 = 0;
    this.newSea();
    this.relayout();
    this.scale.on('resize', () => this.relayout());
    this.warmUp();
    this.input.on('pointerdown', () => this.controller.cast());
    this.controller.ready(this);
  }

  // ---------- artwork ----------

  registerArt() {
    for (const s of this.controller.species) {
      if (!s.art) this.makeEmojiTexture(s);
      if (isMystery(s)) this.makeSilhouette(s);
    }
  }

  textureOf(s) {
    if (s.art?.kind === 'sprite') return { key: s.art.key, frame: undefined, w: s.art.w, h: s.art.h };
    return { key: `emoji-${s.id}`, frame: undefined, w: PLACEHOLDER_ART.w, h: PLACEHOLDER_ART.h };
  }

  // DEV QA only: species whose artwork has not been generated yet are drawn as emoji.
  makeEmojiTexture(s) {
    const key = `emoji-${s.id}`;
    if (this.textures.exists(key)) return;
    const texture = this.textures.createCanvas(key, 128, 128);
    const ctx = texture.context;
    ctx.font = '96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s.emoji ?? '?', 64, 70);
    texture.refresh();
  }

  // Canvas renderer cannot tint sprites: keep the cutout's alpha mask and paint it black.
  makeSilhouette(s) {
    const key = `shadow-${s.id}`;
    if (this.textures.exists(key)) return;
    const tex = this.textureOf(s);
    const source = this.textures.get(tex.key).getSourceImage();
    const [x, y, w, h] = [0, 0, source.width, source.height];
    const texture = this.textures.createCanvas(key, w, h);
    const ctx = texture.context;
    ctx.drawImage(source, x, y, w, h, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#04141c';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    texture.refresh();
  }

  // Sky above the painted background: blend into the colour of the image's top edge.
  paintSky(bgKey) {
    if (this.skyFor === bgKey) return;
    this.skyFor = bgKey;
    const probe = document.createElement('canvas');
    probe.width = 1; probe.height = 1;
    const image = this.textures.get(bgKey).getSourceImage();
    let top = [150, 206, 240];
    try {
      const ctx = probe.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0, image.width, Math.max(1, image.height * 0.01), 0, 0, 1, 1);
      top = [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    } catch { /* keep the default sky */ }
    const texture = this.textures.exists('sky') ? this.textures.get('sky') : this.textures.createCanvas('sky', 4, 256);
    const ctx = texture.context;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, `rgb(${top.map((c) => Math.round(c * 0.82)).join(',')})`);
    gradient.addColorStop(1, `rgb(${top.join(',')})`);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 4, 256);
    texture.refresh();
  }

  makeHookTexture() {
    const S = 3;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const path = () => {
      g.beginPath(); g.moveTo(17 * S, 8 * S); g.lineTo(17 * S, 30 * S);
      g.arc(11 * S, 30 * S, 6 * S, 0, Math.PI, false); g.lineTo(5 * S, 23 * S); g.strokePath();
    };
    g.lineStyle(4.2 * S, 0x24323a, 1); path();
    g.lineStyle(2.6 * S, 0x8d9ca4, 1); path();
    g.lineStyle(0.9 * S, 0xf2f8fb, 1);
    g.beginPath(); g.moveTo(16.4 * S, 10 * S); g.lineTo(16.4 * S, 29 * S); g.strokePath();
    g.fillStyle(0x24323a); g.fillTriangle(2.4 * S, 25 * S, 7.8 * S, 24.5 * S, 5 * S, 18.5 * S);
    g.fillStyle(0x8d9ca4); g.fillTriangle(3.6 * S, 24.2 * S, 6.8 * S, 24 * S, 5 * S, 20.5 * S);
    g.lineStyle(1.8 * S, 0x24323a, 1); g.strokeCircle(17 * S, 5 * S, 2.6 * S);
    g.lineStyle(0.9 * S, 0xc9d6dc, 1); g.strokeCircle(17 * S, 5 * S, 2.6 * S);
    g.generateTexture('hook', 24 * S, 38 * S); g.destroy();
  }

  makeGlintTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xfff6c4, 1);
    g.fillTriangle(16, 0, 19, 16, 13, 16); g.fillTriangle(16, 32, 19, 16, 13, 16);
    g.fillTriangle(0, 16, 16, 13, 16, 19); g.fillTriangle(32, 16, 16, 13, 16, 19);
    g.fillStyle(0xffffff, 1); g.fillCircle(16, 16, 3);
    g.generateTexture('glint', 32, 32); g.destroy();
  }

  // Copy of the boat image with the part under its waterline tinted like the sea.
  wetBoat(art) {
    const source = this.textures.get('boat').getSourceImage();
    const wet = this.textures.createCanvas('boat-wet', source.width, source.height);
    const ctx = wet.context;
    ctx.drawImage(source, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    const line = art.waterline * source.height / art.h;
    const gradient = ctx.createLinearGradient(0, line, 0, source.height);
    gradient.addColorStop(0, 'rgba(24,150,175,0.5)'); gradient.addColorStop(1, 'rgba(10,90,120,0.82)');
    ctx.fillStyle = gradient; ctx.fillRect(0, line, source.width, source.height - line);
    wet.refresh();
    return 'boat-wet';
  }

  // Boat artwork (when generated) or a drawn wooden boat with a fisherman and a rod holder.
  makeBoat() {
    this.rodButt = ROD_BUTT;
    const container = this.add.container(0, 0).setDepth(16);
    const art = manifest.sprites?.boat;
    if (art?.holder && art.waterline && this.textures.exists('boat')) {
      // Fixed on-screen width; the hull's waterline sits on the sea surface and the holder tube sets the rod butt.
      const scale = BOAT_WIDTH / art.w;
      const wet = this.wetBoat(art);
      const top = WATERLINE + 3 - art.waterline * scale;
      const image = this.add.image(BOAT_HOLDER_X - art.holder[0] * scale, top, wet).setOrigin(0, 0).setScale(scale * art.w / this.textures.get(wet).getSourceImage().width);
      this.rodButt = { x: BOAT_HOLDER_X, y: top + art.holder[1] * scale };
      container.add(image);
      this.hull = null;
      return container;
    }
    const g = this.add.graphics();
    container.add(g);
    // Hull: planked wood, red stripe and a cream gunwale. Below WATERLINE it is tinted by the water overlay.
    g.fillStyle(0x7a4a2b);
    g.fillPoints([{ x: 88, y: 106 }, { x: 238, y: 97 }, { x: 224, y: 130 }, { x: 198, y: 146 }, { x: 110, y: 146 }, { x: 93, y: 134 }], true);
    g.lineStyle(1.4, 0x55311b, 0.9);
    for (const dy of [9, 18, 27]) g.lineBetween(91, 106 + dy, 232 - dy * 0.45, 98 + dy);
    g.fillStyle(0xbd3b33); g.fillPoints([{ x: 89, y: 108 }, { x: 236, y: 99 }, { x: 234, y: 104 }, { x: 90, y: 113 }], true);
    g.lineStyle(4, 0xeadfc3); g.lineBetween(87, 106, 239, 96.5);
    g.lineStyle(1, 0x5a4a34, 0.7); g.lineBetween(87, 108.5, 239, 99);
    // Wheelhouse
    g.fillStyle(0xefe9da); g.fillRect(100, 78, 38, 27);
    g.lineStyle(1.4, 0x58676d); g.strokeRect(100, 78, 38, 27);
    g.fillStyle(0x8fd0ea); g.fillRect(106, 83, 26, 10);
    g.lineStyle(1.2, 0x58676d); g.strokeRect(106, 83, 26, 10); g.lineBetween(119, 83, 119, 93);
    g.fillStyle(0x2c6a87); g.fillRect(96, 73, 46, 6);
    g.lineStyle(1.4, 0x3d4a50); g.lineBetween(104, 73, 104, 58);
    g.fillStyle(0xd94b3b); g.fillTriangle(104, 58, 115, 61, 104, 64);
    // Fisherman: bucket hat, orange life vest, arm reaching for the rod holder.
    g.fillStyle(0x38536b); g.fillRoundedRect(156, 92, 22, 12, 4);
    g.fillStyle(0xef8a24); g.fillRoundedRect(158, 80, 19, 20, 6);
    g.lineStyle(1.2, 0xb45f12); g.lineBetween(167.5, 81, 167.5, 99);
    g.fillStyle(0xdfa27a); g.fillCircle(167, 73, 7);
    g.fillStyle(0x6f7d4c); g.fillEllipse(167, 68, 21, 5); g.fillRoundedRect(160, 59, 14, 9, 3);
    g.lineStyle(4, 0xdfa27a); g.lineBetween(174, 86, 189, 101);
    g.fillStyle(0xdfa27a); g.fillCircle(190, 102, 2.6);
    // Rod holder
    g.lineStyle(4.5, 0x2c393f); g.lineBetween(191, 114, 197, 105);
    this.hull = { left: 88, right: 238 };
    return container;
  }

  // ---------- layout ----------

  relayout() {
    // A hidden or not-yet-sized canvas reports 0x0; lay out the nominal world until it has a size.
    const size = this.scale.gameSize.width > 0 && this.scale.gameSize.height > 0 ? this.scale.gameSize : { width: WORLD.width, height: WORLD.height };
    const zoom = Math.min(size.width / WORLD.width, size.height / WORLD.height);
    const width = size.width / zoom;
    const height = size.height / zoom;
    this.cameras.main.setSize(size.width, size.height).setZoom(zoom).centerOn(240, height / 2);
    const dock = this.controller.dockTop?.();
    this.view = computeLayout({ width, height, dockTop: Number.isFinite(dock) && dock > 0 ? dock / zoom : height });
    this.view.zoom = zoom;
    this.controller.round.setBounds(this.view);
    this.layoutBackground();
    this.bonusGlow.setPosition(240, height / 2).setSize(width + 4, height);
    this.layoutRays();
    // Creatures already swimming take the new lane heights and sizes.
    for (const fish of this.fishes.getChildren()) if (!fish.getData('caught')) this.resize(fish);
  }

  layoutBackground() {
    // Use the painting that needs the least cropping or stretching on this screen shape.
    const options = Object.entries(manifest.backgrounds ?? {}).map(([name, bg]) => ({ ...bg, key: `bg-${name}` }));
    let bg = null;
    let place = null;
    for (const option of options) {
      const placement = backgroundPlacement(option, this.view);
      if (!place || placement.distortion < place.distortion) { bg = option; place = placement; }
    }
    this.paintSky(bg.key);
    this.sky.setDisplaySize(this.view.width + 4, Math.max(2, place.top + 2));
    this.bgFrames(bg);
    // Pieces: [frame, x, width]. A wide screen gets reef | stretched water | reef; a narrow one a single centred picture.
    const { left, right } = this.view;
    const pieces = place.slices
      ? [['L', left, place.slices.edge], ['C', left + place.slices.edge, place.slices.center], ['R', right - place.slices.edge, place.slices.edge]]
      : [['W', 240 - place.tileWidth / 2, place.tileWidth]];
    this.bgImages ??= [];
    this.bgMirror ??= [];
    while (this.bgImages.length < 3) {
      this.bgImages.push(this.add.image(0, 0, bg.key).setOrigin(0, 0).setDepth(-3));
      this.bgMirror.push(this.add.image(0, 0, bg.key).setOrigin(0, 0).setDepth(-3).setFlipY(true));
    }
    this.bgImages.forEach((image, i) => {
      const mirror = this.bgMirror[i];
      const piece = pieces[i];
      image.setVisible(Boolean(piece));
      mirror.setVisible(Boolean(piece) && place.below > 0);
      if (!piece) return;
      const [frame, x, width] = piece;
      // +1 px of overlap hides seams between neighbouring pieces.
      image.setTexture(bg.key, frame).setPosition(x, place.top).setDisplaySize(width + 1, place.height);
      mirror.setTexture(bg.key, frame).setPosition(x, place.top + place.height - 1).setDisplaySize(width + 1, place.height).setFlipY(true);
    });
  }

  // Frames of a background texture: W whole, L/C/R the reef edges and the open water between them.
  bgFrames(bg) {
    const texture = this.textures.get(bg.key);
    if (texture.has('W')) return;
    const edge = Math.round(bg.w * BG_EDGE);
    texture.add('W', 0, 0, 0, bg.w, bg.h);
    texture.add('L', 0, 0, 0, edge, bg.h);
    texture.add('C', 0, edge, 0, bg.w - 2 * edge, bg.h);
    texture.add('R', 0, bg.w - edge, 0, edge, bg.h);
  }

  layoutRays() {
    const { left, width, seabedLine } = this.view;
    this.rays.forEach((ray, i) => {
      const x = left + width * (0.18 + i * 0.16);
      const length = (seabedLine - WATERLINE) * (0.75 + (i % 2) * 0.2);
      const spread = 26 + (i % 3) * 14;
      ray.clear().setPosition(x, WATERLINE);
      ray.fillStyle(0xeafcff, 0.07 + (i % 2) * 0.03);
      ray.fillPoints([{ x: -8, y: 0 }, { x: 8, y: 0 }, { x: spread, y: length }, { x: -spread * 0.4, y: length }], true);
    });
  }

  laneY(lane, height) { return lane === SEABED ? this.view.seabedLine - height / 2 : this.view.lanes[lane]; }

  sizeOf(species, lane = species.lane) {
    const maxHeight = lane === SEABED ? this.view.spacing * 1.2 : this.view.laneHeight;
    return displaySize(species, this.textureOf(species), this.view.scale, maxHeight);
  }

  resize(fish) {
    const d = fish.data.values;
    const size = this.sizeOf(d.species, d.lane);
    fish.setData({ w: size.width, h: size.height });
    fish.setDisplaySize(size.width, size.height);
  }

  // ---------- creatures ----------

  newSea() {
    this.clearSea();
    const round = this.controller.round;
    this.spawner = new Spawner({ species: this.controller.species, mode: round.mode, rng: this.controller.rng });
    this.bonusActive = false;
    this.bonusGlow.setVisible(false);
  }

  clearSea() {
    for (const fish of [...(this.fishes?.getChildren() ?? [])]) this.removeCreature(fish);
    this.caught = null;
  }

  warmUp() {
    // Fast-forward so the sea is already lively, with uneven gaps, when the trip starts.
    for (let t = 0; t < WARM_UP_SECONDS; t += 0.1) this.advanceSea(0.1);
  }

  spawnOrder(order) {
    const { species, lane, dir, speed, members } = order;
    const size = this.sizeOf(species, lane);
    const edge = dir > 0 ? this.view.left - size.width / 2 - 6 : this.view.right + size.width / 2 + 6;
    for (const member of members) this.addCreature(species, lane, edge - dir * member.offset * this.view.scale, dir, speed, member, size);
  }

  addCreature(species, lane, x, dir, speed, member, size) {
    const tex = this.textureOf(species);
    const fish = this.fishes.create(x, this.laneY(lane, size.height), tex.key, tex.frame);
    fish.setDisplaySize(size.width, size.height);
    fish.body.setAllowGravity(false);
    fish.body.moves = false;
    fish.body.setSize(tex.w * 0.7, tex.h * 0.62, true);
    const floating = this.bonusActive && lane !== SEABED && species.lane !== lane;
    fish.setData({ species, lane, dir, speed, dy: member.dy, phase: member.phase, w: size.width, h: size.height,
      caught: false, frozen: false, floating, reveal: isMystery(species) ? 0 : 1, born: this.time0, uid: this.serial = (this.serial ?? 0) + 1 });
    fish.setFlipX(!species.noFlip && dir < 0).setDepth(5 + lane * 0.1);
    if (isMystery(species)) fish.setData('shadow', this.add.image(x, fish.y, `shadow-${species.id}`));
    if (isTreasure(species) || species.jackpot) fish.setData('glint', this.add.image(x, fish.y, 'glint').setBlendMode(Phaser.BlendModes.ADD));
    this.syncExtras(fish);
    return fish;
  }

  removeCreature(fish) {
    fish.getData('shadow')?.destroy();
    fish.getData('glint')?.destroy();
    this.tweens.killTweensOf(fish);
    fish.destroy();
  }

  syncExtras(fish) {
    const d = fish.data.values;
    if (d.shadow) {
      d.shadow.setPosition(fish.x, fish.y).setDisplaySize(fish.displayWidth, fish.displayHeight)
        .setAngle(fish.angle).setFlipX(fish.flipX).setDepth(fish.depth + 0.01).setAlpha(fish.alpha * (1 - d.reveal));
    }
    if (d.glint) {
      const twinkle = Math.max(0, Math.sin(this.time0 * 2.6 + d.phase * 3));
      d.glint.setPosition(fish.x + fish.displayWidth * 0.28, fish.y - fish.displayHeight * 0.3)
        .setScale(0.3 + twinkle * 0.35).setAngle(this.time0 * 40).setAlpha(fish.alpha * twinkle).setDepth(fish.depth + 0.02);
    }
  }

  laneStates() {
    const states = Array.from({ length: LANE_COUNT }, () => ({ count: 0, tailGap: Infinity, tailSpeed: 0, span: this.view.width + 80 }));
    for (const fish of this.fishes.getChildren()) {
      const d = fish.data.values;
      if (d.caught) continue;
      const state = states[d.lane];
      state.count++;
      const gap = d.dir > 0 ? fish.x - d.w / 2 - this.view.left : this.view.right - (fish.x + d.w / 2);
      if (gap < state.tailGap) { state.tailGap = gap; state.tailSpeed = d.speed; }
    }
    return states;
  }

  advanceSea(dt) {
    this.time0 += dt;
    if (!this.qaHold) for (const order of this.spawner.tick(dt, this.laneStates())) this.spawnOrder(order);
    const t = this.time0;
    for (const fish of [...this.fishes.getChildren()]) {
      const d = fish.data.values;
      if (d.caught) continue;
      if (!d.frozen) this.swim(fish, d, dt, t);
      const gone = d.dir > 0 ? fish.x - d.w / 2 > this.view.right + 40 : fish.x + d.w / 2 < this.view.left - 40;
      if (gone) { this.removeCreature(fish); continue; }
      this.syncExtras(fish);
    }
  }

  swim(fish, d, dt, t) {
    const motion = d.floating ? 'float' : d.species.motion;
    let speed = d.speed;
    if (motion === 'crawl') speed *= 0.55 + 0.45 * Math.abs(Math.sin(t * 5 + d.phase));
    if (motion === 'pulse') speed *= 0.55 + 0.45 * Math.max(0, Math.sin(t * 2.2 + d.phase));
    fish.x += d.dir * speed * dt;
    const base = this.laneY(d.lane, d.h) + (d.lane === SEABED ? 0 : d.dy * this.view.spacing);
    const wave = (rate, size) => Math.sin(t * rate + d.phase) * size;
    let bob = wave(1.6, 2.5), angle = wave(5.5, 2), stretch = 1;
    if (motion === 'school') { bob = wave(2.4, 3); angle = wave(7, 3); }
    if (motion === 'pulse') { bob = wave(2.2, 7); angle = 0; stretch = 1 + Math.sin(t * 4.4 + d.phase) * 0.06; }
    if (motion === 'bob') { bob = wave(1.7, 6); angle = wave(1.7, 4); }
    if (motion === 'glide') { bob = wave(0.9, 6); angle = Math.sin(t * 0.9 + d.phase + 1) * 5; stretch = 1 + Math.sin(t * 2.6 + d.phase) * 0.08; }
    if (motion === 'eel') { bob = wave(1.6, 3); angle = wave(3.2, 4); }
    if (motion === 'crawl') { bob = -Math.abs(Math.sin(t * 5 + d.phase)) * 1.5; angle = 0; }
    if (motion === 'drift') { bob = wave(1.1, 1.2); angle = wave(0.8, 2); }
    if (motion === 'float') { bob = wave(1.5, 5); angle = wave(1.2, 12); }
    fish.y = base + bob;
    if (motion === 'spin') fish.angle += d.dir * dt * 14;
    else fish.angle = angle * (fish.flipX ? -1 : 1);
    if (stretch !== 1) fish.setDisplaySize(d.w, d.h * stretch);
  }

  hooked(fish) {
    const round = this.controller.round;
    const species = fish.getData('species');
    if (!round.catch(species.id)) return;
    fish.setData({ caught: true, caughtY: round.hook.y });
    fish.body.enable = false;
    fish.setDepth(14);
    this.caught = fish;
    this.bubbleBurst(round.hook.x, round.hook.y, 6);
    this.controller.onHook(species);
  }

  // ---------- effects ----------

  bubbleBurst(x, y, count) {
    for (let i = 0; i < count; i++) {
      const bubble = this.add.circle(x + (Math.random() - 0.5) * 16, y, 1.5 + Math.random() * 2.5, 0xffffff, 0.2).setStrokeStyle(1, 0xffffff, 0.6).setDepth(13);
      this.tweens.add({ targets: bubble, y: y - 40 - Math.random() * 40, x: bubble.x + (Math.random() - 0.5) * 20, alpha: 0, duration: 700 + Math.random() * 400, onComplete: () => bubble.destroy() });
    }
  }

  splash(x) {
    const ring = this.add.ellipse(x, WATERLINE + 1, 10, 3).setStrokeStyle(2, 0xffffff, 0.8).setDepth(19);
    this.tweens.add({ targets: ring, scaleX: 6, scaleY: 3, alpha: 0, duration: 650, onComplete: () => ring.destroy() });
    for (let i = 0; i < 14; i++) {
      const drop = this.add.circle(x + (Math.random() - 0.5) * 18, WATERLINE, 1.6 + Math.random() * 2.2, 0xeafbff, 0.95).setDepth(19);
      const vx = (Math.random() - 0.5) * 90;
      const rise = 18 + Math.random() * 34;
      this.tweens.add({ targets: drop, x: drop.x + vx * 0.45, y: WATERLINE - rise, duration: 260, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: drop, x: drop.x + vx * 0.4, y: WATERLINE + 4, alpha: 0.2, duration: 300, ease: 'Quad.easeIn', onComplete: () => drop.destroy() }) });
    }
  }

  celebrate(species, landing) {
    const fish = this.caught;
    this.caught = null;
    const x = this.controller.round.hook.x;
    this.splash(x);
    if (fish) {
      fish.setData('reveal', 1);
      this.syncExtras(fish);
      fish.getData('shadow')?.setAlpha(0);
      this.tweens.add({ targets: fish, x: 162, y: 96, angle: 0, scale: fish.scale * 0.6, duration: 650, ease: 'Back.easeIn',
        onUpdate: () => this.syncExtras(fish), onComplete: () => this.removeCreature(fish) });
    }
    const text = landing.multiplier > 1 ? `+${landing.points}  x2` : `+${landing.points}`;
    const label = this.add.text(240, 176, text, { fontFamily: 'Tahoma, sans-serif', fontSize: species.jackpot ? '40px' : '32px', fontStyle: 'bold', color: '#ffea8e', stroke: '#145466', strokeThickness: 6 }).setOrigin(0.5).setDepth(21);
    this.tweens.add({ targets: label, y: 120, alpha: 0, delay: species.jackpot ? 600 : 250, duration: species.jackpot ? 1400 : 900, onComplete: () => label.destroy() });
    if (species.kind === 'item' || species.jackpot) this.coinBurst(x, species.jackpot ? 34 : 18);
    else {
      for (let i = 0; i < 15; i++) {
        const confetti = this.add.rectangle(240, 150, 5, 8, [0xffd05b, 0xff786b, 0xffffff, 0x89e8ab][i % 4]).setDepth(20);
        this.tweens.add({ targets: confetti, x: 120 + i * 18, y: 214 + (i % 5) * 18, angle: i * 50, alpha: 0, duration: 1000, onComplete: () => confetti.destroy() });
      }
    }
  }

  coinBurst(x, count) {
    for (let i = 0; i < count; i++) {
      const coin = this.add.ellipse(x, WATERLINE - 6, 9, 9, 0xffcf3f).setStrokeStyle(1.5, 0xb07a12).setDepth(20);
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const distance = 50 + Math.random() * 70;
      this.tweens.add({ targets: coin, x: x + Math.cos(angle) * distance, y: WATERLINE - 6 + Math.sin(angle) * distance, scaleX: { from: 1, to: 0.25 }, duration: 520, ease: 'Quad.easeOut', yoyo: false,
        onComplete: () => this.tweens.add({ targets: coin, y: coin.y + 60, alpha: 0, duration: 520, ease: 'Quad.easeIn', onComplete: () => coin.destroy() }) });
    }
  }

  setBonus(on) {
    this.bonusActive = on;
    this.spawner.setBonus(on);
    this.bonusGlow.setVisible(on).setAlpha(0.1);
    this.controller.audio.setBonus(on);
  }

  // ---------- frame ----------

  update(_time, delta) {
    if (!this.hook) return;
    const round = this.controller.round;
    if (round.paused) return;
    const dt = Math.min(delta / 1000, 0.1);
    const before = round.phase;
    round.tick(dt);
    // Position-only QA fixture: keep a vertical aim until the real button casts.
    if (import.meta.env.DEV && this.testAim) {
      if (round.phase === 'aim') round.angle = 0;
      else this.testAim = false;
    }
    if (before === 'casting' && round.phase === 'returning') this.controller.onMiss();
    if ((round.bonus > 0) !== this.bonusActive) this.setBonus(round.bonus > 0);
    this.controller.audio.setLine(round.phase);
    this.advanceSea(dt);
    const h = round.hook;
    const bob = Math.sin(round.elapsed * 2.1) * 1.2;
    this.boat.y = bob;
    const tension = round.phase === 'reeling' ? 0.75 + 0.25 * Math.max(0, 1 - (this.controller.now() - round.lastTap) / 220) : round.phase === 'casting' ? 0.25 : 0.08;
    const tip = this.drawRod(h, tension, bob);
    this.hook.body.reset(h.x, h.y);
    this.hook.setAngle(-round.angle * 180 / Math.PI);
    this.drawLine(tip, h, round.angle);
    if (this.caught && round.phase === 'reeling') {
      const struggle = Math.sin(this.time0 * 15) * 9;
      this.caught.setPosition(h.x + 4, h.y + 12 + this.caught.displayHeight * 0.25).setAngle((this.caught.flipX ? 18 : -18) + struggle);
      this.caught.setData('reveal', revealForRise(this.caught.getData('species'), h.y, this.caught.getData('caughtY'), SURFACE_Y));
      this.syncExtras(this.caught);
    }
    this.animateWater(dt);
    if (this.bonusActive) this.bonusGlow.setAlpha(0.08 + Math.sin(this.time0 * 3) * 0.04);
    this.controller.renderHUD();
  }

  drawRod(hook, tension, bob) {
    const g = this.rod.clear();
    const butt = { x: this.rodButt.x, y: this.rodButt.y + bob };
    const rest = { x: ROD_TIP.x, y: ROD_TIP.y + bob };
    const dx = hook.x - rest.x, dy = hook.y - rest.y;
    const length = Math.hypot(dx, dy) || 1;
    const bend = tension * 10;
    const tip = { x: rest.x + dx / length * bend, y: rest.y + dy / length * bend };
    const control = { x: butt.x + (rest.x - butt.x) * 0.6 + dx / length * bend * 0.4, y: butt.y + (rest.y - butt.y) * 0.6 + dy / length * bend * 0.4 };
    const at = (t) => ({
      x: (1 - t) ** 2 * butt.x + 2 * (1 - t) * t * control.x + t * t * tip.x,
      y: (1 - t) ** 2 * butt.y + 2 * (1 - t) * t * control.y + t * t * tip.y,
    });
    const steps = 14;
    for (let i = 0; i < steps; i++) {
      const a = at(i / steps), b = at((i + 1) / steps);
      g.lineStyle(3.4 - i * 0.17, 0x1b262d, 1).lineBetween(a.x, a.y, b.x, b.y);
    }
    for (let i = 3; i < steps; i++) {
      const a = at(i / steps), b = at((i + 1) / steps);
      g.lineStyle(0.8, 0x6f8896, 0.9).lineBetween(a.x - 0.6, a.y - 0.6, b.x - 0.6, b.y - 0.6);
    }
    const grip0 = at(0), grip1 = at(0.2);
    g.lineStyle(4.6, 0xc59a63, 1).lineBetween(grip0.x, grip0.y, grip1.x, grip1.y);
    g.lineStyle(1, 0x8c6638, 0.8).lineBetween(grip0.x, grip0.y + 1.4, grip1.x, grip1.y + 1.4);
    for (const t of [0.45, 0.66, 0.86]) { const p = at(t); g.lineStyle(1, 0xd8e2e6, 1).strokeCircle(p.x, p.y + 2, 1.6); }
    // Spinning reel under the grip; its handle turns with every tap on the big reel button.
    const reel = at(0.24);
    g.fillStyle(0x9aa9b0).fillCircle(reel.x, reel.y + 5, 4.6);
    g.lineStyle(1.2, 0x34434a).strokeCircle(reel.x, reel.y + 5, 4.6);
    const turn = this.controller.wheelAngle * Math.PI / 180;
    g.lineStyle(1.6, 0x34434a).lineBetween(reel.x, reel.y + 5, reel.x + Math.cos(turn) * 6, reel.y + 5 + Math.sin(turn) * 6);
    g.fillStyle(0xe8b04d).fillCircle(reel.x + Math.cos(turn) * 6, reel.y + 5 + Math.sin(turn) * 6, 1.8);
    return tip;
  }

  drawLine(tip, hook, angle) {
    const top = { x: hook.x - Math.sin(angle) * 11, y: hook.y - Math.cos(angle) * 11 };
    const g = this.line.clear();
    g.lineStyle(2.4, 0x0b4b5c, 0.35).lineBetween(tip.x, tip.y, top.x, top.y);
    g.lineStyle(1.1, 0xf4fbff, 0.95).lineBetween(tip.x, tip.y, top.x, top.y);
    // Small lead sinker just above the hook
    const sx = top.x + (tip.x - top.x) * 0.06, sy = top.y + (tip.y - top.y) * 0.06;
    g.fillStyle(0x4b565c, 1).fillEllipse(sx, sy - 6, 4.6, 7.5);
    g.fillStyle(0xa9b6bc, 0.9).fillCircle(sx - 0.8, sy - 7.5, 1);
  }

  animateWater(dt) {
    const { left, right, width, seabedLine } = this.view;
    const t = this.time0;
    // Submerged hull: tint the boat below the waterline, with a moving surface highlight.
    const g = this.water.clear();
    if (this.hull) g.fillStyle(0x1aa0b4, 0.5).fillRect(this.hull.left - 6, WATERLINE + 1, this.hull.right - this.hull.left + 12, 19);
    g.lineStyle(1.6, 0xffffff, 0.55).beginPath();
    for (let x = left; x <= right; x += 12) {
      const y = WATERLINE + Math.sin(x * 0.045 + t * 1.8) * 1.2;
      if (x === left) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
    this.rays.forEach((ray) => { ray.setAngle(Math.sin(t * 0.25 + ray.getData('phase')) * 4).setAlpha(0.7 + Math.sin(t * 0.6 + ray.getData('phase')) * 0.3); });
    this.plankton.forEach((p) => {
      const s = p.getData('seed');
      p.x = left + ((s * 97 + t * (4 + (s % 5))) % (width + 20)) - 10;
      p.y = WATERLINE + 40 + ((s * 53 + t * (2 + (s % 3))) % (seabedLine - WATERLINE - 50));
    });
    this.bubbles.forEach((b) => {
      const s = b.getData('seed');
      const column = left + width * ((s * 0.137) % 1);
      const travel = seabedLine - WATERLINE;
      const progress = ((s * 0.21 + t * (0.05 + (s % 4) * 0.012)) % 1);
      b.y = seabedLine - progress * travel;
      b.x = column + Math.sin(t * 2 + s) * 3;
      b.setAlpha(progress > 0.95 ? (1 - progress) * 20 : 1);
    });
    if (this.bonusActive && Math.random() < dt * 14) {
      const spark = this.add.image(left + Math.random() * width, WATERLINE + 10, 'glint').setScale(0.3 + Math.random() * 0.3).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: spark, y: seabedLine - Math.random() * 120, angle: 180, alpha: 0, duration: 1800 + Math.random() * 1200, onComplete: () => spark.destroy() });
    }
  }

  resetRound() {
    this.testAim = false;
    this.qaHold = false;
    this.newSea();
    this.audioBonusOff();
    this.relayout();
    this.warmUp();
  }

  audioBonusOff() { this.controller.audio.setBonus(false); }

  // ---------- QA (DEV ?qa=1 only) ----------

  snapshot() {
    const round = this.controller.round;
    return { ready: true, phase: round.phase, paused: round.paused, angle: round.angle, hook: round.hook, length: round.length, targetLength: round.targetLength,
      taps: round.taps, requiredTaps: round.requiredTaps, score: round.score, catches: [...round.catches], tripCatches: round.tripCatches, remaining: round.remaining,
      bonus: round.bonus, maps: round.maps, doubleNext: round.doubleNext, wave: this.spawner.wave.kind, time: this.time0,
      view: { x: this.cameras.main.worldView.x, y: this.cameras.main.worldView.y, zoom: this.cameras.main.zoom, ...this.view },
      audio: { state: this.controller.audio.context?.state ?? 'locked', enabled: this.controller.audio.enabled, music: this.controller.audio.musicOn, level: this.controller.audio.level() },
      fishes: this.fishes.getChildren().map((f) => {
        const d = f.data.values;
        return { uid: d.uid, id: d.species.id, lane: d.lane, dir: d.dir, speed: d.speed, born: d.born, reveal: d.reveal, shadowAlpha: d.shadow?.alpha ?? 0, glint: Boolean(d.glint),
          x: f.x, y: f.y, width: f.displayWidth, height: f.displayHeight, alpha: f.alpha, active: f.body?.enable ?? false, caught: d.caught };
      }) };
  }

  arrangeForTest(id = 'goldfish') {
    const round = this.controller.round;
    if (round.phase !== 'aim') throw new Error('Arrange only before a cast');
    const species = SPECIES_BY_ID[id];
    if (!this.controller.species.includes(species)) throw new Error(`No artwork for ${id}`);
    round.elapsed = 0;
    round.angle = 0;
    this.testAim = true;
    this.qaHold = true;
    this.clearSea();
    const fish = this.addCreature(species, species.lane, WORLD.originX, 1, 0, { dy: 0, phase: 0 }, this.sizeOf(species));
    fish.setData('frozen', true);
  }

  releaseTest() { this.qaHold = false; }
}

export function createGame(controller) {
  return new Phaser.Game({
    type: Phaser.CANVAS, parent: 'sea', width: WORLD.width, height: WORLD.height, transparent: true,
    render: { antialias: true, roundPixels: false },
    scale: { mode: Phaser.Scale.RESIZE },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false, fps: 60 } },
    audio: { noAudio: true }, scene: [new CoveScene(controller)],
  });
}
