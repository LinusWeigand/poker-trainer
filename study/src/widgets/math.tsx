import { useMemo, useState } from 'react';
import { Calculator, CircleCheck, CircleX, Percent, Scale, Sigma, Target, Layers } from '../components/icons';
import { LineChart, HBars } from '../components/charts';
import { NumberField, Slider, Segmented } from '../components/ui';
import { alpha, bluffShare, defendFreq, requiredEquity } from '../engine/toygames';
import { hitProbability } from '../engine/stats';
import { money, pct, signed } from '../lib/format';
import { KV, ThresholdBar, Widget } from './Widget';

const range = (lo: number, hi: number, step: number) => {
  const out: number[] = [];
  for (let x = lo; x <= hi + 1e-9; x += step) out.push(Math.round(x * 1000) / 1000);
  return out;
};

export function Verdict({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <div className="verdict">
      {ok ? <CircleCheck className="good" /> : <CircleX className="bad" />}
      {ok ? yes : no}
    </div>
  );
}

export function EvCallWidget() {
  const [pot, setPot] = useState(100);
  const [betPct, setBetPct] = useState(50);
  const [eq, setEq] = useState(30);
  const bet = (pot * betPct) / 100;
  const need = bet / (pot + 2 * bet);
  const e = eq / 100;
  const ev = e * (pot + bet) - (1 - e) * bet;
  return (
    <Widget title="EV of a call" icon={Calculator}>
      <div className="widget-controls">
        <Slider label="Pot before the bet" value={pot} min={10} max={500} step={10} onChange={setPot} format={(v) => money(v)} />
        <Slider label="Villain’s bet" value={betPct} min={10} max={200} step={5} onChange={setBetPct} format={(v) => `${v}% · ${money((pot * v) / 100)}`} />
        <Slider label="Your equity" value={eq} min={0} max={100} onChange={setEq} format={(v) => `${v}%`} />
      </div>
      <KV
        items={[
          { k: 'You call', v: money(bet) },
          { k: 'To win', v: money(pot + bet) },
          { k: 'Required equity', v: pct(need) },
          { k: 'EV of calling', v: `${ev >= 0 ? '+' : '−'}$${Math.abs(ev).toFixed(1)}` },
        ]}
      />
      <ThresholdBar have={e} need={need} haveLabel="Your equity" needLabel="Price" />
      <Verdict ok={ev >= 0} yes={`Calling is +EV: you earn $${ev.toFixed(1)} per call on average.`} no={`Calling loses $${Math.abs(ev).toFixed(1)} per call. Fold, unless implied odds make up the gap.`} />
    </Widget>
  );
}

export function PotOddsCurveWidget() {
  const [s, setS] = useState(0.66);
  const xs = range(0.1, 3, 0.05);
  return (
    <Widget title="Required equity by bet size" icon={Percent}>
      <Slider label="Bet size (fraction of pot)" value={s} min={0.1} max={3} step={0.01} onChange={setS} format={(v) => `${Math.round(v * 100)}% pot`} />
      <KV
        items={[
          { k: 'You call', v: `${Math.round(s * 100)}` , sub: 'per 100 in the pot' },
          { k: 'Final pot', v: `${Math.round(100 + 2 * s * 100)}` },
          { k: 'Required equity', v: pct(requiredEquity(s)) },
        ]}
      />
      <LineChart
        ariaLabel="Required equity against bet size"
        height={200}
        series={[{ id: 'req', label: 'Required equity', color: 'var(--s1)', points: xs.map((x) => ({ x, y: requiredEquity(x) })), endDot: false }]}
        markers={[{ x: s, y: requiredEquity(s), label: pct(requiredEquity(s)) }]}
        xFormat={(v) => `${Math.round(v * 100)}%`}
        yFormat={(v) => `${Math.round(v * 100)}%`}
        yDomain={[0, 0.5]}
        xLabel="Bet as % of pot"
        directLabels={false}
      />
      <p className="small subtle">The curve flattens: going from ½ pot to pot moves the price from 25% to 33%, but doubling again only reaches 40%. The required equity never passes 50%.</p>
    </Widget>
  );
}

