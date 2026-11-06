import { describe, expect, it } from 'vitest';
import { parseCards } from './cards';
import { evaluate, describeScore, straightHigh, categoryOf } from './evaluator';
import { computeEquity, singleCombo } from './equity';
import { parseRange, rangeToString, countCombos, topRange, rangeCombos } from './ranges';
import { classifyHand, rankHoldings } from './handClass';
import { analyzeBoard } from './texture';
import { KuhnCFR, exploitability, kuhnValue, GAME_VALUE, RegretMatchingRPS } from './kuhn';
import { schedule } from './srs';
import { akqSolution, akqBluffEV, akqCallEV, clairvoyantSolution } from './toygames';

const c = (s: string) => parseCards(s);

describe('evaluator', () => {
  it('counts every 5-card hand category exactly', () => {
    const counts = new Array(9).fill(0);
    const h = [0, 0, 0, 0, 0];
    for (let a = 0; a < 52; a++)
      for (let b = a + 1; b < 52; b++)
        for (let x = b + 1; x < 52; x++)
          for (let d = x + 1; d < 52; d++)
            for (let e = d + 1; e < 52; e++) {
              h[0] = a;
              h[1] = b;
              h[2] = x;
              h[3] = d;
              h[4] = e;
              counts[categoryOf(evaluate(h))]++;
            }
    expect(counts).toEqual([1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40]);
  });

  it('orders and describes hands', () => {
    expect(describeScore(evaluate(c('AsKsQsJsTs')))).toBe('Royal flush');
    expect(describeScore(evaluate(c('5d4c3h2sAs')))).toBe('Straight, Five-high');
    expect(straightHigh(0b1000000001111)).toBe(3);
    expect(evaluate(c('KhKdQsQc7h2c3d'))).toBeGreaterThan(evaluate(c('KhKdQsQc6h2c3d')));
    // Third pair plays as the kicker
    expect(describeScore(evaluate(c('KhKdQsQc7h7c3d')))).toBe('Two pair, Kings and Queens');
    expect(evaluate(c('KhKdQsQc7h7c3d'))).toBeLessThan(evaluate(c('KhKdQsQc6h6cAd')));
    expect(describeScore(evaluate(c('9h9d9s5c5h5d2c')))).toBe('Nines full of Fives');
  });
});

describe('equity', () => {
  it('matches a hand-counted river decision', () => {
    // AsKs vs QhQd on 2s7s9cJd: 9 spades + 3 aces + 3 kings = 15 of 44 rivers.
    const r = computeEquity([singleCombo(...(c('AsKs') as [number, number])), singleCombo(...(c('QhQd') as [number, number]))], c('2s7s9cJd'));
    expect(r.exact).toBe(true);
    expect(r.equity[0]).toBeCloseTo(15 / 44, 10);
  });

  it('gets AA vs KK preflop roughly right with Monte Carlo', () => {
    const r = computeEquity([singleCombo(...(c('AhAs') as [number, number])), singleCombo(...(c('KdKc') as [number, number]))], [], { iterations: 60000 });
    expect(r.equity[0]).toBeGreaterThan(0.8);
    expect(r.equity[0]).toBeLessThan(0.84);
  });

  it('handles range vs range', () => {
    const qq = rangeCombos(parseRange('QQ+').range);
    const ak = rangeCombos(parseRange('AKs').range);
    const r = computeEquity([qq, ak], [], { iterations: 40000 });
    expect(r.equity[0]).toBeGreaterThan(0.55);
    expect(r.equity[0] + r.equity[1]).toBeCloseTo(1, 6);
  });
});

