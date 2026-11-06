// Kuhn poker: three cards (J, Q, K), one-chip antes, one bet of one chip.
// Vanilla CFR / CFR+ with full chance enumeration, plus exact best responses.

export const KUHN_CARDS = ['J', 'Q', 'K'] as const;
export const P1_INFOSETS = ['J', 'Q', 'K', 'Jpb', 'Qpb', 'Kpb'];
export const P2_INFOSETS = ['Jp', 'Qp', 'Kp', 'Jb', 'Qb', 'Kb'];
export const ALL_INFOSETS = [...P1_INFOSETS, ...P2_INFOSETS];

/** [pass/check/fold, bet/call] probabilities per information set. */
export type KuhnStrategy = Record<string, [number, number]>;

const DEALS: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 0],
  [1, 2],
  [2, 0],
  [2, 1],
];

export const GAME_VALUE = -1 / 18;

/** Utility for the player to act at a terminal history, else null. */
function terminal(history: string, cards: readonly [number, number]): number | null {
  const plays = history.length;
  if (plays < 2) return null;
  const player = plays % 2;
  const higher = cards[player] > cards[1 - player];
  if (history[plays - 1] === 'p') {
    if (history === 'pp') return higher ? 1 : -1;
    return 1; // the other player folded to a bet
  }
  if (history.endsWith('bb')) return higher ? 2 : -2;
  return null;
}

/** Plain-language description of an info set. */
export function describeInfoSet(key: string): { card: string; player: 1 | 2; situation: string; actions: [string, string] } {
  const card = key[0];
  const h = key.slice(1);
  switch (h) {
    case '':
      return { card, player: 1, situation: 'First to act', actions: ['Check', 'Bet'] };
    case 'p':
      return { card, player: 2, situation: 'P1 checked', actions: ['Check', 'Bet'] };
    case 'b':
      return { card, player: 2, situation: 'P1 bet', actions: ['Fold', 'Call'] };
    default:
      return { card, player: 1, situation: 'Checked, P2 bet', actions: ['Fold', 'Call'] };
  }
}

export function uniformStrategy(): KuhnStrategy {
  const s: KuhnStrategy = {};
  for (const k of ALL_INFOSETS) s[k] = [0.5, 0.5];
  return s;
}

/** P1's expected value when both players follow `strat`. */
export function kuhnValue(strat: KuhnStrategy): number {
  const rec = (cards: readonly [number, number], history: string): number => {
    const t = terminal(history, cards);
    const player = history.length % 2;
    if (t !== null) return player === 0 ? t : -t;
    const s = strat[KUHN_CARDS[cards[player]] + history];
    return s[0] * rec(cards, history + 'p') + s[1] * rec(cards, history + 'b');
  };
  let v = 0;
  for (const d of DEALS) v += rec(d, '') / 6;
  return v;
}

/** Best value `player` (0 = P1) can get against the other side of `strat`. */
export function bestResponseValue(strat: KuhnStrategy, player: 0 | 1): number {
  const keys = player === 0 ? P1_INFOSETS : P2_INFOSETS;
  let best = -Infinity;
  for (let mask = 0; mask < 1 << keys.length; mask++) {
    const s = { ...strat };
    keys.forEach((k, i) => (s[k] = (mask >> i) & 1 ? [0, 1] : [1, 0]));
    const v = kuhnValue(s);
    best = Math.max(best, player === 0 ? v : -v);
  }
  return best;
}

/** Average gain of a best responder over the game value, in chips per hand. */
export function exploitability(strat: KuhnStrategy): number {
  return (bestResponseValue(strat, 0) + bestResponseValue(strat, 1)) / 2;
}

interface Node {
  regret: [number, number];
  stratSum: [number, number];
}

export type CfrVariant = 'vanilla' | 'cfr+';

export class KuhnCFR {
  readonly nodes = new Map<string, Node>();
  iterations = 0;

  constructor(readonly variant: CfrVariant = 'vanilla') {
    for (const k of ALL_INFOSETS) this.nodes.set(k, { regret: [0, 0], stratSum: [0, 0] });
  }

  private static match(regret: readonly [number, number]): [number, number] {
    const a = Math.max(0, regret[0]);
    const b = Math.max(0, regret[1]);
    const s = a + b;
    return s > 0 ? [a / s, b / s] : [0.5, 0.5];
  }

  currentStrategy(): KuhnStrategy {
    const s: KuhnStrategy = {};
    for (const [k, n] of this.nodes) s[k] = KuhnCFR.match(n.regret);
    return s;
  }

  averageStrategy(): KuhnStrategy {
    const s: KuhnStrategy = {};
    for (const [k, n] of this.nodes) {
      const t = n.stratSum[0] + n.stratSum[1];
      s[k] = t > 0 ? [n.stratSum[0] / t, n.stratSum[1] / t] : [0.5, 0.5];
    }
    return s;
  }

