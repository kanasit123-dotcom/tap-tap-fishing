# QA Record

Date: 2026-10-04

## Latest: v0.8.1 — giant seal and turtle, trip-end book fix (deployed 2026-10-06)

- LIVE: commit 5dcff9b, run https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37429255762 (success). Live bundle
  `index-I_Nyzk_z.js` + `index-DMSSDtU0.css` equal the local Pages build; `sw.js` and both new sprites return 200;
  `npm run test:pages -- https://kanasit123-dotcom.github.io/tap-tap-fishing/`: passed, 57 entries, colored and moving canvas, offline reload ok, no errors.

- User report (iPhone): "choosing a rod or a boat in the settings hangs on that page, only a reload helps". Found and reproduced with a new test
  (it failed on desktop, tablet, phone and WebKit before the fix): opening the book from the trip-end dialog and closing it left every round
  paused for good (`resumeOnClose` was false after a finished trip), so "ออกเรืออีกครั้ง" stayed disabled. The same happened when the
  trip-end dialog was closed with Escape. Fix: closing any dialog always un-pauses; the book opened from the trip-end dialog returns to it (the
  wheel keeps its prize text and cannot be spun twice); choosing a look marks the button in place instead of redrawing the whole book;
  `FishingAudio.play` can no longer throw into game code. New e2e "looks keep answering" (desktop, tablet, phone and WebKit).
- Not reproduced before the test: one-player and two-player flows with all looks in WebKit and Chromium iPhone emulation, in dev and production builds.
- Giant seal (`boss-seal`) and giant turtle (`boss-turtle`) from `sheet-j-giants.png` (prompt N, SHA-256 in docs/ARTWORK.md): clean cutouts, 720x215
  and 720x283, in game on phone and tablet; 7 giants, 57 book entries.
- Full browser suite via snapshot (43 min, 121 tests): **118 passed, 3 skipped, 0 failed** (the skips are the real multi-touch and old desktop touch cases).
- `npm test`: 95 passed. The five-size trip-end dialog test runs 25-28 s on the phone project (limit was 30 s): its timeout is now 90 s.

## Previous: v0.8.0 — two players, stop-the-wheel stage, offline, fog horn, rare visitors, faster giants (deployed 2026-10-06)

- LIVE: commit 205ccf1, run https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37415639871 (success; CI ran `npm test` and `build:pages`).
  Live bundle `index-CmSBGZua.js` + `index-DMSSDtU0.css` equal the local Pages build; `sw.js`, the manifest and the new sprites return 200;
  `npm run test:pages -- https://kanasit123-dotcom.github.io/tap-tap-fishing/`: passed, 55 entries, colored and moving canvas, reload with the
  network cut starts and shows every picture, no errors. (The `sw.js` VERSION differs between the local and the CI build because Windows
  checks text files out with CRLF; each build only needs its own version to change when its files change.)

- User asked (2026-10-06): two players on one device (iPad and iPhone, co-op and race, bonus stages in turns), the stop-the-wheel bonus,
  offline use, the fog horn; and reported that some creatures (the lobster king...) were never seen and the giants swam too slowly.
- `npm test`: 94 passed (new: `tests/stopwheel.test.mjs`, `tests/match.test.mjs`, guest/boss-pace/horn tests in spawner.test.mjs, wheel
  stage in model.test.mjs, two-finger touch in input.test.mjs, bonus turn 0-2 in progress.test.mjs). The map-rate test now averages 6 seeds
  (one 25-minute run swings between 0.16 and 0.64 maps/min by chance).
- Full browser suite via snapshot (`npm run test:e2e:snapshot`, 37 min, 117 tests): **114 passed, 3 skipped, 0 failed**. The skips are the
  real multi-touch test on desktop and webkit (no touch screen) and the old desktop touch skips. New e2e: stop-the-wheel (three taps, a tap
  anywhere, idle spin stops itself), fog horn, two players (controls fit and do not overlap, boats, shared goal, both fish at once, sea tap by
  half, two fingers at once with real CDP multi-touch, waiting during a bonus stage, team/race results and the records stay untouched, dialog fits one
  screen at 390x664 / 375x560 / 844x390 / 1024x768).
- `npm run build:pages` writes `dist/sw.js` (79 files, 5.0 MB). Local production smoke (`npm run test:pages`) now also reloads with the network
  cut and checks the game and every picture: passed. Found on the way: `cache.match` needs `ignoreVary` (module scripts send an Origin header).
