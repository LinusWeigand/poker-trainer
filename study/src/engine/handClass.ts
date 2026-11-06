// What a holding "is" on a board: made-hand class plus draws, the way players
// talk about it (top pair, overpair, open-ender...). Used by the range explorer.
import { type Card, rankOf, suitOf, remainingDeck } from './cards';
import { evaluate, straightHigh, STRAIGHT } from './evaluator';

export type MadeClass =
  | 'straight-flush'
  | 'quads'
  | 'full-house'
  | 'flush'
  | 'straight'
  | 'set'
  | 'trips'
  | 'two-pair'
  | 'overpair'
  | 'top-pair-good'
  | 'top-pair-weak'
  | 'pp-below-top'
  | 'middle-pair'
  | 'weak-pair'
  | 'underpair'
  | 'ace-high'
  | 'nothing';

export type DrawClass = 'flush-draw' | 'oesd' | 'gutshot' | 'overcards';

export const MADE_ORDER: MadeClass[] = [
  'straight-flush',
  'quads',
  'full-house',
  'flush',
  'straight',
  'set',
  'trips',
  'two-pair',
  'overpair',
  'top-pair-good',
  'top-pair-weak',
  'pp-below-top',
  'middle-pair',
  'weak-pair',
  'underpair',
  'ace-high',
  'nothing',
];

export const MADE_LABELS: Record<MadeClass, string> = {
  'straight-flush': 'Straight flush',
  quads: 'Quads',
  'full-house': 'Full house',
  flush: 'Flush',
  straight: 'Straight',
  set: 'Set',
  trips: 'Trips',
  'two-pair': 'Two pair',
  overpair: 'Overpair',
  'top-pair-good': 'Top pair, good kicker',
  'top-pair-weak': 'Top pair, weak kicker',
  'pp-below-top': 'Pocket pair below top card',
  'middle-pair': 'Middle pair',
  'weak-pair': 'Bottom / weak pair',
  underpair: 'Underpair',
  'ace-high': 'Ace high',
  nothing: 'No made hand',
};

export const DRAW_ORDER: DrawClass[] = ['flush-draw', 'oesd', 'gutshot', 'overcards'];

export const DRAW_LABELS: Record<DrawClass, string> = {
  'flush-draw': 'Flush draw',
  oesd: 'Open-ender / double gutter',
  gutshot: 'Gutshot',
  overcards: 'Two overcards',
};

/** Which strength tier a class belongs to, for colouring. */
export function madeTier(m: MadeClass): 'nutted' | 'strong' | 'medium' | 'weak' | 'air' {
  switch (m) {
    case 'straight-flush':
    case 'quads':
    case 'full-house':
    case 'flush':
    case 'straight':
    case 'set':
      return 'nutted';
    case 'trips':
    case 'two-pair':
    case 'overpair':
    case 'top-pair-good':
      return 'strong';
    case 'top-pair-weak':
    case 'pp-below-top':
    case 'middle-pair':
      return 'medium';
    case 'weak-pair':
    case 'underpair':
      return 'weak';
    default:
      return 'air';
  }
}

export interface HandClass {
  made: MadeClass;
  draws: DrawClass[];
  score: number;
}

export function classifyHand(hole: readonly [Card, Card], board: readonly Card[]): HandClass {
  const all = [hole[0], hole[1], ...board];
  const score = evaluate(all);
  const cat = score >> 20;
  const r1 = rankOf(hole[0]);
  const r2 = rankOf(hole[1]);
  const boardCount = new Array(13).fill(0);
  let boardMask = 0;
  for (const c of board) {
    boardCount[rankOf(c)]++;
    boardMask |= 1 << rankOf(c);
  }
  const uniq = [...new Set(board.map(rankOf))].sort((a, b) => b - a);
  const top = uniq[0] ?? -1;
  const bottom = uniq[uniq.length - 1] ?? -1;

  let made: MadeClass;
  if (cat >= 4) {
    made = (['straight', 'flush', 'full-house', 'quads', 'straight-flush'] as const)[cat - 4];
  } else if (r1 === r2) {
    if (boardCount[r1] >= 1) made = 'set';
    else if (r1 > top) made = 'overpair';
    else if (r1 < bottom) made = 'underpair';
    else made = 'pp-below-top';
  } else {
    const m1 = boardCount[r1] > 0;
    const m2 = boardCount[r2] > 0;
    if (m1 && m2) made = boardCount[r1] >= 2 || boardCount[r2] >= 2 ? 'trips' : 'two-pair';
    else if (m1 || m2) {
      const m = m1 ? r1 : r2;
      const kicker = m1 ? r2 : r1;
      if (boardCount[m] >= 2) made = 'trips';
      else if (m === top) made = kicker >= 8 ? 'top-pair-good' : 'top-pair-weak';
      else if (m === uniq[1]) made = 'middle-pair';
      else made = 'weak-pair';
    } else made = Math.max(r1, r2) === 12 ? 'ace-high' : 'nothing';
  }

  const draws: DrawClass[] = [];
  if (board.length >= 3 && board.length <= 4) {
    if (cat < 5) {
      const suitCount = [0, 0, 0, 0];
      for (const c of all) suitCount[suitOf(c)]++;
      for (let s = 0; s < 4; s++) {
        if (suitCount[s] === 4 && (suitOf(hole[0]) === s || suitOf(hole[1]) === s)) draws.push('flush-draw');
      }
    }
    if (cat < STRAIGHT) {
      const mask = boardMask | (1 << r1) | (1 << r2);
      let outs = 0;
      for (let r = 0; r < 13; r++) {
        if (mask & (1 << r)) continue;
        if (straightHigh(mask | (1 << r)) >= 0 && straightHigh(boardMask | (1 << r)) < 0) outs++;
      }
      if (outs >= 2) draws.push('oesd');
      else if (outs === 1) draws.push('gutshot');
    }
    if ((made === 'ace-high' || made === 'nothing') && Math.min(r1, r2) > top) draws.push('overcards');
  }
  return { made, draws, score };
}

export interface HoldingTier {
  score: number;
  combos: [Card, Card][];
}

/** Every two-card holding on this board grouped by hand value, best first. */
export function rankHoldings(board: readonly Card[], dead: readonly Card[] = []): HoldingTier[] {
  const deck = remainingDeck([...board, ...dead]);
  const map = new Map<number, [Card, Card][]>();
  const buf = [0, 0, ...board];
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      buf[0] = deck[i];
      buf[1] = deck[j];
      const s = evaluate(buf);
      const list = map.get(s);
      if (list) list.push([deck[j], deck[i]]);
      else map.set(s, [[deck[j], deck[i]]]);
    }
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([score, combos]) => ({ score, combos }));
}
