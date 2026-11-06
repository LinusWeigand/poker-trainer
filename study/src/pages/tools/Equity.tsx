import { useEffect, useMemo, useState } from 'react';
import { Grid3x3, Plus, Trash, Percent, LoaderCircle } from '../../components/icons';
import { CardInput } from '../../components/PlayingCard';
import { RangeGrid } from '../../components/RangeGrid';
import { HBars } from '../../components/charts';
import { Badge, Button, Card, IconButton, PageHeader, Progress, Segmented } from '../../components/ui';
import { type Card as PCard, parseCards } from '../../engine/cards';
import { CATEGORY_NAMES } from '../../engine/evaluator';
import { countCombos, parseRange, rangeCombos, rangeToString, topRange, type Range } from '../../engine/ranges';
import { singleCombo, type WeightedCombo } from '../../engine/equity';
import { CHARTS, chartLayers, resolveRangeRef } from '../../content/charts';
import { useEquityWorker } from '../../lib/useEquity';
import { useDebounced } from '../../lib/hooks';
import { num, pct } from '../../lib/format';

const COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];

interface PlayerInput {
  mode: 'hand' | 'range';
  cards: PCard[];
  text: string;
  grid: boolean;
}

export const RANGE_PRESETS: { label: string; text: () => string }[] = [
  ...CHARTS.flatMap((c) => [
    { label: c.title, text: () => rangeToString(resolveRangeRef(c.id)) },
    ...(c.actions.length > 1 ? chartLayers(c).map((l) => ({ label: `${c.title} · ${l.action.label}`, text: () => rangeToString(l.range) })) : []),
  ]),
  ...[5, 10, 15, 20, 30, 50].map((p) => ({ label: `Top ${p}% (equity vs. random)`, text: () => rangeToString(topRange(p / 100)) })),
];

export function RangeEditor({ text, onChange, color = 'var(--s1)' }: { text: string; onChange: (t: string) => void; color?: string }) {
  const { range, errors } = useMemo(() => parseRange(text), [text]);
  const paint = (key: string, mode: 'add' | 'remove') => {
    const r: Range = { ...range };
    if (mode === 'add') r[key] = 1;
    else delete r[key];
    onChange(rangeToString(r));
  };
  return (
    <div className="col gap-2">
      <RangeGrid layers={[{ range, color, label: 'In range' }]} onPaint={paint} compact />
      <span className="xs subtle">
        Click or drag to paint. {num(countCombos(range))} combos · {pct(countCombos(range) / 1326)}
        {errors.length > 0 && <span className="bad"> · could not read: {errors.join(', ')}</span>}
      </span>
    </div>
  );
}