- Screenshots inspected on phone (390x664), tablet (810x1080) and phone on its side: wheel stage, two-player layout (boats, HUD, controls,
  waiting state, results), top bar on iPad portrait (the tools were cut off until the mode buttons were narrowed).
- Not verified on a real iPhone/iPad: two thumbs on the dock (button size and spacing), the two-player toasts, the offline install in Safari,
  wheel-stage timing feel, boss pace, how often a new creature visits.
- Fog horn picture and its sheet (prompt M) are still to come; the item is hidden in production until then.

## Previous: v0.7.0 — Cabinet Ideas 1/2/3/5 + ancient giants (deployed 2026-10-06)

- LIVE: commit 6719110, run https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37409246010 (success). Live bundle
  `index-DREDEn7Z.js` + `index-Bs6TdIvx.css` equal the local `npm run build:pages` output; both new sprites return 200;
  `npm run test:pages -- https://kanasit123-dotcom.github.io/tap-tap-fishing/?qa=1`: passed, 55 entries, colored and moving canvas, no errors.
- Not verified on a real iPhone/iPad: boss warning flash and shadow, tug feel and vibration, chest prize variety, ancient giant look and size.


- Previous release v0.6.1 (wheel dialog fit, 30 s battle, boss cadence, crank): commit 5e91923, run 37391291010, live smoke passed.
- New: boss warning layers (siren, flashing frame, shadow gliding below, boss held back 3.2 s), tug shake for heavy fish
  (reel ring/wheel only; the hit-area box is asserted unchanged), surprise chest prizes (30/40/60/100), ancient-giant catalog entries
  waiting for prompt L art.
- `npm test`: 74 passed. Full suite via snapshot (`test-results/r3-full/`): 81 passed, 2 skipped, 1 failed (phone boss test waited 8 s of
  wall time for a boss that needs 3.2 s of game time under heavy load); wait raised to 25 s, reran on desktop/tablet/phone: 3 passed.
- Tests fixed along the way (test bugs, not game bugs): the tug test clicked once more than the taps left; the boss test now picks a boss
  that is not already swimming (natural bosses arrive within 15-30 s) and no longer compares areas of slender giants.
- Screenshots inspected: orange flashing frame during the boss warning.
- Ancient giants delivered (prompt L, `sheet-h-ancient.png`, SHA-256 in docs/ARTWORK.md): cut with `python tools/sprites.py sheet-h-ancient`
  to `boss-helicoprion` 720x229 and `boss-dunkleosteus` 720x237, clean alpha, closed mouths, facing right. Checked in game on
  phone (390x664) and tablet (810x1080): crisp, mid-lane, right way round when swimming either direction, no console or 4xx errors
  (the swimming size is 215-282 px wide). Book now has 5 giants and 55 entries. The boss e2e test now picks from every boss with art.
- Full browser suite after the art arrived (`npm run test:e2e:snapshot`, 28 min): 81 passed, 2 skipped, 1 failed. The failure (phone boss
  test, the boss never entered within 25 s) was a real bug, not load: the boss waiting in the wings was kept in ONE slot, so a second
  warning (a natural boss arriving while another was pending) overwrote and lost the first. Fixed with a queue (`bossQueue` in scene.js);
  new e2e "two boss warnings at once both deliver their boss" fails on the old single slot (verified, timeout) and passes now.
  Re-run after the fix: boss/tug/chest/two-boss tests 12 passed on desktop, tablet and phone; boss test 3x on phone and tablet passed.
- `npm run check` passes (74 unit tests, build 1.31 MB JS); local production build smoke (`npm run test:pages`): 55 entries, canvas
  colored and moving, no errors.

## Previous: Feedback Round After v0.6.0 (2026-10-06, deployed in v0.6.1)

- User (iPhone): wheel dialog needed scrolling; wanted the cabinet's unlimited 30 s cannon battle; bosses too rare; crank slightly too
  easy (taps are fine).
- `npm test`: 72 passed (timed battle: reload, several balls, streak/sink points, 30+ shots, ends after the last ball, idle battle ends;
  bosses: 6-14 per 15 min, first 15-30 s, one at a time, nearly every 75 s trip meets one; crank 180 deg).
- Full suite via snapshot (`test-results/r2-full/`): 76 passed, 2 skipped, 0 failed (27 min). New e2e: the trip-end dialog at 390x664,
  375x560, 430x740, 844x390 and 1024x768 needs no scrolling, play-again stays in view before and after a spin; the pirate battle test
  fires 14+ shots, ends on the clock and shows the loot toast (a bug found by the test: the loot message only appeared when a hit ended it).
