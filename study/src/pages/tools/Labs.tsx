import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Target } from '../../components/icons';
import { RangeGrid } from '../../components/RangeGrid';
import { Button, Card, PageHeader, Tabs, cx } from '../../components/ui';
import { countCombos } from '../../engine/ranges';
import { ACTION_COLOR, CHARTS, chartById, chartLayers, resolveRangeRef } from '../../content/charts';
import { AlphaMdfWidget, BayesWidget, EvCallWidget, FoldEquityWidget, GeometricWidget, ImpliedOddsWidget, PotOddsCurveWidget, RiverCalcWidget, RuleOf24Widget, SprWidget } from '../../widgets/math';
import { VarianceWidget, KellyWidget } from '../../widgets/quant';
import { AkqWidget, ClairvoyantWidget, KuhnCfrWidget, KuhnLockWidget, RpsRegretWidget } from '../../widgets/theory';
import { useStore } from '../../store/store';
import { MILESTONES } from '../../content/library';
import { usePref } from '../../lib/hooks';
import { pct } from '../../lib/format';

function LessonLinks({ ids }: { ids: [string, string][] }) {
  return (
    <div className="row wrap mb-4">
      {ids.map(([id, label]) => (
        <Button key={id} size="sm" variant="ghost" icon={BookOpen} to={`/learn/${id}`}>
          {label}
        </Button>
      ))}
    </div>
  );
}

