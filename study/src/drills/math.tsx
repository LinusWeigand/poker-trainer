import { Brain, Calculator, Percent, Scale, Sigma, Zap, Target } from '../components/icons';
import { pick, randBetween, type Rng } from '../engine/rng';
import { hitProbability } from '../engine/stats';
import type { DrillDef } from './types';

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;
const money = (x: number) => `$${Number.isInteger(x) ? x : x.toFixed(1)}`;
const FRACS = [0.25, 0.33, 0.5, 0.6, 0.66, 0.75, 0.8, 1, 1.25, 1.5, 2];

export const potOdds: DrillDef = {
  id: 'pot-odds',
  title: 'Pot odds',
  description: 'A pot and a bet: what equity do you need to call?',
  category: 'Math',
  icon: Percent,
  lessons: ['pot-odds'],
  target: '±2%, under 6 seconds',
  generate(rng: Rng) {
    const pot = randBetween(4, 80, rng) * 5;
    const frac = pick(FRACS, rng);
    const bet = Math.max(5, Math.round((pot * frac) / 5) * 5);
    const total = pot + 2 * bet;
    const ans = (bet / total) * 100;
    return {
      kind: 'numeric',
      unit: '%',
      tolerance: 2,
      answer: r1(ans),
      prompt: (
        <>
          The pot is <strong>{money(pot)}</strong>. Villain bets <strong>{money(bet)}</strong> ({Math.round((bet / pot) * 100)}% pot). What equity do you need to call?
        </>
      ),
      explain: (
        <>
          You call {money(bet)} to win a final pot of {money(pot)} + {money(bet)} + {money(bet)} = {money(total)}. Required equity = {bet} / {total} = <strong>{r1(ans)}%</strong>.
        </>
      ),
    };
  },
};

export const ratios: DrillDef = {
  id: 'ratios',
  title: 'Alpha, MDF & bluff share',
  description: 'A bet size: how often must a bluff work, how often must you defend, how many bluffs are balanced?',
  category: 'Math',
  icon: Sigma,
  lessons: ['fold-equity', 'mdf', 'polarization'],
  target: '±2%',
  generate(rng: Rng) {
    const s = pick([0.25, 0.33, 0.5, 0.66, 0.75, 1, 1.25, 1.5, 2, 2.5, 3], rng);
    const kind = pick(['alpha', 'mdf', 'bluff'] as const, rng);
    const size = `${Math.round(s * 100)}% pot`;
    if (kind === 'alpha') {
      const a = (s / (1 + s)) * 100;
      return {
        kind: 'numeric',
        unit: '%',
        tolerance: 2,
        answer: r1(a),
        prompt: <>You bluff <strong>{size}</strong> with a hand that never wins. What fold percentage do you need to break even?</>,
        explain: <>α = s / (1 + s) = {s} / {1 + s} = <strong>{r1(a)}%</strong>. You risk {s} pots to win 1.</>,
      };
    }
    if (kind === 'mdf') {
      const m = (1 / (1 + s)) * 100;
      return {
        kind: 'numeric',
        unit: '%',
        tolerance: 2,
        answer: r1(m),
        prompt: <>Villain bets <strong>{size}</strong>. What is the minimum defense frequency?</>,
        explain: <>MDF = 1 / (1 + s) = 1 / {1 + s} = <strong>{r1(m)}%</strong>, so that his pure bluffs cannot profit.</>,
      };
    }
    const b = (s / (1 + 2 * s)) * 100;
    return {
      kind: 'numeric',
      unit: '%',
      tolerance: 2,
      answer: r1(b),
      prompt: <>A polarized river bet of <strong>{size}</strong>: what share of the betting range should be bluffs to make a bluff-catcher indifferent?</>,
      explain: <>Bluff share = s / (1 + 2s) = {s} / {r2(1 + 2 * s)} = <strong>{r1(b)}%</strong>, the same as the caller’s required equity.</>,
    };
  },
};

