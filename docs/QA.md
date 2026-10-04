# QA Record

Date: 2026-10-04

## Automated Checks

- Final `npm run check`: 20 asset/audio/model/storage unit tests passed and production build succeeded.
- First full browser run: 14 passed, 1 desktop-only touch skip, 3 failures.
- Failures found a genuine game issue: top-row fish could overlap the resting hook, yielding no reel distance.
  Fixed resting line length and first lane, keeping the original assertion that tapping must move the hook.
- Camera layout changed from a fitted portrait canvas to a resized full-width canvas; fixed zoom centering after inspecting screenshots.
- Focused rerun after fixes: scene pixels/motion, real collision/reeling, Web Audio signal/mute: 3 passed.
- Full desktop/tablet/phone rerun after camera, distance, status and pause-restart fixes: 26 passed, 1 skipped (3.3 minutes).
- The skip is the touch-only test on desktop; the same test passed in tablet and phone projects.
- Final changes schedule the first sound even while gesture-triggered AudioContext resume is pending, and use neutral wording for sea creatures/treasure.
- Rerun sound, touch and eight-catch reward flows after those final changes: 8 passed, 1 desktop touch skip (1.5 minutes).
- Production smoke after final build: cast works, one canvas, collection has eight entries, no page errors; dev arranging interface is absent.
- Production dependencies: `npm audit --omit=dev` reported zero vulnerabilities at delivery.
- Inspected final screenshots in portrait/landscape and desktop; text status moved above the cast control or to the side on short landscape, clear of deep targets.
- Restart from pause explicitly resumes Phaser tweens as well as physics; browser tests check landed fish respawn after starting a new mode/round.

## Coverage

- Hook movement and locking direction during cast; misses return with no score penalty.
- Catch only during casting, only known species, once per hook.
- No reel movement from waiting or holding; accepted individual taps shorten the line.
- Points and collection only after landing; each landing callback and trip completion happens once.
- Eight relaxed catches complete a trip; arcade expiry allows an already-hooked fish to finish.
- Pause freezes line and clock; mute stops audio and does not change round state.
- Isolated storage, bad-save recovery, blocked-storage recovery and schema validation.
- Browser workflow uses actual pointer/touch controls and Phaser collision, not direct catch/score assignment.
- Sprite raster/background loading, nonblank canvas pixel sampling, animation, screenshots, viewport fit.
- Touch bursts do not double-count, zoom, or select text; Web Audio unlocks from a gesture.
- Compact fit captures: 375x667, 390x844, 768x1024, 1024x768 and 844x390, plus desktop 1440x900.

## Limits

- Chromium desktop and touch-emulated tablet/phone only. Real iPad/iPhone Safari not yet tested.
- Web Audio signal tests prove synthesis, not speaker output or hardware audio unlocking.
- Optional Thai speech depends on installed voices; no recorded voice or pronunciation approval.
- No offline install, two-player, upgrades, multiple levels or public deployment yet.
- Production bundle includes Phaser and is over Vite's 500 kB warning threshold; build succeeds.
- Refresh starts a new trip. Persistent collection and best completed-trip scores are preserved.

Screenshots and traces are local in ignored `test-results/`; they are QA evidence, not shipped assets.
Use `npm run test:e2e` to regenerate. Do not run separate test processes into the same output directory.
Final full-run evidence: `test-results/release/`; last sound/reward evidence: `test-results/final-audio/`.

## Repository And Server

Local Git repository initialized separately on `codex/fishing-prototype`; the first implementation snapshot is recorded locally at delivery.
No GitHub remote or deployment was created. User visibility choice (Public/Private) is still pending.
Development server: http://127.0.0.1:5193/ (started hidden, no unrelated server terminated).
The temporary production smoke preview on 5194 is stopped after verification.
Original `game-lilly` was read-only and its `git status --short` remains empty.
