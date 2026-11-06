import { useMemo, useState } from 'react';
import { Activity, Dice5, Scale, TrendingUp, Wallet } from '../components/icons';
import { ColumnChart, LineChart } from '../components/charts';
import { Button, NumberField, Slider } from '../components/ui';
import { gaussian, mulberry32 } from '../engine/rng';
import { handsForConfidence, normalCdf, quantile, riskOfRuin } from '../engine/stats';
import { compact, num, pct, signed } from '../lib/format';
import { KV, Widget } from './Widget';

export function VarianceWidget({ full }: { full?: boolean }) {
  const [wr, setWr] = useState(5);
  const [sd, setSd] = useState(90);
  const [hands, setHands] = useState(50000);
  const [seed, setSeed] = useState(1);
  const plotPaths = 24;
  const sims = full ? 400 : 120;
  const steps = 100;
  const sim = useMemo(() => {
    const rng = mulberry32(seed * 7919 + 13);
    const blocks = hands / 100 / steps;
    const paths: { x: number; y: number }[][] = [];
    const finals: number[] = [];
    const dds: number[] = [];
    for (let p = 0; p < sims; p++) {
      let x = 0;
      let peak = 0;
      let dd = 0;
      const pts = [{ x: 0, y: 0 }];
      for (let i = 1; i <= steps; i++) {
        x += wr * blocks + sd * Math.sqrt(blocks) * gaussian(rng);
        peak = Math.max(peak, x);
        dd = Math.max(dd, peak - x);
        if (p < plotPaths) pts.push({ x: (i * hands) / steps, y: x });
      }
      finals.push(x / (hands / 100));
      dds.push(dd);
      if (p < plotPaths) paths.push(pts);
    }
    return { paths, finals: finals.sort((a, b) => a - b), dds: dds.sort((a, b) => a - b) };
  }, [wr, sd, hands, seed, sims]);

  const xs = Array.from({ length: steps + 1 }, (_, i) => (i * hands) / steps);
  const se = sd / Math.sqrt(hands / 100);
  const pBehind = normalCdf((-wr * Math.sqrt(hands / 100)) / sd);
  const needed = handsForConfidence(wr, sd);
  const bins = 16;
  const lo = sim.finals[0];
  const hi = sim.finals[sim.finals.length - 1];
  const width = (hi - lo) / bins || 1;
  const hist = Array.from({ length: bins }, (_, i) => sim.finals.filter((f) => f >= lo + i * width && (i === bins - 1 ? f <= hi : f < lo + (i + 1) * width)).length);

  return (
    <Widget title="Variance simulator" icon={Activity} right={<Button size="sm" variant="ghost" icon={Dice5} onClick={() => setSeed(seed + 1)}>Re-run</Button>}>
      <div className="widget-controls">
        <Slider label="True win rate" value={wr} min={-5} max={15} step={0.5} onChange={setWr} format={(v) => `${v} bb/100`} />
        <Slider label="Standard deviation" value={sd} min={50} max={150} step={5} onChange={setSd} format={(v) => `${v} bb/100`} />
        <Slider label="Hands" value={hands} min={5000} max={500000} step={5000} onChange={setHands} format={(v) => compact(v)} />
      </div>
      <LineChart
        ariaLabel={`${plotPaths} simulated results over ${num(hands)} hands with the expected line and 95% band`}
        height={full ? 300 : 230}
        series={[
          ...sim.paths.map((p, i) => ({ id: `p${i}`, label: `Run ${i + 1}`, color: 'var(--s1)', points: p, width: 1.2, opacity: 0.35, quiet: true })),
          { id: 'exp', label: 'Expected', color: 'var(--ink)', points: xs.map((x) => ({ x, y: (wr * x) / 100 })), endDot: false },
        ]}
        bands={[{ color: 'var(--s1)', label: '95% band', points: xs.map((x) => ({ x, lo: (wr * x) / 100 - 1.96 * sd * Math.sqrt(x / 100), hi: (wr * x) / 100 + 1.96 * sd * Math.sqrt(x / 100) })) }]}
        xFormat={(v) => compact(v)}
        yFormat={(v) => compact(v)}
        xLabel="Hands played (y: big blinds won)"
        directLabels={false}
      />
      <KV
        items={[
          { k: 'Observed win rate, 95%', v: `${signed(wr - 1.96 * se, 0)} to ${signed(wr + 1.96 * se, 0)}`, sub: 'bb/100' },
          { k: 'Chance of being behind', v: pct(pBehind) },
          { k: 'Median worst downswing', v: `${compact(quantile(sim.dds, 0.5))} bb` },
          { k: 'Hands for 95% confidence', v: Number.isFinite(needed) ? compact(needed) : '∞' },
        ]}
      />
      {full && (
        <div>
          <div className="label mb-2">Observed win rate across {sims} simulated players with the same true win rate</div>
          <ColumnChart
            ariaLabel="Histogram of observed win rates"
            labels={hist.map((_, i) => (lo + (i + 0.5) * width).toFixed(0))}
            series={[{ id: 'n', label: 'Players', color: 'var(--s1)' }]}
            values={hist.map((h) => [h])}
            yFormat={(v) => String(Math.round(v))}
            height={180}
          />
        </div>
      )}
    </Widget>
  );
}