export const outsEquity: DrillDef = {
  id: 'outs-equity',
  title: 'Outs → equity',
  description: 'Turn a number of outs into a percentage with the rule of 2 and 4.',
  category: 'Math',
  icon: Target,
  lessons: ['outs'],
  target: '±3%',
  generate(rng: Rng) {
    const outs = pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], rng);
    const flop = rng() < 0.55;
    const exact = flop ? hitProbability(outs, 47, 2) : outs / 46;
    return {
      kind: 'numeric',
      unit: '%',
      tolerance: 3,
      answer: r1(exact * 100),
      prompt: flop ? (
        <>You are all-in on the <strong>flop</strong> with <strong>{outs} outs</strong> and will see both the turn and river. Roughly what is your chance to hit?</>
      ) : (
        <>You are on the <strong>turn</strong> with <strong>{outs} outs</strong>. What is your chance to hit the river?</>
      ),
      explain: flop ? (
        <>
          Rule of 4: {outs} × 4 = {outs * 4}%{outs > 8 ? `, refined: ${outs * 4 - (outs - 8)}%` : ''}. Exact: 1 − ({47 - outs}/47)({46 - outs}/46) = <strong>{r1(exact * 100)}%</strong>.
        </>
      ) : (
        <>
          Rule of 2: {outs} × 2 = {outs * 2}%. Exact: {outs} / 46 = <strong>{r1(exact * 100)}%</strong>.
        </>
      ),
    };
  },
};

export const ev: DrillDef = {
  id: 'ev',
  title: 'Expected value',
  description: 'EV of calls, pure bluffs and semi-bluffs, in dollars.',
  category: 'Math',
  icon: Calculator,
  lessons: ['ev', 'fold-equity', 'implied-odds'],
  target: 'Within 2% of the pot',
  generate(rng: Rng) {
    const pot = randBetween(4, 40, rng) * 10;
    const bet = Math.max(10, Math.round((pot * pick([0.33, 0.5, 0.66, 0.75, 1], rng)) / 10) * 10);
    const tol = Math.max(1, Math.round(pot * 0.02));
    const kind = pick(['call', 'bluff', 'semi'] as const, rng);
    if (kind === 'call') {
      const e = randBetween(10, 60, rng) / 100;
      const val = e * (pot + bet) - (1 - e) * bet;
      return {
        kind: 'numeric',
        unit: '$',
        tolerance: tol,
        answer: r1(val),
        prompt: <>Pot {money(pot)}, villain bets {money(bet)}. You have <strong>{Math.round(e * 100)}%</strong> equity and there is no more betting. What is the EV of calling?</>,
        explain: <>EV = {e} × ({pot} + {bet}) − {r2(1 - e)} × {bet} = {r1(e * (pot + bet))} − {r1((1 - e) * bet)} = <strong>{money(r1(val))}</strong>.</>,
      };
    }
    if (kind === 'bluff') {
      const f = randBetween(20, 70, rng) / 100;
      const val = f * pot - (1 - f) * bet;
      return {
        kind: 'numeric',
        unit: '$',
        tolerance: tol,
        answer: r1(val),
        prompt: <>You bluff {money(bet)} into {money(pot)} with a hand that never wins. Villain folds <strong>{Math.round(f * 100)}%</strong>. What is the EV of the bluff?</>,
        explain: <>EV = {f} × {pot} − {r2(1 - f)} × {bet} = <strong>{money(r1(val))}</strong>. Break-even needs {Math.round((bet / (pot + bet)) * 100)}% folds.</>,
      };
    }
    const f = randBetween(10, 50, rng) / 100;
    const e = randBetween(20, 45, rng) / 100;
    const called = e * (pot + 2 * bet) - bet;
    const val = f * pot + (1 - f) * called;
    return {
      kind: 'numeric',
      unit: '$',
      tolerance: tol,
      answer: r1(val),
      prompt: <>You shove {money(bet)} into {money(pot)} with a draw. Villain folds <strong>{Math.round(f * 100)}%</strong>; when called you have <strong>{Math.round(e * 100)}%</strong> equity. EV of the shove?</>,
      explain: (
        <>
          When called: {e} × {pot + 2 * bet} − {bet} = {r1(called)}. EV = {f} × {pot} + {r2(1 - f)} × {r1(called)} = <strong>{money(r1(val))}</strong>.
        </>
      ),
    };
  },
};

