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
- **v0.9.1 LIVE (2026-10-06):** commit e25cf9c, run https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37468623020. hold-to-clear (`bindHold`, `resetEverything()`; `#reset-hold` in the settings, `#book-settings` in the book), FEVER chip inside `#score-box`, bonus chip in `.banners`, smaller toasts and floating text.
- **v0.9.0 LIVE (2026-10-06):** commit c29d308, run https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37450852021. Round 5 notes: `src/difficulty.js` (level table; `FishingRound({ difficulty })`, `Spawner({ speedScale })`),
  `src/daily.js` (pure missions; `progress.daily/stars/streak/difficulty`, `resetProgress`), settings = the pause dialog (`openSettings`, `confirmReset`),
  missions in the book (`missionsHtml`, `countMissions`, gold dot `has-news`). Pre-registered, hidden until art: eight `special: true` creatures
  (own zone `special`) and sheet names `sheet-k-special`, `sheet-l-stickers`, backgrounds `arctic|lagoon|wreck`-portrait/landscape in tools/sprites.py.
  TODO when the pictures arrive: extend `TIMES` in extras.js with arctic/lagoon/wreck (only those whose backgrounds exist) and make the scene's rays/tint/lantern
  code cope with them; add a stickers panel in the book with unlock rules (list in prompt Q); shrink the `waiting` list in tests/assets.test.mjs.
- **v0.8.1 LIVE (2026-10-06):** commit 5dcff9b, run https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37429255762.
- **Trip-end book fix (2026-10-06, v0.8.1):** every dialog pauses the rounds and closing the modal always un-pauses (`resumeOnClose` is gone); `openCollection(back)` returns to `this.rewardView` when opened from the trip-end dialog; `this.wheelPrize` remembers a spun wheel; looks are marked in place.
- **Giant seal + giant turtle bosses (2026-10-06, v0.8.1):** `boss-seal` / `boss-turtle` in species.js, art cut from `sheet-j-giants` (prompt N), 7 giants and 57 book entries; `tests/assets.test.mjs` has a `waiting` list for creatures whose picture has not arrived (only the fog horn now).
- **v0.8.0 LIVE (2026-10-06):** commit 205ccf1, run https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37415639871.
- **Round 4 (2026-10-06, shipped in v0.8.0; user asked for: two players, stop-the-wheel stage, offline, fog horn, rare creatures
  never seen, slower giants):**
  - **Giants** were slow because (a) their own speeds were 13-22 and the kraken's pulse motion averages 0.69x, and (b) the spawner slowed a boss to
    the speed of the creature ahead. Now bosses use speeds 21-30 and *wait* for a clear road (`bossWaiting`, lane 3 holds new arrivals) instead of
    crawling; `callBoss()` (fog horn) sets `bossIn = 0`. A boss not yet caught is 4x as likely (`isWanted`).
  - **Never-seen creatures:** `Spawner({ wanted })` (main.js `wantedIds()` = species not in the collection). `guestTick` sends one uncollected
    creature alone every 24-36 s (first at 12-22 s), rare ones weighted 8x, never in the treasure rain, not arcade-only items in relaxed mode.
  - **Fog horn** (`horn`, effect 'horn', lane 4, weight 3, cooldown 70): `round.hornCalls`, scene `hornCall()` (pale fog + `spawner.callBoss()`),
    audio `horn`. No art yet: hidden in production until `python tools/sprites.py sheet-i-horn` (prompt M in ART-PROMPTS.md); DEV shows an emoji.
  - **Stop-the-wheel stage** (`src/stopwheel.js` pure + DOM overlay `#stopwheel` in main.js `frameStopWheel()`): third bonus kind
    (`BONUS_KINDS = ['pirate','rain','wheel']`, `bonusTurn` 0-2, saved). Phase `'wheel'`; 10 prizes, 3 spins (150/215/285 deg/s), tap or the red
    button stops it (`round.stopTheWheel()`), settle formula `settleAngle`, an idle spin stops after 6 s.
  - **Offline:** `tools/sw.template.js` + `tools/make-sw.mjs` (run by `npm run build`/`build:pages`) write `dist/sw.js` listing every file with a
    content-hash version; `main.js` registers it only in production builds. Cache lookup needs `ignoreVary` (module scripts send Origin).
    `tests/pages-smoke.mjs` reloads offline and checks the game and all pictures. Not tested on a real iPhone/iPad (Safari treats service workers
    per origin and may drop storage for sites unused for weeks).
  - **Two players, one device** (`src/match.js` pure + `rigs` in scene.js + arrays in main.js): `controller.rounds` (1 or 2 `FishingRound`s, each with its own
    `originX` 200 / 280), `controller.match` (null for one player), `get round()` = player 1 so single-player code and tests are unchanged.
    The scene keeps two *rigs* (boat, rod, line, hook, net, gold hook; rig 2 hidden in solo); player 2's boat is mirrored (`rig.sign = -1`), player 1's is the
    recoloured `boat-red` canvas texture, player 2's the original (button colours: red / blue). `Match.sync()` every frame holds everyone but the bonus
    owner (`round.waiting`: no tick, no cast/reel/fire, clock stopped). Shared goal `TEAM_GOAL` 20 (2 x GOAL; relaxed only) via `round.goalCheck`; arcade watch gives both boats +10 s.
    Co-op = team score; versus = higher score wins and spins the trip-end wheel (points from it are not a personal best: `applyPrize(..., { record: false })`).
    Two players do not persist maps/bonusTurn. Touch: `bindTapControl` now looks at `targetTouches`, so a finger on the other control never counts as a pinch.
    DOM ids of player 2 end in `2` (`#cast2`, `#reel2`, `#score2`, `#phase-text2`...). The sea tap casts player 1 on the left half, player 2 on the right.
    QA: `arrange(id, extras, player, keep)`, `setMaps/setBonusTurn/setPower/expire/finishTrip(..., player)`, snapshot `players[]`, `match`, `twoPlayers`.
