import { useMemo, useState } from 'react';
import { Dice5, Grid3x3, Hash, Layers, Percent, Spade, Target } from '../components/icons';
import { CardInput, InlineCards } from '../components/PlayingCard';
import { RangeGrid } from '../components/RangeGrid';
import { HBars } from '../components/charts';
import { Button, Segmented, Slider } from '../components/ui';
import { type Card, RANKS, dealRandom, parseCards, rankOf } from '../engine/cards';
import { computeEquity, singleCombo } from '../engine/equity';
import { describeScore } from '../engine/evaluator';
import { classifyHand, madeTier, type DrawClass } from '../engine/handClass';
import { countCombos, expandToken, keyCombos, keyKind, parseRange, rangeCombos, type Range } from '../engine/ranges';
import { analyzeBoard } from '../engine/texture';
import { rankHoldings } from '../engine/handClass';
import { ACTION_COLOR, CHARTS, chartById, chartLayers, rangeRefLabel, resolveRangeRef } from '../content/charts';
import { pct } from '../lib/format';
import { KV, ThresholdBar, Widget } from './Widget';
import { Verdict } from './math';

const PRESETS: { label: string; hero: string; villain: string; board: string }[] = [
  { label: 'AA vs KK', hero: 'AhAs', villain: 'KdKc', board: '' },
  { label: 'QQ vs AK', hero: 'QhQd', villain: 'AcKs', board: '' },
  { label: 'AK vs AQ', hero: 'AsKd', villain: 'AhQc', board: '' },
  { label: 'Flush draw vs top pair', hero: 'Jh9h', villain: 'AsKc', board: 'Kh7h2d' },
  { label: 'Set vs overpair', hero: '7c7d', villain: 'AhAd', board: '7s4h2c' },
];

