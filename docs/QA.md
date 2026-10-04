# QA Record

Date: 2026-10-04

## Latest: Dense Schools, Mystery Catches And Reel Gesture Guard

- User reported real-device zoom despite the earlier Chromium touch-emulation pass. That result did not prove iOS behavior.
- Only this fishing repository changed. Audio, round rules, storage module/key and sibling games remain unchanged.
- Separate 12 collectible species from 32 swimming instances: row populations 8/6/5/5/4/4, with fixed non-overlapping slots.
- Restore a landed instance to its vacated slot rather than the old opposite-neighbor placement.
- Rows 4/5 use black alpha-masked Canvas overlays. Color returns according to physical ascent, not elapsed waiting.
- Deep species names remain hidden until mostly revealed. Reset/respawn returns deep creatures to black.
- Stationary reel wrapper cancels non-passive touchstart/move/end/cancel and Safari gesture events,
  even when the reel button becomes disabled. Child artwork cannot intercept input; the button hitbox no longer scales.
- One touch activates once, compatibility events are suppressed, and holding does not reel. Header/dialog zoom is not globally disabled.
- npm run check: 28 unit tests passed and production build succeeded; the existing Phaser bundle-size warning remains.
- First focused Chromium tablet pass: 3 passed (gesture cancellation through landing, actual canvas black-to-color pixels, dense rows).
- First Windows WebKit attempt: 4 passed, 3 failed. One expected AudioContext but both browser constructors are absent here;
  two exhausted automation timeouts in slow software rendering (full row wrap and the four-species workflow).
- Touch tests now still run every input assertion without assuming Web Audio exists in an unsupported engine.
  Row tests observe the fish nearest a wrap instead of waiting for one particular turtle; WebKit input/render checks have a larger timeout.
- Full regression: 46 passed / 2 desktop touch skips in one run, covering Chromium desktop/tablet/phone and 6 selected WebKit cases.
- Final hardening routes disabled-reel touches directly to the stationary wrapper (pointer-events: none on the disabled button).
  Rechecked touch bursts, through-landing default cancellation and keyboard input: 10 passed / 2 desktop touch skips across all 4 projects.
- Rebuilt the final Pages bundle and reran its prefixed production preview: passed, twelve book entries,
  colored/moving canvas, no QA interface and no page/request errors. Temporary preview on 5194 stopped; dev server on 5193 remains.
- Inspected desktop/mobile/tablet/WebKit row screenshots and mystery/partial/full-reveal captures; controls stay clear of the deepest row.
- Evidence: test-results/dense-targeted/, test-results/webkit-reel/ (initial diagnostic run), test-results/dense-release/ (final run).
  Last disabled-button input coverage: test-results/disabled-reel-final/.
