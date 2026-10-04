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

All gameplay assets are served locally. There is no speech API or external font dependency.
Thai narration is **not recorded or guaranteed on every device**; when no Thai system voice exists,
the wheel animation, status and sound effects still work. A service worker/offline installer is not included.

## Structure

| File | Responsibility |
| --- | --- |
| `src/model.js` | Round phases, hook aim, casting, tap progress, scoring and clock |
| `src/scene.js` | Phaser rendering, Arcade Physics overlap, swimming, effects and responsive camera |
| `src/main.js` | Accessible DOM controls, dialogs and application integration |
| `src/input.js` | Single-touch activation, Safari gesture guards, compatibility-event suppression, keyboard/mouse input |
| `src/species.js` | Species, source rectangles, atlas metadata, rows, swim spacing, scores and tap counts |
| `src/progress.js` | Separate validated local storage and idempotent completed-trip recording |
| `src/audio.js` | Gesture-unlocked Web Audio effects and optional Thai device speech |
| `public/assets/` | Original background and two transparent creature atlases |
| `tests/` | Model/storage unit tests and real-browser workflow/input/render tests |

Read [AI-HANDOFF.md](AI-HANDOFF.md) and [docs/QA.md](docs/QA.md) before continuing.
Artwork provenance and generation prompts: [docs/ARTWORK.md](docs/ARTWORK.md).

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

Multiple environments, boat upgrades, two-player play, a deeper bonus stage, recorded Thai voice
and real-device Safari approval. Do not imply these are finished.
