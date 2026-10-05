# AI Handoff: Tap Tap Fishing

Date: 2026-10-04. New repository for the user's arcade-fishing concept, separate from older games.
Path: `C:/Users/KANASIT/Documents/Codex/tap-tap-fishing`
Initial working branch: `codex/fishing-prototype`.

Delivery status: playable version 0.1.0. The user approved creating a public repository and publishing GitHub Pages.
Public origin: https://github.com/kanasit123-dotcom/tap-tap-fishing
Pages address: https://kanasit123-dotcom.github.io/tap-tap-fishing/
Published and verified online: first Actions deployment succeeded and the live HTTPS browser smoke test passed.
The deployment smoke checked colored/moving canvas, all twelve book entries, casting, no exposed QA interface and no request/page errors.
Check docs/QA.md and the latest Actions run before assuming future pushes are live.
Dev server running locally on port 5193.
Latest update: living sea (irregular spawner, screen-filling lanes, special items, synthesized sound) — see the section below; earlier: denser 32-instance schools, deep mystery silhouettes and a stationary Safari reel gesture guard.
Latest QA: see docs/QA.md for this update's final checks and real-device gaps.
28 unit checks + normal/Pages builds; full regression 46 passed / 2 desktop touch skips,
then final disabled-reel routing coverage 10 passed / 2 desktop touch skips. Prefixed production smoke passed.

## Living Sea Update (2026-10-04, Claude Code) — v0.2.0, deployed 2026-10-05

Deployed at the user's request: commit ab5e4cc, Actions run https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37239154580 (success);
live smoke `npm run test:pages -- https://kanasit123-dotcom.github.io/tap-tap-fishing/?qa=1` passed (12 entries, no emoji, moving canvas, no errors).
That deployment still showed the cartoon art for the 12 original creatures. The semi-realistic art below is processed locally and not yet deployed.

User request (Thai): more/better creature, item, boat and rod art in a slightly more realistic style; fish should
not arrive on a uniform beat like now; scene/casting/reel sounds; lane spacing that fills the screen; check other gaps.
Decisions the user made: images come from **ChatGPT** (transparent PNG); **redraw all** creatures semi-realistically;
special items **with effects + bonus stage**; **sea ambience + soft music** with its own toggle.

- `src/spawner.js` (pure, seeded in tests): per-lane exponential waits that only count once the entrance is clear,
  calm/normal/rush waves, school sizes/speeds per group, lane direction flips only while empty, speed cap so groups
  never overtake, cooldowns for specials and a shared rare cooldown for jackpots. Odds always come from the full
  catalog; a creature without artwork leaves its slot empty (so pre-art production is not a parade of chests).
- `src/layout.js`: lanes from WATERLINE+78 to the top of the cast/reel controls (`controller.dockTop()`), creature scale
  follows lane spacing, hook floor/walls follow the visible sea. Background is scaled uniformly, waterline and sand aligned,
  mirrored sideways when needed; the painting with the fewest repeats is chosen per screen.
- `src/species.js`: 34 entries in 7 lanes (seabed = lane 6). The 12 original IDs are unchanged (saved collections still match). Kinds: animal / item / junk; effects: double (bottle), time (watch, arcade only),
  map (4 pieces → 20 s treasure rain). Jackpots: golden lobster king, crown. Mystery silhouettes: animals in lanes ≥ 4.
- `src/model.js`: `setBounds`, rod-tip origin (240,74) with rest 90, per-species taps (no depth bonus), bonus clock pauses
  arcade time and halves taps, rain catches don't count towards GOAL, completion waits for the rain to end. Map pieces
  persist in progress (`maps`), as does `music`.
- `src/audio.js`: all synthesised; buses sfx/ambient/music; scheduler every 50 ms (swells, bubbles, gulls, music, line
  ratchet, struggle splashes). Unlock on pointerup/touchend/click/keydown, `navigator.audioSession='playback'`,
  rebuild after hidden page or stalled clock (same approach as little-exam-adventure). Dialogs duck sea and music.
- `src/scene.js`: creatures created/destroyed by the spawner (`uid`, `born` in QA snapshot), motions per species,
  silhouettes + glints, splash/coin effects, bonus glow, code-drawn bending rod with turning reel, steel hook + sinker,
  boat image path (needs manifest `holder` + `waterline`) with baked submerged tint. Zero-size canvas guard.
