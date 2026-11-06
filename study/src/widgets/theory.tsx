import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Brain, Cpu, Lock, Pause, Play, RotateCcw, StepForward, Swords, Puzzle } from '../components/icons';
import { LineChart } from '../components/charts';
import { Button, Segmented, Slider, Switch } from '../components/ui';
import {
  GAME_VALUE,
  KuhnCFR,
  P1_INFOSETS,
  P2_INFOSETS,
  RegretMatchingRPS,
  describeInfoSet,
  exploitability,
  kuhnValue,
  uniformStrategy,
  type CfrVariant,
  type KuhnStrategy,
} from '../engine/kuhn';
import { akqBluffEV, akqCallEV, akqEV, akqSolution, bluffShare, clairvoyantEV, clairvoyantSolution, defendFreq } from '../engine/toygames';
import { useInterval } from '../lib/hooks';
import { pct } from '../lib/format';
import { KV, Widget } from './Widget';

const RPS = ['Rock', 'Paper', 'Scissors'];
const RPS_COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)'];

export function RpsRegretWidget({ full }: { full?: boolean }) {
  const [mode, setMode] = useState<'fixed' | 'self-play'>('fixed');
  const [rock, setRock] = useState(45);
  const [paper, setPaper] = useState(30);
  const opp = useMemo(() => [rock / 100, paper / 100, Math.max(0, 100 - rock - paper) / 100], [rock, paper]);
  const sim = useRef(new RegretMatchingRPS('fixed', opp));
  const [hist, setHist] = useState<{ t: number; avg: number[]; cur: number[] }[]>([]);
  const [running, setRunning] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);

  const reset = useCallback(() => {
    sim.current = new RegretMatchingRPS(mode, opp);
    setHist([{ t: 0, avg: [1 / 3, 1 / 3, 1 / 3], cur: [1 / 3, 1 / 3, 1 / 3] }]);
  }, [mode, opp]);
  useEffect(() => reset(), [reset]);

  const step = (n: number) => {
    const chunk = Math.max(1, Math.floor(n / 20));
    const points: { t: number; avg: number[]; cur: number[] }[] = [];
    for (let done = 0; done < n; done += chunk) {
      sim.current.iterate(Math.min(chunk, n - done));
      points.push({ t: sim.current.iterations, avg: sim.current.average(), cur: sim.current.current() });
    }
    setHist((h) => {
      let next = [...h, ...points];
      while (next.length > 400) next = next.filter((_, i) => i % 2 === 0 || i === next.length - 1);
      return next;
    });
    if (sim.current.iterations >= 5000) setRunning(false);
  };
  useInterval(() => step(10), running ? 40 : null);

  const avg = hist[hist.length - 1]?.avg ?? [1 / 3, 1 / 3, 1 / 3];
  const ev = avg.reduce((acc, p, a) => acc + p * sim.current.opponentAverage().reduce((s, q, b) => s + q * RegretMatchingRPS.payoff(a, b), 0), 0);
  const key = showCurrent ? 'cur' : 'avg';
  return (
    <Widget title="Regret matching in rock–paper–scissors" icon={Brain} right={<Segmented value={mode} onChange={setMode} options={[{ value: 'fixed', label: 'vs. fixed opponent' }, { value: 'self-play', label: 'Self-play' }]} />}>
      {mode === 'fixed' && (
        <div className="widget-controls">
          <Slider label="Opponent plays rock" value={rock} min={0} max={100} onChange={(v) => { setRock(v); if (v + paper > 100) setPaper(100 - v); }} format={(v) => `${v}%`} />
          <Slider label="Opponent plays paper" value={paper} min={0} max={100 - rock} onChange={setPaper} format={(v) => `${v}%`} />
          <div className="field">
            <span className="label">Opponent plays scissors</span>
            <span className="slider-value">{100 - rock - paper}%</span>
          </div>
        </div>
      )}
      <div className="row wrap">
        <Button variant="primary" size="sm" icon={running ? Pause : Play} onClick={() => setRunning(!running)}>
          {running ? 'Pause' : 'Run'}
        </Button>
        <Button size="sm" icon={StepForward} onClick={() => step(100)}>
          +100
        </Button>
        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => { setRunning(false); reset(); }}>
          Reset
        </Button>
        <span className="row small subtle" style={{ marginLeft: 'auto' }}>
          <Switch on={showCurrent} onChange={setShowCurrent} label="Show current strategy" /> Show current instead of average
        </span>
      </div>
      <LineChart
        ariaLabel={`${showCurrent ? 'Current' : 'Average'} strategy over iterations`}
        height={full ? 260 : 210}
        series={RPS.map((name, i) => ({ id: name, label: name, color: RPS_COLORS[i], points: hist.map((h) => ({ x: h.t, y: h[key][i] })) }))}
        yDomain={[0, 1]}
        yFormat={(v) => `${Math.round(v * 100)}%`}
        xFormat={(v) => String(Math.round(v))}
        xLabel="Iterations"
      />
      <KV
        items={[
          { k: 'Iterations', v: String(sim.current.iterations) },
          ...RPS.map((r, i) => ({ k: `Average ${r.toLowerCase()}`, v: pct(avg[i]) })),
          { k: 'EV vs. opponent', v: ev.toFixed(3) },
        ]}
      />
      <p className="small subtle">
        {mode === 'fixed'
          ? 'Against a fixed, biased opponent, regret matching converges to the best response: mostly the action that beats their favourite.'
          : 'In self-play the current strategies cycle around the equilibrium, but the averages converge to ⅓ each.'}
      </p>
    </Widget>
  );
}