export function RuleOf24Widget() {
  const [outs, setOuts] = useState(9);
  const [street, setStreet] = useState<'flop' | 'turn'>('flop');
  const exact = (o: number) => (street === 'flop' ? hitProbability(o, 47, 2) : o / 46);
  const approx = (o: number) => Math.min(1, (street === 'flop' ? 4 : 2) * o / 100);
  const refined = (o: number) => (street === 'flop' ? Math.min(1, (4 * o - Math.max(0, o - 8)) / 100) : approx(o));
  const xs = range(1, 20, 1);
  return (
    <Widget title="Outs → equity" icon={Target} right={<Segmented value={street} onChange={setStreet} options={[{ value: 'flop', label: 'Flop (2 cards)' }, { value: 'turn', label: 'Turn (1 card)' }]} />}>
      <Slider label="Outs" value={outs} min={1} max={20} onChange={setOuts} format={(v) => `${v} outs`} />
      <KV
        items={[
          { k: 'Exact', v: pct(exact(outs)) },
          { k: street === 'flop' ? 'Rule of 4' : 'Rule of 2', v: pct(approx(outs)) },
          ...(street === 'flop' ? [{ k: '4× − (outs − 8)', v: pct(refined(outs)) }] : []),
          { k: 'Error of the rule', v: `${signed((approx(outs) - exact(outs)) * 100)} pts` },
        ]}
      />
      <LineChart
        ariaLabel="Exact and approximate hit probability by number of outs"
        height={200}
        series={[
          { id: 'exact', label: 'Exact', color: 'var(--s1)', points: xs.map((x) => ({ x, y: exact(x) })) },
          { id: 'rule', label: street === 'flop' ? 'Rule of 4' : 'Rule of 2', color: 'var(--s2)', points: xs.map((x) => ({ x, y: approx(x) })) },
        ]}
        markers={[{ x: outs, y: exact(outs) }]}
        xFormat={(v) => `${v}`}
        yFormat={(v) => `${Math.round(v * 100)}%`}
        xLabel="Outs"
      />
    </Widget>
  );
}

export function FoldEquityWidget() {
  const [pot, setPot] = useState(100);
  const [bet, setBet] = useState(100);
  const [fold, setFold] = useState(30);
  const [eq, setEq] = useState(35);
  const f = fold / 100;
  const e = eq / 100;
  const called = e * (pot + 2 * bet) - bet;
  const ev = f * pot + (1 - f) * called;
  const be = called >= 0 ? 0 : -called / (pot - called);
  const xs = range(0, 1, 0.02);
  return (
    <Widget title="Semi-bluff EV" icon={Scale}>
      <div className="widget-controls">
        <Slider label="Pot" value={pot} min={20} max={400} step={10} onChange={setPot} format={(v) => money(v)} />
        <Slider label="Your bet (all-in)" value={bet} min={10} max={400} step={10} onChange={setBet} format={(v) => money(v)} />
        <Slider label="Villain folds" value={fold} min={0} max={100} onChange={setFold} format={(v) => `${v}%`} />
        <Slider label="Equity when called" value={eq} min={0} max={60} onChange={setEq} format={(v) => `${v}%`} />
      </div>
      <KV
        items={[
          { k: 'EV when called', v: `${signed(called)}` },
          { k: 'EV of the bet', v: `${signed(ev)}` },
          { k: 'Break-even folds', v: pct(be) },
          { k: 'Pure-bluff α', v: pct(alpha(bet / pot)) },
        ]}
      />
      <LineChart
        ariaLabel="Semi-bluff EV by fold frequency"
        height={190}
        series={[{ id: 'ev', label: 'EV of betting', color: 'var(--s1)', points: xs.map((x) => ({ x, y: x * pot + (1 - x) * called })) }]}
        refLines={[{ y: 0, label: 'Break-even' }]}
        markers={[{ x: f, y: ev }]}
        xFormat={(v) => `${Math.round(v * 100)}%`}
        xLabel="Villain’s fold frequency"
        directLabels={false}
      />
      <p className="small subtle">Equity when called lowers the folds you need from {pct(alpha(bet / pot), 0)} (pure bluff) to {pct(be, 0)}.</p>
    </Widget>
  );
}

export function AlphaMdfWidget() {
  const [s, setS] = useState(0.75);
  const xs = range(0.1, 3, 0.05);
  return (
    <Widget title="Alpha, MDF and bluff share" icon={Sigma}>
      <Slider label="Bet size" value={s} min={0.1} max={3} step={0.01} onChange={setS} format={(v) => `${Math.round(v * 100)}% pot`} />
      <KV
        items={[
          { k: 'α: bluff needs folds', v: pct(alpha(s)) },
          { k: 'MDF: defend at least', v: pct(defendFreq(s)) },
          { k: 'River bluff share', v: pct(bluffShare(s)) },
        ]}
      />
      <LineChart
        ariaLabel="Alpha, MDF and bluff share by bet size"
        height={220}
        series={[
          { id: 'mdf', label: 'MDF', color: 'var(--s1)', points: xs.map((x) => ({ x, y: defendFreq(x) })) },
          { id: 'alpha', label: 'Alpha', color: 'var(--s2)', points: xs.map((x) => ({ x, y: alpha(x) })) },
          { id: 'bluff', label: 'Bluff share', color: 'var(--s3)', points: xs.map((x) => ({ x, y: bluffShare(x) })) },
        ]}
        markers={[{ x: s, y: defendFreq(s) }, { x: s, y: alpha(s) }, { x: s, y: bluffShare(s) }]}
        xFormat={(v) => `${Math.round(v * 100)}%`}
        yFormat={(v) => `${Math.round(v * 100)}%`}
        yDomain={[0, 1]}
        xLabel="Bet as % of pot"
      />
    </Widget>
  );
}