- `src/main.js`: music button, map/x2/bonus HUD, toasts, zoned book, arcade 10-second ticks, QA `release()`,
  `setMaps(n)`, `scene()`, `?seed=N`. **Fix:** Phaser kept the old canvas size after iPad rotation (its resize check
  stored the new parent size without refreshing) — `measure()` now forces `scale.refresh()` when canvas and container differ.
- Art pipeline: prompts in `docs/ART-PROMPTS.md` (7 images), `python tools/sprites.py` cuts `art/incoming/` into
  `public/assets/sprites/*.webp` + backgrounds and rewrites `src/art-manifest.js`. Verified with synthetic sheets
  (transparent and flat-colour keyed, de-spill) and a synthetic boat/backgrounds run in the real game, then reverted.
- **Roadmap agreed 2026-10-05 (user: "ดีทุกข้อ ทำทีละอย่าง"):** (1) effects + combo/Fever — done, below; (2) power-up items
  net / turbo reel / golden hook / spyglass and (3) the pirate-ship mini-game after 4 map pieces — both wait for prompt I
  (`sheet-f-pirate.png`, already in docs/ART-PROMPTS.md and `SHEETS`); then boss fish, lucky wheel at trip end, unlockable boat/hook
  skins from book zones, day/sunset/night. Power-up and pirate design notes are under prompt I in ART-PROMPTS.md.
  When sheet I arrives, `tests/assets.test.mjs` must allow the non-catalog prop ids (pirate ships, cannon, coin...).
- **v0.5.0 LIVE (2026-10-05):** commit e646e00, run https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37304838992 —
  Fever/effects, power-ups, pirate battle. Still to do from the agreed roadmap: boss fish event, lucky wheel at trip end,
  unlockable boat/hook looks from book zones, day/sunset/night (the last needs 2 more background images).
- **Power-ups + pirate battle (2026-10-05, from prompt I `sheet-f-pirate.png`):**
  - Catalog items (book zone "treasure"): `net` (lane 2) -> `netCharges`; the next catch also scoops up to 2 creatures within
    80x60 world px of the hook (taps = the toughest one; all recorded, all count for the trip). `turbo-reel` (lane 2) -> next 3 catches
    half taps and the line drops 1.6x faster. `gold-hook` (lane 3) -> 20 s, hook body 1.9x1.7 and the golden hook picture.
    `spyglass` (lane 4) -> 20 s, deep silhouettes show their colours and names. HUD strip `#powers` under the score.
  - Completed maps alternate (persisted `progress.bonusTurn`): even -> pirate battle, odd -> treasure rain. Battle = round phase
    `pirate` after the celebration: cannon (prop sprite) on our bow, crosshair swings with `round.angle`, the cast button becomes
    "ยิงปืนใหญ่", 10 balls, one in flight at a time; `src/pirate.js` (`PirateBattle`) sails small/medium/large ships (1/2/3 hits)
    along the horizon in one direction, ball flies 0.75 s, hit = rock + loot drop + coins; a ship out of hits sails away fast.
    Points (`PIRATE_HIT`, `PIRATE_DEFEAT`, streak x1.5/x2) via `round.fire()` / `round.resolveShot()`. Arcade clock pauses.
    No skulls, nobody hurt, nothing sinks.
  - Prop sprites (`PROPS` in species.js) are art only, not in the book. QA: `arrange(id, extras)`, `setBonusTurn`, `setPower`,
    `freezeShips`, `aimAt(x)`.
- **Effects + Fever (2026-10-05):** `FishingRound.combo/fever`; 3 catches in a row without an empty cast
  (an old boot also breaks it) start 15 s FEVER (`COMBO_FOR_FEVER`, `FEVER_SECONDS`), doubling catches and stacking with the bottle
  (x4). HUD fever banner, golden line + hook glow, faster music, combo/fever/coins sounds. DOM gold coins fly from the catch to the
  score box (`FishingApp.flyCoins`) which bumps; camera shake + flash for jackpots / >= 80 points, light shake >= 40; sparkle trail on
  rare or >= 45-point creatures (capped at 40 sparkles); ripple where the line meets the water on cast. Reduced-motion skips shake
  and flying coins. QA snapshot exposes combo, fever and the last landing.
