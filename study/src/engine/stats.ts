// Abramowitz–Stegun 7.1.26 (max error ~1.5e-7).
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

export const normalCdf = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));

export function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function stdev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

export function quantile(sorted: readonly number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Probability of at least one hit when drawing `draws` cards with `outs` outs among `unseen` cards. */
export function hitProbability(outs: number, unseen: number, draws: number): number {
  let miss = 1;
  for (let i = 0; i < draws; i++) miss *= (unseen - outs - i) / (unseen - i);
  return 1 - miss;
}

/** Poker risk of ruin with a normal approximation: exp(-2·μ·B / σ²), per-hand units. */
export function riskOfRuin(winRateBb100: number, sdBb100: number, bankrollBb: number): number {
  if (winRateBb100 <= 0) return 1;
  const mu = winRateBb100 / 100;
  const var1 = (sdBb100 * sdBb100) / 100;
  return Math.exp((-2 * mu * bankrollBb) / var1);
}

/** Hands needed before a 95% interval on win rate excludes zero. */
export function handsForConfidence(winRateBb100: number, sdBb100: number, z = 1.96): number {
  if (winRateBb100 <= 0) return Infinity;
  return 100 * ((z * sdBb100) / winRateBb100) ** 2;
}
