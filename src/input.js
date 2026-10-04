// Safari can still double-tap zoom transformed/disabled controls despite touch-action.
// Keep the touch guard on a stationary parent, including the final tap after landing.
export function bindTapControl(button, activate, surface = button) {
  let lastTouch = -Infinity;
  const cancel = (event) => { if (event.cancelable) event.preventDefault(); };
  surface.addEventListener('touchstart', (event) => {
    cancel(event);
    lastTouch = performance.now();
    if (event.touches.length === 1 && !button.disabled) activate();
  }, { passive: false });
  for (const type of ['touchmove', 'touchend', 'touchcancel', 'gesturestart', 'gesturechange', 'gestureend', 'dblclick']) {
    surface.addEventListener(type, cancel, { passive: false });
  }
  button.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' || event.button !== 0 || button.disabled) return;
    cancel(event);
    if (event.pointerType === 'mouse' && performance.now() - lastTouch < 700) return;
    activate();
  });
  button.addEventListener('click', (event) => {
    cancel(event);
    if (event.detail === 0 && !button.disabled && performance.now() - lastTouch >= 700) activate();
  });
  button.addEventListener('keydown', (event) => {
    if (event.repeat && (event.key === ' ' || event.key === 'Enter')) cancel(event);
  });
}
