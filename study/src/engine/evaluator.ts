// Hand evaluator for 5–7 cards. A score packs the category into bits 20+ and
// up to five ranks (4 bits each) below it, so a higher score is a better hand.
import { type Card, RANK_NAMES, RANK_PLURALS } from './cards';

export const HIGH_CARD = 0;
export const PAIR = 1;
export const TWO_PAIR = 2;
export const TRIPS = 3;
export const STRAIGHT = 4;
export const FLUSH = 5;
export const FULL_HOUSE = 6;
export const QUADS = 7;
export const STRAIGHT_FLUSH = 8;

export const CATEGORY_NAMES = [
  'High card',
  'One pair',
  'Two pair',
  'Three of a kind',
  'Straight',
  'Flush',
  'Full house',
  'Four of a kind',
  'Straight flush',
];

const counts = new Int8Array(13);
const suitMasks = new Int32Array(4);

export function popcount(x: number): number {
  x = x - ((x >> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
  return (((x + (x >> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/** Highest rank of a straight in a 13-bit rank mask, or -1. The wheel counts as 5-high. */
export function straightHigh(mask: number): number {
  const m = (mask << 1) | ((mask >> 12) & 1);
  const s = m & (m >> 1) & (m >> 2) & (m >> 3) & (m >> 4);
  return s === 0 ? -1 : 31 - Math.clz32(s) + 3;
}

/** The k highest ranks in mask, packed high-first into 4-bit nibbles. */
function topRanks(mask: number, k: number): number {
  let out = 0;
  let n = 0;
  for (let r = 12; r >= 0 && n < k; r--) {
    if (mask & (1 << r)) {
      out = (out << 4) | r;
      n++;
    }
  }
  return out << (4 * (k - n));
}

export function evaluate(cards: ArrayLike<Card>, n: number = cards.length): number {
  counts.fill(0);
  suitMasks[0] = suitMasks[1] = suitMasks[2] = suitMasks[3] = 0;
  let rankMask = 0;
  for (let i = 0; i < n; i++) {
    const c = cards[i];
    const r = c >> 2;
    counts[r]++;
    suitMasks[c & 3] |= 1 << r;
    rankMask |= 1 << r;
  }

  let flushMask = 0;
  for (let s = 0; s < 4; s++) {
    if (popcount(suitMasks[s]) >= 5) {
      flushMask = suitMasks[s];
      break;
    }
  }
  if (flushMask) {
    const sf = straightHigh(flushMask);
    if (sf >= 0) return (STRAIGHT_FLUSH << 20) | (sf << 16);
  }

  let quad = -1;
  let t1 = -1;
  let t2 = -1;
  let p1 = -1;
  let p2 = -1;
  for (let r = 12; r >= 0; r--) {
    const k = counts[r];
    if (k === 4) quad = r;
    else if (k === 3) {
      if (t1 < 0) t1 = r;
      else if (t2 < 0) t2 = r;
    } else if (k === 2) {
      if (p1 < 0) p1 = r;
      else if (p2 < 0) p2 = r;
    }
  }

  if (quad >= 0) return (QUADS << 20) | (quad << 16) | (topRanks(rankMask & ~(1 << quad), 1) << 12);
  if (t1 >= 0 && (t2 >= 0 || p1 >= 0)) return (FULL_HOUSE << 20) | (t1 << 16) | (Math.max(t2, p1) << 12);
  if (flushMask) return (FLUSH << 20) | topRanks(flushMask, 5);
  const st = straightHigh(rankMask);
  if (st >= 0) return (STRAIGHT << 20) | (st << 16);
  if (t1 >= 0) return (TRIPS << 20) | (t1 << 16) | (topRanks(rankMask & ~(1 << t1), 2) << 8);
  if (p2 >= 0) {
    return (TWO_PAIR << 20) | (p1 << 16) | (p2 << 12) | (topRanks(rankMask & ~(1 << p1) & ~(1 << p2), 1) << 8);
  }
  if (p1 >= 0) return (PAIR << 20) | (p1 << 16) | (topRanks(rankMask & ~(1 << p1), 3) << 4);
  return topRanks(rankMask, 5);
}

export const categoryOf = (score: number) => score >> 20;

/** Like describeScore, plus the deciding kicker where one exists. */
export function describeScoreWithKicker(score: number): string {
  const cat = score >> 20;
  const r = (i: number) => (score >> (16 - 4 * i)) & 15;
  const base = describeScore(score);
  switch (cat) {
    case QUADS:
    case TRIPS:
    case PAIR:
      return `${base}, ${RANK_NAMES[r(1)]} kicker`;
    case TWO_PAIR:
      return `${base}, ${RANK_NAMES[r(2)]} kicker`;
    case HIGH_CARD:
      return `${base}, ${RANK_NAMES[r(1)]} kicker`;
    default:
      return base;
  }
}

export function describeScore(score: number): string {
  const cat = score >> 20;
  const r = (i: number) => (score >> (16 - 4 * i)) & 15;
  switch (cat) {
    case STRAIGHT_FLUSH:
      return r(0) === 12 ? 'Royal flush' : `Straight flush, ${RANK_NAMES[r(0)]}-high`;
    case QUADS:
      return `Four ${RANK_PLURALS[r(0)]}`;
    case FULL_HOUSE:
      return `${RANK_PLURALS[r(0)]} full of ${RANK_PLURALS[r(1)]}`;
    case FLUSH:
      return `Flush, ${RANK_NAMES[r(0)]}-high`;
    case STRAIGHT:
      return `Straight, ${RANK_NAMES[r(0)]}-high`;
    case TRIPS:
      return `Three ${RANK_PLURALS[r(0)]}`;
    case TWO_PAIR:
      return `Two pair, ${RANK_PLURALS[r(0)]} and ${RANK_PLURALS[r(1)]}`;
    case PAIR:
      return `Pair of ${RANK_PLURALS[r(0)]}`;
    default:
      return `${RANK_NAMES[r(0)]}-high`;
  }
}
