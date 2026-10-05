// Turning a finger (or a held mouse button) around the reel like a real crank: every CRANK_STEP degrees (half a
// turn) of steady turning counts as one reel pull. Holding still never pulls; wiggling back and forth restarts the turn.
export const CRANK_STEP = 180;

export function createCrank({ step = CRANK_STEP, deadZone = 0.22 } = {}) {
  let center = null;
  let radius = 1;
  let last = null;
  let turned = 0;     // degrees turned in the current direction since the last step
  let direction = 0;
  return {
    begin(point, box) {
      center = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      radius = Math.max(1, Math.min(box.width, box.height) / 2);
      last = this.angle(point);
      turned = 0;
      direction = 0;
    },
    angle(point) {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      // Too close to the hub to tell which way the finger is turning.
      if (Math.hypot(dx, dy) < radius * deadZone) return null;
      return Math.atan2(dy, dx) * 180 / Math.PI;
    },
    // Returns { delta, steps }: degrees turned since the last move and how many pulls that completed.
    move(point) {
      if (!center) return { delta: 0, steps: 0 };
      const angle = this.angle(point);
      if (angle === null) return { delta: 0, steps: 0 };
      if (last === null) { last = angle; return { delta: 0, steps: 0 }; }
      let delta = angle - last;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      last = angle;
      const sign = Math.sign(delta);
      if (sign && sign !== direction) { direction = sign; turned = 0; }
      turned += Math.abs(delta);
      let steps = 0;
      while (turned >= step - 1e-6) { turned -= step; steps++; }
      return { delta, steps };
    },
    end() { center = null; last = null; turned = 0; direction = 0; },
  };
}

// Safari can still double-tap zoom transformed/disabled controls despite touch-action.
// Keep the touch guard on a stationary parent, including the final tap after landing.
// activate(source) runs once per tap ('tap') or per completed crank step ('crank');
// onRotate(degrees) follows the finger so the wheel can turn with it.
export function bindTapControl(button, activate, surface = button, { onRotate } = {}) {
  let lastTouch = -Infinity;
  const crank = createCrank();
  const cancel = (event) => { if (event.cancelable) event.preventDefault(); };
  // Only controls that ask for rotation (the reel) can be cranked; the cast button stays tap-only.
  const box = () => (onRotate && button.getBoundingClientRect ? button.getBoundingClientRect() : null);
  const turn = (point) => {
    const { delta, steps } = crank.move(point);
    if (delta && onRotate) onRotate(delta);
    for (let i = 0; i < steps && !button.disabled; i++) activate('crank');
  };
  surface.addEventListener('touchstart', (event) => {
    cancel(event);
    lastTouch = performance.now();
    if (event.touches.length !== 1 || button.disabled) return;
    activate('tap');
    const rect = box();
    const t = event.touches[0];
    if (rect && t) crank.begin({ x: t.clientX, y: t.clientY }, rect);
  }, { passive: false });
  surface.addEventListener('touchmove', (event) => {
    cancel(event);
    const t = event.touches?.[0];
    if (t && event.touches.length === 1 && !button.disabled) turn({ x: t.clientX, y: t.clientY });
  }, { passive: false });
  for (const type of ['touchend', 'touchcancel']) surface.addEventListener(type, (event) => { cancel(event); crank.end(); }, { passive: false });
  for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) {
    surface.addEventListener(type, cancel, { passive: false });
  }
  button.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' || event.button !== 0 || button.disabled) return;
    cancel(event);
    if (event.pointerType === 'mouse' && performance.now() - lastTouch < 700) return;
    activate('tap');
    const rect = box();
    if (rect && event.pointerType === 'mouse') crank.begin({ x: event.clientX, y: event.clientY }, rect);
  });
  // Mouse cranking: drag around the wheel with the button held.
  const target = onRotate && typeof window !== 'undefined' ? window : null;
  target?.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' && event.buttons & 1 && !button.disabled) turn({ x: event.clientX, y: event.clientY });
  });
  target?.addEventListener('pointerup', (event) => { if (event.pointerType === 'mouse') crank.end(); });
  button.addEventListener('click', (event) => {
    cancel(event);
    if (event.detail === 0 && !button.disabled && performance.now() - lastTouch >= 700) activate('tap');
  });
  button.addEventListener('keydown', (event) => {
    if (event.repeat && (event.key === ' ' || event.key === 'Enter')) cancel(event);
  });
}