export function EquityMiniWidget() {
  const [hero, setHero] = useState<Card[]>(parseCards('QhQd'));
  const [villain, setVillain] = useState<Card[]>(parseCards('AcKs'));
  const [board, setBoard] = useState<Card[]>([]);
  const result = useMemo(() => {
    if (hero.length !== 2 || villain.length !== 2) return null;
    try {
      return computeEquity([singleCombo(hero[0], hero[1]), singleCombo(villain[0], villain[1])], board, { iterations: 40000, exactLimit: 60000 });
    } catch {
      return null;
    }
  }, [hero, villain, board]);
  const used = [...hero, ...villain, ...board];
  return (
    <Widget title="Hand vs. hand equity" icon={Percent}>
      <div className="row wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="tag"
            onClick={() => {
              setHero(parseCards(p.hero));
              setVillain(parseCards(p.villain));
              setBoard(parseCards(p.board));
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid-3">
        <CardInput label="Hero" value={hero} onChange={setHero} max={2} dead={used.filter((c) => !hero.includes(c))} />
        <CardInput label="Villain" value={villain} onChange={setVillain} max={2} dead={used.filter((c) => !villain.includes(c))} />
        <CardInput label="Board" value={board} onChange={setBoard} max={5} dead={used.filter((c) => !board.includes(c))} />
      </div>
      {result ? (
        <>
          <HBars
            rows={[
              { label: 'Hero', value: result.equity[0], color: 'var(--s1)', sub: `win ${pct(result.win[0])}` },
              { label: 'Villain', value: result.equity[1], color: 'var(--s2)', sub: `win ${pct(result.win[1])}` },
            ]}
            max={1}
          />
          <p className="xs subtle">
            {result.exact ? `Exact: all ${result.samples.toLocaleString('en-US')} runouts enumerated.` : `Monte Carlo: ${result.samples.toLocaleString('en-US')} random runouts (±0.5%).`} Ties {pct(result.tie[0])}.
          </p>
        </>
      ) : (
        <p className="small subtle">Choose two cards for each player.</p>
      )}
    </Widget>
  );
}

export function ComboCounterWidget() {
  const [hand, setHand] = useState('AK');
  const [board, setBoard] = useState<Card[]>(parseCards('Ks9d4c'));
  const [mine, setMine] = useState<Card[]>(parseCards('AhKd'));
  const keys = expandToken(hand) ?? [];
  const dead = new Set([...board, ...mine]);
  const perKey = keys.map((k) => {
    const all = keyCombos(k);
    const live = all.filter(([a, b]) => !dead.has(a) && !dead.has(b));
    return { k, all: all.length, live };
  });
  const total = perKey.reduce((a, x) => a + x.live.length, 0);
  const fresh = perKey.reduce((a, x) => a + x.all, 0);
  const shown = perKey.flatMap((x) => x.live).slice(0, 24);
  return (
    <Widget title="Combo counter" icon={Hash}>
      <div className="grid-3">
        <label className="field">
          <span className="label">Hand or class</span>
          <input className="input input-mono" value={hand} onChange={(e) => setHand(e.target.value)} placeholder="AK, QQ, T9s, 77+" />
        </label>
        <CardInput label="Board" value={board} onChange={setBoard} max={5} dead={mine} />
        <CardInput label="Your hand" value={mine} onChange={setMine} max={2} dead={board} />
      </div>
      {keys.length === 0 ? (
        <p className="small subtle">Type a hand class like AK, QQ, AKs or T9o.</p>
      ) : (
        <>
          <KV items={[{ k: 'Combos remaining', v: String(total) }, { k: 'Without card removal', v: String(fresh) }, { k: 'Removed by visible cards', v: String(fresh - total) }]} />
          {perKey.length <= 6 && (
            <div className="col gap-1 small muted">
              {perKey.map((x) => (
                <span key={x.k}>
                  <strong className="ink">{x.k}</strong>: {x.live.length} of {x.all}
                  {keyKind(x.k) === 'pair'
                    ? ` — ${4 - [...dead].filter((c) => rankOf(c) === RANKS.indexOf(x.k[0])).length} cards of that rank left`
                    : ''}
                </span>
              ))}
            </div>
          )}
          <div className="row wrap gap-1">
            {shown.map(([a, b], i) => (
              <span key={i} className="nowrap">
                <InlineCards cards={[a, b]} />
              </span>
            ))}
            {total > shown.length && <span className="small subtle">+{total - shown.length} more</span>}
          </div>
        </>
      )}
    </Widget>
  );
}

const SEATS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

export function PositionTableWidget() {
  const [mode, setMode] = useState<'pre' | 'post'>('pre');
  const order = mode === 'pre' ? SEATS : ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'];
  const W = 520;
  const H = 260;
  const cx = W / 2;
  const cy = H / 2;
  const angles = [200, 250, 310, 0, 70, 130].map((d) => (d * Math.PI) / 180);
  return (
    <Widget title="6-max seats and order of action" icon={Target} right={<Segmented value={mode} onChange={setMode} options={[{ value: 'pre', label: 'Preflop' }, { value: 'post', label: 'Postflop' }]} />}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Order of action ${mode === 'pre' ? 'preflop' : 'postflop'}: ${order.join(', ')}`}>
        <ellipse cx={cx} cy={cy} rx={170} ry={78} fill="#10141c" stroke="var(--hairline-strong)" strokeWidth={1.5} />
        <ellipse cx={cx} cy={cy} rx={150} ry={62} fill="none" stroke="var(--hairline)" strokeWidth={1} />
        <text x={cx} y={cy + 4} textAnchor="middle" style={{ fill: 'var(--ink-tertiary)', fontSize: 12 }}>
          {mode === 'pre' ? 'Preflop: UTG first, BB last' : 'Postflop: SB first, BTN last'}
        </text>
        {SEATS.map((seat, i) => {
          const x = cx + 215 * Math.cos(angles[i]);
          const y = cy + 105 * Math.sin(angles[i]);
          const n = order.indexOf(seat) + 1;
          const last = n === 6;
          return (
            <g key={seat}>
              <rect x={x - 38} y={y - 18} width={76} height={36} rx={9} fill={last ? 'var(--primary-wash)' : 'var(--surface-3)'} stroke={last ? 'var(--primary)' : 'var(--hairline-strong)'} />
              <text x={x - 8} y={y + 4} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 590 }}>
                {seat}
              </text>
              <circle cx={x + 22} cy={y} r={9} fill="var(--surface-1)" stroke="var(--hairline-tertiary)" />
              <text x={x + 22} y={y + 4} textAnchor="middle" style={{ fill: 'var(--ink-muted)', fontSize: 11 }}>
                {n}
              </text>
              {seat === 'BTN' && (
                <g>
                  <circle cx={x - 46} cy={y - 18} r={8} fill="#f7f8f8" />
                  <text x={x - 46} y={y - 15} textAnchor="middle" style={{ fill: '#010102', fontSize: 9, fontWeight: 700 }}>
                    D
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <p className="small subtle">Numbers show the order of action. The highlighted seat acts last: {mode === 'pre' ? 'the big blind closes the preflop action' : 'the button is in position on every postflop street'}.</p>
    </Widget>
  );
}

export function RangeChartWidget({ charts = ['rfi-btn'] }: { charts?: string[] }) {
  const valid = charts.filter((c) => chartById(c));
  const [id, setId] = useState(valid[0] ?? CHARTS[0].id);
  const [hover, setHover] = useState<string | null>(null);
  const chart = chartById(id)!;
  const layers = chartLayers(chart);
  const within = chart.within ? resolveRangeRef(chart.within) : null;
  const dim = within ? new Set(Object.keys(rangeComboKeys()).filter((k) => !within[k])) : undefined;
  const hoverAction = hover ? layers.find((l) => (l.range[hover] ?? 0) > 0)?.action.label ?? (within && !within[hover] ? 'Not in the opening range' : 'Fold') : null;
  return (
    <Widget
      title={chart.title}
      icon={Grid3x3}
      right={valid.length > 1 ? <Segmented value={id} onChange={setId} options={valid.map((c) => ({ value: c, label: chartById(c)!.short }))} /> : undefined}
    >
      <p className="small subtle">{chart.scenario}</p>
      <div className="range-chart-layout">
        <div style={{ maxWidth: 470 }}>
          <RangeGrid layers={layers.map((l) => ({ range: l.range, color: ACTION_COLOR[l.action.kind], label: l.action.label }))} dim={dim} onHover={setHover} label={chart.title} />
        </div>
        <div className="col gap-3">
          <div className="legend" style={{ flexDirection: 'column', gap: 8 }}>
            {layers.map((l) => (
              <span key={l.action.id}>
                <i style={{ background: ACTION_COLOR[l.action.kind] }} />
                {l.action.label}
                <span className="tertiary">{pct(countCombos(l.range) / 1326)} of hands</span>
              </span>
            ))}
            <span>
              <i style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline-strong)' }} />
              Fold
            </span>
          </div>
          <div className="panel-inset" style={{ padding: '10px 12px', minHeight: 54 }}>
            <div className="xs subtle">Hover a hand</div>
            <div className="ink medium">{hover ? `${hover}: ${hoverAction}` : '—'}</div>
          </div>
          <p className="small muted">{chart.note}</p>
        </div>
      </div>
    </Widget>
  );
}

function rangeComboKeys(): Range {
  return parseRange('any').range;
}

type Tier = 'nutted' | 'strong' | 'medium' | 'weak' | 'air';
const TIERS: { id: Tier; label: string }[] = [
  { id: 'nutted', label: 'Nutted: sets, straights, flushes+' },
  { id: 'strong', label: 'Strong: two pair, trips, overpairs, TPGK' },
  { id: 'medium', label: 'Medium: weak top pair, middle pairs' },
  { id: 'weak', label: 'Weak: bottom pairs, underpairs' },
  { id: 'air', label: 'No pair' },
];
const DRAWS: { id: DrawClass; label: string }[] = [
  { id: 'flush-draw', label: 'Flush draws' },
  { id: 'oesd', label: 'Open-enders' },
  { id: 'gutshot', label: 'Gutshots' },
];

export function breakdownRange(range: Range, board: Card[]) {
  const dead = new Set(board);
  const tiers: Record<Tier, number> = { nutted: 0, strong: 0, medium: 0, weak: 0, air: 0 };
  const draws: Record<string, number> = {};
  const made: Record<string, number> = {};
  let total = 0;
  for (const key in range) {
    const w = range[key];
    if (!(w > 0)) continue;
    for (const combo of keyCombos(key)) {
      if (dead.has(combo[0]) || dead.has(combo[1])) continue;
      const cls = classifyHand(combo, board);
      tiers[madeTier(cls.made)] += w;
      made[cls.made] = (made[cls.made] ?? 0) + w;
      for (const d of cls.draws) draws[d] = (draws[d] ?? 0) + w;
      total += w;
    }
  }
  return { tiers, draws, made, total };
}

function GroupedBars({ rows, labels }: { rows: { label: string; a: number; b: number; ca: number; cb: number }[]; labels: [string, string] }) {
  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="chart-legend" style={{ marginBottom: 0 }}>
        <span>
          <i className="rect-key" style={{ background: 'var(--s1)' }} />
          {labels[0]}
        </span>
        <span>
          <i className="rect-key" style={{ background: 'var(--s2)' }} />
          {labels[1]}
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.label}>
          <div className="small muted" style={{ marginBottom: 4 }}>
            {r.label}
          </div>
          {[
            { v: r.a, c: r.ca, color: 'var(--s1)', who: labels[0] },
            { v: r.b, c: r.cb, color: 'var(--s2)', who: labels[1] },
          ].map((x, i) => (
            <div key={i} className="row" style={{ gap: 8, marginTop: i ? 3 : 0 }} title={`${x.who}: ${pct(x.v)} (${x.c.toFixed(0)} combos)`}>
              <div className="hbar-track grow" style={{ height: 9 }}>
                {x.v > 0 && <div className="hbar-fill" style={{ width: `${Math.max(0.6, x.v * 100)}%`, background: x.color }} />}
              </div>
              <span className="xs tabular ink" style={{ width: 92, textAlign: 'right' }}>
                {pct(x.v)} <span className="tertiary">· {x.c.toFixed(0)}</span>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function RangeVsBoardWidget({ hero = 'rfi-btn', villain = 'bb-vs-btn:call', board: boardInit = 'Ah7c2d', full }: { hero?: string; villain?: string; board?: string; full?: boolean }) {
  const [board, setBoard] = useState<Card[]>(parseCards(boardInit));
  const heroRange = useMemo(() => resolveRangeRef(hero), [hero]);
  const villainRange = useMemo(() => resolveRangeRef(villain), [villain]);
  const key = board.join(',');
  const data = useMemo(() => {
    if (board.length < 3) return null;
    const a = breakdownRange(heroRange, board);
    const b = breakdownRange(villainRange, board);
    let eq: number | null = null;
    try {
      eq = computeEquity([rangeCombos(heroRange, board), rangeCombos(villainRange, board)], board, { iterations: full ? 40000 : 16000, exactLimit: 0 }).equity[0];
    } catch {
      eq = null;
    }
    return { a, b, eq };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, heroRange, villainRange, full]);
  const labels: [string, string] = [rangeRefLabel(hero), rangeRefLabel(villain)];
  return (
    <Widget title="Range vs. range on a board" icon={Layers} right={<Button size="sm" variant="ghost" icon={Dice5} onClick={() => setBoard(dealRandom(3, []))}>Random flop</Button>}>
      <CardInput label="Board (3–5 cards)" value={board} onChange={setBoard} max={5} />
      {!data ? (
        <p className="small subtle">Choose at least three board cards.</p>
      ) : (
        <>
          {data.eq !== null && (
            <div>
              <div className="row-between small mb-2">
                <span className="muted">Range equity</span>
                <span className="xs subtle">Monte Carlo</span>
              </div>
              <div className="eqbar" role="img" aria-label={`${labels[0]} ${pct(data.eq)}, ${labels[1]} ${pct(1 - data.eq)}`}>
                <span style={{ width: `${data.eq * 100}%`, background: 'var(--s1)' }} />
                <span style={{ width: `${(1 - data.eq) * 100}%`, background: 'var(--s2)' }} />
              </div>
              <div className="row-between small mt-1">
                <span className="ink medium">
                  {labels[0]} {pct(data.eq)}
                </span>
                <span className="ink medium">
                  {pct(1 - data.eq)} {labels[1]}
                </span>
              </div>
            </div>
          )}
          <GroupedBars
            labels={labels}
            rows={TIERS.map((t) => ({ label: t.label, a: data.a.tiers[t.id] / data.a.total, b: data.b.tiers[t.id] / data.b.total, ca: data.a.tiers[t.id], cb: data.b.tiers[t.id] }))}
          />
          {board.length < 5 && (
            <div className="grid-3">
              {DRAWS.map((d) => (
                <div key={d.id} className="panel-inset" style={{ padding: '8px 10px' }}>
                  <div className="xs subtle">{d.label}</div>
                  <div className="small ink tabular">
                    {pct((data.a.draws[d.id] ?? 0) / data.a.total)} <span className="tertiary">vs</span> {pct((data.b.draws[d.id] ?? 0) / data.b.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="xs subtle">
            {data.a.total.toFixed(0)} vs. {data.b.total.toFixed(0)} live combos. Ranges are the simplified study charts.
          </p>
        </>
      )}
    </Widget>
  );
}

export function TextureWidget() {
  const [board, setBoard] = useState<Card[]>(parseCards('JhTh9c'));
  const t = useMemo(() => (board.length >= 3 ? analyzeBoard(board) : null), [board]);
  const nuts = useMemo(() => (board.length >= 3 ? rankHoldings(board)[0] : null), [board]);
  return (
    <Widget title="Board texture analyzer" icon={Spade} right={<Button size="sm" variant="ghost" icon={Dice5} onClick={() => setBoard(dealRandom(3, []))}>Random flop</Button>}>
      <CardInput label="Board" value={board} onChange={setBoard} max={5} />
      {t && nuts && (
        <>
          <KV
            items={[
              { k: 'Suits', v: t.suits },
              { k: 'Pairing', v: t.paired },
              { k: 'Height', v: t.height },
              { k: 'Wetness', v: t.wetness },
              { k: 'Straight combos', v: String(t.straightCombos) },
              ...(t.volatility !== null ? [{ k: 'Turns that change the nuts', v: pct(t.volatility, 0) }] : []),
            ]}
          />
          <div className="panel-inset" style={{ padding: '10px 12px' }}>
            <div className="xs subtle">Current nuts</div>
            <div className="row wrap mt-1">
              <span className="ink medium">{describeScore(nuts.score)}</span>
              <span className="row gap-1">
                {nuts.combos.slice(0, 4).map((c, i) => (
                  <InlineCards key={i} cards={c} />
                ))}
                {nuts.combos.length > 4 && <span className="xs subtle">+{nuts.combos.length - 4}</span>}
              </span>
            </div>
          </div>
          <ul className="col gap-1 small muted" style={{ paddingLeft: 18, margin: 0 }}>
            {t.heuristics.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </>
      )}
    </Widget>
  );
}

export function BlockersWidget() {
  const [board, setBoard] = useState<Card[]>(parseCards('Ks9d5c2h3d'));
  const [hero, setHero] = useState<Card[]>(parseCards('AhTc'));
  const [value, setValue] = useState('AK, KK, 99, 55');
  const [bluffs, setBluffs] = useState('QJs, JTs, T8s, 76s, 64s');
  const [betPct, setBetPct] = useState(100);
  const v = parseRange(value).range;
  const b = parseRange(bluffs).range;
  const before = { v: countCombos(v, board), b: countCombos(b, board) };
  const after = { v: countCombos(v, [...board, ...hero]), b: countCombos(b, [...board, ...hero]) };
  const need = betPct / 100 / (1 + (2 * betPct) / 100);
  const shareBefore = before.v + before.b ? before.b / (before.v + before.b) : 0;
  const shareAfter = after.v + after.b ? after.b / (after.v + after.b) : 0;
  return (
    <Widget title="Blocker calculator" icon={Hash}>
      <div className="grid-2">
        <CardInput label="Board" value={board} onChange={setBoard} max={5} dead={hero} />
        <CardInput label="Your hand" value={hero} onChange={setHero} max={2} dead={board} />
        <label className="field">
          <span className="label">Villain’s value range</span>
          <input className="input input-mono" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Villain’s bluffs</span>
          <input className="input input-mono" value={bluffs} onChange={(e) => setBluffs(e.target.value)} />
        </label>
      </div>
      <Slider label="Villain’s river bet" value={betPct} min={25} max={200} step={5} onChange={setBetPct} format={(x) => `${x}% pot`} />
      <KV
        items={[
          { k: 'Value combos', v: `${before.v} → ${after.v}` },
          { k: 'Bluff combos', v: `${before.b} → ${after.b}` },
          { k: 'Bluff share', v: `${pct(shareBefore, 0)} → ${pct(shareAfter, 0)}` },
        ]}
      />
      <ThresholdBar have={shareAfter} need={need} haveLabel="Bluff share given your hand" needLabel="Needed" />
      <Verdict ok={shareAfter >= need} yes="Your hand makes this a call." no="Your hand makes this a fold." />
      <p className="xs subtle">Before your cards are removed the bluff share is {pct(shareBefore)}; your cards change it to {pct(shareAfter)}.</p>
    </Widget>
  );
}

export function PolarVsLinearWidget() {
  const [mode, setMode] = useState<'polar' | 'linear' | 'condensed'>('polar');
  const N = 40;
  const role = (i: number): 'value' | 'bluff' | 'check' => {
    const p = i / N;
    if (mode === 'polar') return p < 0.2 ? 'value' : p >= 0.88 ? 'bluff' : 'check';
    if (mode === 'linear') return p < 0.45 ? 'value' : 'check';
    return p >= 0.25 && p < 0.7 ? 'value' : 'check';
  };
  const color = { value: 'var(--s1)', bluff: 'var(--s2)', check: 'var(--surface-4)' };
  const text = {
    polar: 'Polarized: the strongest hands and the weakest hands bet; medium hands check. Pairs naturally with big bets.',
    linear: 'Linear (merged): the top of the range bets, strong to medium, with no bluffs. Pairs with small bets for thin value and protection.',
    condensed: 'Condensed: a range made mostly of medium hands (a typical caller). It has few nuts and little air, and plays as a bluff-catcher facing big bets.',
  }[mode];
  return (
    <Widget
      title="Range shapes"
      icon={Layers}
      right={<Segmented value={mode} onChange={setMode} options={[{ value: 'polar', label: 'Polarized' }, { value: 'linear', label: 'Linear' }, { value: 'condensed', label: 'Condensed' }]} />}
    >
      <div className="row-between xs subtle">
        <span>Strongest hands</span>
        <span>Weakest hands</span>
      </div>
      <div className="strip" role="img" aria-label={text}>
        {Array.from({ length: N }, (_, i) => (
          <i key={i} style={{ background: color[role(i)] }} />
        ))}
      </div>
      <div className="legend">
        <span>
          <i style={{ background: 'var(--s1)' }} />
          Bets for value
        </span>
        <span>
          <i style={{ background: 'var(--s2)' }} />
          Bets as a bluff
        </span>
        <span>
          <i style={{ background: 'var(--surface-4)' }} />
          Checks
        </span>
      </div>
      <p className="small muted">{text}</p>
    </Widget>
  );
}