describe('ranges', () => {
  it('parses standard notation', () => {
    const { range, errors } = parseRange('22+, A2s+, KTo+, QJs:0.5, T9s-T7s');
    expect(errors).toEqual([]);
    expect(countCombos(range)).toBeCloseTo(78 + 48 + 36 + 2 + 12, 6);
  });

  it('round-trips through the compact string form', () => {
    const text = '55+, A2s+, K9s+, T9s-T7s, ATo+, KJo';
    const back = rangeToString(parseRange(text).range);
    expect(back).toBe('55+, A2s+, K9s+, T7s+, ATo+, KJo');
    expect(rangeToString(parseRange('A5s-A2s, KQo-KTo').range)).toBe('A5s-A2s, KTo+');
  });

  it('removes blocked combos', () => {
    expect(countCombos(parseRange('AA').range, c('Ah'))).toBe(3);
    expect(countCombos(parseRange('AKo').range, c('AhKd'))).toBe(7);
  });

  it('builds top-x% ranges', () => {
    const r = topRange(0.1);
    expect(countCombos(r) / 1326).toBeGreaterThan(0.095);
    expect(r.AA).toBe(1);
  });
});

describe('hand classes and texture', () => {
  it('classifies made hands and draws', () => {
    expect(classifyHand(c('AhKd') as [number, number], c('Ks7c2d')).made).toBe('top-pair-good');
    expect(classifyHand(c('QhQd') as [number, number], c('Ks7c2d')).made).toBe('pp-below-top');
    expect(classifyHand(c('7h7d') as [number, number], c('Ks7c2d')).made).toBe('set');
    const fd = classifyHand(c('JsTs') as [number, number], c('9s8s2c'));
    expect(fd.draws).toContain('flush-draw');
    expect(fd.draws).toContain('oesd');
  });

  it('finds the nuts', () => {
    const tiers = rankHoldings(c('9s8s2c'));
    expect(describeScore(tiers[0].score)).toBe('Three Nines');
    expect(describeScore(rankHoldings(c('9s8s2c7s'))[0].score)).toBe('Straight flush, Jack-high');
  });

  it('reads textures', () => {
    expect(analyzeBoard(c('Ks7c2d')).wetness).toBe('dry');
    expect(analyzeBoard(c('JhTh9c')).wetness).toBe('wet');
    expect(analyzeBoard(c('Ah7h2h')).suits).toBe('monotone');
  });
});

describe('game theory', () => {
  it('CFR converges in Kuhn poker', () => {
    const cfr = new KuhnCFR('vanilla');
    cfr.iterate(3000);
    const avg = cfr.averageStrategy();
    expect(exploitability(avg)).toBeLessThan(0.01);
    expect(kuhnValue(avg)).toBeCloseTo(GAME_VALUE, 2);
    // Equilibrium family: K bets 3x as often as J bluffs.
    const alpha = avg.J[1];
    expect(avg.K[1]).toBeCloseTo(Math.min(1, 3 * alpha), 1);
  });

  it('CFR+ converges faster', () => {
    const cfr = new KuhnCFR('cfr+');
    cfr.iterate(500);
    expect(exploitability(cfr.averageStrategy())).toBeLessThan(0.005);
  });

  it('regret matching approaches uniform in self-play', () => {
    const rm = new RegretMatchingRPS('self-play');
    rm.iterate(5000);
    rm.average().forEach((p) => expect(p).toBeCloseTo(1 / 3, 1));
  });

  it('toy game solutions make the other side indifferent', () => {
    const s = 0.5;
    const { beta, c: call } = akqSolution(s);
    expect(akqBluffEV(s, call)).toBeCloseTo(0, 10);
    expect(akqCallEV(s, beta)).toBeCloseTo(0, 10);
    const cv = clairvoyantSolution(1, 0.5);
    expect(cv.callRate).toBeCloseTo(0.5, 10);
    expect(cv.bluffRate).toBeCloseTo(0.5, 10);
  });
});

describe('spaced repetition', () => {
  it('grows intervals', () => {
    const a = schedule(undefined, 2, '2026-11-01');
    expect(a.interval).toBe(1);
    const b = schedule(a, 2, a.due);
    expect(b.interval).toBe(3);
    const d = schedule(b, 2, b.due);
    expect(d.interval).toBe(8);
    expect(schedule(d, 0, d.due).interval).toBe(0);
  });
});