- Screenshots inspected: dialog at 390x664 and 844x390, wheel labels after shortening "ตะขอทอง" on the wheel.
- Not verified on a real iPhone: dialog height with Safari's toolbars, how hard the half-turn crank feels, boss cadence in play.

## Previous: v0.6.0 — Wheel, Looks, Day/Sunset/Night, Bosses, Crank Reeling (deployed 2026-10-06)

- Deployed at the user's request: commit 9bc2575, Pages run 37373626821 succeeded; live bundle = local Pages build
  (index-CXk9MCNM.js); boss/sunset/night images 200; live smoke passed (53 entries, no errors). Build 5.1 MB.
- Includes everything below (sunset/night art, bosses, crank reeling, snapshot runner).

- Prompts J/K delivered: sunset/night repaints keep the day lines (waterline/sand within 0.4%), bosses cut cleanly.
  Screenshots inspected: night (moon, glowing corals, lanterns) and sunset (golden rays) with a whale/kraken crossing.
- Crank reeling: unit tests (one pull per 120 deg either way, none for holding/wiggling/circling the hub, touch binding,
  cast button not crankable) + e2e on Chromium desktop (mouse drag) and tablet/phone (CDP touch circle): 1 + 6 pulls for two
  turns, wheel follows the finger, no page zoom, taps still finish the catch. WebKit cannot synthesize the circle here.
- `npm test`: 72 passed. Full suite via `npm run test:e2e:snapshot` (`test-results/crank-full/`): 73 passed, 2 skipped, 0 failed.
- Earlier full run with the J/K art (`jk-full2/`): 70 passed. A previous attempt (`jk-full/`) was corrupted by editing src during
  the run — the reason for the new snapshot runner.

## Previous: Lucky Wheel, Boat Looks, Day/Sunset/Night, Bosses (2026-10-05, not yet deployed)

- Art for sunset/night (prompt J) and the bosses (prompt K) is still pending: the sea uses a tint over the day painting, and
  bosses exist only as DEV emoji placeholders (production hides them; the spawner never sends a boss without art).
- `npm test`: 69 passed (new: wheel odds/prizes/next-trip powers, looks unlocking and sanitising, time-of-day cycle,
  boss timing — first >= 70 s, gaps >= 120 s, lane 3, alternating bosses, none in the rain or without art).
- New e2e: lucky wheel spin and payout + start power applied on the next trip + sunset after one trip; looks panel unlock and
  equip (bamboo rod, pennants, lanterns) + night/sunset scenes; boss warning, 30 taps, giants section in the book.
- Full Playwright run (`test-results/extras-full/`): 67 passed, 2 skipped, 3 failed — the all-creature test on three projects,
  caused by the test (the new "ตกแต่งเรือ" heading shares the zone-title class; boss entries are still emoji). Test updated;
  reran: tablet + phone passed (`extras-rerun2/`), desktop passed (`extras-rerun3/`).
- Screenshots inspected (phone): wheel after a spin, night tint with pennants, sunset tint with glowing lanterns, boss warning.

## Previous: v0.5.0 — Power-Ups And Pirate Battle (2026-10-05) (deployed)

- Deployed (user: "deploy ทีเดียวหลังทำเสร็จ"): commit e646e00, Pages Actions run 37304838992 succeeded; live bundle matches the
  local Pages build (index-jccIFepN.js); pirate/net/coin sprites 200; live smoke passed (50 entries, no errors).

- Includes the combo/Fever and effects round below. Sheet I checked (12 subjects, order, ships bow right, coin-emblem flags,
  no skulls) and cut cleanly.
- `npm test`: 64 passed (net scoop/taps/points/one charge, turbo 3 catches + faster drop, golden hook/spyglass timers paused with
  the game, map bonuses alternate pirate/rain, cannon one-ball rule, streak and sinking points, battle end, bonusTurn persistence).
- New e2e: power-ups (net scoops a neighbour with a mesh bag, turbo halves taps, spyglass reveals a grouper's name and colours,
  golden hook enlarges the hit box, HUD icons) and the pirate battle (banner, fire button, reel disabled, arcade clock paused,
  a hit raises the score, 10 balls then back to fishing, bonusTurn saved).