export function ChartsTool() {
  const [id, setId] = usePref('charts-tool', 'rfi-utg');
  const [hover, setHover] = useState<string | null>(null);
  const chart = chartById(id) ?? CHARTS[0];
  const layers = chartLayers(chart);
  const within = chart.within ? resolveRangeRef(chart.within) : null;
  const dim = within ? new Set(Object.keys(resolveRangeRef('any')).filter((k) => !within[k])) : undefined;
  const groups = [...new Set(CHARTS.map((c) => c.group))];
  return (
    <div className="page-inner wide">
      <PageHeader
        title="Preflop charts"
        description="Simplified pure-strategy study charts for 100bb 6-max. They approximate the shape of solver solutions; real solutions mix many edge hands. Learn the structure and the reasons, then drill them."
        actions={
          <Button variant="primary" icon={Target} to="/practice/preflop">
            Drill these charts
          </Button>
        }
      />
      <div className="charts-layout">
        <nav className="card chart-list" aria-label="Charts">
          {groups.map((g) => (
            <div key={g}>
              <div className="nav-section-title" style={{ padding: '10px 12px 4px' }}>
                {g}
              </div>
              {CHARTS.filter((c) => c.group === g).map((c) => (
                <button key={c.id} type="button" className={cx('nav-item', c.id === chart.id && 'active')} style={{ width: '100%', border: 0, background: c.id === chart.id ? undefined : 'transparent' }} onClick={() => setId(c.id)}>
                  {c.title}
                  <span className="nav-count">{pct(countCombos(resolveRangeRef(c.id)) / 1326, 0)}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <Card title={chart.title}>
          <p className="small subtle mb-3">{chart.scenario}</p>
          <div className="range-chart-layout big">
            <div style={{ maxWidth: 560 }}>
              <RangeGrid layers={layers.map((l) => ({ range: l.range, color: ACTION_COLOR[l.action.kind], label: l.action.label }))} dim={dim} onHover={setHover} highlight={hover} label={chart.title} />
            </div>
            <div className="col gap-3">
              <div className="legend" style={{ flexDirection: 'column', gap: 8 }}>
                {layers.map((l) => (
                  <span key={l.action.id}>
                    <i style={{ background: ACTION_COLOR[l.action.kind] }} />
                    {l.action.label}
                    <span className="tertiary">
                      {Math.round(countCombos(l.range))} combos · {pct(countCombos(l.range) / 1326)}
                    </span>
                  </span>
                ))}
                {within && <span className="tertiary">Dimmed hands were never in the opening range.</span>}
              </div>
              <div className="panel-inset" style={{ padding: '10px 12px' }}>
                <div className="xs subtle">Hand</div>
                <div className="ink medium">{hover ? `${hover}: ${layers.find((l) => (l.range[hover] ?? 0) > 0)?.action.label ?? (within && !within[hover] ? 'not opened' : 'Fold')}` : '—'}</div>
              </div>
              <p className="small muted">{chart.note}</p>
              <div className="panel-inset" style={{ padding: '10px 12px' }}>
                <div className="xs subtle mb-1">Range text</div>
                {layers.map((l) => (
                  <div key={l.action.id} className="xs mono muted" style={{ lineHeight: 1.6 }}>
                    <span className="ink">{l.action.label}:</span> {l.action.range}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function CalculatorsTool() {
  return (
    <div className="page-inner wide">
      <PageHeader title="Calculators" description="Every formula from the math and theory modules as a live calculator." />
      <div className="calc-grid">
        <EvCallWidget />
        <PotOddsCurveWidget />
        <AlphaMdfWidget />
        <FoldEquityWidget />
        <RuleOf24Widget />
        <ImpliedOddsWidget />
        <RiverCalcWidget />
        <BayesWidget />
        <GeometricWidget />
        <SprWidget />
      </div>
    </div>
  );
}

export function VarianceTool() {
  return (
    <div className="page-inner">
      <PageHeader title="Variance lab" description="Why short-term results say so little about skill. Simulate many players with the same true win rate and watch how far apart their results land." />
      <LessonLinks ids={[['variance', 'Variance & sample size']]} />
      <VarianceWidget full />
    </div>
  );
}

export function BankrollTool() {
  return (
    <div className="page-inner">
      <PageHeader title="Bankroll & Kelly" description="Edge over variance. Compare fractional, full and over-Kelly betting on the same sequence, and estimate your poker risk of ruin." />
      <LessonLinks ids={[['kelly', 'Bankroll management & Kelly']]} />
      <KellyWidget full />
    </div>
  );
}

export function ToyGamesTool() {
  const [tab, setTab] = usePref<'clairvoyant' | 'akq'>('toy-tab', 'clairvoyant');
  return (
    <div className="page-inner">
      <PageHeader title="Toy games" description="Exactly solvable games that isolate one strategic idea. Find the equilibrium, then switch to exploit mode and watch best responses punish deviations." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'clairvoyant', label: 'Clairvoyant game' }, { value: 'akq', label: 'AKQ game' }]} />
      <LessonLinks ids={tab === 'clairvoyant' ? [['clairvoyant', 'The clairvoyant game'], ['indifference', 'The indifference principle']] : [['akq', 'The AKQ game']]} />
      {tab === 'clairvoyant' ? <ClairvoyantWidget advanced /> : <AkqWidget />}
    </div>
  );
}

export function CfrTool() {
  const [tab, setTab] = usePref<'rm' | 'kuhn' | 'lock'>('cfr-tab', 'kuhn');
  const milestones = useStore((s) => s.milestones);
  const done = MILESTONES.filter((m) => milestones[m.id]).length;
  return (
    <div className="page-inner wide">
      <PageHeader
        title="CFR lab"
        description="Watch the algorithms behind every solver converge: regret matching in rock–paper–scissors, CFR and CFR+ on Kuhn poker, and node-locking with exact best responses."
        actions={
          <Link to="/library" className="small subtle">
            Solver project: {done}/{MILESTONES.length} milestones
          </Link>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'rm', label: 'Regret matching' },
          { value: 'kuhn', label: 'Kuhn poker CFR' },
          { value: 'lock', label: 'Node-locking' },
        ]}
      />
      {tab === 'rm' && (
        <>
          <LessonLinks ids={[['regret-matching', 'Regret matching'], ['nash', 'Nash equilibrium & GTO']]} />
          <RpsRegretWidget full />
        </>
      )}
      {tab === 'kuhn' && (
        <>
          <LessonLinks ids={[['cfr', 'Counterfactual regret minimization'], ['kuhn', 'Kuhn poker']]} />
          <KuhnCfrWidget full />
        </>
      )}
      {tab === 'lock' && (
        <>
          <LessonLinks ids={[['node-locking', 'Node-locking']]} />
          <KuhnLockWidget />
        </>
      )}
      <Card className="mt-5" title="Build it yourself">
        <p className="small muted">
          The engine behind this lab is about 200 lines of TypeScript (src/engine/kuhn.ts). Reimplementing it in Python, then extending it to Leduc and a no-limit river subgame, is the solver track’s project. Your C++ DCFR engine in ../engine is the end point.
        </p>
      </Card>
    </div>
  );
}
