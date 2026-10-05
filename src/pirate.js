import { WATERLINE, CENTER_X } from './layout.js';
import { PIRATE_HP } from './model.js';

// Pirate ships sail along the horizon; the cannon on our bow swings like the hook and one tap fires.
// A hit rocks the ship and drops treasure into the sea; a ship that runs out of hits sails away fast.
// Nobody is hurt and nothing sinks: this is a treasure game for children.
const SHIPS = {
  small: { art: 'pirate-small', width: 62, speed: 42, weight: 50 },
  medium: { art: 'pirate-medium', width: 84, speed: 33, weight: 35 },
  large: { art: 'pirate-large', width: 106, speed: 25, weight: 15 },
};
const FLIGHT_MS = 750;
const AIM_SPAN = 0.42;     // the target swings over this share of the visible width on each side
const MAX_SHIPS = 2;
const HIT_SHARE = 0.42;    // a ball within this share of the ship's width from its centre is a hit

export class PirateBattle {
  constructor(scene) {
    this.scene = scene;
    this.ships = [];
    this.active = false;
    this.frozen = false;
    this.testAimX = null;
    this.marker = scene.add.graphics().setDepth(19);
    this.cannon = null;
  }

  start(rng = Math.random) {
    this.clear();
    this.active = true;
    this.rng = rng;
    this.dir = rng() < 0.5 ? 1 : -1;
    this.spawnIn = 0.2;
    const s = this.scene;
    const key = s.fitted('sp-cannon', 34);
    const butt = s.rodButt;
    this.cannon = s.add.image(butt.x - 6, butt.y + 8, key).setOrigin(0.45, 0.95).setDepth(16.2);
    this.cannon.setDisplaySize(34, 34 * this.cannon.height / this.cannon.width);
  }

  // World x the cannon is aimed at for a swing angle in [-0.67, 0.67].
  targetX(angle) {
    const span = this.scene.view.width * AIM_SPAN;
    return CENTER_X + Math.max(-1, Math.min(1, angle / 0.67)) * span;
  }

  angleFor(x) { return Math.max(-0.67, Math.min(0.67, (x - CENTER_X) / (this.scene.view.width * AIM_SPAN) * 0.67)); }

  muzzle() {
    const c = this.cannon;
    return { x: c.x + (c.flipX ? -1 : 1) * c.displayWidth * 0.4, y: c.y - c.displayHeight * 0.8 };
  }

  spawnShip() {
    const roll = this.rng() * 100;
    const kind = roll < SHIPS.small.weight ? 'small' : roll < SHIPS.small.weight + SHIPS.medium.weight ? 'medium' : 'large';
    const spec = SHIPS[kind];
    const s = this.scene;
    const image = s.add.image(0, 0, s.fitted(`sp-${spec.art}`, spec.width)).setOrigin(0.5, 0.9).setDepth(15.5);
    image.setDisplaySize(spec.width, spec.width * image.height / image.width).setFlipX(this.dir < 0);
    const x = this.dir > 0 ? s.view.left - spec.width : s.view.right + spec.width;
    this.ships.push({ kind, image, x, hp: PIRATE_HP[kind], speed: spec.speed * (0.9 + this.rng() * 0.25), leaving: false, rock: 0, phase: this.rng() * 6, width: spec.width });
  }

  update(dt, round) {
    const s = this.scene;
    if (this.active && !this.frozen) {
      this.spawnIn -= dt;
      if (this.spawnIn <= 0 && this.ships.filter((ship) => !ship.leaving).length < MAX_SHIPS) {
        this.spawnShip();
        this.spawnIn = 1.6 + this.rng() * 2.2;
      }
    }
    for (const ship of [...this.ships]) {
      if (!this.frozen || ship.leaving) ship.x += this.dir * ship.speed * (ship.leaving ? 3 : 1) * dt;
      ship.rock *= Math.max(0, 1 - dt * 3);
      const bob = Math.sin(s.time0 * 2 + ship.phase) * 1.2;
      ship.image.setPosition(ship.x, WATERLINE + 4 + bob).setAngle(Math.sin(s.time0 * 1.4 + ship.phase) * 2 + ship.rock * Math.sin(s.time0 * 18));
      const gone = this.dir > 0 ? ship.x - ship.width > s.view.right + 20 : ship.x + ship.width < s.view.left - 20;
      if (gone || (!this.active && (ship.x < s.view.left - ship.width || ship.x > s.view.right + ship.width))) {
        ship.image.destroy();
        this.ships.splice(this.ships.indexOf(ship), 1);
      }
    }
    const g = this.marker.clear();
    if (!this.active || round.phase !== 'pirate' || !this.cannon) return;
    if (import.meta.env.DEV && this.testAimX !== null) round.angle = this.angleFor(this.testAimX);
    const tx = this.targetX(round.angle);
    const ty = WATERLINE - 20;
    const pulse = 1 + Math.sin(s.time0 * 6) * 0.08;
    g.lineStyle(3, 0x7a2a12, 0.5).strokeCircle(tx, ty, 11 * pulse);
    g.lineStyle(2, 0xffe08a, 1).strokeCircle(tx, ty, 11 * pulse);
    g.lineStyle(2, 0xffe08a, 1).lineBetween(tx - 16, ty, tx - 6, ty).lineBetween(tx + 6, ty, tx + 16, ty).lineBetween(tx, ty - 16, tx, ty - 6).lineBetween(tx, ty + 6, tx, ty + 16);
    // The cannon turns towards the target side and tilts a little.
    this.cannon.setFlipX(tx < this.cannon.x - 4);
    this.cannon.setAngle((this.cannon.flipX ? 1 : -1) * Math.max(-8, Math.min(14, (Math.abs(tx - this.cannon.x) - 120) / 12)));
  }

