import { Crosshair, Grid3x3, Hash, Percent, Spade } from '../components/icons';
import { CardRow, InlineCards } from '../components/PlayingCard';
import { RangeGrid } from '../components/RangeGrid';
import { type Card, RANKS, RANK_PLURALS, dealRandom, rankOf, remainingDeck } from '../engine/cards';
import { computeEquity, singleCombo } from '../engine/equity';
import { describeScore, describeScoreWithKicker, evaluate } from '../engine/evaluator';
import { rankHoldings } from '../engine/handClass';
import { HAND_KEYS, keyCombos, keyComboCount, keyFromCards, liveCombos } from '../engine/ranges';
import { pick, randInt, sample, shuffle, type Rng } from '../engine/rng';
import { ACTION_COLOR, CHARTS, chartAction, chartLayers, resolveRangeRef, type Chart } from '../content/charts';
import type { DrillDef } from './types';

const r1 = (x: number) => Math.round(x * 10) / 10;

function Seat({ label, cards, slots }: { label: string; cards: Card[]; slots?: number }) {
  return (
    <div className="seat">
      <div className="xs subtle">{label}</div>
      <CardRow cards={cards} slots={slots} />
    </div>
  );
}

export const outs: DrillDef = {
  id: 'outs',
  title: 'Count your outs',
  description: 'Both hands face up on the turn: how many river cards win it for you?',
  category: 'Cards',
  icon: Crosshair,
  lessons: ['outs'],
  target: 'Exact count',
  generate(rng: Rng) {
    for (let tries = 0; tries < 400; tries++) {
      const deal = dealRandom(8, [], rng);
      const hero = deal.slice(0, 2);
      const villain = deal.slice(2, 4);
      const board = deal.slice(4, 8);
      const hs = evaluate([...hero, ...board]);
      const vs = evaluate([...villain, ...board]);
      if (hs >= vs) continue;
      const rest = remainingDeck(deal);
      const wins = rest.filter((c) => evaluate([...hero, ...board, c]) > evaluate([...villain, ...board, c]));
      if (wins.length < 2 || wins.length > 20) continue;
      if (wins.length < 5 && rng() < 0.6) continue;
      const byRank = new Map<number, Card[]>();
      for (const c of wins) byRank.set(rankOf(c), [...(byRank.get(rankOf(c)) ?? []), c]);
      return {
        kind: 'numeric',
        unit: 'outs',
        tolerance: 0,
        answer: wins.length,
        visual: (
          <div className="table-felt">
            <Seat label="You" cards={hero} />
            <Seat label="Board" cards={board} slots={5} />
            <Seat label="Villain" cards={villain} />
          </div>
        ),
        prompt: <>You are behind on the turn ({describeScoreWithKicker(hs)} vs. {describeScoreWithKicker(vs)}). How many river cards give you the <strong>outright win</strong>?</>,
        explain: (
          <div className="col gap-2">
            <span>
              <strong>{wins.length} outs</strong> of 44 unseen cards ({r1((wins.length / 44) * 100)}%):
            </span>
            <span className="row wrap gap-1">
              {[...byRank.entries()]
                .sort((a, b) => b[0] - a[0])
                .map(([, cs]) => (
                  <InlineCards key={cs[0]} cards={cs} />
                ))}
            </span>
          </div>
        ),
      };
    }
    return outs.generate(Math.random);
  },
};