- **v0.4.1 LIVE (2026-10-05):** commit 8c45030, run https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37274185113 —
  one direction per row + swim pace 1.12; live smoke passed.
- **Swim pace (2026-10-05):** user found the fish "a tiny bit slow". `SWIM_PACE = 1.12` in `src/spawner.js` multiplies every group's
  speed and divides `LANE_GAPS`, so density is unchanged (~27 on screen) while the average on-screen speed rose about 11% (20.8 -> 23.0).
  Change that one number to tune the pace; note groups behind a slower group are capped, so effective speeds average ~0.85 of nominal.
- **One direction per lane (2026-10-05, after v0.4.0; user: in the cabinet a row never has fish swimming against each other):**
  `Spawner.dir` is fixed for the whole trip, neighbouring lanes alternate, and the top lane's direction is random per trip.
  Strays and treasure-rain items follow the lane they are in. Gaps back to one-way values `[4.25, 4.25, 3.8, 4.2, 5, 5.8, 5]`
  (density unchanged, ~27 on screen). Vertical spread tightened (depth ±0.14, wander 0.03-0.08, members ±0.12 of the lane spacing)
  so a creature never sits nearer a neighbouring (opposite-direction) row than its own; checked 0 of 369 samples in the browser.
  This supersedes the "each group picks its own side" rule of the sharpness round.
- **v0.4.0 LIVE (2026-10-05):** commit afe02d2, Actions run https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37259027875,
  live smoke passed (46 entries). Contains the sharpness, balance/continuous-swing and extra-species rounds below.
- **Extra species (prompt H, 2026-10-05):** 12 sprites cut from `sheet-e-extra.png` and added to the catalog: lane 0 mackerel (school),
  yellow tang, damselfish; lane 1 Moorish idol; lane 2 cuttlefish (glide), batfish; lane 3 barracuda, dolphin (fast, cooldown 30 s);
  lane 5 manta (glide), whale shark (90 pts, cooldown 40 s); seabed hermit crab, horseshoe crab. Book: 46 entries. With more species per
  lane `STRAY_SHARE` went down to 0.15 so lanes keep >60% of their own animals. Deployed together with the balance and sharpness rounds.
- **Balance round (2026-10-05, user feedback after playing: top row too dense, same fish five in a row, treasure should float in
  the middle like the cabinet, hook angle should continue after a catch):**
  - Items moved off the seabed into the middle water with a floating motion: bottle/coins lane 2, pearl/map/watch lane 3,
    chest/crown lane 4 (still visible among the deep silhouettes). Seabed: crab, starfish, the lobster-king jackpot, old boot
    (weight 4, cooldown 35 s).
  - Smaller groups (most 1-2, sardines 3-4, tuna 2-3); the species that just arrived in a lane is excluded from the next pick,
    the one before weighted 0.4; strays from neighbouring lanes 0.2. Gaps per side `[8.5, 8.5, 7.6, 8.4, 10, 11.6, 10]` give about
    4/4.5/5/4/3/2.5/5 creatures on screen per lane (~27 total). Jackpots: crown 0.8, lobster 0.35, shared cooldown 60 s.
  - `FishingRound.swingTime` only advances while aiming, so the hook resumes swinging from its cast angle in the same direction.
  - Line, hook and a hooked catch are drawn in front of the boat (they used to disappear behind the hull at the left end of the
    swing); the landed catch drops behind the gunwale into the boat.
  - Prompt H (`sheet-e-extra.png`, 12 more species) added to docs/ART-PROMPTS.md and to `SHEETS` in tools/sprites.py; their catalog
    entries are to be added when the user delivers the sheet.
