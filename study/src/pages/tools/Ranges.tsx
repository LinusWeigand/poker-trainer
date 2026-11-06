import { useMemo, useState } from 'react';
import { Dice5, Grid3x3, Layers, Trash } from '../../components/icons';
import { CardInput } from '../../components/PlayingCard';
import { RangeGrid } from '../../components/RangeGrid';
import { HBars } from '../../components/charts';
import { Button, Card, PageHeader, Segmented } from '../../components/ui';
import { type Card as PCard, dealRandom, parseCards } from '../../engine/cards';
import { DRAW_LABELS, DRAW_ORDER, MADE_LABELS, MADE_ORDER, madeTier } from '../../engine/handClass';
import { countCombos, keyKind, parseRange, rangeToString, type Range } from '../../engine/ranges';
import { PREFLOP_EQUITY } from '../../engine/preflopEquity';
import { CHARTS, chartLayers } from '../../content/charts';
import { RangeVsBoardWidget, breakdownRange } from '../../widgets/cards';
import { RANGE_PRESETS } from './Equity';
import { num, pct } from '../../lib/format';

const TIER_COLOR: Record<string, string> = { nutted: 'var(--o1)', strong: 'var(--o2)', medium: 'var(--o3)', weak: 'var(--o4)', air: 'var(--hairline-tertiary)' };

const REFS = CHARTS.flatMap((c) => [{ ref: c.id, label: c.title }, ...(c.actions.length > 1 ? chartLayers(c).map((l) => ({ ref: `${c.id}:${l.action.id}`, label: `${c.title} · ${l.action.label}` })) : [])]);