export const bluffcatch: DrillDef = {
  id: 'bluffcatch',
  title: 'Bluff-catcher decisions',
  description: 'Villain’s river range in combos: call or fold?',
  category: 'Reasoning',
  icon: Scale,
  lessons: ['mdf', 'river', 'blockers'],
  target: '90% accuracy',
  generate(rng: Rng) {
    const pot = randBetween(5, 30, rng) * 10;
    const frac = pick([0.33, 0.5, 0.66, 0.75, 1, 1.25, 1.5, 2], rng);
    const bet = Math.round((pot * frac) / 5) * 5;
    const need = bet / (pot + 2 * bet);
    const value = randBetween(6, 30, rng);
    // Aim the bluff count near the threshold so the decision is not obvious.
    const ideal = (need * value) / (1 - need);
    const bluffs = Math.max(0, Math.round(ideal * (0.55 + rng() * 0.9)));
    const share = bluffs / (value + bluffs);
    const call = share >= need;
    return {
      kind: 'choice',
      choices: ['Call', 'Fold'],
      answer: call ? 0 : 1,
      prompt: (
        <>
          River. Pot {money(pot)}, villain bets <strong>{money(bet)}</strong>. Your hand beats only his bluffs. His betting range: <strong>{value} value combos</strong> and <strong>{bluffs} bluff combos</strong>.
        </>
      ),
      explain: (
        <>
          You need {bet} / {pot + 2 * bet} = {r1(need * 100)}%. His bluff share is {bluffs} / {value + bluffs} = {r1(share * 100)}%, so <strong>{call ? 'call' : 'fold'}</strong>. EV of calling: {money(r1(share * (pot + bet) - (1 - share) * bet))}.
        </>
      ),
    };
  },
};

export const bayes: DrillDef = {
  id: 'bayes',
  title: 'Range updating (Bayes)',
  description: 'Priors and action frequencies in, posterior value share out.',
  category: 'Reasoning',
  icon: Brain,
  lessons: ['bayes'],
  target: '±3%',
  generate(rng: Rng) {
    const v = randBetween(5, 40, rng);
    const b = randBetween(10, 80, rng);
    const pv = randBetween(12, 20, rng) * 5;
    const pb = randBetween(2, 12, rng) * 5;
    const vb = (v * pv) / 100;
    const bb = (b * pb) / 100;
    const post = (vb / (vb + bb)) * 100;
    return {
      kind: 'numeric',
      unit: '%',
      tolerance: 3,
      answer: r1(post),
      prompt: (
        <>
          Entering the river villain has <strong>{v}</strong> value combos and <strong>{b}</strong> missed draws. He bets <strong>{pv}%</strong> of his value and bluffs <strong>{pb}%</strong> of his missed draws. He bets. What share of his betting range is value?
        </>
      ),
      explain: (
        <>
          Value that bets: {v} × {pv}% = {r1(vb)}. Bluffs that bet: {b} × {pb}% = {r1(bb)}. Posterior = {r1(vb)} / {r1(vb + bb)} = <strong>{r1(post)}%</strong>.
        </>
      ),
    };
  },
};