- Inspected actual frames near 0:23 and 1:03 of the [IAAPA demonstration](https://www.youtube.com/watch?v=wOiXknKSgqw),
  for horizontal schools and larger creatures lower down. No artwork/audio was copied. Mystery reveal follows the user's request.
- [WebKit issue 218015](https://bugs.webkit.org/show_bug.cgi?id=218015) is historical context for touch-action insufficiency,
  not confirmation of the exact cause on the user's device. Real iPad Safari rapid-tap/hold, speaker and Thai voice approval remain pending.

## GitHub Pages Publication

- User explicitly approved a public repository and publishing the game.
- Public repository: https://github.com/kanasit123-dotcom/tap-tap-fishing
- Live site: https://kanasit123-dotcom.github.io/tap-tap-fishing/
- First deployment commit: f8c184a. Actions run succeeded: https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37203396858
- Added a separate build:pages script with /tap-tap-fishing/ asset base; the local dev URL and gameplay code are unchanged by deployment configuration.
- Rechecked 22 unit tests and built successfully; the Actions runner also passed the unit checks and production build.
- Local prefixed production preview and live HTTPS site both passed npm run test:pages -- <url>?qa=1.
- Live browser smoke: HTTP 200, canvas has varied colors and moves, all twelve collection/artwork entries load, cast button works,
  QA interface is absent even with ?qa=1, and there are no page errors or HTTP error responses.
- Inspected the screenshot captured from the actual live site. Evidence: test-results/pages-sea.png and test-results/pages-book.png.
- Only dist is uploaded as the website. Source/artwork are intentionally public; credentials, node_modules and local test output are excluded.
- No matching access-token/private-key patterns were found in the publishable files before pushing.
- Remote publication branch is main. Local branch remains codex/fishing-prototype, tracking origin/main; use git push origin HEAD:main.
- Local preview process was stopped; the existing dev server on 5193 stays running.
- Saves are browser-local and separated by origin; localhost progress does not automatically transfer to the live site.
- Real iPad Safari speaker/Thai-voice validation remains pending. Public deployment does not imply hardware testing.

## Previous: Six Rows And New Artwork

- Updated only tap-tap-fishing. No sibling repositories, audio module, round model or persistence module were edited.
- Final npm run check: 22 unit tests passed and production build succeeded (existing Phaser bundle-size warning remains).
- Full browser run after game fixes: 29 passed, 1 desktop touch skip, 3 failures in the new row-spacing assertion.
  All three reported 349.5 versus 350 world pixels exactly at a wrap boundary; this is one physics integration step, not a visible collision.
  The assertion now allows at most 1 world pixel and separately requires over 100 pixels of clear horizontal gap.
- Focused rerun of the complete row test on desktop/tablet/phone: 3 passed.
  Together, the full run and focused rerun verify all 32 applicable browser cases; this was not a single all-green full run.
- Earlier targeted attempt caught a QA fixture race: the aiming line could swing during slow automated input.
  The DEV-only arranging fixture now holds a vertical aim until the real cast button is pressed; it does not simulate catching or scoring.
- Tested all four added creatures through actual Phaser collision, repeated reel taps, scoring, respawn, reload and collection persistence on all three browser projects.
- Canvas alpha/color sampling verifies the scene is nonblank; crop pixel checks verify each animal has opaque colored pixels and transparent corners.
- Inspected full-width, compact portrait/landscape, expanded book and newly collected animal screenshots.
- Corrected a visual issue found in the book: bitmap SVG viewBox letterboxing exposed neighboring atlas fragments.
  Explicit clipPath rectangles now isolate all twelve entries and reward images.
- Swimming rows retain direction/speed after wrapping; caught creatures return opposite their same-row neighbor.
- Deepest row shifted up to keep it clear of compact-screen controls. Creatures retain their natural aspect ratios.
- Production smoke: 12 book entries, artwork loads, cast works, QA interface absent, no page/request errors.
- Temporary preview on port 5194 was stopped; the original dev server on 5193 remains running.
- Evidence: test-results/depth-final/ (full), test-results/depth-rows-verified/ (focused), test-results/production-depth.png (production).
- Real iPad Safari, physical speaker output and Thai pronunciation still require human/device testing.
- No silhouette gameplay mechanic was added while the user's shadow comment awaits clarification. Idle animals have alpha 1;
  undiscovered book entries deliberately remain faint grayscale.

The records below describe the initial eight-species release, not the current catalog count.

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

- Chromium desktop/touch emulation plus selected Windows WebKit input/render checks. Real iPad/iPhone Safari not yet tested.
- Web Audio signal tests prove synthesis, not speaker output or hardware audio unlocking.
- Optional Thai speech depends on installed voices; no recorded voice or pronunciation approval.
- No offline install, two-player, upgrades or multiple levels yet.
- Production bundle includes Phaser and is over Vite's 500 kB warning threshold; build succeeds.
- Refresh starts a new trip. Persistent collection and best completed-trip scores are preserved.

Screenshots and traces are local in ignored `test-results/`; they are QA evidence, not shipped assets.
Use `npm run test:e2e` to regenerate. Do not run separate test processes into the same output directory.
Final full-run evidence: `test-results/release/`; last sound/reward evidence: `test-results/final-audio/`.

## Repository And Server

Local Git repository initialized separately on `codex/fishing-prototype`; the first implementation snapshot is recorded locally at delivery.
Public GitHub origin and Pages deployment are now configured with explicit user approval; see the publication record above.
Development server: http://127.0.0.1:5193/ (started hidden, no unrelated server terminated).
The temporary production smoke preview on 5194 is stopped after verification.
Original `game-lilly` was read-only and its `git status --short` remains empty.