- Full Playwright run (`test-results/pirate-full/`): 57 passed, 2 skipped, 4 failed — all test expectations, not game bugs:
  the QA landing object gained `extras`, and in the all-creature run the spyglass (caught earlier) correctly named the shark.
  Tests updated; reran both on desktop/tablet/phone: 6 passed (`test-results/pirate-rerun/`).
- Screenshots inspected: pirate aim (cannon on the bow, crosshair on a galleon), hit (loot and coins), net bag, power-up icons.

## Previous: Combo/Fever And Catch Effects (2026-10-05, deployed in v0.5.0)

- `npm test`: 58 passed (new model tests: fever after 3 in a row, the starting catch not doubled, x2 during fever, ends after
  15 s; empty cast and old boot reset the combo; bottle x fever = x4; trip-score tests now sum real landing points).
- New e2e: three goldfish -> combo toast, coins fly and are cleaned up, FEVER banner, next clownfish scores 16 (x2).
- Full Playwright run (`test-results/fever-full/`): 55 passed, 2 desktop touch skips, 0 failed (24.7 min).
- Screenshot inspected (phone): FEVER banner with countdown, golden line and glowing hook.

## Previous: v0.4.1 — One Direction Per Row, Slightly Faster Swimming (deployed 2026-10-05)

- Deployed at the user's request: commit 8c45030, Pages Actions run 37274185113 succeeded; the live page serves the same bundle
  hash as the local Pages build (index-BLH23J3R.js) and the live smoke passed (46 entries, colored/moving canvas, no errors).

- Includes the one-direction-per-row change below. `SWIM_PACE` 1.12 with gaps divided by it.
- 50-minute spawner simulation, seed 9: pace 1.0 -> 1.12 gives mean on-screen speed 20.8 -> 23.0 world px/s and the same density
  (26.6 -> 26.5 creatures on screen; top row 4.2 both).
- `npm test`: 56 passed (new check: average group speed ratio to species speed x pace stays within 0.78-1.05).
- Full Playwright run (`test-results/pace-full/`): 52 passed, 2 desktop touch skips, 0 failed.

## Previous: One Swimming Direction Per Row (2026-10-05, deployed in v0.4.1)

- User report from the live v0.4.0: fish in the same row should never swim against each other (cabinet behaviour).
- Each lane now has one direction for the whole trip; neighbouring lanes alternate; the top lane's direction is random per trip.
  Vertical spread tightened so rows stay visually separate.
- New unit test: across 6 seeds every lane has exactly one direction, neighbours are opposite, both starting directions occur,
  and the treasure rain keeps per-lane directions; school spread + wander stays < 0.36 lane spacing from the lane centre.
  The e2e "creatures enter" test now also asserts one direction per lane and alternation on the live scene.
- `npm test`: 56 passed. Full Playwright run (`test-results/oneway-full/`): 52 passed, 2 desktop touch skips, 0 failed.
- Browser check on iPad emulation: lanes R/L/R/L/R/L/R, and 0 of 369 sampled creatures sat nearer another row than their own.
  Spawner simulation: ~27 creatures on screen, top row ~4.3 (unchanged density).

## Previous: v0.4.0 — Extra Species, Balance, Sharp Rendering (2026-10-05)

- Deployed at the user's request: commit afe02d2, Pages Actions run 37259027875 succeeded. Live smoke on
  https://kanasit123-dotcom.github.io/tap-tap-fishing/ passed (46 entries with decoded images, no errors); new sprites 200.

- Ships the sharp-rendering, balance and continuous-swing rounds below plus 12 extra species from prompt H (46 entries).
- Sheet H checked before cutting (order, facing right, true alpha); all 12 pieces cut clean, thin parts intact.
- `npm test`: 56 passed (stray share lowered to 0.15 so lanes keep > 60% own animals with the larger catalog).
- Full Playwright run (`test-results/extra-full/`): 50 passed, 2 skipped, 2 failed on time limits only — the desktop
  all-creature test now hooks 46 species (needed > 4 min) and the slow software WebKit "creatures enter" case hit 60 s.
  Limits raised to 8 min / 3 min; both reran and passed (`test-results/extra-rerun1/`, `extra-rerun2/`).
- Screenshot inspected: iPad sea with mackerel and damselfish, Moorish idols, batfish, floating bottle and pearl, manta and
  horseshoe-crab silhouettes.

## Previous: Balance, Middle-Water Treasure And Continuous Swing (2026-10-05, not yet deployed)

- Includes the sharp-rendering round below (also not deployed yet).
- User feedback: top row too dense and the same fish five in a row; treasure belongs in the middle rows; the hook should keep
  swinging from its previous angle after a catch.