- **v0.6.1 LIVE (2026-10-06):** commit 5e91923, run https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37391291010
  (wheel dialog fit, 30 s pirate battle, boss cadence, harder crank).
- **v0.7.0 LIVE (2026-10-06):** commit 6719110, run https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37409246010
  (everything in the next item, plus the ancient giants art). Found by the full suite and fixed before release: the boss waiting in the
  wings was a single slot (`bossPending`), so two overlapping warnings lost one; now a `bossQueue` (regression e2e "two boss warnings at once").
- **Cabinet ideas 1/2/3/5 (2026-10-06, user: "ทำข้อ 1 2 3 5"; shipped in v0.7.0):**
  - Boss warning layers: `bossWarning` + `bossShadow` (silhouette of the boss glides across lane 5, alpha .32) and the real boss is held
    back `BOSS_WARNING_SECONDS` 3.2 s of game time (`bossPending`, not for warm-up); DOM `#edge` flashing frame (`flashEdges`: orange boss,
    gold Fever), siren + horn. Reduced motion: steady glow, no shake.
  - Tug (`tugLevel` in species.js: 0 / 1 for >=14 taps / 2 for >=20 taps or bosses): while reeling the scene calls `controller.onTug` every
    ~0.7-1.8 s -> `#reel.tug` shakes only `.reel-progress` and `.wheel` via the CSS `translate` property (hit area never moves, AGENTS rule),
    thump sound, `navigator.vibrate`, bigger on-screen struggle. Pure feel, no gameplay effect.
  - Chest `prizes` [[30,4],[40,3],[60,2],[100,1]] drawn at landing (`FishingRound.pointsFor`, `rng` option, `landing.base`); toast "เปิดหีบได้ N คะแนน!".
  - Ancient giants `boss-helicoprion` / `boss-dunkleosteus` (boss: true) + `SHEETS['sheet-h-ancient']` + prompt L. **Art delivered and cut
    (2026-10-06):** both sprites in `public/assets/sprites/`, manifest regenerated, 5 giants, 55 book entries (production smoke shows 55).
    Checked in game on phone and tablet. Idea 4 (stop-the-wheel bonus) was not requested.
- **Feedback round after v0.6.0 (2026-10-06, user played on iPhone; not deployed):**
  - Trip-end dialog scrolled on iPhone (play-again button fell off): `.reward` = `reward-main` + `reward-side`; wheel size `--wheel`
    = clamp(112px, 25dvh, 190px) with all geometry relative to it; compact rules under (max-width 600 | max-height 760); two columns
    when short and wide (844x390). Tested at 390x664, 375x560, 430x740, 844x390, 1024x768 (no scrolling, button in view, also after a spin).
  - Pirate battle follows the cabinet: unlimited balls, 30 s (`PIRATE_SECONDS`), reload 0.45 s, several balls may fly; points scaled
    down (hit 5/7/9, sink bonus 15/30/60, streak x1.5/x2); up to 3 ships, faster spawns; ends when time is up and the last ball landed
    (`onPirateEnd` toasts the loot, from `round.pirateResult`).
  - Bosses were too rare (a trip of 8 catches ends in ~1-1.5 min): first boss 15-30 s, then 35-55 s of boss-free sea after the previous
    one leaves (one at a time, `lanes[3].bosses`); about one per 90 s, nearly every short trip meets one.
  - Crank: `CRANK_STEP` 180 (half a turn per pull); taps unchanged (user: taps are good).
  - Research on the real cabinet (public pages only; videos could not be read): `docs/CABINET-IDEAS.md`.