export const combos: DrillDef = {
  id: 'combos',
  title: 'Combo counting',
  description: 'Count villain’s combos of a hand after board and blocker removal.',
  category: 'Cards',
  icon: Hash,
  lessons: ['combos', 'blockers'],
  target: 'Exact count',
  generate(rng: Rng) {
    const boardLen = pick([3, 3, 4, 5], rng);
    const deal = dealRandom(boardLen + 2, [], rng);
    const board = deal.slice(0, boardLen);
    const hero = deal.slice(boardLen);
    const boardRanks = [...new Set(board.map(rankOf))];
    const kind = pick(['set', 'pair', 'top', 'two', 'suited'] as const, rng);
    let key: string;
    let label: string;
    if (kind === 'set') {
      const r = pick(boardRanks, rng);
      key = RANKS[r] + RANKS[r];
      label = `sets of ${RANK_PLURALS[r]} (${key})`;
    } else if (kind === 'pair') {
      const r = pick([12, 11, 10, 9, 8].filter((x) => !boardRanks.includes(x)).concat([12]), rng);
      key = RANKS[r] + RANKS[r];
      label = key;
    } else if (kind === 'top') {
      const top = Math.max(...boardRanks);
      const kick = pick([12, 11, 10, 9].filter((x) => x !== top), rng);
      const hi = Math.max(top, kick);
      const lo = Math.min(top, kick);
      key = RANKS[hi] + RANKS[lo];
      label = `${key} (suited and offsuit)`;
    } else if (kind === 'two') {
      const [a, b] = sample(boardRanks.length >= 2 ? boardRanks : [12, 11], 2, rng).sort((x, y) => y - x);
      key = RANKS[a] + RANKS[b];
      label = `${key} (two pair, suited and offsuit)`;
    } else {
      const hi = pick([12, 11, 10], rng);
      const lo = randInt(hi, rng);
      key = RANKS[hi] + RANKS[lo] + 's';
      label = key;
    }
    const dead = new Set([...board, ...hero]);
    const keys = key.length === 2 && key[0] !== key[1] ? [key + 's', key + 'o'] : [key];
    const live = keys.flatMap((k) => liveCombos(k, dead));
    const fresh = keys.reduce((a, k) => a + keyComboCount(k), 0);
    return {
      kind: 'numeric',
      unit: 'combos',
      tolerance: 0,
      answer: live.length,
      visual: (
        <div className="table-felt">
          <Seat label="Board" cards={board} slots={5} />
          <Seat label="Your hand" cards={hero} />
        </div>
      ),
      prompt: <>How many combos of <strong>{label}</strong> can villain hold?</>,
      explain: (
        <div className="col gap-2">
          <span>
            <strong>{live.length}</strong> of {fresh} combos survive the {board.length} board cards and your two cards.
          </span>
          <span className="row wrap gap-1">
            {live.slice(0, 16).map(([a, b], i) => (
              <InlineCards key={i} cards={[a, b]} />
            ))}
            {live.length > 16 && <span className="xs subtle">+{live.length - 16}</span>}
          </span>
        </div>
      ),
    };
  },
};

const PLAYABLE = ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22', 'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs', 'A5s', 'A9o', 'KQs', 'KQo', 'KJs', 'QJs', 'JTs', 'T9s', '98s', '87s', '76s', '65s', 'K9o', 'Q9s', 'J9s', 'T8s', '54s'];

export const equityEst: DrillDef = {
  id: 'equity-est',
  title: 'Equity estimation',
  description: 'Hand vs. hand, preflop or on the flop: estimate your equity.',
  category: 'Cards',
  icon: Percent,
  lessons: ['equity'],
  target: 'Within ±5 points',
  generate(rng: Rng) {
    const flop = rng() < 0.35;
    for (let t = 0; t < 50; t++) {
      const k1 = pick(PLAYABLE, rng);
      const k2 = pick(PLAYABLE, rng);
      const c1 = pick(keyCombos(k1), rng);
      const rest = keyCombos(k2).filter(([a, b]) => a !== c1[0] && a !== c1[1] && b !== c1[0] && b !== c1[1]);
      if (!rest.length || k1 === k2) continue;
      const c2 = pick(rest, rng);
      const board = flop ? dealRandom(3, [...c1, ...c2], rng) : [];
      const res = computeEquity([singleCombo(c1[0], c1[1]), singleCombo(c2[0], c2[1])], board, { iterations: 30000, exactLimit: 2000, rng });
      const eq = res.equity[0] * 100;
      return {
        kind: 'numeric',
        unit: '%',
        tolerance: 5,
        answer: r1(eq),
        visual: (
          <div className="table-felt">
            <Seat label="You" cards={c1} />
            {flop && <Seat label="Flop" cards={board} slots={3} />}
            <Seat label="Villain" cards={c2} />
          </div>
        ),
        prompt: <>All-in {flop ? 'on this flop' : 'preflop'}. What is your equity?</>,
        explain: (
          <>
            Your equity is <strong>{r1(eq)}%</strong> ({res.exact ? 'exact' : 'Monte Carlo'}); villain has {r1(res.equity[1] * 100)}%{res.tie[0] > 0.005 ? `, including ${r1(res.tie[0] * 100)}% ties` : ''}.
          </>
        ),
      };
    }
    return equityEst.generate(Math.random);
  },
};