export function RangesTool() {
  const [text, setText] = useState(rangeToString(parseRange('22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, ATo+, KTo+, QTo+, JTo').range));
  const [weight, setWeight] = useState(1);
  const [board, setBoard] = useState<PCard[]>(parseCards('Kd7s2c'));
  const [hover, setHover] = useState<string | null>(null);
  const [hero, setHero] = useState('rfi-btn');
  const [villain, setVillain] = useState('bb-vs-btn:call');
  const { range, errors } = useMemo(() => parseRange(text), [text]);

  const paint = (key: string, mode: 'add' | 'remove') => {
    const r: Range = { ...range };
    if (mode === 'add') r[key] = weight;
    else delete r[key];
    setText(rangeToString(r));
  };

  const combos = countCombos(range);
  const byKind = { pair: 0, suited: 0, offsuit: 0 };
  for (const k in range) byKind[keyKind(k)] += countCombos({ [k]: range[k] });
  const bd = useMemo(() => (board.length >= 3 ? breakdownRange(range, board) : null), [range, board]);

  return (
    <div className="page-inner wide">
      <PageHeader title="Range explorer" description="Paint a range on the grid or type it in standard notation, then see how it hits any board: made hands, draws and strength tiers, with exact combo counts after card removal." />
      <div className="ranges-layout">
        <Card
          title="Range"
          icon={Grid3x3}
          actions={
            <>
              <Segmented value={weight} onChange={setWeight} options={[1, 0.75, 0.5, 0.25].map((w) => ({ value: w, label: `${w * 100}%` }))} label="Paint weight" />
              <Button size="sm" variant="ghost" icon={Trash} onClick={() => setText('')}>
                Clear
              </Button>
            </>
          }
        >
          <RangeGrid layers={[{ range, color: 'var(--act-range)', label: 'In range' }]} onPaint={paint} onHover={setHover} highlight={hover} />
          <div className="row-between mt-3 small">
            <span className="subtle">{hover ? `${hover} · ${keyKind(hover) === 'pair' ? 6 : keyKind(hover) === 'suited' ? 4 : 12} combos · ${pct(PREFLOP_EQUITY[hover] ?? 0)} vs. random${range[hover] ? ` · in range at ${Math.round(range[hover] * 100)}%` : ''}` : 'Hover a cell for details. Drag to paint.'}</span>
          </div>
          <label className="field mt-3">
            <span className="label">Range text</span>
            <textarea className="textarea input-mono" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
            {errors.length > 0 && <span className="hint bad">Could not read: {errors.join(', ')}</span>}
          </label>
          <select
            className="select input-sm mt-2"
            value=""
            onChange={(e) => {
              const p = RANGE_PRESETS[Number(e.target.value)];
              if (p) setText(p.text());
            }}
            aria-label="Load a preset"
          >
            <option value="">Load a preset…</option>
            {RANGE_PRESETS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </Card>

        <div className="col gap-4">
          <Card title="Size">
            <div className="kv">
              <div>
                <div className="k">Combos</div>
                <div className="v">{num(combos, combos % 1 ? 1 : 0)}</div>
              </div>
              <div>
                <div className="k">Of all hands</div>
                <div className="v">{pct(combos / 1326)}</div>
              </div>
              <div>
                <div className="k">Classes</div>
                <div className="v">{Object.keys(range).length}<small>/ 169</small></div>
              </div>
            </div>
            <div className="mt-3">
              <HBars
                rows={[
                  { label: 'Pairs', value: byKind.pair / Math.max(1, combos), sub: `${num(byKind.pair)} combos` },
                  { label: 'Suited', value: byKind.suited / Math.max(1, combos), sub: `${num(byKind.suited)} combos` },
                  { label: 'Offsuit', value: byKind.offsuit / Math.max(1, combos), sub: `${num(byKind.offsuit)} combos` },
                ]}
                max={1}
              />
            </div>
          </Card>
          <Card title="On this board" icon={Layers} actions={<Button size="sm" variant="ghost" icon={Dice5} onClick={() => setBoard(dealRandom(3, []))}>Random flop</Button>}>
            <CardInput value={board} onChange={setBoard} max={5} />
            {!bd ? (
              <p className="small subtle mt-3">Add at least three board cards.</p>
            ) : bd.total === 0 ? (
              <p className="small subtle mt-3">No combos left.</p>
            ) : (
              <div className="col gap-4 mt-4">
                <HBars
                  rows={MADE_ORDER.filter((m) => (bd.made[m] ?? 0) > 0).map((m) => ({
                    key: m,
                    label: MADE_LABELS[m],
                    value: (bd.made[m] ?? 0) / bd.total,
                    color: TIER_COLOR[madeTier(m)],
                    sub: `${num(bd.made[m] ?? 0, 0)}`,
                  }))}
                  max={1}
                  thickness={8}
                />
                {board.length < 5 && (
                  <div>
                    <div className="label mb-2">Draws (can overlap with made hands)</div>
                    <HBars rows={DRAW_ORDER.map((d) => ({ key: d, label: DRAW_LABELS[d], value: (bd.draws[d] ?? 0) / bd.total, color: 'var(--s2)', sub: `${num(bd.draws[d] ?? 0, 0)}` }))} max={1} thickness={8} />
                  </div>
                )}
                <span className="xs subtle">{num(bd.total, 0)} live combos after removing the board. Shades run from nutted (lightest) to weak; grey is no pair.</span>
              </div>
            )}
          </Card>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Compare two study ranges</h2>
          <div className="row wrap">
            <select className="select input-sm" value={hero} onChange={(e) => setHero(e.target.value)} aria-label="First range" style={{ width: 230 }}>
              {REFS.map((r) => (
                <option key={r.ref} value={r.ref}>
                  {r.label}
                </option>
              ))}
            </select>
            <span className="subtle small">vs.</span>
            <select className="select input-sm" value={villain} onChange={(e) => setVillain(e.target.value)} aria-label="Second range" style={{ width: 230 }}>
              {REFS.map((r) => (
                <option key={r.ref} value={r.ref}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <RangeVsBoardWidget key={`${hero}|${villain}`} hero={hero} villain={villain} board="Ah7c2d" full />
      </section>
    </div>
  );
}

