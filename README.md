# อ่าวสมบัติ / Tap Tap Fishing

Original family fishing arcade. Watch the swinging hook, cast through swimming sea creatures,
then tap the reel repeatedly to bring a catch aboard. Inspired by the timing-and-reeling genre;
not an official Treasure Cove game or a reproduction of its artwork, audio or branding.

## Run

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev -- --port 5193
```

Local URL: http://127.0.0.1:5193/

Public repository: https://github.com/kanasit123-dotcom/tap-tap-fishing
GitHub Pages address: https://kanasit123-dotcom.github.io/tap-tap-fishing/
The Pages workflow publishes pushes to remote `main`; the local working branch is `codex/fishing-prototype`.
`private: true` in package.json prevents npm publishing, not GitHub visibility.

```sh
npm run check
npx playwright install chromium webkit
npm run test:e2e
npm run build
npm run preview -- --port 5194
```

## Version 0.5.0

Combo/FEVER (3 in a row = x2 for 15 s), coins flying to the score, shake and sparkles for big catches, power-ups
(net, turbo reel, golden hook, spyglass) and a pirate-ship cannon mini-game that alternates with the treasure rain
after every 4 map pieces. 50 book entries.

## Version 0.4.1

Every row swims one way (neighbouring rows alternate, like the cabinet) and all fish swim about 11% faster
with the same number on screen.

## Version 0.4.0

Sharp rendering at device resolution with pre-shrunk sprites, calm path-following motion, one swimming direction per
row (alternating like the cabinet), random gaps/depths/strays and no same-species repeats, treasure floating in the middle water, a hook that keeps swinging from its cast angle,
and 12 more species (46 in the book).

## Version 0.3.0 (0.2.0 plus the semi-realistic artwork and home-screen icon)

Everything under Version 0.2.0 below, now with the redrawn artwork, the install icon and manifest, and the sea-fitting fixes.

## Version 0.2.0

- **Living sea instead of fixed rows.** `src/spawner.js` decides when and what enters each of seven lanes
  (six swimming lanes + the seabed): random exponential gaps, schools of different sizes and speeds,
  calm/normal/rush waves, lanes that change direction only while empty, and faster groups capped so they never
  swim through slower ones. Creatures enter from beyond the screen edge and leave on the far side on every
  screen width (the old loop popped fish in and out mid-screen on wide displays).
- **Lanes fill the screen.** `src/layout.js` spreads the lanes from just under the surface down to the top of the
  cast/reel controls, and scales creatures with the lane spacing, so tall phones no longer leave the lower half empty.
  The background is scaled uniformly (no more stretching), aligned to the waterline and seabed, and repeated mirrored
  on very wide screens; the painting that needs the fewest repeats is chosen per screen shape.
- **46 collection entries** (`src/species.js`; 34 at first, 12 added later): 12 original IDs kept for saved progress, plus sardine, butterflyfish,
  parrotfish, seahorse, jellyfish, lionfish, tuna, eagle ray, moray, swordfish, grouper, hammerhead, crab, sea star,
  golden lobster king (jackpot) and treasures. The book is grouped by zone.
- **Special items:** message bottle = next catch x2, pocket watch = +10 s (arcade only), old boot = 1-point joke,
  coins/pearl/chest/crown = treasure, map piece: four pieces (saved across trips) start a 20-second treasure rain
  in every lane with half the taps; it pauses the arcade clock and does not count towards the 8-catch goal.
- **Sound:** all synthesised (`src/audio.js`): sea swell and surf, bubbles, distant gulls, a soft island music loop
  (separate music button, faster during the treasure rain), rod whoosh, line ratchet while casting/retrieving,
  reel clicks with rising pitch per tap, hook strike, struggling splashes, surface splash, fanfares, coin shimmer.
  iOS unlock on pointerup/touchend/click/keydown and a rebuilt AudioContext after the page was hidden.
- **Boat, rod and hook:** wooden boat with wheelhouse and fisherman; the rod is drawn in code, bends with line
  tension and its reel handle turns with every tap; steel J-hook with barb and a lead sinker.
- **Semi-realistic artwork (2026-10-05):** all 46 creatures/treasures (34 first, 12 more from prompt H), the boat with its fisherman and two seas were
  generated in ChatGPT from [docs/ART-PROMPTS.md](docs/ART-PROMPTS.md) and cut by `python tools/sprites.py` into
  `public/assets/sprites/*.webp` (about 1.2 MB in total). The earlier cartoon atlases were removed
  (see [docs/ARTWORK.md](docs/ARTWORK.md)). Production shows every creature; DEV `?qa=1` would draw an emoji for any
  future creature that has no sprite yet.
- **Sea fills any screen:** the sand line is aligned to the seabed lane. On a screen wider than the painting the reef
  stays pinned to both edges and only the open water is stretched; a mirrored strip fills the area behind the controls.
  The boat is scaled to a fixed on-screen width with its waterline on the surface, and the rod is drawn from the
  boat's own holder tube.
- **Install as an app:** `public/manifest.webmanifest`, home-screen icons (`python tools/make_icon.py`), `apple-touch-icon`
  and web-app meta tags, like the other games. There is still no service worker or offline mode.

## Version 0.1.0

- Starts directly in the playable sea, no landing page or sign-in.
- Six aligned depth rows with 32 swimming instances (8/6/5/5/4/4), twelve collectible species/treasures.
- Fish in each row swim in the same direction with stable spacing; deeper creatures are generally larger.
- Two deepest rows appear as black silhouettes; colors gradually return as a hooked catch rises.
- A deep catch's name remains hidden until its artwork is mostly revealed; respawns return to silhouettes.
- New seal, shark, anglerfish and giant squid; original pufferfish and other collection IDs are preserved.
- Swinging hook locks its direction when cast; Phaser Arcade Physics detects catches.
- Every accepted reel tap turns the wheel and shortens the line. Holding does not auto-reel.
- Relaxed mode has no clock, slipping fish or penalty for pausing the tapping.
- Arcade mode lasts 90 seconds; a fish already hooked may still be brought home afterwards.
- A relaxed trip finishes after eight catches; scores, completion rewards and repeat trips.
- Local collection, mode-specific best scores and sound preference are saved independently.
- Pause/resume, collection book, restart, sound toggle and mode-switch confirmation.
- Pointer, touch and keyboard activation. A stationary reel wrapper cancels native touch/gesture defaults,
  even after landing disables the button; each touch counts once and holding never auto-reels.
- Zoom is not globally disabled. Real iPad Safari gesture confirmation is still needed.
- Original generated raster art, code-drawn boat/hook, synthesized sound effects.
- Optional Thai spoken encouragement uses a Thai voice on the device, when available.

## Publish

The user approved the public repository and GitHub Pages deployment.
`.github/workflows/pages.yml` installs locked dependencies, runs unit tests, builds and deploys only `dist/`.
Source, tests and artwork are public; node_modules, local logs and test screenshots are excluded from Git.
No account credentials or deployment secrets are stored in the repository.

```sh
npm run build:pages
npm run test:pages -- https://kanasit123-dotcom.github.io/tap-tap-fishing/?qa=1
git push origin HEAD:main
```

The dedicated Pages build sets `/tap-tap-fishing/` as the asset base without changing the local dev URL.
Check the Actions deployment result before assuming a push is live. Changing the repository name requires updating the Pages base.
Online and localhost progress are separate because browsers store saves per origin; saves are not synced across devices.

## Boundaries

This repository is independent of `game-lilly`, `happy-little-kitchen` and `little-exam-adventure`.
No shared imports, storage migration, accounts, real money, ticket payouts or ads.
Storage key: `tap-tap-fishing-v1`. Collection saves after each landed catch; refreshing starts a new trip,
but keeps the collection and best completed-trip scores. Live hook position is not persisted.

All gameplay assets are served locally. There is no external font dependency and no speech API except the optional device voice.
Thai narration is **not recorded or guaranteed on every device**; when no Thai system voice exists,
the wheel animation, status and sound effects still work. A service worker/offline installer is not included.

## Structure

| File | Responsibility |
| --- | --- |
| `src/model.js` | Round phases, hook aim, casting, tap progress, scoring and clock |
| `src/scene.js` | Phaser rendering, Arcade Physics overlap, swimming, effects and responsive camera |
| `src/main.js` | Accessible DOM controls, dialogs and application integration |
| `src/input.js` | Single-touch activation, Safari gesture guards, compatibility-event suppression, keyboard/mouse input |
| `src/species.js` | Catalog: lane, points, taps, size, speed, rarity, school size, motion, effects, art lookup |
| `src/spawner.js` | Irregular arrivals per lane, waves, cooldowns, treasure-rain pool (pure, seeded in tests) |
| `src/layout.js` | Lane positions from the visible sea and the controls; background placement |
| `src/art-manifest.js` | Generated list of processed sprites/backgrounds with the boat/background anchors (rewritten by the tool) |
| `tools/sprites.py` | Cuts ChatGPT sheets from `art/incoming/` into sprites and updates the manifest |
| `tools/make_icon.py` | Draws the home-screen icons (`public/icons/`) from the clownfish sprite and the portrait sea |
| `public/manifest.webmanifest` | Installable app metadata: standalone, Thai name, any + maskable icons |
| `src/progress.js` | Separate validated local storage and idempotent completed-trip recording |
| `src/audio.js` | Synthesised ambience, music and effects, iOS unlock/rebuild, optional Thai device speech |
| `public/assets/` | Processed sprites (`sprites/*.webp`: 34 creatures + boat) and the two sea paintings |
| `tests/` | Model/storage unit tests and real-browser workflow/input/render tests |

Read [AI-HANDOFF.md](AI-HANDOFF.md) and [docs/QA.md](docs/QA.md) before continuing.
Artwork provenance and generation prompts: [docs/ARTWORK.md](docs/ARTWORK.md); prompts for the new set: [docs/ART-PROMPTS.md](docs/ART-PROMPTS.md).

## Design References

[UNIS Treasure Cove operation manual](https://www.mossdistributing.com/userdocs/documents/MS0369_TREASURECOVE.PDF),
gameplay section: swing, cast, hook and reel. Our touch controls, rewards, data and art are original.
[PrimeTime Amusements IAAPA 2018 demonstration](https://www.youtube.com/watch?v=wOiXknKSgqw):
inspected gameplay frames near 0:23 and 1:03 for aligned schools and increasing creature size.
The new mystery silhouettes are the user's requested addition, not a claim that this clip proves that mechanic.
[WebKit issue 218015](https://bugs.webkit.org/show_bug.cgi?id=218015) documents an older iOS case where
touch-action alone did not stop double-tap zoom on positioned elements; this is relevant context,
not a diagnosis of the user's exact iPad/browser version.
[Phaser Arcade Physics](https://docs.phaser.io/phaser/concepts/physics/arcade) and
[Phaser unified pointer input](https://docs.phaser.io/phaser/concepts/input).

## Not Included Yet

Multiple environments, boat upgrades, two-player play, recorded Thai voice, a service worker/offline install and
real-device Safari approval (touch, sound, home-screen icon). Do not imply these are finished.