- **v0.6.0 LIVE (2026-10-06):** commit 9bc2575, run https://github.com/kanasit123-dotcom/tap-tap-fishing/actions/runs/37373626821 —
  everything in the roadmap items below. Open ideas: playtest balance on a real iPad (boss frequency, wheel odds, pirate difficulty,
  crank step 120 deg), two-player, recorded Thai voice, offline/PWA service worker.
- **Crank reeling + snapshot tests (2026-10-05, deployed in v0.6.0):** `createCrank` in src/input.js (120 deg per pull, dead zone
  near the hub, a reversal restarts the count); `bindTapControl(..., { onRotate })` enables it only for the reel (touch on the
  stationary wrapper, mouse drag with the button held); the wheel follows the finger (`turnWheel`), hint toast/speech mention
  both ways. `npm run test:e2e:snapshot` = tools/e2e-snapshot.mjs copies index.html/src/public/tests to `.e2e-snapshot/` and runs
  Playwright against `vite .e2e-snapshot` on 5195 (E2E_SNAPSHOT=1 in playwright.config.js). The crank e2e uses CDP touch, so it
  runs on Chromium projects only. Boss sizes raised (300/260/280) and boss speed capped behind slower groups.
- **Art J + K delivered (2026-10-05):** sunset/night repaints measured within 0.4% of the day lines (existing ANCHORS kept);
  bosses cut 720 px wide. Tint fallback no longer used. Not deployed until the user says so.
- **Roadmap finished in code (2026-10-05):**
  - `src/extras.js` (pure): lucky wheel (`WHEEL`, `spinWheel`, `applyPrize`: points raise the finished trip and best; map piece
    capped at 3; net/turbo/golden hook saved in `progress.startPowers` and used by the next `FishingRound`), boat looks (`LOOKS`:
    rod classic/bamboo/gold, hook steel/golden, boat plain/pennants/lanterns; unlocked by completing a book section among
    creatures that have artwork; saved in `progress.looks`), time of day (`timeOfDay(trips)`: day -> sunset -> night per trip).
  - Wheel UI in the reward dialog (one spin, conic-gradient wheel, slowing ticks); looks panel at the top of the book.
  - Scene: rod colours, cosmetic golden hook, pennant/lantern string from cabin roof to bow (lanterns glow more at sunset/night),
    sunset/night paintings chosen by name prefix (`sunset-portrait`...) or, until they exist, a MULTIPLY tint over the day
    painting; rays dimmer, no gulls at night.
  - Bosses: `boss-whale` / `boss-kraken` / `boss-marlin` (book section "ยักษ์ใหญ่", taps 28-32, 180-250 pts). Spawner `bossTick`:
    first after 70-100 s, then every 120-180 s, lane 3, never during the treasure rain, a different boss each time, only with art
    (so production shows none until sheet K). Up to 2.3 lane-heights tall; warning = darkened sea, ▶▶ arrows, horn, toast.
  - Prompts J (4 background repaints, attach the day picture) and K (`sheet-g-boss.png`) are in ART-PROMPTS.md and in tools/sprites.py.
    After J arrives check the waterline/sand lines in art/preview; after K, the boss sizes in-game.
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
then **tap tap tap on the reel**. The user first chose repeated taps; on 2026-10-05 they asked for taps OR a circular crank on the reel (both work now; holding still does not).
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

- Rule (user, 2026-10-06): nothing may be written over the water. Messages go to the status label above the cast button (`#toast` lives inside the first `.phase-label`; `.captioning` hides the status text),
  FEVER sits in the score box, "+points" is the DOM chip `#gain` beside the score box, bonus chips hang under `.hud-right`. New messages must use `toast()`; keep them short (about 3 lines in 172 px).
- Original eight collection IDs, point values and storage key stay unchanged. The original goal of eight catches per trip was raised to ten (`GOAL`, 2026-10-06; two players share 20), and arcade now has no catch limit (`goalReached` is false in arcade: only the clock ends it; the HUD shows "N ตัว").
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
