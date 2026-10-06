// Two players on one device share one sea: this ties their two FishingRounds together. Pure rules, no DOM.
//  - One shared goal: the trip ends when the two together have brought up TEAM_GOAL creatures (arcade has no goal: each clock runs out).
//  - Bonus stages take turns: the player who completed the map plays it alone, the other waits (held, clock included).
//  - 'coop' adds the scores into one team score; 'versus' compares them.
import { GOAL, WORLD } from './model.js';

export const TEAM_GOAL = GOAL * 2;
// Where each player's rod tip hangs: one player in the middle, two players either side of it.
export const TWO_APART = 40;
export const originFor = (players, index) => players === 2 ? WORLD.originX + (index === 0 ? -TWO_APART : TWO_APART) : WORLD.originX;
export const MATCH_KINDS = ['coop', 'versus'];

// A player in (or just about to start) a bonus stage: the treasure rain, the pirate battle or the stop-the-wheel stage.
export const inBonus = (round) => round.bonus > 0 || round.pirateQueued || round.wheelQueued || round.phase === 'pirate' || round.phase === 'wheel';

export class Match {
  constructor(rounds, kind = 'coop') {
    this.rounds = rounds;
    this.kind = MATCH_KINDS.includes(kind) ? kind : 'coop';
    this.bonusPoints = 0;   // points won on the trip-end wheel, added to the team (coop) or the winner (versus)
    this.recorded = false;
    for (const round of rounds) round.goalCheck = () => this.catches >= TEAM_GOAL;
  }

  get catches() { return this.rounds.reduce((sum, round) => sum + round.tripCatches, 0); }
  get scores() { return this.rounds.map((round) => round.score); }
  get total() { return this.scores.reduce((a, b) => a + b, 0) + this.bonusPoints; }
  get finished() { return this.rounds.every((round) => round.phase === 'complete'); }

  // Index of the player playing a bonus stage, or -1.
  get owner() { return this.rounds.findIndex(inBonus); }

  // Holds everybody but the bonus player. Call every frame (cheap).
  sync() {
    const owner = this.owner;
    this.rounds.forEach((round, i) => { round.waiting = owner >= 0 && i !== owner; });
    return owner;
  }

  // Versus: the higher score wins (index), a draw is -1. Coop: the team always "wins" together (-1).
  get winner() {
    if (this.kind !== 'versus') return -1;
    const [a, b] = this.scores;
    return a === b ? -1 : a > b ? 0 : 1;
  }

  // Who spins the trip-end wheel: the winner, or player 1 for a team (and for a draw).
  get spinner() { return Math.max(0, this.winner); }

  result() {
    return { kind: this.kind, scores: this.scores, total: this.total, winner: this.winner, catches: this.catches, bonusPoints: this.bonusPoints };
  }
}