  regrets(): Record<string, [number, number]> {
    const r: Record<string, [number, number]> = {};
    for (const [k, n] of this.nodes) r[k] = [n.regret[0] / Math.max(1, this.iterations), n.regret[1] / Math.max(1, this.iterations)];
    return r;
  }

  iterate(n = 1): void {
    for (let i = 0; i < n; i++) {
      this.iterations++;
      const current = this.currentStrategy();
      const delta = new Map<string, [number, number]>();
      for (const k of ALL_INFOSETS) delta.set(k, [0, 0]);
      const w = this.variant === 'cfr+' ? this.iterations : 1;
      const rec = (cards: readonly [number, number], history: string, p0: number, p1: number): number => {
        const t = terminal(history, cards);
        if (t !== null) return t;
        const player = history.length % 2;
        const key = KUHN_CARDS[cards[player]] + history;
        const s = current[key];
        const node = this.nodes.get(key)!;
        const own = player === 0 ? p0 : p1;
        const opp = player === 0 ? p1 : p0;
        node.stratSum[0] += w * own * s[0];
        node.stratSum[1] += w * own * s[1];
        const u0 = -(player === 0 ? rec(cards, history + 'p', p0 * s[0], p1) : rec(cards, history + 'p', p0, p1 * s[0]));
        const u1 = -(player === 0 ? rec(cards, history + 'b', p0 * s[1], p1) : rec(cards, history + 'b', p0, p1 * s[1]));
        const u = s[0] * u0 + s[1] * u1;
        const d = delta.get(key)!;
        d[0] += opp * (u0 - u);
        d[1] += opp * (u1 - u);
        return u;
      };
      for (const d of DEALS) rec(d, '', 1 / 6, 1 / 6);
      for (const [k, d] of delta) {
        const node = this.nodes.get(k)!;
        node.regret[0] += d[0];
        node.regret[1] += d[1];
        if (this.variant === 'cfr+') {
          node.regret[0] = Math.max(0, node.regret[0]);
          node.regret[1] = Math.max(0, node.regret[1]);
        }
      }
    }
  }
}

/** Rock–paper–scissors regret matching, either against a fixed opponent or in self-play. */
export class RegretMatchingRPS {
  regret = [0, 0, 0];
  stratSum = [0, 0, 0];
  oppRegret = [0, 0, 0];
  oppStratSum = [0, 0, 0];
  iterations = 0;

  constructor(
    readonly mode: 'fixed' | 'self-play',
    readonly fixedOpponent: number[] = [0.4, 0.3, 0.3],
  ) {}

  static payoff(a: number, b: number): number {
    if (a === b) return 0;
    return (a - b + 3) % 3 === 1 ? 1 : -1;
  }

  private static match(r: number[]): number[] {
    const pos = r.map((x) => Math.max(0, x));
    const s = pos[0] + pos[1] + pos[2];
    return s > 0 ? pos.map((x) => x / s) : [1 / 3, 1 / 3, 1 / 3];
  }

  current(): number[] {
    return RegretMatchingRPS.match(this.regret);
  }

  opponentCurrent(): number[] {
    return this.mode === 'fixed' ? this.fixedOpponent : RegretMatchingRPS.match(this.oppRegret);
  }

  average(): number[] {
    const s = this.stratSum[0] + this.stratSum[1] + this.stratSum[2];
    return s > 0 ? this.stratSum.map((x) => x / s) : [1 / 3, 1 / 3, 1 / 3];
  }

  opponentAverage(): number[] {
    if (this.mode === 'fixed') return this.fixedOpponent;
    const s = this.oppStratSum[0] + this.oppStratSum[1] + this.oppStratSum[2];
    return s > 0 ? this.oppStratSum.map((x) => x / s) : [1 / 3, 1 / 3, 1 / 3];
  }

  iterate(n = 1): void {
    for (let t = 0; t < n; t++) {
      this.iterations++;
      const me = this.current();
      const opp = this.opponentCurrent();
      const util = [0, 1, 2].map((a) => opp.reduce((acc, p, b) => acc + p * RegretMatchingRPS.payoff(a, b), 0));
      const u = me.reduce((acc, p, a) => acc + p * util[a], 0);
      for (let a = 0; a < 3; a++) {
        this.regret[a] += util[a] - u;
        this.stratSum[a] += me[a];
      }
      if (this.mode === 'self-play') {
        const oppUtil = [0, 1, 2].map((a) => me.reduce((acc, p, b) => acc + p * RegretMatchingRPS.payoff(a, b), 0));
        const ou = opp.reduce((acc, p, a) => acc + p * oppUtil[a], 0);
        for (let a = 0; a < 3; a++) {
          this.oppRegret[a] += oppUtil[a] - ou;
          this.oppStratSum[a] += opp[a];
        }
      }
    }
  }
}
