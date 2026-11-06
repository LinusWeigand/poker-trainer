// Hand-class ranges in the usual notation: "22+, A2s+, KTo+, QJs:0.5, T9s-T7s".
// A range maps a hand class ("AKs", "AKo", "QQ") to a weight in (0, 1].
import { type Card, RANKS, makeCard, rankOf, suitOf } from './cards';
import { PREFLOP_EQUITY } from './preflopEquity';
import type { WeightedCombo } from './equity';

export type Range = Record<string, number>;

/** Grid order, high to low. */
export const GRID = 'AKQJT98765432';

export function gridKey(row: number, col: number): string {
  const a = GRID[row];
  const b = GRID[col];
  if (row === col) return a + b;
  return row < col ? a + b + 's' : b + a + 'o';
}

export const HAND_KEYS: string[] = [];
for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) HAND_KEYS.push(gridKey(r, c));

export type KeyKind = 'pair' | 'suited' | 'offsuit';

export function keyKind(key: string): KeyKind {
  if (key.length === 2) return 'pair';
  return key[2] === 's' ? 'suited' : 'offsuit';
}

export function keyComboCount(key: string): number {
  const k = keyKind(key);
  return k === 'pair' ? 6 : k === 'suited' ? 4 : 12;
}

const comboCache = new Map<string, [Card, Card][]>();

export function keyCombos(key: string): [Card, Card][] {
  const cached = comboCache.get(key);
  if (cached) return cached;
  const r1 = RANKS.indexOf(key[0]);
  const r2 = RANKS.indexOf(key[1]);
  const out: [Card, Card][] = [];
  const kind = keyKind(key);
  if (kind === 'pair') {
    for (let s1 = 0; s1 < 4; s1++) for (let s2 = s1 + 1; s2 < 4; s2++) out.push([makeCard(r1, s2), makeCard(r1, s1)]);
  } else if (kind === 'suited') {
    for (let s = 0; s < 4; s++) out.push([makeCard(r1, s), makeCard(r2, s)]);
  } else {
    for (let s1 = 0; s1 < 4; s1++) for (let s2 = 0; s2 < 4; s2++) if (s1 !== s2) out.push([makeCard(r1, s1), makeCard(r2, s2)]);
  }
  comboCache.set(key, out);
  return out;
}

export function keyFromCards(a: Card, b: Card): string {
  const ra = rankOf(a);
  const rb = rankOf(b);
  if (ra === rb) return RANKS[ra] + RANKS[ra];
  const hi = Math.max(ra, rb);
  const lo = Math.min(ra, rb);
  return RANKS[hi] + RANKS[lo] + (suitOf(a) === suitOf(b) ? 's' : 'o');
}

/** Combos of a class that survive the dead cards. */
export function liveCombos(key: string, dead: ReadonlySet<Card>): [Card, Card][] {
  return keyCombos(key).filter(([a, b]) => !dead.has(a) && !dead.has(b));
}

function normToken(t: string): string {
  let out = '';
  for (const ch of t) {
    const up = ch.toUpperCase();
    out += RANKS.includes(up) ? up : ch.toLowerCase();
  }
  return out;
}

function nonPairKeys(hi: number, lo: number, kind: string | undefined): string[] {
  const base = RANKS[hi] + RANKS[lo];
  if (kind === 's') return [base + 's'];
  if (kind === 'o') return [base + 'o'];
  return [base + 's', base + 'o'];
}

/** Expands one token (without weight) into hand classes, or null if it is not valid. */
export function expandToken(raw: string): string[] | null {
  const t = normToken(raw.trim()).replace(/10/g, 'T');
  if (!t) return [];
  if (/^(any|all|random|100%)$/i.test(raw.trim())) return [...HAND_KEYS];
  let m: RegExpMatchArray | null;

  // Pairs: 77, 77+, 99-66
  if ((m = t.match(/^([2-9TJQKA])\1(\+)?$/))) {
    const r = RANKS.indexOf(m[1]);
    if (!m[2]) return [m[1] + m[1]];
    const out: string[] = [];
    for (let x = r; x <= 12; x++) out.push(RANKS[x] + RANKS[x]);
    return out;
  }
  if ((m = t.match(/^([2-9TJQKA])\1-([2-9TJQKA])\2$/))) {
    const a = RANKS.indexOf(m[1]);
    const b = RANKS.indexOf(m[2]);
    const out: string[] = [];
    for (let x = Math.min(a, b); x <= Math.max(a, b); x++) out.push(RANKS[x] + RANKS[x]);
    return out;
  }
  // Ranges of one high card: A5s-A2s, KQo-KT
  if ((m = t.match(/^([2-9TJQKA])([2-9TJQKA])([so])?-([2-9TJQKA])([2-9TJQKA])([so])?$/))) {
    if (m[1] !== m[4]) return null;
    const hi = RANKS.indexOf(m[1]);
    const a = RANKS.indexOf(m[2]);
    const b = RANKS.indexOf(m[5]);
    if (a >= hi || b >= hi) return null;
    const kind = m[3] ?? m[6];
    const out: string[] = [];
    for (let x = Math.min(a, b); x <= Math.max(a, b); x++) out.push(...nonPairKeys(hi, x, kind));
    return out;
  }
  // Single non-pair class, optionally with +: AKs, KTo+, QJ
  if ((m = t.match(/^([2-9TJQKA])([2-9TJQKA])([so])?(\+)?$/))) {
    let hi = RANKS.indexOf(m[1]);
    let lo = RANKS.indexOf(m[2]);
    if (hi === lo) return null;
    if (lo > hi) [hi, lo] = [lo, hi];
    if (!m[4]) return nonPairKeys(hi, lo, m[3]);
    const out: string[] = [];
    for (let x = lo; x < hi; x++) out.push(...nonPairKeys(hi, x, m[3]));
    return out;
  }
  return null;
}

