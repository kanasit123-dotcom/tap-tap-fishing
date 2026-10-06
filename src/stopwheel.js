// Bonus stage "stop the wheel": a wheel of prizes spins past a pointer at the top and the player taps once to stop it.
// Three spins, each a little faster. Pure rules: no DOM, no Phaser, so the timing can be tested exactly.

// Prizes clockwise from the pointer's start position. One golden jackpot, the rest small and middling.
export const STOP_SEGMENTS = [
  { points: 10 }, { points: 30 }, { points: 15 }, { points: 100, jackpot: true }, { points: 20 },
  { points: 50 }, { points: 10 }, { points: 30 }, { points: 20 }, { points: 50 },
];
export const SEGMENT_DEGREES = 360 / STOP_SEGMENTS.length;
export const STOP_SPINS = 3;
export const STOP_SPEEDS = [150, 215, 285];   // degrees per second for spin 1, 2, 3
export const STOP_SLIDE = 0.28;               // seconds the wheel takes to settle after the tap
export const STOP_TIMEOUT = 6;                // a spin the player never stops stops itself
export const STOP_SHOW = 1.3;                 // seconds the result stays on show

export const wrapDegrees = (angle) => ((angle % 360) + 360) % 360;

// Which prize is under the pointer (at the top) when the wheel has turned clockwise by `angle` degrees.
export function segmentAt(angle) {
  return Math.floor(wrapDegrees(-angle) / SEGMENT_DEGREES) % STOP_SEGMENTS.length;
}

// Where a wheel spinning at `speed` degrees per second settles when stopped at `angle` (it slows evenly over STOP_SLIDE).
export const settleAngle = (angle, speed) => angle + speed * STOP_SLIDE / 2;

export class StopWheel {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.spin = 0;                       // index of the current spin
    this.angle = rng() * 360;
    this.speed = STOP_SPEEDS[0];
    this.state = 'spinning';             // spinning -> sliding -> show -> (next spin | done)
    this.clock = 0;                      // seconds in the current state
    this.results = [];                   // { index, points, jackpot } per finished spin
    this.total = 0;
    this.done = false;
  }

  // The player taps: the wheel starts to settle. Returns false when it cannot be stopped right now.
  stop() {
    if (this.done || this.state !== 'spinning') return false;
    this.state = 'sliding';
    this.clock = 0;
    this.stoppedAt = this.angle;
    return true;
  }

  // Advances the wheel; returns the finished spin's result on the tick when the wheel comes to rest, else null.
  tick(dt) {
    if (this.done || !(dt > 0)) return null;
    this.clock += dt;
    if (this.state === 'spinning') {
      this.angle += this.speed * dt;
      if (this.clock >= STOP_TIMEOUT) this.stop();
      return null;
    }
    if (this.state === 'sliding') {
      const t = Math.min(1, this.clock / STOP_SLIDE);
      // Speed falls evenly to zero, so the distance covered is speed * t * (1 - t / 2) of the slide.
      this.angle = this.stoppedAt + this.speed * STOP_SLIDE * (t - t * t / 2);
      if (t < 1) return null;
      const index = segmentAt(this.angle);
      const prize = STOP_SEGMENTS[index];
      const result = { index, points: prize.points, jackpot: Boolean(prize.jackpot) };
      this.results.push(result);
      this.total += prize.points;
      this.state = 'show';
      this.clock = 0;
      return result;
    }
    if (this.state === 'show' && this.clock >= STOP_SHOW) {
      if (this.spin + 1 >= STOP_SPINS) { this.done = true; return null; }
      this.spin++;
      this.speed = STOP_SPEEDS[this.spin];
      this.state = 'spinning';
      this.clock = 0;
    }
    return null;
  }
}
