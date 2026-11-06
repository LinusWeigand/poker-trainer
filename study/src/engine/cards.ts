// Card id = rank * 4 + suit; rank 0..12 = 2..A, suit 0..3 = c, d, h, s.
// Same convention as the C++ engine in ../engine/solver.cpp.
import { type Rng } from './rng';

export type Card = number;

export const RANKS = '23456789TJQKA';
export const SUITS = 'cdhs';
export const SUIT_SYMBOLS = ['♣', '♦', '♥', '♠'];
export const SUIT_NAMES = ['clubs', 'diamonds', 'hearts', 'spades'];
export const RANK_NAMES = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
export const RANK_PLURALS = ['Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens', 'Jacks', 'Queens', 'Kings', 'Aces'];

export const rankOf = (c: Card) => c >> 2;
export const suitOf = (c: Card) => c & 3;
export const makeCard = (rank: number, suit: number): Card => (rank << 2) | suit;

export const DECK: readonly Card[] = Array.from({ length: 52 }, (_, i) => i);

export function cardStr(c: Card): string {
  return RANKS[c >> 2] + SUITS[c & 3];
}

export function cardsStr(cs: readonly Card[], sep = ''): string {
  return cs.map(cardStr).join(sep);
}

export function parseCard(s: string): Card | null {
  if (s.length !== 2) return null;
  const r = RANKS.indexOf(s[0].toUpperCase());
  const su = SUITS.indexOf(s[1].toLowerCase());
  return r < 0 || su < 0 ? null : makeCard(r, su);
}

/** Parses "AsKd", "As Kd" or "10h 9h"; duplicates and junk are dropped. */
export function parseCards(s: string): Card[] {
  const clean = s.replace(/10/g, 'T').replace(/[^2-9tjqkaTJQKAcdhsCDHS]/g, '');
  const out: Card[] = [];
  for (let i = 0; i + 1 < clean.length; i += 2) {
    const c = parseCard(clean.slice(i, i + 2));
    if (c === null) break;
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

export function remainingDeck(dead: Iterable<Card>): Card[] {
  const d = new Set(dead);
  return DECK.filter((c) => !d.has(c));
}

export function dealRandom(n: number, exclude: Iterable<Card>, rng: Rng = Math.random): Card[] {
  const deck = remainingDeck(exclude);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (deck.length - i));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, n);
}

/** Sorts cards high to low by rank, then suit. */
export function sortCards(cs: readonly Card[]): Card[] {
  return [...cs].sort((a, b) => b - a);
}