export function ImpliedOddsWidget() {
  const [pot, setPot] = useState(100);
  const [bet, setBet] = useState(50);
  const [outs, setOuts] = useState(9);
  const [stack, setStack] = useState(300);
  const e = outs / 46;
  const finalPot = pot + 2 * bet;
  const need = Math.max(0, bet / e - finalPot);
  const direct = bet / finalPot;
  return (
    <Widget title="Implied odds" icon={Calculator}>
      <div className="widget-controls">
        <Slider label="Pot" value={pot} min={20} max={400} step={10} onChange={setPot} format={(v) => money(v)} />
        <Slider label="Villain bets" value={bet} min={10} max={300} step={5} onChange={setBet} format={(v) => money(v)} />
        <Slider label="Outs (one card to come)" value={outs} min={1} max={15} onChange={setOuts} format={(v) => `${v} · ${pct(v / 46)}`} />
        <Slider label="Stack behind after calling" value={stack} min={0} max={1000} step={10} onChange={setStack} format={(v) => money(v)} />
      </div>
      <KV
        items={[
          { k: 'Hit chance', v: pct(e) },
          { k: 'Direct price', v: pct(direct) },
          { k: 'Extra needed when you hit', v: money(need) },
          { k: 'Of the stack behind', v: stack > 0 ? pct(Math.min(9.99, need / stack)) : '—' },
        ]}
      />
      <Verdict
        ok={e >= direct || need <= stack * 0.5}
        yes={e >= direct ? 'Calling is profitable on direct odds alone.' : `You need to win ${money(need)} more on average when you hit — plausible with ${money(stack)} behind.`}
        no={need > stack ? `Even winning the whole ${money(stack)} behind would not be enough.` : `You would need to win ${pct(need / Math.max(1, stack), 0)} of the stack behind every time you hit. Be honest about how often that happens.`}
      />
    </Widget>
  );
}

export function GeometricWidget() {
  const [pot, setPot] = useState(5.5);
  const [stack, setStack] = useState(97.5);
  const [streets, setStreets] = useState(3);
  const s = (Math.pow(1 + (2 * stack) / pot, 1 / streets) - 1) / 2;
  const rows: { street: string; potBefore: number; bet: number; stackAfter: number }[] = [];
  let p = pot;
  let st = stack;
  const names = ['Flop', 'Turn', 'River'].slice(3 - streets);
  for (let i = 0; i < streets; i++) {
    const b = Math.min(st, p * s);
    rows.push({ street: names[i], potBefore: p, bet: b, stackAfter: st - b });
    p += 2 * b;
    st -= b;
  }
  return (
    <Widget title="Geometric bet sizing" icon={Layers}>
      <div className="widget-controls">
        <NumberField label="Pot (bb)" value={pot} onChange={setPot} step={0.5} min={1} />
        <NumberField label="Effective stack (bb)" value={stack} onChange={setStack} step={1} min={1} />
        <div className="field">
          <span className="label">Streets left</span>
          <Segmented value={streets} onChange={setStreets} options={[1, 2, 3].map((n) => ({ value: n, label: String(n) }))} />
        </div>
      </div>
      <KV items={[{ k: 'Bet each street', v: `${Math.round(s * 100)}%`, sub: 'of pot' }, { k: 'SPR', v: (stack / pot).toFixed(1) }]} />
      <div className="table-wrap panel-inset">
        <table className="table">
          <thead>
            <tr>
              <th>Street</th>
              <th className="num">Pot before</th>
              <th className="num">Bet</th>
              <th className="num">Stack after</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.street}>
                <td>{r.street}</td>
                <td className="num">{r.potBefore.toFixed(1)}</td>
                <td className="num">{r.bet.toFixed(1)}</td>
                <td className="num">{r.stackAfter.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Widget>
  );
}

