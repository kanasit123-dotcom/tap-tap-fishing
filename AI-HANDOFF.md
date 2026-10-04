# AI Handoff: Tap Tap Fishing

Date: 2026-10-04. New repository for the user's arcade-fishing concept, separate from older games.
Path: `C:/Users/KANASIT/Documents/Codex/tap-tap-fishing`
Initial working branch: `codex/fishing-prototype`.

Delivery status: playable version 0.1.0. The user approved creating a public repository and publishing GitHub Pages.
Public origin: https://github.com/kanasit123-dotcom/tap-tap-fishing
Pages address: https://kanasit123-dotcom.github.io/tap-tap-fishing/
Initial publication is being verified; check docs/QA.md and the Actions run before claiming it is live.
Dev server running locally on port 5193.
Latest update: six ordered depth rows and four new creatures, implemented locally without changing sibling games.
Latest QA: 22 unit tests + build; browser full run 29 passed / 1 desktop touch skip,
then all 3 row checks passed after correcting a subpixel tolerance in that assertion.
Production smoke passed with twelve collection entries and no exposed QA interface.
See docs/QA.md for the exact intermediate failures, combined coverage and real-device gaps.

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
- Two creatures per row, common speed/direction within a row, 700-world-pixel loop and half-loop spacing.
- Wrapped fish explicitly regain velocity after Phaser Body.reset; landed fish respawn opposite their row neighbor.
- Source rectangles in species.js replace the old fixed frame grid to avoid neighboring fragments and transparent padding.
- Preserve each creature's aspect ratio and vertical row clearance when changing sizes.
- Book/reward SVGs display actual bitmap cutouts, with explicit clipPath rectangles. A viewBox alone is not sufficient.
- New asset: public/assets/deep-creatures.png; actual output is 1254x1254, not the requested 1024x1024.
- Animals in play remain full-color and alpha 1. Faint grayscale appears only for undiscovered book entries.
- User's comment about animal shadows is ambiguous: an async question asks whether this is a mystery effect request or a rendering problem.
  No random silhouette mechanic has been added without that clarification.
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

## Useful Next Work

- Parent/child playtest: hook speed, visible hitboxes, fish spacing, tap counts and reachability of deep catches.
- Original boat art matching the generated sea/creatures; ship/hook are currently code-drawn.
- More coves, rare appearances, gentle missions and boat decorations.
- Recorded Thai prompts with phrase review and device tests, if the user requests it.
- Optional session resume after reload and an offline/PWA install path.
- Two-player and special bonus stages only after the single-player feel is approved.

Publishing uses .github/workflows/pages.yml and npm run build:pages. Do not manually upload node_modules or tests as the website.
Use npm run test:pages -- <site-url> for a production smoke check, including colored/moving canvas and no exposed QA interface.
Localhost saves do not transfer to the github.io origin, and saves do not sync between devices.
Do not report future game features as implemented.
