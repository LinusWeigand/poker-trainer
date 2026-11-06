// Board texture: suits, pairing, connectivity, and how often the turn changes the nuts.
import { type Card, rankOf, suitOf, remainingDeck, RANK_NAMES } from './cards';
import { evaluate } from './evaluator';

export type SuitTexture = 'rainbow' | 'two-tone' | 'monotone' | 'flush possible' | 'four-flush';
export type Wetness = 'dry' | 'semi-wet' | 'wet';
export type Height = 'ace-high' | 'broadway' | 'middle' | 'low';

export interface Texture {
  suits: SuitTexture;
  paired: 'unpaired' | 'paired' | 'two pair' | 'trips';
  highCard: number;
  height: Height;
  /** Sum over straight windows holding 2+ board ranks of (ranks in window − 1). */
  connectivity: number;
  /** Two-card rank combinations that already make a straight. */
  straightCombos: number;
  wetness: Wetness;
  wetScore: number;
  /** Share of turn cards that change the category of the nuts (flop only). */
  volatility: number | null;
  nuts: number;
  heuristics: string[];
}

const WINDOWS: number[][] = (() => {
  const w: number[][] = [[12, 0, 1, 2, 3]];
  for (let lo = 0; lo <= 8; lo++) w.push([lo, lo + 1, lo + 2, lo + 3, lo + 4]);
  return w;
})();

export function bestHoldingScore(board: readonly Card[]): number {
  const deck = remainingDeck(board);
  const buf = [0, 0, ...board];
  let best = -1;
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      buf[0] = deck[i];
      buf[1] = deck[j];
      const s = evaluate(buf);
      if (s > best) best = s;
    }
  }
  return best;
}

export function analyzeBoard(board: readonly Card[]): Texture {
  const ranks = board.map(rankOf);
  const uniq = [...new Set(ranks)];
  const counts = new Array(13).fill(0);
  ranks.forEach((r) => counts[r]++);
  const suitCount = [0, 0, 0, 0];
  board.forEach((c) => suitCount[suitOf(c)]++);
  const maxSuit = Math.max(...suitCount);

  let suits: SuitTexture;
  if (board.length <= 3) suits = maxSuit >= 3 ? 'monotone' : maxSuit === 2 ? 'two-tone' : 'rainbow';
  else suits = maxSuit >= 4 ? 'four-flush' : maxSuit === 3 ? 'flush possible' : maxSuit === 2 ? 'two-tone' : 'rainbow';

  const maxCount = Math.max(...counts);
  const pairs = counts.filter((c) => c === 2).length;
  const paired = maxCount >= 3 ? 'trips' : pairs >= 2 ? 'two pair' : pairs === 1 ? 'paired' : 'unpaired';

  const highCard = Math.max(...ranks);
  const height: Height = highCard === 12 ? 'ace-high' : highCard >= 9 ? 'broadway' : highCard >= 6 ? 'middle' : 'low';

  let connectivity = 0;
  for (const win of WINDOWS) {
    const k = win.filter((r) => uniq.includes(r)).length;
    if (k >= 2) connectivity += k - 1;
  }

  let mask = 0;
  uniq.forEach((r) => (mask |= 1 << r));
  let straightCombos = 0;
  for (let a = 0; a < 13; a++) {
    for (let b = a + 1; b < 13; b++) {
      const m = mask | (1 << a) | (1 << b);
      const mm = (m << 1) | ((m >> 12) & 1);
      if (mm & (mm >> 1) & (mm >> 2) & (mm >> 3) & (mm >> 4)) straightCombos++;
    }
  }

  const flushPts = suits === 'rainbow' ? 0 : suits === 'two-tone' ? 1.5 : 3;
  const wetScore = flushPts + connectivity * 0.4 - (paired === 'unpaired' ? 0 : 0.5);
  const wetness: Wetness = wetScore < 1.6 ? 'dry' : wetScore < 3 ? 'semi-wet' : 'wet';

  const nuts = bestHoldingScore(board);
  let volatility: number | null = null;
  if (board.length === 3) {
    const turns = remainingDeck(board);
    let changed = 0;
    for (const t of turns) if (bestHoldingScore([...board, t]) >> 20 !== nuts >> 20) changed++;
    volatility = changed / turns.length;
  }

  const heuristics: string[] = [];
  const top = RANK_NAMES[highCard];
  if (paired !== 'unpaired' && highCard <= 9 && suits !== 'monotone') {
    heuristics.push('Paired boards hit few hands. The preflop raiser keeps more overpairs, so small, frequent c-bets do well.');
  }
  if (suits === 'monotone') {
    heuristics.push('Monotone flops compress equities. Expect the raiser to c-bet less often and mostly small; holding the ace of the suit matters a lot.');
  }
  if ((height === 'ace-high' || highCard === 11) && connectivity <= 3 && suits !== 'monotone') {
    heuristics.push(`${top}-high dry boards favour the preflop raiser (more ${top[0]}x and big pairs). Solvers like a high-frequency small bet (25–33% pot).`);
  }
  if (highCard <= 8 && connectivity >= 5) {
    heuristics.push('Low connected boards favour the caller (suited connectors, small pairs, two pair). The raiser checks more and polarises when betting.');
  }
  if (height === 'broadway' && connectivity >= 4) {
    heuristics.push('Connected broadway boards hit both ranges. The raiser has more big pairs and AK/AQ; the caller has many broadway combos. Mixed strategies are common.');
  }
  if (wetness === 'wet') {
    heuristics.push('Wet, dynamic board: equities run close and many turns change the nuts. Bigger bets protect equity and charge draws.');
  } else if (wetness === 'dry') {
    heuristics.push('Dry, static board: few turns change the best hand, so there is less urgency to bet big. Small sizes go a long way.');
  }
  return { suits, paired, highCard, height, connectivity, straightCombos, wetness, wetScore, volatility, nuts, heuristics };
}