export function SprWidget() {
  const [pot, setPot] = useState(22.5);
  const [stack, setStack] = useState(89);
  const spr = stack / pot;
  const zone = spr < 3 ? 'Low: top pair+ is usually happy to get all-in.' : spr <= 8 ? 'Medium: one pair is a judgement call against aggression; plan street by street.' : 'High: one-pair hands shrink, implied-odds hands gain, position matters most.';
  const after = (frac: number) => {
    const b = Math.min(stack, pot * frac);
    return (stack - b) / (pot + 2 * b);
  };
  return (
    <Widget title="SPR planner" icon={Scale}>
      <div className="widget-controls">
        <NumberField label="Pot on the flop (bb)" value={pot} onChange={setPot} step={0.5} min={1} />
        <NumberField label="Effective stack (bb)" value={stack} onChange={setStack} step={1} min={0} />
      </div>
      <KV items={[{ k: 'SPR', v: spr.toFixed(2) }, { k: 'After ½-pot bet + call', v: after(0.5).toFixed(2) }, { k: 'After pot bet + call', v: after(1).toFixed(2) }]} />
      <div className="notice">{zone}</div>
    </Widget>
  );
}

export function RiverCalcWidget() {
  const [pot, setPot] = useState(100);
  const [bet, setBet] = useState(75);
  const [value, setValue] = useState(14);
  const [bluffs, setBluffs] = useState(7);
  const need = bet / (pot + 2 * bet);
  const share = value + bluffs > 0 ? bluffs / (value + bluffs) : 0;
  const ev = share * (pot + bet) - (1 - share) * bet;
  return (
    <Widget title="Bluff-catcher calculator" icon={Calculator}>
      <div className="widget-controls">
        <Slider label="Pot" value={pot} min={20} max={400} step={10} onChange={setPot} format={(v) => money(v)} />
        <Slider label="Villain bets" value={bet} min={10} max={400} step={5} onChange={setBet} format={(v) => `${money(v)} · ${Math.round((v / pot) * 100)}%`} />
        <Slider label="Value combos" value={value} min={0} max={60} onChange={setValue} format={(v) => String(v)} />
        <Slider label="Bluff combos" value={bluffs} min={0} max={60} onChange={setBluffs} format={(v) => String(v)} />
      </div>
      <ThresholdBar have={share} need={need} haveLabel="Bluff share" needLabel="Needed" />
      <Verdict ok={ev >= 0} yes={`Call: +$${ev.toFixed(1)} per call against this range.`} no={`Fold: calling loses $${Math.abs(ev).toFixed(1)} per call.`} />
    </Widget>
  );
}

interface BayesRow {
  label: string;
  prior: number;
  like: number;
  value: boolean;
}

export function BayesWidget() {
  const [rows, setRows] = useState<BayesRow[]>([
    { label: 'Value hands', prior: 20, like: 90, value: true },
    { label: 'Missed draws', prior: 30, like: 40, value: false },
    { label: 'Air', prior: 50, like: 10, value: false },
  ]);
  const [betPct, setBetPct] = useState(100);
  const post = useMemo(() => {
    const bets = rows.map((r) => r.prior * (r.like / 100));
    const total = bets.reduce((a, b) => a + b, 0);
    return { bets, total };
  }, [rows]);
  const valueShare = post.total ? rows.reduce((a, r, i) => a + (r.value ? post.bets[i] : 0), 0) / post.total : 0;
  const need = requiredEquity(betPct / 100);
  const update = (i: number, patch: Partial<BayesRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <Widget title="Bayesian range update" icon={Sigma}>
      <div className="col gap-3">
        {rows.map((r, i) => (
          <div key={r.label} className="grid-2" style={{ alignItems: 'end' }}>
            <Slider label={`${r.label}: prior combos`} value={r.prior} min={0} max={100} onChange={(v) => update(i, { prior: v })} format={(v) => String(v)} />
            <Slider label={`P(bet ∣ ${r.label.toLowerCase()})`} value={r.like} min={0} max={100} onChange={(v) => update(i, { like: v })} format={(v) => `${v}%`} />
          </div>
        ))}
      </div>
      <HBars
        rows={rows.map((r, i) => ({ label: r.label, value: post.total ? post.bets[i] / post.total : 0, color: r.value ? 'var(--s2)' : 'var(--s1)', sub: `${post.bets[i].toFixed(1)} combos` }))}
        max={1}
      />
      <Slider label="Villain’s bet size" value={betPct} min={25} max={200} step={5} onChange={setBetPct} format={(v) => `${v}% pot`} />
      <ThresholdBar have={1 - valueShare} need={need} haveLabel="Bluffs after the bet" needLabel="Needed to call" />
      <Verdict ok={1 - valueShare >= need} yes="A pure bluff-catcher can call." no="A pure bluff-catcher should fold." />
    </Widget>
  );
}
