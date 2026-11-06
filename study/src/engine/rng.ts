export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(n: number, rng: Rng = Math.random): number {
  return Math.floor(rng() * n);
}

export function randBetween(lo: number, hi: number, rng: Rng = Math.random): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function pick<T>(arr: readonly T[], rng: Rng = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sample<T>(arr: readonly T[], k: number, rng: Rng = Math.random): T[] {
  return shuffle([...arr], rng).slice(0, k);
}

export function weightedPick<T>(items: readonly T[], weights: readonly number[], rng: Rng = Math.random): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Standard normal via Box–Muller. */
export function gaussian(rng: Rng = Math.random): number {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}