- Measured with a 50-minute spawner simulation before/after: top-row creatures on screen 6.3 -> about 3.9 (total ~27);
  consecutive same-species groups in a lane 0% while another candidate exists; boots ~0.5/min; jackpots roughly every 6-10 min.
- New/updated tests: items only in lanes 2-4; same-species repeats < 3%; schools of different sizes; model test that the swing
  resumes at the cast angle (within 0.03 rad) and keeps its direction after a catch and after a miss.
- `npm test`: 56 passed. Full Playwright run (`test-results/balance-full/`): 52 passed, 2 desktop touch skips, 0 failed.
- Screenshots inspected: rebalanced iPad sea (chest floating at depth among silhouettes); hook at the far-left end of its swing,
  now drawn in front of the hull instead of disappearing behind it.

## Previous: Sharp Rendering, Calm Motion And More Random Arrivals (2026-10-05, not yet deployed)

- Trigger: the user's iPhone screenshot of v0.3.0 — fish looked jagged, blurry and shaky; arrival patterns too regular.
- Causes found: canvas rendered at CSS resolution on a DPR-3 phone; large sprites shrunk 5-6x per frame with cheap sampling;
  a constant tail-wag rotation; lanes fed from one side at one height with same-species runs.
- Fixes: canvas backing = CSS x min(2, dpr) (Phaser scale NONE + zoom 1/dpr, sized in `fitCanvas()`); mipmap-like fitted
  sprite/silhouette/boat textures; path-following pitch instead of wiggle; per-group side, depth, wander, loose spacing,
  strays and anti-repeat; seabed things at varied depth on the sand. Densities kept (~34 on screen); jackpots rarer.
- `npm run check`: 55 unit tests passed (new spawner tests: both sides with independent direction switches, depth spread
  > 0.12 lane spacing, strays only within the zone and < 40%, same-species repeats < 25%, same-side groups never overlap,
  jackpot rate below 0.25/min). Builds succeed.
- Full Playwright run (`test-results/sharp-full/`): 52 passed, 2 desktop touch skips, 0 failed. The full-bleed test now also
  asserts canvas backing pixels = CSS size x min(2, devicePixelRatio).
- Emulated iPhone 13 (DPR 3): canvas 780x1294 for 390x647 CSS (2x); screenshot inspected at native resolution — smooth
  edges, mixed species at different heights and directions. Local Pages preview smoke passed (34 entries, no errors).
- Not verified on a real iPhone/iPad yet: perceived sharpness at DPR 2 vs 3 and frame rate with the larger canvas.

## Previous: Semi-Realistic Artwork And Home-Screen Icon (v0.3.0, deployed 2026-10-05)

- Published as commit b346794; Pages Actions run 37249214080 succeeded (unit tests + build on the runner). Live checks on
  https://kanasit123-dotcom.github.io/tap-tap-fishing/: `npm run test:pages` passed (34 entries with decoded images, no emoji,
  colored/moving canvas, QA interface absent, no page/request errors); manifest, apple-touch icon, 512 icon, clownfish/boat/sea
  WebP all 200 with the right MIME types; the removed `assets/cove.png` is 404. Screenshot inspected: test-results/pages-sea.png.

- User delivered all 7 ChatGPT images. Checked before processing: names, sizes, true alpha on the creature/boat sheets, opaque
  seas, every animal facing right, no text; the visible glow is hidden RGB under transparent pixels (only ~0.5% of pixels are
  partially transparent, on subject edges). `tools/sprites.py` produced 34 creature sprites + boat + 2 seas (about 1.2 MB WebP);
  each sheet slot gave exactly one piece, and `art/preview/` showed thin parts intact (butterflyfish streamer, swordfish bill,
  ray tail, lobster antennae, squid tentacles, anglerfish lure). The boat anchors (red cross = holder tube, yellow line = hull
  boundary) were checked on `art/preview/boat.png`.
- Removed the cartoon atlases and all code/tests for them. New asset tests: every catalog entry has a sprite, every manifest
  file exists with the recorded WebP size and alpha, boat/background anchors are inside their images and ordered sensibly,
  every creature is readable at its smallest on-screen size (sardine and pocket watch were enlarged after this check).
- Layout bugs found by looking at the real art and fixed: (1) tall phones: sand sat ~57 world px below the treasure lane;
  the sand line now equals the seabed lane and a mirrored strip fills behind the controls; (2) wide screens: mirrored tiles
  put reef "pillars" mid-sea; the reef is now pinned to both edges and only open water is stretched (`BG_EDGE` 22%).
  `tests/layout.test.mjs` covers both (exact sand alignment, reef never stretched, painting choice per screen shape).