export function KellyWidget({ full }: { full?: boolean }) {
  const [p, setP] = useState(0.55);
  const [b, setB] = useState(1);
  const [mult, setMult] = useState(1);
  const [seed, setSeed] = useState(3);
  const [wr, setWr] = useState(5);
  const [sd, setSd] = useState(90);
  const [buyins, setBuyins] = useState(30);
  const q = 1 - p;
  const fStar = Math.max(0, (b * p - q) / b);
  const g = (f: number) => (f >= 1 ? -Infinity : p * Math.log(1 + b * f) + q * Math.log(1 - f));
  const fMax = Math.min(0.99, Math.max(0.05, fStar * 3));
  const fs = Array.from({ length: 80 }, (_, i) => (i / 79) * fMax);
  const chosen = Math.min(0.99, fStar * mult);
  const runs = useMemo(() => {
    const rng = mulberry32(seed * 104729);
    const outcomes = Array.from({ length: 300 }, () => rng() < p);
    const mk = (f: number) => {
      let w = 1;
      return outcomes.map((win, i) => {
        w *= win ? 1 + b * f : 1 - f;
        return { x: i + 1, y: Math.log10(Math.max(1e-12, w)) };
      });
    };
    return [
      { id: 'half', label: '½ Kelly', color: 'var(--s1)', points: mk(fStar / 2) },
      { id: 'full', label: 'Kelly', color: 'var(--s3)', points: mk(fStar) },
      { id: 'double', label: '2× Kelly', color: 'var(--s2)', points: mk(Math.min(0.99, fStar * 2)) },
    ];
  }, [p, b, fStar, seed]);
  const ror = riskOfRuin(wr, sd, buyins * 100);
  return (
    <Widget title="Kelly criterion" icon={Wallet} right={<Button size="sm" variant="ghost" icon={Dice5} onClick={() => setSeed(seed + 1)}>New sequence</Button>}>
      <div className="widget-controls">
        <Slider label="Win probability p" value={p} min={0.4} max={0.8} step={0.01} onChange={setP} format={(v) => pct(v, 0)} />
        <Slider label="Net odds b (win b per 1)" value={b} min={0.5} max={3} step={0.05} onChange={setB} format={(v) => `${v.toFixed(2)} : 1`} />
        <Slider label="Your fraction" value={mult} min={0.25} max={3} step={0.05} onChange={setMult} format={(v) => `${v.toFixed(2)}× Kelly`} />
      </div>
      <KV
        items={[
          { k: 'Kelly fraction f*', v: pct(fStar) },
          { k: 'Your bet', v: pct(chosen) },
          { k: 'Growth per bet', v: `${(g(chosen) * 100).toFixed(2)}%`, sub: 'log' },
          { k: 'Of max growth', v: fStar > 0 ? pct(g(chosen) / g(fStar)) : '—' },
        ]}
      />
      {fStar === 0 ? (
        <div className="notice warn">No edge: bp − q ≤ 0, so Kelly says bet nothing.</div>
      ) : (
        <div className={full ? 'grid-2' : 'col gap-4'}>
          <LineChart
            ariaLabel="Expected log growth by bet fraction"
            height={200}
            series={[{ id: 'g', label: 'Growth rate', color: 'var(--s1)', points: fs.map((f) => ({ x: f, y: g(f) * 100 })) }]}
            refLines={[{ y: 0, label: 'Zero growth' }]}
            markers={[
              { x: fStar, y: g(fStar) * 100, label: 'Kelly', color: 'var(--s3)' },
              { x: chosen, y: g(chosen) * 100 },
            ]}
            xFormat={(v) => `${Math.round(v * 100)}%`}
            yFormat={(v) => `${v.toFixed(1)}%`}
            xLabel="Fraction of bankroll bet"
            directLabels={false}
          />
          <LineChart
            ariaLabel="Bankroll paths for half, full and double Kelly on one sequence of bets, log scale"
            height={200}
            series={runs}
            yFormat={(v) => `${(10 ** v).toPrecision(2)}×`}
            xFormat={(v) => String(v)}
            xLabel="Bets (bankroll on a log scale)"
          />
        </div>
      )}
      <div className="divider" />
      <div className="row mb-2">
        <Scale size={14} className="subtle" />
        <span className="label">Poker risk of ruin</span>
      </div>
      <div className="widget-controls">
        <NumberField label="Win rate (bb/100)" value={wr} onChange={setWr} step={0.5} />
        <NumberField label="Std. dev. (bb/100)" value={sd} onChange={setSd} step={5} min={1} />
        <NumberField label="Bankroll (buy-ins of 100bb)" value={buyins} onChange={setBuyins} step={5} min={1} />
      </div>
      <KV items={[{ k: 'Risk of ruin', v: pct(ror, ror < 0.01 ? 2 : 1) }, { k: 'Buy-ins for 1% RoR', v: wr > 0 ? String(Math.ceil((-Math.log(0.01) * (sd * sd)) / 100 / (2 * (wr / 100)) / 100)) : '∞' }]} />
    </Widget>
  );
}

