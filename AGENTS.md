# Project Instructions

- This is the separate `tap-tap-fishing` repository. Do not modify sibling game repositories.
- Keep gameplay touch-first: single tap to cast; reel by repeated taps OR by turning a finger around the reel like a crank
  (user decision 2026-10-05; 180 degrees = half a turn of steady turning = one pull). Holding still never reels: no hold-to-reel.
- Run long browser suites with `npm run test:e2e:snapshot` (frozen copy on port 5195) so source edits during a run
  cannot reload the page under test.
- Two players share one device (user decision 2026-10-06, both iPad and iPhone): two boats (player 1 red on the left, player 2 blue
  mirrored on the right), each with its own cast button and reel; co-op (team score) or race (higher score wins); one shared goal of 16
  catches; bonus stages take turns (the player who completed the map plays, the other waits). Keep each player's controls independent
  (touch handlers use `targetTouches`, so two hands never cancel each other). No online play (the site has no server).
- Relaxed play must remain untimed and forgiving; do not randomly drop a fish after correct input.
- Preserve saved collection and the dedicated `tap-tap-fishing-v1` storage key.
- Use Phaser for rendering and collision detection. Keep testable round rules in `src/model.js`.
- Keep the scene full-bleed, use original art, and avoid copying UNIS assets or branding.
- Add sound features to this repo only. Thai device speech is optional, not reviewed recorded narration.
- Do not introduce autoplay audio before a user gesture or narration that overlaps another utterance.
- Maintain touch-action protection on the sea/reel without disabling zoom globally in browser UI.
- Test pointer, touch, keyboard, hold-not-repeat, mute, pause, storage, rewards and small-screen fit.
- Run `npm run check` and Playwright, inspect screenshots and nonblank/moving canvas pixels.
- The debug arranging interface is for dev `?qa=1` only, never production or a gameplay shortcut.
- Read AI-HANDOFF.md and docs/QA.md before claiming a previous test result covers newer changes.
- No publish/deploy, destructive git operations or changes to another repo without user instruction.