- **Sharpness and randomness (2026-10-05, after the user's iPhone screenshot: fish "แตก มัว สั่น", patterns too regular):**
  - Cause 1: Phaser RESIZE mode rendered the canvas at CSS size, so a DPR-3 iPhone blew it up 3x. Now scale mode NONE with
    `zoom: 1/dpr`; `FishingApp.fitCanvas()` sizes the backing store to CSS x dpr (capped at 2 for speed) on every measure
    (this also replaces the earlier iPad-rotation refresh). `view.zoom` is canvas px per world unit, `view.dpr` is exposed in QA.
  - Cause 2: 300-470 px sprites were drawn at ~50-70 canvas px with cheap bilinear sampling (jagged, shimmering).
    `scene.fitted(key, displayWidth)` makes mipmap-like copies (repeated halving, imageSmoothingQuality high) bucketed by 16 px;
    creatures (`dress()`), silhouettes (`silhouette(key)`) and the boat (`layoutBoat()`) use them and are refitted on relayout.
  - Cause 3: a constant tail-wag rotation looked like shaking. Swimmers now only pitch along their actual path (smoothed);
    jellyfish/seahorse/items keep gentle explicit rocking.
  - Randomness: each group picks its own side (committed until that entrance is clear, so sides are independent), its own depth
    inside the band (±0.3 lane spacing) and a slow shared wander; schools are tight, other groups loose with uneven spacing and
    ±3% member speeds; neighbouring lanes' animals stray in (`STRAY_SHARE` 0.15, same zone only); the species that just arrived
    in a lane is less likely next (`REPEAT_SHARE` 0.3); seabed things sit 0-0.14 spacing into the sand, nearer drawn in front.
    Gaps doubled (`LANE_GAPS`) because both sides feed each lane (~34 creatures on screen, like before); crown/lobster-king
    weights lowered (about one jackpot per 10 minutes).
- **Deployed as v0.3.0 (2026-10-05, at the user's request):** commit b346794, Actions run https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37249214080 (success); live smoke passed
  (34 book entries with decoded images, manifest and icons 200, old `cove.png` 404, no errors); live screenshot inspected.
- **Artwork delivered and integrated (2026-10-05):** the user's 7 ChatGPT images (`art/incoming/`, git-ignored) were cut
  into 34 creature sprites + boat + two seas (`public/assets/`, ~1.2 MB WebP). Every sheet slot produced exactly one piece; thin
  parts were inspected in `art/preview/`. The cartoon atlases, `legacy` catalog fields, the atlas code paths in `scene.js`/`main.js`
  and the old hash tests were removed (Git history `ab5e4cc` has them). Sizes retuned: sardine 48, pocket watch 48.
- Boat: image scaled to `BOAT_WIDTH` 180 world px, holder tube at x=204, waterline on the surface; `rodButt` follows the holder.
  Anchors are `ANCHORS` in `tools/sprites.py` (holder (1350,462) and hull boundary y=706 on `boat.png`).
- Sea backgrounds: sand line = seabed lane exactly; narrow screens crop the centred painting, wide screens pin reef to both
  edges (`BG_EDGE` 22%) and stretch the water between; a vertically mirrored copy fills the strip behind the controls; the painting
  with the least distortion is chosen. This fixed (a) sand lower than the treasure lane on tall phones and (b) mirrored reef
  "pillars" in the middle of wide screens that the first approach produced.
- Icon: `tools/make_icon.py` now uses the new clownfish and the portrait sea as the backdrop.

- **Home-screen icon (2026-10-05, deployed in v0.3.0):** same install set as the sibling games —
  `public/manifest.webmanifest` (standalone, short name อ่าวสมบัติ), `public/icons/icon-{32,180,192,512}.png` +
  `icon-maskable-512.png`, favicon/apple-touch-icon/`apple-mobile-web-app-*` tags in `index.html` (absolute `/icons/...` paths;
  Vite adds the Pages base, verified in `dist/index.html`). Generated by `python tools/make_icon.py` (clownfish approaching a
  hook over the sea painting; uses `public/assets/sprites/clownfish.webp` and `sea-portrait.webp`).
  `tests/icons.test.mjs` checks sizes/manifest/head tags; `tests/pages-smoke.mjs` fetches the manifest and every icon (200, image/png).
  No service worker/offline install (still not included).

Next: playtest on a real iPad (sizes of the new art, hook hit boxes against the large silhouettes, sound), then tune `size`,
`speed` and `weight` in `src/species.js`. If any picture is regenerated, rerun `tools/sprites.py` and recheck `ANCHORS`.

## Agreed Interaction

Watch the swinging hook, tap to cast, catch a creature passing in a depth lane,
then **tap tap tap on the reel**. The user chose repeated taps, not holding or a circular swipe.
Large visual wheel feedback and visible catch movement matter more than complex difficulty systems.
New neutral brand: อ่าวสมบัติ / Tap Tap Fishing. Do not reuse the Treasure Cove name as our title.

## Implemented

Phaser 3.90.0 + Vite + vanilla JS/DOM. Twelve sprite species across six lanes, original raster art,
real Arcade Physics overlap, deterministic round state machine, per-tap reeling, landing-only scoring,
completion reward, collection, separate best scores, 90-second arcade and untimed relaxed modes,
pause/resume, sound toggle, mode switch confirmation and isolated validated localStorage.
Optional Thai narration uses the device's Thai voice; it is not an MP3 engine or a reviewed voice pack.
No code, voices, progress or artwork was imported from sibling repositories.

## Depth And Artwork Update

- Original eight collection IDs, point values, storage key and goal of eight catches per trip stay unchanged.
- Added seal, shark, anglerfish and giant squid. The pufferfish was already present and remains in the middle rows.
- Separate collectible species from swimming instances: SCHOOLS contains 32 fish, with 8/6/5/5/4/4 per row.
- Common speed/direction within a row, 700-world-pixel loop and fixed slot spacing.
- Wrapped fish regain velocity after Phaser Body.reset; landed fish restore their vacated slot relative to an active row neighbor.
- Source rectangles in species.js replace the old fixed frame grid to avoid neighboring fragments and transparent padding.
- Preserve each creature's aspect ratio and vertical row clearance when changing sizes.
- Book/reward SVGs display actual bitmap cutouts, with explicit clipPath rectangles. A viewBox alone is not sufficient.
- New asset: public/assets/deep-creatures.png; actual output is 1254x1254, not the requested 1024x1024.
- User clarified that the deepest animals should be mysteries. Rows 4/5 are black silhouettes, with gradual color reveal during ascent.
- Canvas does not support sprite tint: source-in alpha-masked Canvas textures overlay the existing original artwork.
- Keep shadow position/size/flip/depth/alpha synchronized through pause, landing, reset and respawn.
- Deep catch names are hidden until mostly revealed. Collection artwork and stable species IDs remain unchanged.
- src/input.js uses non-passive touch/gesture cancellation on the stationary reel wrapper, including disabled/landing taps.
  Touch activates on touchstart only; touch pointerdown and synthetic mouse/click events must not double-count.
- Reel pulse feedback must not scale/move the real hit area. Decorative children must have pointer-events: none.
- Do not disable viewport zoom globally or extend native gesture cancellation into dialogs/header.
- These are stylized arcade difficulty rows, not a scientifically accurate habitat/depth diagram.

## Before Continuing

1. Read README.md, AGENTS.md, docs/QA.md and docs/ARTWORK.md.
2. Inspect actual git status and remote configuration. This repository is public with explicit user approval.
   The local branch is codex/fishing-prototype; publish to remote main using git push origin HEAD:main.
3. Preserve all existing work. Only modify this repository.
4. Check the running server at http://127.0.0.1:5193/ before starting another or killing any process.
5. QA interface: dev URL `/?qa=1`, `window.__FISHING_QA__.snapshot()` and `.arrange(speciesId)`.
   Arranging positions stops other fish solely to make collision tests deterministic; it does not award or reel.
   It also holds a vertical aim until the real cast button is used, so browser input latency cannot change the arranged aim.
6. Live round position is intentionally in memory; collection persists after a landed catch, completed bests after trip completion.
7. Verify on real iPad Safari. Chromium tablet/touch emulation and Web Audio signal tests do not prove hardware sound or Thai pronunciation.
   Windows Playwright WebKit here exposes neither AudioContext nor webkitAudioContext, so it cannot validate audio.
   Its selected input/render cases are additional engine coverage, not actual iOS/Safari validation.

## Useful Next Work

- Parent/child playtest: hook speed, visible hitboxes, fish spacing, tap counts and reachability of deep catches.
- Process the user's ChatGPT sheets (docs/ART-PROMPTS.md) and tune sizes/anchors in-game.
- More coves, rare appearances, gentle missions and boat decorations.
- Recorded Thai prompts with phrase review and device tests, if the user requests it.
- Optional session resume after reload and an offline/PWA install path.
- Two-player only after the single-player feel is approved. Treasure-rain balance (map frequency) needs a playtest.

Publishing uses .github/workflows/pages.yml and npm run build:pages. Do not manually upload node_modules or tests as the website.
Use npm run test:pages -- <site-url> for a production smoke check, including colored/moving canvas and no exposed QA interface.
Localhost saves do not transfer to the github.io origin, and saves do not sync between devices.
Do not report future game features as implemented.