export const nuts: DrillDef = {
  id: 'nuts',
  title: 'Find the nuts',
  description: 'Which of these four holdings is the best possible hand on this board?',
  category: 'Cards',
  icon: Spade,
  lessons: ['texture'],
  target: '90% accuracy',
  generate(rng: Rng) {
    const len = rng() < 0.6 ? 3 : 4;
    const board = dealRandom(len, [], rng);
    const tiers = rankHoldings(board);
    const nutsCombo = pick(tiers[0].combos, rng);
    const pool = tiers.slice(1, 9);
    const picks = shuffle([...pool], rng).slice(0, 3);
    const options = shuffle([{ combo: nutsCombo, score: tiers[0].score }, ...picks.map((t) => ({ combo: pick(t.combos, rng), score: t.score }))], rng);
    const answer = options.findIndex((o) => o.score === tiers[0].score);
    return {
      kind: 'choice',
      choices: options.map((o, i) => <InlineCards key={i} cards={o.combo} />),
      answer,
      visual: (
        <div className="table-felt">
          <Seat label={len === 3 ? 'Flop' : 'Turn'} cards={board} slots={len} />
        </div>
      ),
      prompt: <>Which holding is the current nuts?</>,
      explain: (
        <div className="col gap-1">
          {options.map((o, i) => (
            <span key={i} className="row gap-1">
              <InlineCards cards={o.combo} /> {describeScore(o.score)} {i === answer && <strong className="good">· the nuts</strong>}
            </span>
          ))}
        </div>
      ),
    };
  },
};

function borderline(chart: Chart): string[] {
  const at = (r: number, c: number) => (r < 0 || r > 12 || c < 0 || c > 12 ? null : HAND_KEYS[r * 13 + c]);
  const out: string[] = [];
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      const k = at(r, c)!;
      const a = chartAction(chart, k);
      const nb = [at(r, c + 1), at(r, c - 1), at(r + 1, c), at(r - 1, c)].filter((x): x is string => x !== null);
      if (nb.some((x) => chartAction(chart, x) !== a)) out.push(k);
    }
  }
  return out;
}

const borderCache = new Map<string, string[]>();

export const preflop: DrillDef = {
  id: 'preflop',
  title: 'Preflop trainer',
  description: 'Seat and cards: raise, call or fold according to the study charts.',
  category: 'Preflop',
  icon: Grid3x3,
  lessons: ['rfi', '3bet', 'bb-defense', 'vs-3bet'],
  target: '95% accuracy',
  generate(rng: Rng) {
    const r = rng();
    const group = r < 0.5 ? 'Open (RFI)' : r < 0.75 ? 'Big blind defense' : 'Facing a 3-bet';
    const chart = pick(
      CHARTS.filter((c) => c.group === group),
      rng,
    );
    const within = chart.within ? resolveRangeRef(chart.within) : null;
    let bl = borderCache.get(chart.id);
    if (!bl) {
      bl = borderline(chart);
      borderCache.set(chart.id, bl);
    }
    const candidates = (rng() < 0.65 ? bl : HAND_KEYS).filter((k) => !within || within[k]);
    const weighted = candidates.flatMap((k) => Array(keyComboCount(k) / 2).fill(k));
    const key = pick(weighted.length ? weighted : HAND_KEYS, rng);
    const [a, b] = pick(keyCombos(key), rng);
    const actionIds = [...chart.actions.map((x) => x.id), 'fold'];
    const labels = [...chart.actions.map((x) => x.label), 'Fold'];
    const correct = chartAction(chart, key);
    const order = [actionIds.length - 1, ...actionIds.slice(0, -1).map((_, i) => i).reverse()];
    const layers = chartLayers(chart);
    return {
      kind: 'choice',
      choices: order.map((i) => labels[i]),
      answer: order.indexOf(actionIds.indexOf(correct)),
      visual: (
        <div className="table-felt">
          <Seat label={chart.short} cards={[a, b]} />
        </div>
      ),
      prompt: (
        <>
          {chart.scenario} You hold <strong>{keyFromCards(a, b)}</strong>.
        </>
      ),
      explain: (
        <div className="col gap-3">
          <span>
            <strong>{key}</strong>: {correct === 'fold' ? 'fold' : chart.actions.find((x) => x.id === correct)!.label.toLowerCase()} in the {chart.title} chart. {chart.note}
          </span>
          <div style={{ maxWidth: 340 }}>
            <RangeGrid compact layers={layers.map((l) => ({ range: l.range, color: ACTION_COLOR[l.action.kind], label: l.action.label }))} highlight={key} label={chart.title} />
          </div>
        </div>
      ),
    };
  },
};

