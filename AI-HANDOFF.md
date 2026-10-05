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
