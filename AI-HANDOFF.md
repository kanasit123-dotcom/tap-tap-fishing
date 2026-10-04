# AI Handoff: Tap Tap Fishing

Date: 2026-10-04. New repository for the user's arcade-fishing concept, separate from older games.
Path: `C:/Users/KANASIT/Documents/Codex/tap-tap-fishing`
Initial working branch: `codex/fishing-prototype`.

Delivery status: playable version 0.1.0, initial local Git snapshot. No GitHub remote/push/deploy;
Public/Private question remains unanswered. Dev server running locally on port 5193.
Final QA: 20 unit tests + build, full browser 26 passed / 1 desktop touch skip,
then 8 passed / 1 skip rechecking the final sound/text changes. See docs/QA.md for exact scope and real-device gaps.

## Agreed Interaction

Watch the swinging hook, tap to cast, catch a creature passing in a depth lane,
then **tap tap tap on the reel**. The user chose repeated taps, not holding or a circular swipe.
Large visual wheel feedback and visible catch movement matter more than complex difficulty systems.
New neutral brand: อ่าวสมบัติ / Tap Tap Fishing. Do not reuse the Treasure Cove name as our title.

## Implemented

Phaser 3.90.0 + Vite + vanilla JS/DOM. Eight sprite species across five lanes, original raster art,
real Arcade Physics overlap, deterministic round state machine, per-tap reeling, landing-only scoring,
completion reward, collection, separate best scores, 90-second arcade and untimed relaxed modes,
pause/resume, sound toggle, mode switch confirmation and isolated validated localStorage.
Optional Thai narration uses the device's Thai voice; it is not an MP3 engine or a reviewed voice pack.
No code, voices, progress or artwork was imported from sibling repositories.

## Before Continuing

1. Read README.md, AGENTS.md, docs/QA.md and docs/ARTWORK.md.
2. Inspect actual git status and remote configuration. GitHub visibility was asked separately; do not infer public/private.
3. Preserve all existing work. Only modify this repository.
4. Check the running server at http://127.0.0.1:5193/ before starting another or killing any process.
5. QA interface: dev URL `/?qa=1`, `window.__FISHING_QA__.snapshot()` and `.arrange(speciesId)`.
   Arranging positions stops other fish solely to make collision tests deterministic; it does not award or reel.
6. Live round position is intentionally in memory; collection persists after a landed catch, completed bests after trip completion.
7. Verify on real iPad Safari. Chromium tablet/touch emulation and Web Audio signal tests do not prove hardware sound or Thai pronunciation.

## Useful Next Work

- Parent/child playtest: hook speed, visible hitboxes, fish spacing, tap counts and reachability of deep catches.
- Original boat art matching the generated sea/creatures; ship/hook are currently code-drawn.
- More coves, rare appearances, gentle missions and boat decorations.
- Recorded Thai prompts with phrase review and device tests, if the user requests it.
- Optional session resume after reload and an offline/PWA install path.
- Two-player and special bonus stages only after the single-player feel is approved.

No remote deployment is part of this first slice. Do not report future features as implemented.