export function ClairvoyantWidget({ advanced }: { advanced?: boolean }) {
  const [s, setS] = useState(1);
  const [v, setV] = useState(0.5);
  const [exploit, setExploit] = useState(false);
  const sol = clairvoyantSolution(s, v);
  const [yCall, setYCall] = useState(0.5);
  const [xBluff, setXBluff] = useState(0.5);
  useEffect(() => {
    setYCall(sol.callRate);
    setXBluff(sol.bluffRate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, v]);
  const xs = Array.from({ length: 50 }, (_, i) => 0.1 + i * 0.1);
  const bluffs = xBluff * (1 - v);
  const share = v + bluffs > 0 ? bluffs / (v + bluffs) : 0;
  const evPlayed = clairvoyantEV(s, v, xBluff, yCall);
  const xBest = yCall < defendFreq(s) ? 1 : 0;
  const evXBest = clairvoyantEV(s, v, xBest, yCall);
  const yBestCall = share > bluffShare(s) ? 1 : 0;
  const evYBest = 1 - clairvoyantEV(s, v, xBluff, yBestCall);
  return (
    <Widget
      title="The clairvoyant game"
      icon={Puzzle}
      right={advanced ? <Segmented value={exploit ? 'exploit' : 'eq'} onChange={(m) => setExploit(m === 'exploit')} options={[{ value: 'eq', label: 'Equilibrium' }, { value: 'exploit', label: 'Exploit mode' }]} /> : undefined}
    >
      <div className="widget-controls">
        <Slider label="Bet size s" value={s} min={0.1} max={5} step={0.05} onChange={setS} format={(x) => `${Math.round(x * 100)}% pot`} />
        <Slider label="X holds the nuts" value={v} min={0.1} max={0.9} step={0.05} onChange={setV} format={(x) => pct(x, 0)} />
      </div>
      {!exploit ? (
        <>
          <KV
            items={[
              { k: 'X bluffs with air', v: pct(sol.bluffRate) },
              { k: 'Bluffs in X’s bets', v: pct(sol.enoughAir ? bluffShare(s) : 1 - v) },
              { k: 'Y calls', v: pct(sol.callRate) },
              { k: 'X’s share of pot', v: sol.evX.toFixed(3) },
              { k: 'Value of betting', v: `+${(sol.evX - v).toFixed(3)}`, sub: 'vs. check-down' },
            ]}
          />
          {!sol.enoughAir && <div className="notice warn">X does not have enough air to balance this size: X bets everything and Y simply folds.</div>}
          <LineChart
            ariaLabel="X's equilibrium share of the pot by bet size"
            height={190}
            series={[{ id: 'ev', label: 'X’s equilibrium share', color: 'var(--s1)', points: xs.map((x) => ({ x, y: clairvoyantSolution(x, v).evX })) }]}
            refLines={[{ y: v, label: 'Check-down' }]}
            markers={[{ x: s, y: sol.evX }]}
            xFormat={(x) => `${Math.round(x * 100)}%`}
            yFormat={(x) => x.toFixed(2)}
            xLabel="Bet size (fraction of pot)"
            directLabels={false}
          />
        </>
      ) : (
        <>
          <div className="widget-controls">
            <Slider label="Y’s calling frequency" value={yCall} min={0} max={1} step={0.01} onChange={setYCall} format={(x) => pct(x, 0)} hint={`Equilibrium: ${pct(sol.callRate, 0)}`} />
            <Slider label="X bluffs with air" value={xBluff} min={0} max={1} step={0.01} onChange={setXBluff} format={(x) => pct(x, 0)} hint={`Equilibrium: ${pct(sol.bluffRate, 0)}`} />
          </div>
          <KV
            items={[
              { k: 'X’s share with these strategies', v: evPlayed.toFixed(3) },
              { k: 'Equilibrium share', v: sol.evX.toFixed(3) },
              { k: 'Bluffs in X’s bets', v: pct(share) },
            ]}
          />
          <div className="col gap-2 small">
            <div className="notice">
              <span>
                <strong className="ink">X’s best response</strong> to Y calling {pct(yCall, 0)}: {xBest ? 'bluff with all air' : 'never bluff'}, earning {evXBest.toFixed(3)} (
                {evXBest - sol.evX >= 0 ? '+' : ''}
                {(evXBest - sol.evX).toFixed(3)} vs. equilibrium).
              </span>
            </div>
            <div className="notice">
              <span>
                <strong className="ink">Y’s best response</strong> to {pct(share, 0)} bluffs: {yBestCall ? 'call every time' : 'never call'}, so Y gets {evYBest.toFixed(3)} (
                {evYBest - (1 - sol.evX) >= 0 ? '+' : ''}
                {(evYBest - (1 - sol.evX)).toFixed(3)} vs. equilibrium).
              </span>
            </div>
          </div>
        </>
      )}
    </Widget>
  );
}

export function AkqWidget() {
  const [s, setS] = useState(0.5);
  const sol = akqSolution(s);
  const [beta, setBeta] = useState(sol.beta);
  const [c, setC] = useState(sol.c);
  useEffect(() => {
    setBeta(akqSolution(s).beta);
    setC(akqSolution(s).c);
  }, [s]);
  const xs = Array.from({ length: 60 }, (_, i) => 0.05 + i * 0.025);
  const best = Math.SQRT2 - 1;
  const ev = akqEV(s, beta, c);
  const bluffEV = akqBluffEV(s, c);
  const callEV = akqCallEV(s, beta);
  return (
    <Widget title="The AKQ game" icon={Swords}>
      <Slider label="Y’s bet size" value={s} min={0.05} max={1.5} step={0.01} onChange={setS} format={(x) => `${Math.round(x * 100)}% pot`} />
      <KV
        items={[
          { k: 'Y bluffs Q (β)', v: pct(sol.beta) },
          { k: 'X calls with K (c)', v: pct(sol.c) },
          { k: 'Y’s share of pot', v: pct(sol.evY) },
          { k: 'Edge from betting', v: `+${((sol.evY - 0.5) * 100).toFixed(2)} pts` },
        ]}
      />
      <LineChart
        ariaLabel="Y's equilibrium share of the pot by bet size"
        height={180}
        series={[{ id: 'ev', label: 'Y’s share', color: 'var(--s1)', points: xs.map((x) => ({ x, y: akqSolution(x).evY })) }]}
        markers={[
          { x: best, y: akqSolution(best).evY, label: 'max ≈ 41%', color: 'var(--s4)' },
          { x: s, y: sol.evY },
        ]}
        refLines={[{ y: 0.5, label: 'No betting' }]}
        xFormat={(x) => `${Math.round(x * 100)}%`}
        yFormat={(x) => `${(x * 100).toFixed(1)}%`}
        xLabel="Bet size"
        directLabels={false}
      />
      <div className="divider" />
      <div className="label">Deviate and see the best responses</div>
      <div className="widget-controls">
        <Slider label="Y’s Q bluff frequency" value={beta} min={0} max={1} step={0.01} onChange={setBeta} format={(x) => pct(x, 0)} />
        <Slider label="X’s K calling frequency" value={c} min={0} max={1} step={0.01} onChange={setC} format={(x) => pct(x, 0)} />
      </div>
      <KV
        items={[
          { k: 'Y’s share with these', v: pct(ev) },
          { k: 'EV of a Q bluff', v: bluffEV.toFixed(3), sub: bluffEV > 1e-9 ? '→ always bluff' : bluffEV < -1e-9 ? '→ never bluff' : 'indifferent' },
          { k: 'EV of a K call', v: callEV.toFixed(3), sub: callEV > 1e-9 ? '→ always call' : callEV < -1e-9 ? '→ never call' : 'indifferent' },
        ]}
      />
    </Widget>
  );
}

const P2_EQ: Record<string, number> = { Jp: 1 / 3, Qp: 0, Kp: 1, Jb: 0, Qb: 1 / 3, Kb: 1 };

function p1Target(key: string, alpha: number): number {
  switch (key) {
    case 'J':
      return alpha;
    case 'Q':
      return 0;
    case 'K':
      return Math.min(1, 3 * alpha);
    case 'Jpb':
      return 0;
    case 'Qpb':
      return alpha + 1 / 3;
    default:
      return 1;
  }
}

function StrategyTable({ strat, title, keys, alpha }: { strat: KuhnStrategy; title: string; keys: string[]; alpha: number }) {
  return (
    <div className="panel-inset" style={{ overflow: 'hidden' }}>
      <table className="table">
        <thead>
          <tr>
            <th>{title}</th>
            <th>Situation</th>
            <th style={{ width: '38%' }}>Aggressive action</th>
            <th className="num">Target</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => {
            const d = describeInfoSet(k);
            const p = strat[k][1];
            const target = keys === P2_INFOSETS ? P2_EQ[k] : p1Target(k, alpha);
            return (
              <tr key={k}>
                <td>
                  <span className="icard suit-s">{d.card}</span>
                </td>
                <td>{d.situation}</td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <div className="hbar-track grow" style={{ height: 8 }}>
                      <div className="hbar-fill" style={{ width: `${p * 100}%`, background: 'var(--s2)' }} />
                    </div>
                    <span className="xs tabular ink" style={{ width: 82 }}>
                      {d.actions[1]} {pct(p, 0)}
                    </span>
                  </div>
                </td>
                <td className="num xs">{pct(target, 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function KuhnCfrWidget({ full }: { full?: boolean }) {
  const [variant, setVariant] = useState<CfrVariant>('vanilla');
  const cfr = useRef(new KuhnCFR('vanilla'));
  const [hist, setHist] = useState<{ t: number; e: number; v: number }[]>([]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(10);
  const [, force] = useState(0);

  const record = () => {
    const avg = cfr.current.averageStrategy();
    const pt = { t: cfr.current.iterations, e: Math.max(1e-6, exploitability(avg)), v: kuhnValue(avg) };
    setHist((h) => {
      const next = [...h, pt];
      return next.length > 300 ? next.filter((_, i) => i % 2 === 0 || i === next.length - 1) : next;
    });
  };
  const reset = (v: CfrVariant = variant) => {
    cfr.current = new KuhnCFR(v);
    setHist([{ t: 0, e: exploitability(uniformStrategy()), v: kuhnValue(uniformStrategy()) }]);
    force((x) => x + 1);
  };
  useEffect(() => reset(variant), [variant]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = (n: number) => {
    const chunk = Math.max(1, Math.floor(n / 20));
    for (let done = 0; done < n; done += chunk) {
      cfr.current.iterate(Math.min(chunk, n - done));
      record();
    }
    if (cfr.current.iterations >= 20000) setRunning(false);
  };
  useInterval(() => step(speed), running ? 50 : null);

  const avg = cfr.current.averageStrategy();
  const last = hist[hist.length - 1];
  const alpha = avg.J[1];
  return (
    <Widget title="CFR solving Kuhn poker" icon={Cpu} right={<Segmented value={variant} onChange={(v) => { setRunning(false); setVariant(v); }} options={[{ value: 'vanilla', label: 'Vanilla CFR' }, { value: 'cfr+', label: 'CFR+' }]} />}>
      <div className="row wrap">
        <Button variant="primary" size="sm" icon={running ? Pause : Play} onClick={() => setRunning(!running)}>
          {running ? 'Pause' : 'Run'}
        </Button>
        <Button size="sm" icon={StepForward} onClick={() => step(1)}>
          +1
        </Button>
        <Button size="sm" icon={StepForward} onClick={() => step(100)}>
          +100
        </Button>
        <Button size="sm" icon={StepForward} onClick={() => step(1000)}>
          +1000
        </Button>
        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => { setRunning(false); reset(); }}>
          Reset
        </Button>
        <div style={{ marginLeft: 'auto', width: 190 }}>
          <Slider label="Iterations per tick" value={speed} min={1} max={100} onChange={setSpeed} format={(v) => String(v)} />
        </div>
      </div>
      <KV
        items={[
          { k: 'Iterations', v: cfr.current.iterations.toLocaleString('en-US') },
          { k: 'Exploitability', v: last ? last.e.toFixed(4) : '—', sub: 'chips/hand' },
          { k: 'P1 value', v: last ? last.v.toFixed(4) : '—', sub: `target ${GAME_VALUE.toFixed(4)}` },
          { k: 'α (P1 bluffs J)', v: pct(alpha), sub: `K bets ${pct(avg.K[1], 0)}` },
        ]}
      />
      <LineChart
        ariaLabel="Exploitability of the average strategy, log scale"
        height={full ? 240 : 190}
        series={[{ id: 'e', label: 'Exploitability', color: 'var(--s1)', points: hist.map((h) => ({ x: h.t, y: Math.log10(h.e) })), endDot: hist.length > 1 }]}
        yFormat={(v) => (10 ** v).toPrecision(1)}
        xFormat={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K` : String(Math.round(v)))}
        xLabel="Iterations (exploitability on a log scale)"
        directLabels={false}
      />
      <div className={full ? 'grid-2' : 'col gap-3'}>
        <StrategyTable strat={avg} title="P1" keys={P1_INFOSETS} alpha={alpha} />
        <StrategyTable strat={avg} title="P2" keys={P2_INFOSETS} alpha={alpha} />
      </div>
      <p className="xs subtle">Bars show the average strategy’s bet/call frequency. Targets come from the equilibrium family using the current α for P1.</p>
    </Widget>
  );
}

const LOCK_PRESETS: { label: string; p2: Record<string, number> }[] = [
  { label: 'Equilibrium P2', p2: P2_EQ },
  { label: 'Never bluffs the J', p2: { ...P2_EQ, Jp: 0 } },
  { label: 'Calls too much with Q', p2: { ...P2_EQ, Qb: 0.8 } },
  { label: 'Folds Q to every bet', p2: { ...P2_EQ, Qb: 0 } },
  { label: 'Bluffs J every time', p2: { ...P2_EQ, Jp: 1 } },
];

export function KuhnLockWidget() {
  const [p2, setP2] = useState<Record<string, number>>(P2_EQ);
  const result = useMemo(() => {
    let best = -Infinity;
    let bestS: KuhnStrategy | null = null;
    for (let mask = 0; mask < 64; mask++) {
      const s: KuhnStrategy = {};
      P1_INFOSETS.forEach((k, i) => (s[k] = (mask >> i) & 1 ? [0, 1] : [1, 0]));
      P2_INFOSETS.forEach((k) => (s[k] = [1 - p2[k], p2[k]]));
      const v = kuhnValue(s);
      if (v > best + 1e-12) {
        best = v;
        bestS = s;
      }
    }
    return { best, bestS: bestS! };
  }, [p2]);
  const gain = result.best - GAME_VALUE;
  return (
    <Widget title="Node-lock player 2" icon={Lock}>
      <div className="row wrap gap-1">
        {LOCK_PRESETS.map((p) => (
          <button key={p.label} type="button" className="tag" onClick={() => setP2(p.p2)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="widget-controls">
        {P2_INFOSETS.map((k) => {
          const d = describeInfoSet(k);
          return (
            <Slider
              key={k}
              label={`${d.card} · ${d.situation}: ${d.actions[1].toLowerCase()}`}
              value={Math.round(p2[k] * 100)}
              min={0}
              max={100}
              onChange={(v) => setP2({ ...p2, [k]: v / 100 })}
              format={(v) => `${v}%`}
            />
          );
        })}
      </div>
      <KV
        items={[
          { k: 'P1 best-response value', v: result.best.toFixed(4) },
          { k: 'Equilibrium value', v: GAME_VALUE.toFixed(4) },
          { k: 'P1 gain from exploiting', v: `${gain >= 0 ? '+' : ''}${gain.toFixed(4)}`, sub: 'chips/hand' },
        ]}
      />
      <div className="panel-inset">
        <table className="table">
          <thead>
            <tr>
              <th>P1 holds</th>
              <th>Situation</th>
              <th>Best response</th>
            </tr>
          </thead>
          <tbody>
            {P1_INFOSETS.map((k) => {
              const d = describeInfoSet(k);
              return (
                <tr key={k}>
                  <td>
                    <span className="icard suit-s">{d.card}</span>
                  </td>
                  <td>{d.situation}</td>
                  <td className="ink">{result.bestS[k][1] === 1 ? d.actions[1] : d.actions[0]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="xs subtle">A best response is a pure strategy. Notice how small deviations by P2 flip whole P1 decisions, and how much each mistake is worth.</p>
    </Widget>
  );
}

