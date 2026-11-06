// All-in equity for 2–4 players, each a weighted list of hole-card combos.
// Exact enumeration when it is cheap enough, Monte Carlo otherwise.
import type { Card } from './cards';
import { evaluate } from './evaluator';
import type { Rng } from './rng';

export interface WeightedCombo {
  a: Card;
  b: Card;
  w: number;
}

export interface EquityResult {
  equity: number[];
  win: number[];
  tie: number[];
  /** Per player: share of final hand categories (index = evaluator category). */
  categories: number[][];
  samples: number;
  exact: boolean;
}

export function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

export function singleCombo(a: Card, b: Card): WeightedCombo[] {
  return [{ a, b, w: 1 }];
}

export class EquitySim {
  readonly players: WeightedCombo[][];
  readonly board: Card[];
  readonly dead: Card[];
  readonly error: string | null = null;
  private readonly cum: Float64Array[];
  private readonly n: number;
  private share: Float64Array;
  private wins: Float64Array;
  private ties: Float64Array;
  private cats: Float64Array[];
  private weight = 0;
  private samples = 0;
  private exact = false;
  private readonly hand = new Int32Array(7);
  private readonly full = new Int32Array(5);
  private readonly scores: Int32Array;

  constructor(players: WeightedCombo[][], board: Card[], dead: Card[] = [], private readonly rng: Rng = Math.random) {
    const deadSet = new Set([...board, ...dead]);
    this.board = board.slice();
    this.dead = dead.slice();
    this.players = players.map((p) => p.filter((c) => c.w > 0 && c.a !== c.b && !deadSet.has(c.a) && !deadSet.has(c.b)));
    this.n = players.length;
    if (this.n < 2) this.error = 'Need at least two players.';
    else if (this.players.some((p) => p.length === 0)) this.error = 'A player has no possible hands after card removal.';
    else if (board.length > 5) this.error = 'The board has more than five cards.';
    else if (this.players.every((p) => p.length === 1)) {
      const seen = new Set(this.board.concat(this.dead));
      for (const [c] of this.players) {
        if (seen.has(c.a) || seen.has(c.b)) this.error = 'Two players share a card.';
        seen.add(c.a);
        seen.add(c.b);
      }
    }
    this.cum = this.players.map((p) => {
      const arr = new Float64Array(p.length);
      let s = 0;
      p.forEach((c, i) => (arr[i] = s += c.w));
      return arr;
    });
    this.share = new Float64Array(this.n);
    this.wins = new Float64Array(this.n);
    this.ties = new Float64Array(this.n);
    this.cats = this.players.map(() => new Float64Array(9));
    this.scores = new Int32Array(this.n);
  }

  /** Number of showdowns an exact enumeration would evaluate. */
  exactCost(): number {
    if (this.error) return Infinity;
    const missing = 5 - this.board.length;
    const free = 52 - this.board.length - this.dead.length - 2 * this.n;
    const runouts = binom(free, missing);
    if (this.players.every((p) => p.length === 1)) return runouts;
    if (this.n !== 2) return Infinity;
    return runouts * this.players[0].length * this.players[1].length;
  }

  private reset() {
    this.share.fill(0);
    this.wins.fill(0);
    this.ties.fill(0);
    this.cats.forEach((c) => c.fill(0));
    this.weight = 0;
    this.samples = 0;
  }

  /** Scores one completed deal; `chosen` holds each player's combo. */
  private showdown(chosen: WeightedCombo[], w: number) {
    const { hand, full, scores } = this;
    for (let k = 0; k < 5; k++) hand[k + 2] = full[k];
    let best = -1;
    let winners = 0;
    for (let p = 0; p < this.n; p++) {
      hand[0] = chosen[p].a;
      hand[1] = chosen[p].b;
      const s = evaluate(hand, 7);
      scores[p] = s;
      if (s > best) {
        best = s;
        winners = 1;
      } else if (s === best) winners++;
    }
    for (let p = 0; p < this.n; p++) {
      this.cats[p][scores[p] >> 20] += w;
      if (scores[p] === best) {
        this.share[p] += w / winners;
        if (winners === 1) this.wins[p] += w;
        else this.ties[p] += w;
      }
    }
    this.weight += w;
    this.samples++;
  }