export function AdverseSelectionWidget() {
  const [h, setH] = useState(2);
  const [qPct, setQPct] = useState(20);
  const [seed, setSeed] = useState(5);
  const w = 10;
  const q = qPct / 100;
  const expected = (hs: number) => (1 - q) * hs - (hs < w ? (q * (w - hs) ** 2) / (2 * w) : 0);
  const breakEven = q > 0 ? (w * (1 - Math.sqrt(1 - q * q))) / q : 0;
  const hs = Array.from({ length: 61 }, (_, i) => (i / 60) * w);
  const sim = useMemo(() => {
    const rng = mulberry32(seed * 31337);
    let noise = 0;
    let informed = 0;
    const a: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    const bb: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    const t: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    for (let i = 1; i <= 500; i++) {
      const v = 50 - w + 2 * w * rng();
      const bid = 50 - h;
      const ask = 50 + h;
      if (rng() < q) {
        if (v > ask) informed += ask - v;
        else if (v < bid) informed += v - bid;
      } else if (rng() < 0.5) noise += ask - v;
      else noise += v - bid;
      a.push({ x: i, y: noise });
      bb.push({ x: i, y: informed });
      t.push({ x: i, y: noise + informed });
    }
    return [
      { id: 'noise', label: 'From noise traders', color: 'var(--s1)', points: a },
      { id: 'informed', label: 'To informed traders', color: 'var(--s2)', points: bb },
      { id: 'total', label: 'Total P&L', color: 'var(--ink)', points: t },
    ];
  }, [h, q, seed]);
  return (
    <Widget title="Market making with informed flow" icon={TrendingUp} right={<Button size="sm" variant="ghost" icon={Dice5} onClick={() => setSeed(seed + 1)}>Re-run</Button>}>
      <p className="small muted">
        The true value V is uniform between 40 and 60. You quote 50 ± h. Informed traders know V and trade only when it is outside your quote; noise traders buy or sell at random.
      </p>
      <div className="widget-controls">
        <Slider label="Half-spread h" value={h} min={0} max={10} step={0.1} onChange={setH} format={(v) => v.toFixed(1)} />
        <Slider label="Informed share of traders" value={qPct} min={0} max={100} onChange={setQPct} format={(v) => `${v}%`} />
      </div>
      <KV
        items={[
          { k: 'Expected P&L per trader', v: signed(expected(h), 2) },
          { k: 'Break-even half-spread', v: breakEven.toFixed(2) },
          { k: 'Best half-spread', v: (hs.reduce((best, x) => (expected(x) > expected(best) ? x : best), 0)).toFixed(1) },
        ]}
      />
      <div className="grid-2">
        <LineChart
          ariaLabel="Expected P&L per trader by half-spread"
          height={190}
          series={[{ id: 'e', label: 'Expected P&L', color: 'var(--s1)', points: hs.map((x) => ({ x, y: expected(x) })) }]}
          refLines={[{ y: 0, label: 'Break-even' }]}
          markers={[{ x: h, y: expected(h) }]}
          xFormat={(v) => v.toFixed(0)}
          yFormat={(v) => v.toFixed(1)}
          xLabel="Half-spread"
          directLabels={false}
        />
        <LineChart ariaLabel="Simulated cumulative P&L split by counterparty type" height={190} series={sim} xFormat={(v) => String(Math.round(v))} yFormat={(v) => compact(v)} xLabel="Traders" />
      </div>
    </Widget>
  );
}
