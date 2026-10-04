import Phaser from 'phaser';
import { SPECIES, SCHOOLS, ROW_POPULATIONS, LANES, ATLASES, SWIM_LOOP, spawnX, wrapX, directionFor, revealForRise } from './species.js';
import { WORLD } from './model.js';

export class CoveScene extends Phaser.Scene {
  constructor(controller) { super('cove'); this.controller = controller; this.caught = null; }

  preload() {
    this.load.image('cove', `${import.meta.env.BASE_URL}assets/cove.png`);
    for (const [key, atlas] of Object.entries(ATLASES)) this.load.image(key, `${import.meta.env.BASE_URL}assets/${atlas.file}`);
    this.load.on('loaderror', () => this.controller.assetError());
  }

  create() {
    this.sky = this.add.rectangle(240, 380, 480, 760, 0x73c8f4).setDepth(-3);
    this.background = this.add.image(240, 380, 'cove').setDepth(-2);
    this.layout(this.scale.gameSize);
    this.scale.on('resize', (size) => this.layout(size));
    this.makeHookTexture();
    this.rope = this.add.graphics().setDepth(12);
    this.fishes = this.physics.add.group();
    SPECIES.forEach((species) => {
      this.textures.get(species.atlas).add(species.id, 0, ...species.rect);
      if (species.lane >= 4) this.makeSilhouette(species);
    });
    SCHOOLS.forEach(({ species, slot }) => {
      const fish = this.fishes.create(spawnX(species, slot), LANES[species.lane], species.atlas, species.id);
      fish.setDisplaySize(species.width, species.height).setDepth(5 + species.lane * 0.1);
      fish.setData('species', species).setData('slot', slot);
      if (species.lane >= 4) fish.setData('shadow', this.add.image(fish.x, fish.y, `shadow-${species.id}`));
      fish.body.setSize(species.rect[2] * 0.7, species.rect[3] * 0.65, true).setAllowGravity(false);
      this.swim(fish, directionFor(species));
      this.syncShadow(fish);
    });
    this.boat = this.drawBoat();
    this.hook = this.physics.add.image(240, 186, 'hook').setDisplaySize(28, 28).setDepth(15);
    this.hook.body.setSize(32, 40, true).setAllowGravity(false);
    this.physics.add.overlap(this.hook, this.fishes, (_hook, fish) => {
      const species = fish.getData('species');
      if (!this.controller.round.catch(species.id)) return;
      fish.body.enable = false;
      fish.setDepth(14).setAngle(-12);
      fish.setData('caughtY', this.controller.round.hook.y);
      this.caught = fish;
      this.controller.onHook(species);
    }, () => !this.controller.round.paused && this.controller.round.phase === 'casting');
    this.bubbles = Array.from({ length: 17 }, (_, i) => {
      const bubble = this.add.circle(28 + (i * 109) % 424, 175 + (i * 51) % 430, 1.5 + i % 3, 0xffffff, 0.22);
      bubble.setStrokeStyle(1, 0xffffff, 0.2).setDepth(2);
      return bubble;
    });
    this.input.on('pointerdown', () => this.controller.cast());
    this.controller.ready(this);
  }

  layout(size) {
    const zoom = Math.min(size.width / WORLD.width, size.height / WORLD.height);
    const width = size.width / zoom;
    const height = size.height / zoom;
    this.cameras.main.setSize(size.width, size.height).setZoom(zoom).centerOn(240, height / 2);
    this.sky?.setPosition(240, height / 2).setDisplaySize(width, height);
    // Keep the waterline beside the boat while expanding the painted environment.
    const artHeight = height + 100;
    this.background?.setPosition(240, 132 - artHeight * 0.108 + artHeight / 2).setDisplaySize(width, artHeight);
  }

  makeHookTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.lineStyle(9, 0x075a6d, 1);
    g.beginPath(); g.moveTo(36, 3); g.lineTo(36, 43); g.arc(26, 43, 10, 0, Math.PI, false); g.lineTo(16, 32); g.strokePath();
    g.lineStyle(5, 0xfff0b6, 1);
    g.beginPath(); g.moveTo(36, 3); g.lineTo(36, 43); g.arc(26, 43, 10, 0, Math.PI, false); g.lineTo(16, 32); g.strokePath();
    g.fillStyle(0xffd45c); g.fillTriangle(12, 36, 20, 34, 16, 27);
    g.generateTexture('hook', 64, 64); g.destroy();
  }

  makeSilhouette(species) {
    // Canvas renderer does not support sprite tint. Preserve the cutout's alpha mask.
    const [x, y, width, height] = species.rect;
    const texture = this.textures.createCanvas(`shadow-${species.id}`, width, height);
    const context = texture.context;
    context.drawImage(this.textures.get(species.atlas).getSourceImage(), x, y, width, height, 0, 0, width, height);
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = '#000000';
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'source-over';
    texture.refresh();
  }

  syncShadow(fish) {
    const shadow = fish.getData('shadow');
    if (!shadow) return;
    shadow.setPosition(fish.x, fish.y).setDisplaySize(fish.displayWidth, fish.displayHeight)
      .setAngle(fish.angle).setFlipX(fish.flipX).setDepth(fish.depth + 0.01)
      .setAlpha(fish.alpha * (1 - fish.getData('reveal')));
  }

  drawBoat() {
    const g = this.add.graphics().setDepth(16);
    g.fillStyle(0x087b89, 0.22); g.fillEllipse(240, 131, 175, 14);
    g.lineStyle(3, 0x205d67); g.fillStyle(0xfff5c7);
    g.beginPath(); g.moveTo(158, 107); g.lineTo(326, 107); g.lineTo(301, 134); g.lineTo(185, 134); g.closePath(); g.fillPath(); g.strokePath();
    g.fillStyle(0xf06a55); g.fillRect(171, 109, 140, 6);
    g.fillStyle(0x1593a0); g.fillCircle(205, 123, 5); g.fillCircle(225, 123, 5); g.fillCircle(245, 123, 5);
    g.lineStyle(5, 0x31565f); g.lineBetween(262, 107, 262, 43);
    g.fillStyle(0xfffbec); g.fillTriangle(258, 43, 218, 95, 258, 95);
    g.fillStyle(0xffd264); g.fillTriangle(268, 52, 298, 96, 268, 96);
    g.fillStyle(0xef6b5c); g.fillTriangle(262, 40, 285, 46, 262, 53);
    g.fillStyle(0xffd09a); g.fillCircle(198, 97, 10);
    g.fillStyle(0x16687c); g.fillRoundedRect(185, 84, 27, 8, 3);
    g.fillStyle(0xffd052); g.fillRoundedRect(190, 79, 17, 9, 3);
    g.fillStyle(0x244853); g.fillCircle(200, 96, 1.5);
    g.lineStyle(4, 0x285565); g.lineBetween(221, 108, 240, 132);
    return g;
  }

  swim(fish, direction) {
    const species = fish.getData('species');
    fish.body.enable = true;
    fish.setData('reveal', species.lane >= 4 ? 0 : 1);
    fish.setAngle(0).setFlipX(direction < 0).setDepth(5 + species.lane * 0.1);
    fish.setVelocity(direction * species.speed, 0);
  }

  resetRound() {
    this.caught = null;
    this.testAim = false;
    this.fishes.getChildren().forEach((fish) => {
      const species = fish.getData('species');
      this.tweens.killTweensOf(fish);
      fish.setAlpha(1).setDisplaySize(species.width, species.height);
      fish.body.enable = true;
      fish.body.reset(spawnX(species, fish.getData('slot')), LANES[species.lane]);
      this.swim(fish, directionFor(species));
      this.syncShadow(fish);
    });
    this.physics.resume();
    this.tweens.resumeAll();
  }

  celebrate(species) {
    const fish = this.caught;
    this.caught = null;
    if (fish) {
      fish.setData('reveal', 1);
      this.tweens.add({ targets: fish, x: 198, y: 98, alpha: 0, duration: 650, ease: 'Back.easeIn', onComplete: () => {
        fish.setAlpha(1).setAngle(0);
        fish.body.enable = true;
        const neighbor = this.fishes.getChildren().find((other) => other !== fish && other.body.enable && other.getData('species').lane === species.lane);
        const spacing = SWIM_LOOP.width / ROW_POPULATIONS[species.lane];
        const x = neighbor ? wrapX(neighbor.x + (fish.getData('slot') - neighbor.getData('slot')) * spacing) : spawnX(species, fish.getData('slot'));
        fish.body.reset(x, LANES[species.lane]);
        this.swim(fish, directionFor(species));
      } });
    }
    const label = this.add.text(240, 170, `+${species.points}`, { fontFamily: 'Tahoma, sans-serif', fontSize: '32px', fontStyle: 'bold', color: '#ffea8e', stroke: '#176174', strokeThickness: 5 }).setOrigin(0.5).setDepth(21);
    this.tweens.add({ targets: label, y: 132, alpha: 0, duration: 1000, onComplete: () => label.destroy() });
    for (let i = 0; i < 15; i++) {
      const confetti = this.add.rectangle(240, 146, 5, 8, [0xffd05b, 0xff786b, 0xffffff, 0x89e8ab][i % 4]).setDepth(20);
      this.tweens.add({ targets: confetti, x: 120 + i * 18, y: 210 + i % 5 * 18, angle: i * 50, alpha: 0, duration: 1000, onComplete: () => confetti.destroy() });
    }
  }

  update(_time, delta) {
    if (!this.hook) return;
    const round = this.controller.round;
    if (round.paused) { this.physics.pause(); this.tweens.pauseAll(); return; }
    if (this.physics.world.isPaused) { this.physics.resume(); this.tweens.resumeAll(); }
    const before = round.phase;
    round.tick(delta / 1000);
    // Position-only QA fixture: keep a vertical aim until the real button casts.
    if (import.meta.env.DEV && this.testAim) {
      if (round.phase === 'aim') round.angle = 0;
      else this.testAim = false;
    }
    if (before === 'casting' && round.phase === 'returning') this.controller.audio.play('miss');
    const h = round.hook;
    this.hook.body.reset(h.x, h.y);
    this.hook.setAngle(-round.angle * 180 / Math.PI);
    this.rope.clear().lineStyle(4, 0x0b647b, 0.5).lineBetween(240, 132, h.x, h.y);
    this.rope.lineStyle(2, 0xfff4c6, 1).lineBetween(240, 132, h.x, h.y);
    if (this.caught && round.phase === 'reeling') {
      this.caught.setPosition(h.x + 5, h.y + 15);
      this.caught.setData('reveal', revealForRise(this.caught.getData('species').lane, h.y, this.caught.getData('caughtY')));
    }
    this.fishes.getChildren().forEach((fish) => {
      if (fish.body.enable && (fish.x > SWIM_LOOP.right || fish.x < SWIM_LOOP.left)) {
        fish.body.reset(wrapX(fish.x), fish.y);
        this.swim(fish, directionFor(fish.getData('species')));
      }
      this.syncShadow(fish);
    });
    this.bubbles.forEach((bubble, i) => {
      bubble.y -= Math.min(delta / 1000, 0.1) * (9 + i % 5);
      if (bubble.y < 160) bubble.y = 590;
    });
    this.boat.y = Math.sin(round.elapsed * 2.1) * 1.2;
    this.controller.renderHUD();
  }

  snapshot() {
    const round = this.controller.round;
    return { ready: true, phase: round.phase, paused: round.paused, angle: round.angle, hook: round.hook, length: round.length, targetLength: round.targetLength, taps: round.taps, requiredTaps: round.requiredTaps, score: round.score, catches: [...round.catches], remaining: round.remaining,
      view: { x: this.cameras.main.worldView.x, y: this.cameras.main.worldView.y, zoom: this.cameras.main.zoom },
      audio: { state: this.controller.audio.context?.state ?? 'locked', enabled: this.controller.audio.enabled, level: this.controller.audio.level() },
      fishes: this.fishes.getChildren().map((f) => ({ id: f.getData('species').id, lane: f.getData('species').lane,
        slot: f.getData('slot'), reveal: f.getData('reveal'), shadowAlpha: f.getData('shadow')?.alpha ?? 0,
        x: f.x, y: f.y, width: f.displayWidth, height: f.displayHeight, alpha: f.alpha, velocity: f.body.velocity.x, active: f.body.enable })) };
  }

  arrangeForTest(id = 'goldfish') {
    if (this.controller.round.phase !== 'aim') throw new Error('Arrange only before a cast');
    this.controller.round.elapsed = 0;
    this.controller.round.angle = 0;
    this.testAim = true;
    const target = this.fishes.getChildren().find((fish) => fish.getData('species').id === id);
    this.fishes.getChildren().forEach((fish) => {
      this.tweens.killTweensOf(fish);
      fish.body.setVelocity(0, 0);
      fish.body.enable = fish === target;
      fish.setData('reveal', fish.getData('species').lane >= 4 ? 0 : 1);
      fish.body.reset(fish.body.enable ? 240 : -200, fish.body.enable ? LANES[fish.getData('species').lane] : 600);
      fish.setAlpha(fish.body.enable ? 1 : 0);
      this.syncShadow(fish);
    });
  }
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