- Home-screen install set (earlier this day) regenerated from the new clownfish over the portrait sea; checked at 32/180/192/512
  and as maskable. `tests/icons.test.mjs` + `tests/pages-smoke.mjs` check manifest, icon sizes/MIME and head tags.
- `npm run check`: 54 unit tests passed; normal and Pages builds succeed (dist 3.6 MB; existing Phaser bundle-size warning).
- Full Playwright run (`test-results/new-art-full/`): 52 passed, 2 desktop touch skips, 0 failed across desktop, tablet, phone
  and the selected WebKit cases. It includes: all 34 creatures hooked with the real hook, reeled, landed and listed in the
  zoned book; the book's 34 `<img>` all decoded (no emoji, no broken images); mystery silhouette -> revealed real artwork;
  treasure rain with the new treasures; layout fit and sand/controls alignment on six viewport sizes.
- Local production smoke on a `/tap-tap-fishing/` preview passed: 34 book entries with decoded images, manifest and icons 200,
  colored/moving canvas, no page/request errors. Inspected screenshots: iPad/phone/desktop/landscape-phone sea, mystery catch
  at 0% and mid reveal, the book. The temporary preview on 5194 was stopped.
- Not verified: how the new art and boat size feel on a real iPad (hit boxes against large silhouettes, readability of the
  smallest creatures), real-device sound, the Add-to-Home-Screen icon on iOS, and the pocket-watch/map balance in real play.

## Previous: Living Sea, Special Items And Synthesised Sound (v0.2.0, deployed 2026-10-05)

- Published as commit ab5e4cc; Pages Actions run 37239154580 succeeded (unit tests + build on the runner).
  Live smoke on https://kanasit123-dotcom.github.io/tap-tap-fishing/?qa=1 passed: HTTP 200, 12 book entries with artwork,
  no emoji placeholders, music button, colored/moving canvas, QA interface absent, no page/request errors.
  Screenshot inspected: test-results/pages-sea.png (new boat/rod, lanes down to the controls).

- Only this repository changed. Storage key `tap-tap-fishing-v1` and the 12 original collection IDs are unchanged;
  old saves load with the new entries at zero, plus `music` (default on) and `maps` (0-3).
- `npm run check`: 50 unit tests passed (model, spawner statistics, layout, catalog/assets, progress, audio with a fake
  Web Audio context); normal and Pages builds succeed (existing Phaser bundle-size warning remains).
- Full Playwright run (`test-results/new-sea-full/`): 51 passed, 2 desktop touch skips, 1 failure — the pocket-watch
  assertion compared wall-clock time on the slower tablet run. The test now compares against elapsed game time and passed
  on desktop/tablet/phone (`test-results/new-sea-watch/`). After moving the treasure-rain banner into the status label,
  full-bleed, compact-fit and special-item tests passed again on all three Chromium projects (`test-results/new-sea-final/`).
- Earlier device run (`test-results/new-sea-devices/`) exposed two real issues, both fixed and re-verified:
  1. iPad rotation: Phaser stored the rotated container size without resizing the canvas (canvas stayed 768x944 inside
     1024x688). `measure()` now refreshes the scale manager when canvas and container differ.
  2. Page reloads caused by editing `src/` while Playwright used the dev server create false failures — don't edit during runs.
- WebKit (Windows port) runs the selected input/render cases including "creatures enter …", which now waits on game time
  because software rendering advances the game slower than the wall clock. It still has no Web Audio here.
- Production smoke on a local `/tap-tap-fishing/` preview: 12 book entries (only creatures with artwork), no emoji
  placeholders, music button present, colored/moving canvas, no page/request errors.
- The ChatGPT art pipeline was verified with synthetic sheets (transparent and flat-colour backgrounds) and with a
  synthetic boat + portrait/landscape backgrounds inside the real game (anchoring, waterline/sand alignment, mirrored tiles,
  submerged hull tint); the synthetic files were then removed. Real artwork has not arrived yet.
- Not verified: real iPad/iPhone sound and music on hardware (iOS unlock/rebuild path is unit-tested only), how the
  synthesised music/gulls feel to the family, and spawn balance in real play (map frequency, treasure-rain length).

## Previous: Dense Schools, Mystery Catches And Reel Gesture Guard

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