  runExact(): void {
    this.reset();
    this.exact = true;
    const used = new Uint8Array(52);
    for (const c of this.board) used[c] = 1;
    for (const c of this.dead) used[c] = 1;
    const missing = 5 - this.board.length;
    for (let k = 0; k < this.board.length; k++) this.full[k] = this.board[k];

    const enumerate = (chosen: WeightedCombo[], w: number) => {
      const deck: number[] = [];
      for (let c = 0; c < 52; c++) if (!used[c]) deck.push(c);
      const idx = new Int32Array(missing);
      const rec = (start: number, depth: number) => {
        if (depth === missing) {
          for (let k = 0; k < missing; k++) this.full[this.board.length + k] = deck[idx[k]];
          this.showdown(chosen, w);
          return;
        }
        for (let i = start; i <= deck.length - (missing - depth); i++) {
          idx[depth] = i;
          rec(i + 1, depth + 1);
        }
      };
      rec(0, 0);
    };

    if (this.players.every((p) => p.length === 1)) {
      const chosen = this.players.map((p) => p[0]);
      for (const c of chosen) used[c.a] = used[c.b] = 1;
      enumerate(chosen, 1);
      return;
    }
    // Two ranges: every non-overlapping pair of combos, every runout.
    for (const x of this.players[0]) {
      used[x.a] = used[x.b] = 1;
      for (const y of this.players[1]) {
        if (used[y.a] || used[y.b]) continue;
        used[y.a] = used[y.b] = 1;
        enumerate([x, y], x.w * y.w);
        used[y.a] = used[y.b] = 0;
      }
      used[x.a] = used[x.b] = 0;
    }
  }

  private sampleIndex(p: number): number {
    const cum = this.cum[p];
    const x = this.rng() * cum[cum.length - 1];
    let lo = 0;
    let hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] > x) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }

  /** Adds n Monte Carlo trials to the running totals. */
  runMonteCarlo(n: number): void {
    if (this.exact) {
      this.reset();
      this.exact = false;
    }
    const used = new Uint8Array(52);
    const chosen: WeightedCombo[] = new Array(this.n);
    const boardLen = this.board.length;
    for (let k = 0; k < boardLen; k++) this.full[k] = this.board[k];
    for (let t = 0; t < n; t++) {
      let ok = false;
      for (let attempt = 0; attempt < 200 && !ok; attempt++) {
        used.fill(0);
        for (const c of this.board) used[c] = 1;
        for (const c of this.dead) used[c] = 1;
        ok = true;
        for (let p = 0; p < this.n; p++) {
          const c = this.players[p][this.sampleIndex(p)];
          if (used[c.a] || used[c.b]) {
            ok = false;
            break;
          }
          used[c.a] = used[c.b] = 1;
          chosen[p] = c;
        }
      }
      if (!ok) continue;
      for (let k = boardLen; k < 5; k++) {
        let c: number;
        do c = (this.rng() * 52) | 0;
        while (used[c]);
        used[c] = 1;
        this.full[k] = c;
      }
      this.showdown(chosen, 1);
    }
  }

  result(): EquityResult {
    const W = this.weight || 1;
    return {
      equity: Array.from(this.share, (x) => x / W),
      win: Array.from(this.wins, (x) => x / W),
      tie: Array.from(this.ties, (x) => x / W),
      categories: this.cats.map((c) => Array.from(c, (x) => x / W)),
      samples: this.samples,
      exact: this.exact,
    };
  }
}

export interface EquityOptions {
  dead?: Card[];
  iterations?: number;
  exactLimit?: number;
  rng?: Rng;
}

export function computeEquity(players: WeightedCombo[][], board: Card[], opts: EquityOptions = {}): EquityResult {
  const sim = new EquitySim(players, board, opts.dead ?? [], opts.rng);
  if (sim.error) throw new Error(sim.error);
  if (sim.exactCost() <= (opts.exactLimit ?? 60000)) sim.runExact();
  else sim.runMonteCarlo(opts.iterations ?? 30000);
  return sim.result();
}

/** Equity of hand a vs hand b on a board, from a's side. */
export function headsUpEquity(a: [Card, Card], b: [Card, Card], board: Card[] = [], iterations = 30000): number {
  return computeEquity([singleCombo(a[0], a[1]), singleCombo(b[0], b[1])], board, { iterations }).equity[0];
}
