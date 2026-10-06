import test from 'node:test';
import assert from 'node:assert/strict';
import { FishingRound, WORLD, GOAL } from '../src/model.js';
import { Match, TEAM_GOAL, inBonus } from '../src/match.js';

const pair = (kind = 'coop', mode = 'relaxed', options = [{}, {}]) => {
  const rounds = [
    new FishingRound(mode, () => {}, { originX: 200, ...options[0] }),
    new FishingRound(mode, () => {}, { originX: 280, ...options[1] }),
  ];
  return { rounds, match: new Match(rounds, kind) };
};
const tick = (match, seconds) => { for (let i = 0; i < Math.ceil(seconds * 60); i++) { match.sync(); for (const r of match.rounds) r.tick(1 / 60); } };
function catchFish(round, id = 'goldfish', depth = 130) { assert.equal(round.cast(), true); round.length = depth; assert.equal(round.catch(id), true); }
function land(match, round) { for (let i = 0, n = round.requiredTaps; i < n; i++) assert.equal(round.reel(i * 100), true); tick(match, 1); }
function catchAndLand(match, round, id) { catchFish(round, id); land(match, round); tick(match, 2.2); }

test('each player has a rod tip of their own, so the two hooks hang apart', () => {
  const { rounds } = pair();
  assert.equal(rounds[0].hook.x, 200); assert.equal(rounds[1].hook.x, 280);
  rounds[0].angle = 0.5; rounds[1].angle = 0.5;
  assert.ok(Math.abs(rounds[1].hook.x - rounds[0].hook.x - 80) < 1e-9, 'the same angle keeps the two hooks 80 apart');
  assert.equal(new FishingRound().hook.x, WORLD.originX, 'one player keeps the centre');
});

test('the two players share one goal: the trip ends when together they brought up the team goal', () => {
  const { rounds, match } = pair();
  assert.equal(TEAM_GOAL, GOAL * 2);
  for (let i = 0; i < GOAL; i++) catchAndLand(match, rounds[0], 'goldfish');
  // Player 1 alone has brought up a full single-player goal, but the team is only half way.
  assert.equal(match.catches, GOAL); assert.equal(rounds[0].phase, 'aim', 'no end after player 1 alone caught eight');
  for (let i = 0; i < GOAL - 1; i++) catchAndLand(match, rounds[1], 'goldfish');
  assert.equal(match.finished, false);
  catchAndLand(match, rounds[1], 'goldfish');
  tick(match, 1);
  assert.equal(match.catches, TEAM_GOAL);
  assert.deepEqual(rounds.map((r) => r.phase), ['complete', 'complete']); assert.equal(match.finished, true);
});

test('a bonus stage is played by one player while the other waits, held with the clock', () => {
  const { rounds, match } = pair('coop', 'arcade', [{ maps: 3, bonusTurn: 1 }, {}]);
  assert.equal(match.owner, -1);
  catchFish(rounds[0], 'map'); land(match, rounds[0]);
  assert.equal(rounds[0].landing.bonusKind, 'rain'); assert.equal(match.owner, 0); assert.ok(inBonus(rounds[0]));
  match.sync(); assert.equal(rounds[1].waiting, true); assert.equal(rounds[0].waiting, false);
  const angle = rounds[1].angle; const clock = rounds[1].remaining;
  tick(match, 3);
  assert.equal(rounds[1].angle, angle, 'the waiting player stands still'); assert.equal(rounds[1].remaining, clock, 'and their clock waits');
  assert.equal(rounds[1].cast(), false, 'cannot cast while waiting');
  assert.equal(rounds[0].remaining, rounds[0].remaining); assert.ok(rounds[0].bonus > 0);
  tick(match, 20);
  assert.equal(match.owner, -1); match.sync();
  assert.equal(rounds[1].waiting, false); assert.equal(rounds[1].cast(), true, 'back to fishing together');
});

test('a waiting player keeps a hooked fish in the water and finishes reeling it afterwards', () => {
  const { rounds, match } = pair('coop', 'relaxed', [{ maps: 3, bonusTurn: 1 }, {}]);
  catchFish(rounds[1], 'goldfish'); rounds[1].reel(0);
  catchFish(rounds[0], 'map'); land(match, rounds[0]);
  match.sync(); assert.equal(rounds[1].waiting, true);
  const taps = rounds[1].taps;
  assert.equal(rounds[1].reel(5000), false, 'no reeling while waiting');
  tick(match, 25);
  assert.equal(rounds[1].phase, 'reeling'); assert.equal(rounds[1].taps, taps);
  match.sync(); assert.equal(rounds[1].reel(9000), true, 'reeling resumes');
});

test('pirate battle and stop-the-wheel stage also hold the other player', () => {
  for (const bonusTurn of [0, 2]) {
    const { rounds, match } = pair('coop', 'relaxed', [{ maps: 3, bonusTurn }, {}]);
    catchFish(rounds[0], 'map'); land(match, rounds[0]);
    assert.ok(['pirate', 'wheel'].includes(rounds[0].phase) || rounds[0].pirateQueued || rounds[0].wheelQueued);
    assert.equal(match.owner, 0); match.sync(); assert.equal(rounds[1].waiting, true);
    tick(match, 120);
    assert.equal(match.owner, -1, `stage ${bonusTurn} is over`); match.sync(); assert.equal(rounds[1].waiting, false);
  }
});

test('co-op adds the scores, versus compares them and a draw has no winner; the wheel goes to the winner or to player 1', () => {
  const { rounds, match } = pair('versus');
  rounds[0].score = 120; rounds[1].score = 135;
  assert.equal(match.winner, 1); assert.equal(match.spinner, 1); assert.equal(match.total, 255);
  rounds[1].score = 120; assert.equal(match.winner, -1); assert.equal(match.spinner, 0);
  const team = pair('coop'); team.rounds[0].score = 50; team.rounds[1].score = 70; team.match.bonusPoints = 30;
  assert.equal(team.match.winner, -1); assert.equal(team.match.total, 150);
  assert.deepEqual(team.match.result(), { kind: 'coop', scores: [50, 70], total: 150, winner: -1, catches: 0, bonusPoints: 30 });
  assert.equal(new Match([], 'nonsense').kind, 'coop');
});