export function parseRange(text: string): { range: Range; errors: string[] } {
  const range: Range = {};
  const errors: string[] = [];
  for (const rawTok of text.split(/[,\s]+/)) {
    const tok = rawTok.trim();
    if (!tok) continue;
    let weight = 1;
    let body = tok;
    const wm = tok.match(/^(.*?)[:@](\d*\.?\d+)(%?)$/);
    if (wm) {
      body = wm[1];
      weight = parseFloat(wm[2]);
      if (wm[3] === '%' || weight > 1) weight /= 100;
      weight = Math.max(0, Math.min(1, weight));
    }
    const keys = expandToken(body);
    if (keys === null) {
      errors.push(tok);
      continue;
    }
    for (const k of keys) {
      if (weight > 0) range[k] = weight;
      else delete range[k];
    }
  }
  return { range, errors };
}

export function rangeToString(range: Range): string {
  const tokens: string[] = [];
  const w = (k: string) => range[k] ?? 0;
  const fmt = (t: string, weight: number) => (weight >= 0.999 ? t : `${t}:${+weight.toFixed(2)}`);
  const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;

  for (let i = 12; i >= 0; ) {
    const wt = w(RANKS[i] + RANKS[i]);
    if (wt <= 0) {
      i--;
      continue;
    }
    let j = i;
    while (j - 1 >= 0 && same(w(RANKS[j - 1] + RANKS[j - 1]), wt)) j--;
    const top = RANKS[i] + RANKS[i];
    const bottom = RANKS[j] + RANKS[j];
    if (i === j) tokens.push(fmt(top, wt));
    else if (i === 12) tokens.push(fmt(bottom + '+', wt));
    else tokens.push(fmt(`${top}-${bottom}`, wt));
    i = j - 1;
  }
  for (const suffix of ['s', 'o']) {
    for (let h = 12; h >= 1; h--) {
      for (let k = h - 1; k >= 0; ) {
        const wt = w(RANKS[h] + RANKS[k] + suffix);
        if (wt <= 0) {
          k--;
          continue;
        }
        let m = k;
        while (m - 1 >= 0 && same(w(RANKS[h] + RANKS[m - 1] + suffix), wt)) m--;
        const top = RANKS[h] + RANKS[k] + suffix;
        const bottom = RANKS[h] + RANKS[m] + suffix;
        if (k === m) tokens.push(fmt(top, wt));
        else if (k === h - 1) tokens.push(fmt(bottom + '+', wt));
        else tokens.push(fmt(`${top}-${bottom}`, wt));
        k = m - 1;
      }
    }
  }
  return tokens.join(', ');
}

export function rangeCombos(range: Range, dead: Iterable<Card> = []): WeightedCombo[] {
  const d = new Set(dead);
  const out: WeightedCombo[] = [];
  for (const key in range) {
    const w = range[key];
    if (!(w > 0)) continue;
    for (const [a, b] of keyCombos(key)) if (!d.has(a) && !d.has(b)) out.push({ a, b, w });
  }
  return out;
}

/** Weighted number of combos, after removing dead cards. */
export function countCombos(range: Range, dead: Iterable<Card> = []): number {
  const d = new Set(dead);
  let n = 0;
  for (const key in range) {
    const w = range[key];
    if (!(w > 0)) continue;
    if (d.size === 0) n += w * keyComboCount(key);
    else n += w * liveCombos(key, d).length;
  }
  return n;
}

export const rangeFraction = (range: Range) => countCombos(range) / 1326;

/** Hand classes ordered by all-in equity against a random hand. */
export const STRENGTH_ORDER: string[] = [...HAND_KEYS].sort((a, b) => (PREFLOP_EQUITY[b] ?? 0) - (PREFLOP_EQUITY[a] ?? 0));

/** The strongest classes (by equity vs. a random hand) totalling about pct of all combos. */
export function topRange(pct: number): Range {
  const target = pct * 1326;
  const r: Range = {};
  let n = 0;
  for (const key of STRENGTH_ORDER) {
    if (n >= target - 1e-9) break;
    r[key] = 1;
    n += keyComboCount(key);
  }
  return r;
}

export function rangeFromKeys(keys: Iterable<string>): Range {
  const r: Range = {};
  for (const k of keys) r[k] = 1;
  return r;
}

export function rangeOf(text: string): Range {
  return parseRange(text).range;
}