export function EquityTool() {
  const [players, setPlayers] = useState<PlayerInput[]>([
    { mode: 'hand', cards: parseCards('AhKh'), text: '', grid: false },
    { mode: 'range', cards: [], text: 'QQ+, AKs, AKo, A5s-A4s', grid: false },
  ]);
  const [board, setBoard] = useState<PCard[]>([]);
  const [dead, setDead] = useState<PCard[]>([]);
  const eq = useEquityWorker();

  const parsed = useMemo(
    () =>
      players.map((p) => {
        if (p.mode === 'hand') return p.cards.length === 2 ? { combos: singleCombo(p.cards[0], p.cards[1]), label: p.cards.length === 2 ? 'hand' : '' } : null;
        const r = parseRange(p.text).range;
        const combos: WeightedCombo[] = rangeCombos(r, [...board, ...dead]);
        return combos.length ? { combos, label: `${num(countCombos(r, [...board, ...dead]))} combos` } : null;
      }),
    [players, board, dead],
  );

  const ready = parsed.every(Boolean);
  const key = useDebounced(JSON.stringify({ players, board, dead }), 250);
  useEffect(() => {
    if (ready) eq.run(parsed.map((p) => p!.combos), board, dead);
    else eq.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const allCards = [...board, ...dead, ...players.flatMap((p) => (p.mode === 'hand' ? p.cards : []))];
  const update = (i: number, patch: Partial<PlayerInput>) => setPlayers((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const r = eq.result;

  return (
    <div className="page-inner">
      <PageHeader
        title="Equity calculator"
        description="Hands or ranges for up to four players, with any board and dead cards. Results are exact when enumeration is cheap (hand vs. hand, or two ranges on the turn) and Monte Carlo otherwise, computed in a background worker."
      />
      <div className="equity-layout">
        <div className="col gap-4">
          {players.map((p, i) => (
            <Card
              key={i}
              title={
                <div className="row">
                  <i className="dot" style={{ background: COLORS[i] }} />
                  <h3>Player {i + 1}</h3>
                  {parsed[i] && p.mode === 'range' && <span className="xs subtle">{parsed[i]!.label}</span>}
                </div>
              }
              actions={
                <>
                  <Segmented value={p.mode} onChange={(m) => update(i, { mode: m })} options={[{ value: 'hand', label: 'Hand' }, { value: 'range', label: 'Range' }]} />
                  {players.length > 2 && <IconButton icon={Trash} label="Remove player" onClick={() => setPlayers(players.filter((_, j) => j !== i))} />}
                </>
              }
            >
              {p.mode === 'hand' ? (
                <CardInput value={p.cards} onChange={(cs) => update(i, { cards: cs })} max={2} dead={allCards.filter((c) => !p.cards.includes(c))} />
              ) : (
                <div className="col gap-2">
                  <div className="row">
                    <input className="input input-mono grow" value={p.text} onChange={(e) => update(i, { text: e.target.value })} placeholder="e.g. 22+, A2s+, KTo+, QJs:0.5" aria-label={`Player ${i + 1} range`} />
                    <IconButton icon={Grid3x3} label="Edit in grid" onClick={() => update(i, { grid: !p.grid })} />
                  </div>
                  <select
                    className="select input-sm"
                    value=""
                    onChange={(e) => {
                      const preset = RANGE_PRESETS[Number(e.target.value)];
                      if (preset) update(i, { text: preset.text() });
                    }}
                    aria-label="Load a preset range"
                  >
                    <option value="">Load a preset…</option>
                    {RANGE_PRESETS.map((pr, k) => (
                      <option key={pr.label} value={k}>
                        {pr.label}
                      </option>
                    ))}
                  </select>
                  {p.grid && <RangeEditor text={p.text} onChange={(t) => update(i, { text: t })} color={COLORS[i]} />}
                </div>
              )}
            </Card>
          ))}
          {players.length < 4 && (
            <Button variant="ghost" icon={Plus} onClick={() => setPlayers([...players, { mode: 'range', cards: [], text: '22+, A2s+, KTs+, ATo+, KJo+', grid: false }])}>
              Add player
            </Button>
          )}
          <Card title="Board & dead cards">
            <div className="grid-2">
              <CardInput label="Board" value={board} onChange={setBoard} max={5} dead={allCards.filter((c) => !board.includes(c))} />
              <CardInput label="Dead cards" value={dead} onChange={setDead} max={6} dead={allCards.filter((c) => !dead.includes(c))} />
            </div>
          </Card>
        </div>

        <div className="col gap-4 sticky-col">
          <Card
            title="Results"
            icon={Percent}
            actions={
              r && (
                <Badge tone={r.exact ? 'good' : 'default'}>
                  {eq.running && <LoaderCircle className="spin" />}
                  {r.exact ? `Exact · ${num(r.samples)} runouts` : `Monte Carlo · ${num(r.samples)}`}
                </Badge>
              )
            }
          >
            {eq.error ? (
              <div className="notice bad">{eq.error}</div>
            ) : !ready ? (
              <p className="small subtle">Give every player a hand or a non-empty range.</p>
            ) : !r ? (
              <p className="small subtle">Calculating…</p>
            ) : (
              <div className="col gap-4">
                {eq.running && <Progress value={eq.progress} label="Simulation progress" />}
                <HBars
                  rows={players.map((p, i) => ({
                    key: String(i),
                    label: `Player ${i + 1}${p.mode === 'hand' ? '' : ' (range)'}`,
                    value: r.equity[i] ?? 0,
                    color: COLORS[i],
                    sub: `win ${pct(r.win[i] ?? 0)} · tie ${pct(r.tie[i] ?? 0)}`,
                  }))}
                  max={1}
                  thickness={12}
                />
              </div>
            )}
          </Card>
          {r && ready && (
            <Card title="Hand at showdown" pad={false}>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Final hand</th>
                      {players.map((_, i) => (
                        <th key={i} className="num">
                          P{i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORY_NAMES.map((name, c) => ({ name, c }))
                      .reverse()
                      .filter(({ c }) => r.categories.some((cat) => (cat[c] ?? 0) > 0.0005))
                      .map(({ name, c }) => (
                        <tr key={name}>
                          <td>{name}</td>
                          {players.map((_, i) => (
                            <td key={i} className="num">
                              {pct(r.categories[i]?.[c] ?? 0)}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
