import { EquitySim, type WeightedCombo } from '../engine/equity';

interface Req {
  id: number;
  players: WeightedCombo[][];
  board: number[];
  dead: number[];
  iterations: number;
  exactLimit: number;
}

const ctx = self as unknown as { postMessage: (msg: unknown) => void; onmessage: ((e: MessageEvent<Req>) => void) | null };
let current = 0;

ctx.onmessage = (e: MessageEvent<Req>) => {
  const { id, players, board, dead, iterations, exactLimit } = e.data;
  current = id;
  const sim = new EquitySim(players, board, dead);
  if (sim.error) {
    ctx.postMessage({ id, error: sim.error });
    return;
  }
  if (sim.exactCost() <= exactLimit) {
    sim.runExact();
    ctx.postMessage({ id, done: true, progress: 1, result: sim.result() });
    return;
  }
  let n = 0;
  const batch = 25000;
  const step = () => {
    if (current !== id) return;
    const k = Math.min(batch, iterations - n);
    sim.runMonteCarlo(k);
    n += k;
    const done = n >= iterations;
    ctx.postMessage({ id, done, progress: n / iterations, result: sim.result() });
    if (!done) setTimeout(step, 0);
  };
  step();
};