  // Fires at the current aim; resolve({ hit, kind, sunk }) returns the round's result for the shot.
  fire(angle, resolve) {
    const s = this.scene;
    const tx = this.targetX(angle);
    const from = this.muzzle();
    const to = { x: tx, y: WATERLINE - 20 };
    const apex = Math.min(from.y, to.y) - 55;
    const ball = s.add.image(from.x, from.y, s.fitted('sp-cannonball', 12)).setDepth(19).setDisplaySize(12, 12);
    this.puff(from.x, from.y, 5, 0xf4efe6);
    s.cameras.main.shake(120, 0.003);
    this.tweenRecoil();
    const state = { t: 0 };
    s.tweens.add({
      targets: state, t: 1, duration: FLIGHT_MS, ease: 'Linear',
      onUpdate: () => {
        const t = state.t;
        ball.setPosition(from.x + (to.x - from.x) * t, (1 - t) ** 2 * from.y + 2 * (1 - t) * t * apex + t * t * to.y);
        ball.setDisplaySize(12 - 5 * t, 12 - 5 * t);
      },
      onComplete: () => { ball.destroy(); this.impact(tx, resolve); },
    });
  }

  tweenRecoil() {
    const c = this.cannon;
    if (!c) return;
    const x = c.x;
    this.scene.tweens.add({ targets: c, x: x + (c.flipX ? 4 : -4), duration: 70, yoyo: true, onComplete: () => c.setX(x) });
  }

  impact(tx, resolve) {
    const s = this.scene;
    const ship = this.ships
      .filter((sh) => !sh.leaving && Math.abs(sh.x - tx) < sh.width * HIT_SHARE)
      .sort((a, b) => Math.abs(a.x - tx) - Math.abs(b.x - tx))[0];
    if (!ship) {
      s.splash(tx);
      resolve({ hit: false });
      return;
    }
    ship.hp--;
    const sunk = ship.hp <= 0;
    ship.rock = 9;
    this.puff(tx, WATERLINE - 24, 8, 0xfff3d6);
    this.dropLoot(ship, sunk);
    if (sunk) ship.leaving = true;
    const result = resolve({ hit: true, kind: ship.kind, sunk });
    if (result?.points) s.controller.flyCoins?.(ship.x, WATERLINE - 20, Math.max(4, Math.min(16, Math.ceil(result.points / 8))));
  }

  dropLoot(ship, sunk) {
    const s = this.scene;
    const items = sunk ? ['float-chest', 'barrel', 'coin', 'coin'] : [this.rng() < 0.5 ? 'barrel' : 'coin', 'coin'];
    items.forEach((id, i) => {
      const width = id === 'float-chest' ? 26 : id === 'barrel' ? 20 : 12;
      const img = s.add.image(ship.x + (i - items.length / 2) * 10, WATERLINE - 30, s.fitted(`sp-${id}`, width)).setDepth(18.5);
      img.setDisplaySize(width, width * img.height / img.width);
      const x = img.x + (this.rng() - 0.5) * 40;
      s.tweens.add({ targets: img, x, y: WATERLINE + 4, angle: (this.rng() - 0.5) * 60, duration: 420 + i * 80, ease: 'Quad.easeIn',
        onComplete: () => {
          s.splash(x);
          s.tweens.add({ targets: img, y: WATERLINE + 10, alpha: 0, duration: 900, delay: 300, onComplete: () => img.destroy() });
        } });
    });
  }

  puff(x, y, count, color) {
    const s = this.scene;
    for (let i = 0; i < count; i++) {
      const p = s.add.circle(x + (Math.random() - 0.5) * 6, y, 3 + Math.random() * 3, color, 0.85).setDepth(19);
      s.tweens.add({ targets: p, x: p.x + (Math.random() - 0.5) * 30, y: p.y - 8 - Math.random() * 16, scale: 2.4, alpha: 0, duration: 600 + Math.random() * 300, onComplete: () => p.destroy() });
    }
  }

  // The battle is over: ships sail off, the cannon is stowed.
  end() {
    this.active = false;
    this.frozen = false;
    this.testAimX = null;
    for (const ship of this.ships) ship.leaving = true;
    this.marker.clear();
    this.cannon?.destroy();
    this.cannon = null;
  }

  clear() {
    for (const ship of this.ships) ship.image.destroy();
    this.ships = [];
    this.end();
  }

  // QA only: stop the ships and make sure one is on screen, right of the boat.
  freeze() {
    this.frozen = true;
    if (!this.ships.some((ship) => !ship.leaving)) this.spawnShip();
    const ship = this.ships.find((sh) => !sh.leaving);
    ship.x = CENTER_X + 110;
  }

  state(round) {
    return {
      active: this.active,
      targetX: this.active ? this.targetX(round.angle) : null,
      ships: this.ships.map((ship) => ({ kind: ship.kind, x: ship.x, hp: ship.hp, leaving: ship.leaving, width: ship.width })),
    };
  }
}

