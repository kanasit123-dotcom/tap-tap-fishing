import Phaser from 'phaser';
import { PROPS, propArt, tugLevel, SPECIES_BY_ID, SEABED, LANE_COUNT, PLACEHOLDER_ART, isMystery, isTreasure, displaySize, revealForRise } from './species.js';
import { computeLayout, backgroundPlacement, BG_EDGE, WATERLINE } from './layout.js';
import { Spawner, emptyLane } from './spawner.js';
import { WORLD, NET_EXTRA } from './model.js';
import { PirateBattle } from './pirate.js';
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
const BOSS_WARNING_SECONDS = 3.2;
// Colour washes over the day painting when no sunset/night painting is available (multiplied, fish stay bright).
const TINTS = { sunset: { color: 0xffa36b, alpha: 0.55 }, night: { color: 0x34508f, alpha: 0.75 } };
// Rod colours for the unlockable looks: [main, highlight, grip].
const RODS = { classic: [0x1b262d, 0x6f8896, 0xc59a63], bamboo: [0xb98a3e, 0xf1d28a, 0x7a5426], gold: [0xc9921c, 0xfff0a0, 0x6b3b12] };

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
    for (const id of PROPS) { const art = propArt(id); if (art) this.load.image(art.key, asset(art.file)); }
    for (const id of ['gold-hook']) if (manifest.sprites?.[id] && !this.textures.exists(`sp-${id}`)) this.load.image(`sp-${id}`, asset(manifest.sprites[id].file));
    if (manifest.sprites?.hook) this.load.image('hook-art', asset(manifest.sprites.hook.file));
    this.load.on('loaderror', () => this.controller.assetError());
  }

  create() {
    this.textures.createCanvas('sky', 4, 256);
    this.sky = this.add.image(240, 0, 'sky').setOrigin(0.5, 0).setDepth(-4);
    this.bgTiles = [];
    this.tint = this.add.rectangle(240, 380, 480, 760, 0xffffff, 0).setDepth(-2.5).setBlendMode(Phaser.BlendModes.MULTIPLY).setVisible(false);
    this.decor = this.add.graphics().setDepth(16.15);
    this.lanternGlow = this.add.graphics().setDepth(16.16).setBlendMode(Phaser.BlendModes.ADD);
    this.registerArt();
    this.makeHookTexture();
    this.makeGlintTexture();
    this.rays = Array.from({ length: 5 }, (_, i) => this.add.graphics().setDepth(-1).setBlendMode(Phaser.BlendModes.ADD).setData('phase', i * 1.7));
    this.plankton = Array.from({ length: 26 }, (_, i) => this.add.circle(0, 0, 0.8 + (i % 3) * 0.5, 0xe9fbff, 0.32).setDepth(1).setData('seed', i));
    this.bubbles = Array.from({ length: 16 }, (_, i) => this.add.circle(0, 0, 1.4 + i % 3, 0xffffff, 0.16).setStrokeStyle(1, 0xffffff, 0.35).setDepth(2).setData('seed', i));
    this.bonusGlow = this.add.rectangle(240, 380, 480, 760, 0xffd34d, 0.1).setDepth(3).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.fishes = this.physics.add.group();
    // Line, hook and a hooked catch are drawn in front of the boat so they never vanish behind the hull.
    this.line = this.add.graphics().setDepth(16.5);
    this.boat = this.makeBoat();
    this.rod = this.add.graphics().setDepth(17);
    this.water = this.add.graphics().setDepth(18);
    this.hook = this.physics.add.image(240, SURFACE_Y, this.textures.exists('hook-art') ? 'hook-art' : 'hook').setDepth(16.6);
    this.hook.setDisplaySize(19, 30);
    this.hookGlow = this.add.image(240, SURFACE_Y, 'glint').setDepth(16.55).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.hook.body.setAllowGravity(false);
    this.hookBody = [this.hook.width * 0.8, this.hook.height * 0.62];
    this.hook.body.setSize(...this.hookBody, true);
    this.bigHook = false;
    this.netted = [];
    this.netMesh = this.add.graphics().setDepth(16.45);
    this.pirate = new PirateBattle(this);
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
    for (const s of this.controller.species) if (!s.art) this.makeEmojiTexture(s);
  }

  // Source picture of a species (its aspect ratio drives the display size).
  textureOf(s) {
    if (s.art?.kind === 'sprite') return { key: s.art.key, w: s.art.w, h: s.art.h };
    return { key: `emoji-${s.id}`, w: PLACEHOLDER_ART.w, h: PLACEHOLDER_ART.h };
  }

  // Canvas drawImage shrinks big pictures with cheap sampling, so a 400 px sprite drawn at 60 px looks jagged and
  // shimmers while it moves. Pre-shrink each picture to about its on-screen size by repeated halving (like mipmaps)
  // and draw that copy instead. Widths are bucketed so small layout changes reuse the same copy.
  fitted(key, displayWidth) {
    const source = this.textures.get(key).getSourceImage();
    const want = displayWidth * this.view.zoom * 1.2;
    if (want >= source.width * 0.75) return key;
    const width = Math.max(16, Math.ceil(want / 16) * 16);
    const fittedKey = `${key}@${width}`;
    if (this.textures.exists(fittedKey)) return fittedKey;
    const height = Math.max(1, Math.round(source.height * width / source.width));
    let image = source;
    let w = source.width;
    let h = source.height;
    while (w / 2 >= width) {
      const half = document.createElement('canvas');
      half.width = Math.ceil(w / 2);
      half.height = Math.ceil(h / 2);
      const ctx = half.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, 0, 0, w, h, 0, 0, half.width, half.height);
      image = half;
      w = half.width;
      h = half.height;
    }
    const texture = this.textures.createCanvas(fittedKey, width, height);
    texture.context.imageSmoothingEnabled = true;
    texture.context.imageSmoothingQuality = 'high';
    texture.context.drawImage(image, 0, 0, w, h, 0, 0, width, height);
    texture.refresh();
    return fittedKey;
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

  // Canvas renderer cannot tint sprites: keep the cutout's alpha mask and paint it black (one per fitted copy).
  silhouette(textureKey) {
    const key = `${textureKey}#shadow`;
    if (this.textures.exists(key)) return key;
    const source = this.textures.get(textureKey).getSourceImage();
    const [w, h] = [source.width, source.height];
    const texture = this.textures.createCanvas(key, w, h);
    const ctx = texture.context;
    ctx.drawImage(source, 0, 0, w, h, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#04141c';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    texture.refresh();
    return key;
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

  // Copy of the (fitted) boat image with the part under its waterline tinted like the sea.
  wetBoat(art, key) {
    const name = `${key}#wet`;
    if (this.textures.exists(name)) return name;
    const source = this.textures.get(key).getSourceImage();
    const wet = this.textures.createCanvas(name, source.width, source.height);
    const ctx = wet.context;
    ctx.drawImage(source, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    const line = art.waterline * source.height / art.h;
    const gradient = ctx.createLinearGradient(0, line, 0, source.height);
    gradient.addColorStop(0, 'rgba(24,150,175,0.5)'); gradient.addColorStop(1, 'rgba(10,90,120,0.82)');
    ctx.fillStyle = gradient; ctx.fillRect(0, line, source.width, source.height - line);
    wet.refresh();
    return name;
  }

  // Boat artwork (when generated) or a drawn wooden boat with a fisherman and a rod holder.
  makeBoat() {
    this.rodButt = ROD_BUTT;
    const container = this.add.container(0, 0).setDepth(16);
    const art = manifest.sprites?.boat;
    if (art?.holder && art.waterline && this.textures.exists('boat')) {
      // Fixed on-screen width; the hull's waterline sits on the sea surface and the holder tube sets the rod butt.
      const scale = BOAT_WIDTH / art.w;
      const top = WATERLINE + 3 - art.waterline * scale;
      // The picture itself is fitted to the zoom in layoutBoat().
      this.boatImage = this.add.image(BOAT_HOLDER_X - art.holder[0] * scale, top, 'boat').setOrigin(0, 0).setDisplaySize(BOAT_WIDTH, art.h * scale);
      this.rodButt = { x: BOAT_HOLDER_X, y: top + art.holder[1] * scale };
      container.add(this.boatImage);
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
    // dockTop is in CSS px; the canvas has dpr backing pixels per CSS px.
    const dpr = this.controller.dpr ?? 1;
    const dock = this.controller.dockTop?.();
    this.view = computeLayout({ width, height, dockTop: Number.isFinite(dock) && dock > 0 ? dock * dpr / zoom : height });
    this.view.zoom = zoom;
    this.view.dpr = dpr;
    this.controller.round.setBounds(this.view);
    this.layoutBackground();
    this.bonusGlow.setPosition(240, height / 2).setSize(width + 4, height);
    this.layoutRays();
    this.layoutBoat();
    // Creatures already swimming take the new lane heights and sizes.
    for (const fish of this.fishes.getChildren()) if (!fish.getData('caught')) this.resize(fish);
  }

  setTimeOfDay(time) {
    if (this.timeOfDay === time) return;
    this.timeOfDay = time;
    this.controller.audio.setNight?.(time === 'night');
    if (this.view) { this.layoutBackground(); this.layoutRays(); }
  }

  // The boat picture is re-fitted to the zoom (sharp on every screen, no shimmer while it bobs).
  layoutBoat() {
    const art = manifest.sprites?.boat;
    if (!this.boatImage || !art) return;
    const key = this.wetBoat(art, this.fitted('boat', BOAT_WIDTH));
    if (this.boatImage.texture.key !== key) this.boatImage.setTexture(key);
    this.boatImage.setDisplaySize(BOAT_WIDTH, BOAT_WIDTH * art.h / art.w);
  }

  layoutBackground() {
    // Paintings for the current time of day ('portrait', 'sunset-portrait', ...); without them, the day ones plus a tint.
    const all = Object.entries(manifest.backgrounds ?? {}).map(([name, bg]) => ({ ...bg, key: `bg-${name}`, name }));
    const prefix = this.timeOfDay && this.timeOfDay !== 'day' ? `${this.timeOfDay}-` : '';
    const timed = all.filter((bg) => bg.name === `${prefix}portrait` || bg.name === `${prefix}landscape`);
    const options = timed.length ? timed : all.filter((bg) => bg.name === 'portrait' || bg.name === 'landscape');
    const tint = !timed.length && prefix ? TINTS[this.timeOfDay] : null;
    this.tint.setVisible(Boolean(tint)).setPosition(240, this.view.height / 2).setSize(this.view.width + 4, this.view.height + 4);
    if (tint) this.tint.setFillStyle(tint.color, tint.alpha);
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
    // Bosses are giants: they may fill more than one lane.
    const maxHeight = species.boss ? this.view.spacing * 2.3 : lane === SEABED ? this.view.spacing * 1.2 : this.view.laneHeight;
    return displaySize(species, this.textureOf(species), this.view.scale, maxHeight);
  }

  resize(fish) {
    const d = fish.data.values;
    const size = this.sizeOf(d.species, d.lane);
    fish.setData({ w: size.width, h: size.height });
    this.dress(fish, size);
  }

  // Picture (fitted to the on-screen size), hit box and silhouette of a creature.
  dress(fish, size) {
    const d = fish.data.values;
    const key = this.fitted(this.textureOf(d.species).key, size.width);
    if (fish.texture.key !== key) {
      fish.setTexture(key);
      d.shadow?.setTexture(this.silhouette(key));
    }
    fish.setDisplaySize(size.width, size.height);
    fish.body.setSize(fish.width * 0.7, fish.height * 0.62, true);
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
    this.warmingUp = true;
    for (let t = 0; t < WARM_UP_SECONDS; t += 0.1) this.advanceSea(0.1);
    this.warmingUp = false;
  }

  // A huge dark shape glides across the deep water a moment before the giant itself arrives.
  bossShadow(species, dir) {
    const size = this.sizeOf(species, 3);
    const width = size.width * 1.25;
    const key = this.silhouette(this.fitted(this.textureOf(species).key, width));
    const y = this.view.lanes[5];
    const from = dir > 0 ? this.view.left - width / 2 : this.view.right + width / 2;
    const to = dir > 0 ? this.view.right + width / 2 : this.view.left - width / 2;
    const shadow = this.add.image(from, y, key).setDepth(3.5).setAlpha(0.32).setFlipX(dir < 0);
    shadow.setDisplaySize(width, width * shadow.height / shadow.width);
    this.bossShadowImage = shadow;
    this.tweens.add({ targets: shadow, x: to, duration: (BOSS_WARNING_SECONDS + 1.5) * 1000, ease: 'Sine.easeInOut',
      onComplete: () => { shadow.destroy(); if (this.bossShadowImage === shadow) this.bossShadowImage = null; } });
  }

  // The sea darkens for a moment and a horn sounds before a giant swims in.
  bossWarning(species, order) {
    this.bossShadow(species, order.dir ?? this.spawner.dir[3]);
    const shade = this.add.rectangle(240, this.view.height / 2, this.view.width + 4, this.view.height + 4, 0x02121c, 0).setDepth(4);
    this.tweens.add({ targets: shade, fillAlpha: 0.35, duration: 500, yoyo: true, hold: 900, onComplete: () => shade.destroy() });
    const y = this.view.lanes[3];
    const arrow = this.add.text(this.spawner.dir[3] > 0 ? this.view.left + 40 : this.view.right - 40, y, this.spawner.dir[3] > 0 ? '▶▶' : '◀◀',
      { fontFamily: 'Tahoma, sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#ffd34d', stroke: '#5a2a00', strokeThickness: 5 }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: arrow, alpha: { from: 1, to: 0.2 }, duration: 300, yoyo: true, repeat: 3, onComplete: () => arrow.destroy() });
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) this.cameras.main.shake(500, 0.003);
    this.controller.onBossWarning?.(species);
  }

  spawnOrder(order) {
    const { species, lane, dir, speed, members } = order;
    // Bosses announce themselves first: warning, a shadow crossing beneath, then the real one enters.
    if (order.boss && !this.warmingUp && !order.warned) {
      // A queue, not one slot: two warnings can overlap (a natural boss and one called by a test) and neither may be lost.
      (this.bossQueue ??= []).push({ order: { ...order, warned: true }, at: this.time0 + BOSS_WARNING_SECONDS });
      this.bossWarning(species, order);
      return;
    }
    const size = this.sizeOf(species, lane);
    const edge = dir > 0 ? this.view.left - size.width / 2 - 6 : this.view.right + size.width / 2 + 6;
    for (const member of members) this.addCreature(species, lane, edge - dir * member.offset * this.view.scale, dir, speed, member, size);
  }

  addCreature(species, lane, x, dir, speed, member, size) {
    const key = this.fitted(this.textureOf(species).key, size.width);
    const fish = this.fishes.create(x, this.laneY(lane, size.height), key);
    fish.body.setAllowGravity(false);
    fish.body.moves = false;
    const floating = this.bonusActive && lane !== SEABED && species.lane !== lane;
    fish.setData({ species, lane, dir, speed: speed * (member.speedMul ?? 1), dy: member.dy, phase: member.phase,
      wander: member.wander ?? 0, wanderRate: member.wanderRate ?? 0.2, wanderPhase: member.wanderPhase ?? 0, tilt: 0,
      w: size.width, h: size.height, caught: false, frozen: false, floating, reveal: isMystery(species) ? 0 : 1,
      born: this.time0, uid: this.serial = (this.serial ?? 0) + 1 });
    // Nearer (lower) creatures in a lane are drawn in front of farther ones.
    fish.setFlipX(!species.noFlip && dir < 0).setDepth(5 + lane * 0.1 + member.dy * 0.05);
    if (isMystery(species)) fish.setData('shadow', this.add.image(x, fish.y, this.silhouette(key)));
    this.dress(fish, size);
    this.swim(fish, fish.data.values, 0, this.time0);
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

  // Room at each lane entrance, per side (creatures from the left swim right, dir 1).
  laneStates() {
    const states = Array.from({ length: LANE_COUNT }, () => emptyLane(this.view.width + 80));
    for (const fish of this.fishes.getChildren()) {
      const d = fish.data.values;
      if (d.caught) continue;
      const state = states[d.lane];
      state.count++;
      if (d.species.boss) state.bosses++;
      const side = state.sides[d.dir];
      const gap = d.dir > 0 ? fish.x - d.w / 2 - this.view.left : this.view.right - (fish.x + d.w / 2);
      if (gap < side.tailGap) { side.tailGap = gap; side.tailSpeed = d.speed; }
    }
    return states;
  }

  advanceSea(dt) {
    this.time0 += dt;
    while (this.bossQueue?.length && this.time0 >= this.bossQueue[0].at) this.spawnOrder(this.bossQueue.shift().order);
    if (!this.qaHold) for (const order of this.spawner.tick(dt, this.laneStates())) this.spawnOrder(order);
    const t = this.time0;
    for (const fish of [...this.fishes.getChildren()]) {
      const d = fish.data.values;
      if (d.caught) continue;
      if (!d.frozen) this.swim(fish, d, dt, t);
      if (isMystery(d.species)) d.reveal = this.controller.round.spyglass > 0 ? 1 : 0;
      if (d.species.rare || d.species.points >= 45) this.trail(fish, d, dt);
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
    const dx = d.dir * speed * dt;
    fish.x += dx;
    const seabed = d.lane === SEABED;
    // Every creature wanders slowly up and down inside its depth band, so rows never look ruled.
    const wander = seabed ? 0 : Math.sin(t * d.wanderRate + d.wanderPhase) * d.wander * this.view.spacing;
    const base = this.laneY(d.lane, d.h) + d.dy * this.view.spacing + wander;
    const wave = (rate, size) => Math.sin(t * rate + d.phase) * size;
    let bob = wave(1.3, 2), stretch = 1, rock = null;
    if (motion === 'school') bob = wave(1.8, 2.5);
    if (motion === 'pulse') { bob = wave(2.2, 7); rock = 0; stretch = 1 + Math.sin(t * 4.4 + d.phase) * 0.05; }
    if (motion === 'bob') { bob = wave(1.4, 5); rock = wave(1.4, 3); }
    if (motion === 'glide') { bob = wave(0.9, 5); stretch = 1 + Math.sin(t * 2.2 + d.phase) * 0.06; }
    if (motion === 'eel') bob = wave(1.2, 3);
    if (motion === 'crawl') { bob = -Math.abs(Math.sin(t * 5 + d.phase)) * 1.2; rock = 0; }
    if (motion === 'drift') { bob = wave(1.1, 1); rock = wave(0.8, 1.5); }
    if (motion === 'float') { bob = wave(1.5, 5); rock = wave(1.2, 10); }
    const y = base + bob;
    if (motion === 'spin') fish.angle += d.dir * dt * 14;
    else if (dt > 0) {
      // No wiggling: swimmers only pitch their nose along their path, smoothed so they never shake.
      const mirror = fish.flipX ? -1 : 1;
      const target = rock !== null ? rock * mirror
        : Math.max(-7, Math.min(7, Math.atan2(y - fish.y, Math.max(Math.abs(dx), 1e-3)) * 45)) * mirror;
      d.tilt += (target - d.tilt) * Math.min(1, dt * 2.5);
      fish.angle = d.tilt;
    }
    fish.y = y;
    if (stretch !== 1) fish.setDisplaySize(d.w, d.h * stretch);
  }

  // Valuable creatures leave a short trail of sparkles so children notice them.
  trail(fish, d, dt) {
    d.trailClock = (d.trailClock ?? Math.random() * 0.2) - dt;
    if (d.trailClock > 0 || fish.x < this.view.left || fish.x > this.view.right || this.sparkles >= 40) return;
    d.trailClock = 0.16;
    this.sparkles = (this.sparkles ?? 0) + 1;
    const tail = fish.x - d.dir * fish.displayWidth * 0.45;
    const spark = this.add.image(tail, fish.y + (Math.random() - 0.5) * fish.displayHeight * 0.5, 'glint')
      .setScale(0.22 + Math.random() * 0.2).setDepth(fish.depth - 0.01).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9);
    this.tweens.add({ targets: spark, alpha: 0, scale: 0.05, x: tail - d.dir * 10, y: spark.y - 6, angle: 90, duration: 700,
      onComplete: () => { spark.destroy(); this.sparkles--; } });
  }

  // Rings where the line meets the water as the hook drops.
  castRipple(angle) {
    const x = WORLD.originX + Math.tan(angle) * (WATERLINE - WORLD.originY);
    for (const [delay, size] of [[0, 1], [140, 0.7]]) {
      const ring = this.add.ellipse(x, WATERLINE + 1, 8, 2.5).setStrokeStyle(1.6, 0xffffff, 0.85).setDepth(19);
      this.tweens.add({ targets: ring, scaleX: 5 * size, scaleY: 2.5 * size, alpha: 0, delay, duration: 600, onComplete: () => ring.destroy() });
    }
  }

  hooked(fish) {
    const round = this.controller.round;
    const species = fish.getData('species');
    const h = round.hook;
    // A net also scoops up the creatures right next to the hook.
    const nearby = round.netCharges > 0 ? this.fishes.getChildren()
      .filter((o) => o !== fish && !o.getData('caught') && Math.abs(o.x - h.x) < 80 && Math.abs(o.y - h.y) < 60)
      .sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y)).slice(0, NET_EXTRA) : [];
    if (!round.catch(species.id, nearby.map((o) => o.getData('species').id))) return;
    fish.setData({ caught: true, caughtY: round.hook.y });
    fish.body.enable = false;
    fish.setDepth(16.4);
    this.caught = fish;
    this.netted = round.extraIds.map((_id, i) => {
      const o = nearby[i];
      o.setData({ caught: true, caughtY: round.hook.y });
      o.body.enable = false;
      o.setDepth(16.39);
      return { fish: o, ox: (i ? 1 : -1) * (fish.displayWidth * 0.42 + o.displayWidth * 0.3), oy: 4 + i * 10 };
    });
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
      // Lifted out of the water it drops behind the gunwale, into the boat.
      fish.setDepth(15.9);
      this.tweens.add({ targets: fish, x: 150, y: 112, angle: 0, scale: fish.scale * 0.6, duration: 650, ease: 'Back.easeIn',
        onUpdate: () => this.syncExtras(fish), onComplete: () => this.removeCreature(fish) });
    }
    for (const { fish: o } of this.netted) {
      o.setData('reveal', 1);
      o.getData('shadow')?.setAlpha(0);
      o.setDepth(15.9);
      this.tweens.add({ targets: o, x: 150 + (Math.random() - 0.5) * 30, y: 112, angle: 0, scale: o.scale * 0.6, duration: 700, ease: 'Back.easeIn',
        onUpdate: () => this.syncExtras(o), onComplete: () => this.removeCreature(o) });
    }
    this.netted = [];
    this.netMesh.clear();
    const text = landing.multiplier > 1 ? `+${landing.points}  x${landing.multiplier}` : `+${landing.points}`;
    const label = this.add.text(240, 176, text, { fontFamily: 'Tahoma, sans-serif', fontSize: species.jackpot ? '40px' : '32px', fontStyle: 'bold', color: '#ffea8e', stroke: '#145466', strokeThickness: 6 }).setOrigin(0.5).setDepth(21);
    this.tweens.add({ targets: label, y: 120, alpha: 0, delay: species.jackpot ? 600 : 250, duration: species.jackpot ? 1400 : 900, onComplete: () => label.destroy() });
    if (species.kind === 'item' || species.jackpot) this.coinBurst(x, species.jackpot ? 34 : 18);
    if (landing.points > 1) this.controller.flyCoins?.(x, WATERLINE - 10, Math.max(3, Math.min(14, Math.ceil(landing.points / 8))));
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!calm && (species.jackpot || landing.points >= 80)) { this.cameras.main.shake(380, 0.009); this.cameras.main.flash(260, 255, 236, 170); }
    else if (!calm && landing.points >= 40) this.cameras.main.shake(200, 0.004);
    else {
      for (let i = 0; i < 15; i++) {
        const confetti = this.add.rectangle(240, 150, 5, 8, [0xffd05b, 0xff786b, 0xffffff, 0x89e8ab][i % 4]).setDepth(20);
        this.tweens.add({ targets: confetti, x: 120 + i * 18, y: 214 + (i % 5) * 18, angle: i * 50, alpha: 0, duration: 1000, onComplete: () => confetti.destroy() });
      }
    }
  }

  // Unlockable boat looks: a string of pennants or lanterns from the cabin roof to the bow.
  drawDecor(bob) {
    const g = this.decor.clear();
    const glow = this.lanternGlow.clear();
    const look = this.controller.progress?.looks?.boat ?? 'plain';
    const img = this.boatImage;
    if (look === 'plain' || !img) return;
    const at = (fx, fy) => ({ x: img.x + img.displayWidth * fx, y: img.y + img.displayHeight * fy + bob });
    const from = at(0.21, 0.04);
    const to = at(0.985, 0.45);
    const point = (t) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t + Math.sin(t * Math.PI) * 7 });
    g.lineStyle(0.8, 0x3d3226, 0.9).beginPath();
    for (let i = 0; i <= 12; i++) { const p = point(i / 12); if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }
    g.strokePath();
    if (look === 'pennants') {
      const colors = [0xe8433a, 0xf5c542, 0x2f8fd8, 0x3bb36a, 0xf08ac0];
      for (let i = 1; i < 10; i++) {
        const p = point(i / 10);
        const sway = Math.sin(this.time0 * 3 + i) * 1.2;
        g.fillStyle(colors[i % colors.length], 1).fillTriangle(p.x - 3, p.y, p.x + 3, p.y, p.x + sway, p.y + 7);
      }
    }
    if (look === 'lanterns') {
      const night = this.timeOfDay === 'night' ? 1 : this.timeOfDay === 'sunset' ? 0.7 : 0.35;
      for (const t of [0.22, 0.5, 0.78]) {
        const p = point(t);
        g.lineStyle(0.8, 0x3d3226, 1).lineBetween(p.x, p.y, p.x, p.y + 3);
        g.fillStyle(0x7a2a12, 1).fillRect(p.x - 2.6, p.y + 3, 5.2, 1.4);
        g.fillStyle(0xffc44d, 1).fillEllipse(p.x, p.y + 7, 6, 7);
        g.fillStyle(0x7a2a12, 1).fillRect(p.x - 2.6, p.y + 10, 5.2, 1.2);
        const flicker = 0.85 + Math.sin(this.time0 * 9 + t * 20) * 0.15;
        glow.fillStyle(0xffb347, 0.18 * night * flicker).fillCircle(p.x, p.y + 7, 14);
        glow.fillStyle(0xffe08a, 0.3 * night * flicker).fillCircle(p.x, p.y + 7, 6);
      }
    }
  }

  // A simple mesh bag around everything the net is bringing up.
  drawNet() {
    const g = this.netMesh.clear();
    if (!this.netted.length || !this.caught) return;
    const all = [this.caught, ...this.netted.map((n) => n.fish)];
    const x0 = Math.min(...all.map((f) => f.x - f.displayWidth / 2)) - 5;
    const x1 = Math.max(...all.map((f) => f.x + f.displayWidth / 2)) + 5;
    const y0 = Math.min(...all.map((f) => f.y - f.displayHeight / 2)) - 4;
    const y1 = Math.max(...all.map((f) => f.y + f.displayHeight / 2)) + 6;
    g.lineStyle(1, 0xe2c48a, 0.6);
    for (let x = x0; x <= x1; x += 8) g.lineBetween(x, y0, x, y1);
    for (let y = y0; y <= y1; y += 8) g.lineBetween(x0, y, x1, y);
    g.lineStyle(2, 0xb98b4e, 0.9).strokeRoundedRect(x0, y0, x1 - x0, y1 - y0, 8);
    g.fillStyle(0xe8692e, 1);
    for (let x = x0 + 6; x < x1; x += 18) g.fillCircle(x, y0, 2.6);
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
    if (before === 'aim' && round.phase === 'casting') this.castRipple(round.angle);
    const pirate = round.phase === 'pirate';
    if (pirate && !this.pirate.active) { this.pirate.start(this.controller.rng); this.controller.onPirateStart?.(); }
    if (!pirate && this.pirate.active) { this.pirate.end(); this.controller.onPirateEnd?.(); }
    this.controller.audio.setFever?.(round.fever > 0);
    if ((round.bonus > 0) !== this.bonusActive) this.setBonus(round.bonus > 0);
    this.controller.audio.setBonus(round.bonus > 0 || pirate);
    this.controller.audio.setLine(round.phase);
    this.advanceSea(dt);
    this.pirate.update(dt, round);
    const h = round.hook;
    const bob = Math.sin(round.elapsed * 2.1) * 1.2;
    this.boat.y = bob;
    const tension = round.phase === 'reeling' ? 0.75 + 0.25 * Math.max(0, 1 - (this.controller.now() - round.lastTap) / 220) : round.phase === 'casting' ? 0.25 : 0.08;
    const tip = this.drawRod(h, tension, bob);
    this.hook.body.reset(h.x, h.y);
    this.hook.setAngle(-round.angle * 180 / Math.PI);
    this.drawLine(tip, h, round.angle, round.fever > 0);
    // Golden hook: bigger catch area and the golden hook picture.
    const gold = round.goldHook > 0;
    if (gold !== this.bigHook) {
      this.bigHook = gold;
      this.hook.body.setSize(this.hookBody[0] * (gold ? 1.9 : 1), this.hookBody[1] * (gold ? 1.7 : 1), true);
      if (gold && !this.goldHookImg && this.textures.exists('sp-gold-hook')) {
        this.goldHookImg = this.add.image(0, 0, this.fitted('sp-gold-hook', 30)).setDepth(16.61);
        this.goldHookImg.setDisplaySize(30, 30 * this.goldHookImg.height / this.goldHookImg.width);
      }
    }
    const goldLook = this.controller.progress?.looks?.hook === 'golden';
    if (goldLook && !this.goldHookImg && this.textures.exists('sp-gold-hook')) {
      this.goldHookImg = this.add.image(0, 0, this.fitted('sp-gold-hook', 30)).setDepth(16.61);
      this.goldHookImg.setDisplaySize(30, 30 * this.goldHookImg.height / this.goldHookImg.width);
    }
    const showGold = (gold || goldLook) && !pirate && Boolean(this.goldHookImg);
    this.goldHookImg?.setVisible(showGold).setPosition(h.x - 2, h.y + 2).setAngle(-round.angle * 180 / Math.PI);
    this.hook.setVisible(!pirate && !showGold);
    this.rod.setVisible(!pirate);
    this.line.setVisible(!pirate);
    this.hookGlow.setVisible(round.fever > 0 && !pirate);
    if (round.fever > 0) this.hookGlow.setPosition(h.x, h.y).setScale(1.6 + Math.sin(this.time0 * 8) * 0.3).setAngle(this.time0 * 60).setAlpha(0.85);
    if (this.caught && round.phase === 'reeling') {
      const level = tugLevel(this.caught.getData('species'));
      const struggle = Math.sin(this.time0 * 15) * (9 + level * 5);
      this.tugClock = (this.tugClock ?? 1) - dt;
      if (level > 0 && this.tugClock <= 0) {
        this.tugClock = (0.9 + Math.random() * 0.9) / (level > 1 ? 1.3 : 1);
        this.controller.onTug?.(level);
      }
      this.caught.setPosition(h.x + 4, h.y + 12 + this.caught.displayHeight * 0.25).setAngle((this.caught.flipX ? 18 : -18) + struggle);
      const reveal = (f) => round.spyglass > 0 ? 1 : revealForRise(f.getData('species'), h.y, f.getData('caughtY'), SURFACE_Y);
      this.caught.setData('reveal', reveal(this.caught));
      this.syncExtras(this.caught);
      for (const n of this.netted) {
        n.fish.setPosition(h.x + n.ox, h.y + 12 + n.oy + n.fish.displayHeight * 0.2).setAngle((n.fish.flipX ? 14 : -14) + Math.sin(this.time0 * 13 + n.oy) * 7);
        n.fish.setData('reveal', reveal(n.fish));
        this.syncExtras(n.fish);
      }
      this.drawNet();
    }
    this.drawDecor(bob);
    if (!this.caught) this.tugClock = undefined;
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
    const look = this.controller.progress?.looks?.rod ?? 'classic';
    const rod = RODS[look] ?? RODS.classic;
    for (let i = 0; i < steps; i++) {
      const a = at(i / steps), b = at((i + 1) / steps);
      g.lineStyle(3.4 - i * 0.17, rod[0], 1).lineBetween(a.x, a.y, b.x, b.y);
      if (look === 'bamboo' && i % 3 === 2) g.fillStyle(0x6b4a1e, 1).fillCircle(b.x, b.y, 2 - i * 0.07);
    }
    for (let i = 3; i < steps; i++) {
      const a = at(i / steps), b = at((i + 1) / steps);
      g.lineStyle(0.8, rod[1], 0.9).lineBetween(a.x - 0.6, a.y - 0.6, b.x - 0.6, b.y - 0.6);
    }
    const grip0 = at(0), grip1 = at(0.2);
    g.lineStyle(4.6, rod[2], 1).lineBetween(grip0.x, grip0.y, grip1.x, grip1.y);
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

  drawLine(tip, hook, angle, fever = false) {
    const top = { x: hook.x - Math.sin(angle) * 11, y: hook.y - Math.cos(angle) * 11 };
    const g = this.line.clear();
    g.lineStyle(2.4, 0x0b4b5c, 0.35).lineBetween(tip.x, tip.y, top.x, top.y);
    g.lineStyle(fever ? 1.6 : 1.1, fever ? 0xffd34d : 0xf4fbff, 0.95).lineBetween(tip.x, tip.y, top.x, top.y);
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
    const rayLight = this.timeOfDay === 'night' ? 0.35 : this.timeOfDay === 'sunset' ? 0.7 : 1;
    this.rays.forEach((ray) => { ray.setAngle(Math.sin(t * 0.25 + ray.getData('phase')) * 4).setAlpha((0.7 + Math.sin(t * 0.6 + ray.getData('phase')) * 0.3) * rayLight); });
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
    this.pirate.clear();
    this.bossQueue = [];
    this.bossShadowImage?.destroy(); this.bossShadowImage = null;
    this.netted = [];
    this.netMesh.clear();
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
      combo: round.combo, fever: round.fever, landing: round.landing ? { id: round.landing.species.id, points: round.landing.points, multiplier: round.landing.multiplier, extras: round.landing.extras.map((s) => s.id) } : null,
      powers: { net: round.netCharges, turbo: round.turbo, goldHook: round.goldHook, spyglass: round.spyglass, bigHook: this.bigHook }, extras: [...round.extraIds], netted: this.netted.length,
      pirate: round.pirate ? { ...round.pirate } : null, battle: this.pirate.state(round), bonusTurn: round.bonusTurn,
      bossPending: Boolean(this.bossQueue?.length), bossShadow: Boolean(this.bossShadowImage?.active), tugs: this.controller.tugs ?? 0,
      timeOfDay: this.timeOfDay ?? 'day', tint: this.tint.visible, looks: { ...this.controller.progress.looks },
      view: { x: this.cameras.main.worldView.x, y: this.cameras.main.worldView.y, zoom: this.cameras.main.zoom, ...this.view },
      audio: { state: this.controller.audio.context?.state ?? 'locked', enabled: this.controller.audio.enabled, music: this.controller.audio.musicOn, level: this.controller.audio.level() },
      fishes: this.fishes.getChildren().map((f) => {
        const d = f.data.values;
        return { uid: d.uid, id: d.species.id, lane: d.lane, dir: d.dir, speed: d.speed, born: d.born, reveal: d.reveal, shadowAlpha: d.shadow?.alpha ?? 0, glint: Boolean(d.glint),
          x: f.x, y: f.y, width: f.displayWidth, height: f.displayHeight, alpha: f.alpha, active: f.body?.enable ?? false, caught: d.caught };
      }) };
  }

  arrangeForTest(id = 'goldfish', extras = []) {
    const round = this.controller.round;
    if (round.phase !== 'aim') throw new Error('Arrange only before a cast');
    const species = SPECIES_BY_ID[id];
    if (!this.controller.species.includes(species)) throw new Error(`No artwork for ${id}`);
    round.elapsed = 0;
    round.swingTime = 0;
    round.angle = 0;
    this.testAim = true;
    this.qaHold = true;
    this.clearSea();
    const fish = this.addCreature(species, species.lane, WORLD.originX, 1, 0, { dy: 0, phase: 0 }, this.sizeOf(species));
    fish.setData('frozen', true);
    // Neighbours for net tests: same depth, either side of the hook's path.
    extras.forEach((extraId, i) => {
      const extra = SPECIES_BY_ID[extraId];
      const size = this.sizeOf(extra, species.lane);
      const other = this.addCreature(extra, species.lane, WORLD.originX + (i ? 1 : -1) * (fish.displayWidth / 2 + size.width / 2 + 4), 1, 0, { dy: 0, phase: 0 }, size);
      other.setData('frozen', true);
    });
  }

  releaseTest() { this.qaHold = false; }

  spawnBossForTest(id) {
    const species = SPECIES_BY_ID[id];
    this.spawnOrder({ species, lane: 3, dir: this.spawner.dir[3], speed: species.speed, boss: true,
      members: [{ offset: 0, dy: 0, phase: 0, wander: 0, wanderRate: 0.2, wanderPhase: 0, speedMul: 1 }] });
  }
}

export function createGame(controller) {
  // The canvas is sized by the controller (CSS size x device pixel ratio, see FishingApp.fitCanvas).
  const { width, height } = controller.seaSize();
  return new Phaser.Game({
    type: Phaser.CANVAS, parent: 'sea', width, height, transparent: true,
    render: { antialias: true, roundPixels: false },
    scale: { mode: Phaser.Scale.NONE, width, height, zoom: 1 / controller.dpr },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false, fps: 60 } },
    audio: { noAudio: true }, scene: [new CoveScene(controller)],
  });
}