export const quant: DrillDef = {
  id: 'quant',
  title: 'Quant warm-up',
  description: 'Interview-style mental math: odds, expected values and probabilities.',
  category: 'Quant',
  icon: Zap,
  lessons: ['ev', 'kelly'],
  target: '±1–2%, fast',
  generate(rng: Rng) {
    const kind = pick(['odds', 'atleast', 'percent', 'game', 'kelly', 'dice'] as const, rng);
    if (kind === 'odds') {
      const a = randBetween(2, 12, rng);
      const b = randBetween(1, Math.max(1, a - 1), rng);
      const p = (b / (a + b)) * 100;
      return { kind: 'numeric', unit: '%', tolerance: 1, answer: r1(p), prompt: <>Convert <strong>{a} to {b}</strong> against into a probability.</>, explain: <>{b} / ({a} + {b}) = <strong>{r1(p)}%</strong>.</> };
    }
    if (kind === 'atleast') {
      const n = randBetween(2, 8, rng);
      const p = (1 - (5 / 6) ** n) * 100;
      return {
        kind: 'numeric',
        unit: '%',
        tolerance: 2,
        answer: r1(p),
        prompt: <>You roll a fair die <strong>{n} times</strong>. What is the probability of at least one six?</>,
        explain: <>1 − (5/6)^{n} = 1 − {r2((5 / 6) ** n)} = <strong>{r1(p)}%</strong>.</>,
      };
    }
    if (kind === 'percent') {
      const p = randBetween(3, 97, rng);
      const x = randBetween(12, 96, rng) * 10;
      const ans = (p * x) / 100;
      return { kind: 'numeric', tolerance: Math.max(0.5, ans * 0.01), answer: r1(ans), prompt: <>What is <strong>{p}% of {x}</strong>?</>, explain: <>{p} × {x} / 100 = <strong>{r1(ans)}</strong>.</> };
    }
    if (kind === 'game') {
      const cost = randBetween(1, 6, rng);
      const prize = randBetween(5, 40, rng);
      const k = randBetween(1, 6, rng);
      const ans = (k / 6) * prize - cost;
      return {
        kind: 'numeric',
        unit: '$',
        tolerance: 0.2,
        answer: r2(ans),
        prompt: (
          <>
            A game costs <strong>${cost}</strong> to play. Roll a die: on <strong>{k === 1 ? 'a 6' : `1–${k}`}</strong> you win <strong>${prize}</strong>, otherwise nothing. What is your EV per game?
          </>
        ),
        explain: <>EV = {k}/6 × {prize} − {cost} = {r2((k / 6) * prize)} − {cost} = <strong>${r2(ans)}</strong>.</>,
      };
    }
    if (kind === 'kelly') {
      const p = randBetween(51, 70, rng) / 100;
      const b = pick([1, 1, 2, 0.5, 1.5], rng);
      const f = Math.max(0, ((b * p - (1 - p)) / b) * 100);
      return {
        kind: 'numeric',
        unit: '%',
        tolerance: 1,
        answer: r1(f),
        prompt: <>A bet pays <strong>{b} : 1</strong> and wins <strong>{Math.round(p * 100)}%</strong> of the time. What fraction of your bankroll does Kelly bet?</>,
        explain: <>f* = (bp − q) / b = ({b} × {p} − {r2(1 - p)}) / {b} = <strong>{r1(f)}%</strong>.</>,
      };
    }
    const kindDice = pick(['sum', 'max'] as const, rng);
    if (kindDice === 'sum') {
      const n = randBetween(2, 6, rng);
      return { kind: 'numeric', tolerance: 0.05, answer: 3.5 * n, prompt: <>What is the expected <strong>sum of {n} fair dice</strong>?</>, explain: <>Each die averages 3.5, so {n} × 3.5 = <strong>{3.5 * n}</strong>.</> };
    }
    return {
      kind: 'numeric',
      tolerance: 0.05,
      answer: r2(161 / 36),
      prompt: <>You roll two fair dice. What is the expected value of the <strong>higher</strong> one?</>,
      explain: <>P(max ≤ k) = (k/6)², so E[max] = Σ k · ((k/6)² − ((k−1)/6)²) = 161/36 ≈ <strong>4.47</strong>.</>,
    };
  },
};
