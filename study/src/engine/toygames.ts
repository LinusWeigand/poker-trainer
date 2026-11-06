// Closed-form toy games from The Mathematics of Poker. Pot is normalised to 1
// and s is the bet as a fraction of the pot.

/** Share of a polarised betting range that must be bluffs to make a bluff-catcher indifferent. */
export const bluffShare = (s: number) => s / (1 + 2 * s);
/** Bluffs per value combo at that share. */
export const bluffsPerValue = (s: number) => s / (1 + s);
/** How often the bluff-catcher must call so bluffs break even (= MDF). */
export const defendFreq = (s: number) => 1 / (1 + s);
/** Required equity to call a bet of s (pot 1). */
export const requiredEquity = (s: number) => s / (1 + 2 * s);
/** Fold frequency a pure bluff needs to break even. */
export const alpha = (s: number) => s / (1 + s);

/**
 * Clairvoyant game: X knows if they hold the nuts (fraction v of the time) or air;
 * Y holds a bluff-catcher. X may bet s or check; Y calls or folds.
 * bluffRate = share of X's air that bets; callRate = how often Y calls.
 * Returns X's share of the pot plus net from betting.
 */
export function clairvoyantEV(s: number, v: number, bluffRate: number, callRate: number): number {
  const b = bluffRate * (1 - v);
  return v * (callRate * (1 + s) + (1 - callRate)) + b * ((1 - callRate) - callRate * s);
}

export function clairvoyantSolution(s: number, v: number) {
  const needed = v * bluffsPerValue(s);
  const air = 1 - v;
  if (needed <= air) {
    const bluffRate = air > 0 ? needed / air : 0;
    const callRate = defendFreq(s);
    return { bluffRate, callRate, evX: clairvoyantEV(s, v, bluffRate, callRate), enoughAir: true };
  }
  // Not enough air to balance: X bets everything and Y folds every time.
  return { bluffRate: 1, callRate: 0, evX: 1, enoughAir: false };
}

/**
 * AKQ game: X checks in the dark; Y (in position) may bet s or check behind; X calls or folds.
 * Y bets A always, never bets K, and bluffs Q at rate beta. X calls with A, folds Q, and calls K at rate c.
 * Returns Y's share of the pot (0.5 = no edge).
 */
export function akqEV(s: number, beta: number, c: number): number {
  return (-beta * s + 1 + c * s + beta * (c * -s + (1 - c)) + 2) / 6;
}

export function akqSolution(s: number) {
  const beta = s / (1 + s);
  const c = Math.max(0, (1 - s) / (1 + s));
  return { beta, c, evY: akqEV(s, beta, c) };
}

/** Best response of Y's Q to X's K calling rate c: bluff if positive EV. */
export const akqBluffEV = (s: number, c: number) => 0.5 * -s + 0.5 * (c * -s + (1 - c));
/** EV for X calling with K given Y's bluff rate beta (Y bets A always). */
export const akqCallEV = (s: number, beta: number) => (beta * (1 + s) - s) / (1 + beta);
