import { useCallback, useEffect, useRef, useState } from 'react';
import type { Card } from '../engine/cards';
import type { EquityResult, WeightedCombo } from '../engine/equity';

export interface EquityState {
  running: boolean;
  progress: number;
  result: EquityResult | null;
  error: string | null;
}

export function useEquityWorker() {
  const worker = useRef<Worker | null>(null);
  const id = useRef(0);
  const [state, setState] = useState<EquityState>({ running: false, progress: 0, result: null, error: null });

  useEffect(() => {
    const w = new Worker(new URL('../workers/equity.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e) => {
      const d = e.data;
      if (d.id !== id.current) return;
      if (d.error) setState({ running: false, progress: 0, result: null, error: d.error });
      else setState({ running: !d.done, progress: d.progress, result: d.result, error: null });
    };
    worker.current = w;
    return () => w.terminate();
  }, []);

  const run = useCallback((players: WeightedCombo[][], board: Card[], dead: Card[] = [], iterations = 300000, exactLimit = 2_000_000) => {
    id.current += 1;
    setState((s) => ({ ...s, running: true, progress: 0, error: null }));
    worker.current?.postMessage({ id: id.current, players, board, dead, iterations, exactLimit });
  }, []);

  const clear = useCallback(() => {
    id.current += 1;
    setState({ running: false, progress: 0, result: null, error: null });
  }, []);

  return { ...state, run, clear };
}
