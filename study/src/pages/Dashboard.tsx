import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Calendar, Flame, GraduationCap, Layers, Target, Timer, Trophy } from '../components/icons';
import { ActivityHeatmap, ColumnChart, Sparkline } from '../components/charts';
import { Badge, Button, Card, Checkbox, NumberField, Progress, Stat, StatusIcon } from '../components/ui';
import { CATEGORIES, useStore } from '../store/store';
import { MODULES, PHASES } from '../content/modules';
import { PLAN, TASK_LABEL } from '../content/plan';
import { DRILLS } from '../drills';
import { addDays, localDate } from '../engine/srs';
import { currentWeek, daysUntil, weekIndex, weekRange, weekStartOf } from '../lib/plan';
import { cardQueue, drillStats, minutesByCategory, moduleProgress, nextLesson, overallProgress, streak, taskKey, taskState } from '../lib/progress';
import { duration, pct, shortDate } from '../lib/format';

const CAT_COLOR: Record<string, string> = { study: 'var(--s1)', play: 'var(--s2)', review: 'var(--s3)', drills: 'var(--s4)' };

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function Onboarding() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const finish = useStore((s) => s.finishOnboarding);
  const [name, setName] = useState(settings.name);
  const [start, setStart] = useState(settings.startDate);
  const [intern, setIntern] = useState(settings.internshipDate);
  const [hours, setHours] = useState(settings.weeklyHours);
  return (
    <Card className="onboard" title="Welcome to Equilibrium" icon={Trophy}>
      <p className="muted" style={{ maxWidth: 680 }}>
        A 30-week path from rules-and-intuition to real poker theory: math, preflop, game theory, exploitation, the mental game and the trading lens, plus a solver track that builds on your C++ engine. Set your dates and the plan adapts to them.
      </p>
      <div className="grid-4 mt-4">
        <label className="field">
          <span className="label">Your name (optional)</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        </label>
        <label className="field">
          <span className="label">Plan starts</span>
          <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Internship starts</span>
          <input className="input" type="date" value={intern} onChange={(e) => setIntern(e.target.value)} />
        </label>
        <NumberField label="Study hours per week" value={hours} onChange={setHours} min={1} max={40} />
      </div>
      <div className="row mt-4">
        <Button
          variant="primary"
          iconRight={ArrowRight}
          onClick={() => {
            update({ name: name.trim(), startDate: start || localDate(), internshipDate: intern, weeklyHours: Math.max(1, hours) });
            finish();
          }}
        >
          Start my plan
        </Button>
        <span className="small subtle">You can change all of this later in Settings.</span>
      </div>
    </Card>
  );
}

export function Dashboard() {
  const s = useStore();
  const today = localDate();
  const week = currentWeek(s.settings);
  const raw = weekIndex(s.settings);
  const plan = PLAN[week - 1];
  const phase = PHASES.find((p) => p.num === plan.phase)!;
  const next = nextLesson(s, week);
  const queue = cardQueue(s, null);
  const overall = overallProgress(s);
  const st = streak(s.activity, today);
  const r = weekRange(s.settings, week);
  const mins = minutesByCategory(s.sessions, r);
  const totalMin = Object.values(mins).reduce((a, b) => a + b, 0);
  const goalMin = s.settings.weeklyHours * 60;
  const until = daysUntil(s.settings.internshipDate, today);
  const recentAttempts = s.attempts.filter((a) => a.t > Date.now() - 7 * 86400000);
  const acc7 = recentAttempts.length ? recentAttempts.filter((a) => a.ok).length / recentAttempts.length : null;

  // Last 8 calendar weeks of logged time, by category
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(weekStartOf(today), -7 * (7 - i)));
  const weekVals = weeks.map((w) => {
    const m = minutesByCategory(s.sessions, { start: w, end: addDays(w, 6) });
    return CATEGORIES.map((c) => m[c.id] / 60);
  });

  const drillRows = DRILLS.map((d) => ({ d, st: drillStats(s, d.id) }));
  const weakest = drillRows.filter((x) => x.st.attempts >= 5 && x.st.accuracy !== null).sort((a, b) => (a.st.accuracy ?? 1) - (b.st.accuracy ?? 1))[0];
  const suggestedDrill = plan.tasks.find((t) => t.kind === 'drill' && !taskState(s, plan, t).done)?.ref ?? weakest?.d.id ?? 'pot-odds';
  const suggested = DRILLS.find((d) => d.id === suggestedDrill)!;

  return (
    <div className="page-inner">
      {!s.onboarded && <Onboarding />}
      <div className="page-head" style={{ marginTop: s.onboarded ? 0 : 28 }}>
        <div>
          <div className="eyebrow mb-2">
            Week {week} of 30 · Phase {phase.num}: {phase.title}
          </div>
          <h1>
            {greeting()}
            {s.settings.name ? `, ${s.settings.name}` : ''}.
          </h1>
          <p>
            {raw > 30 ? 'You have finished the 30-week plan. Keep the reps going.' : plan.focus}{' '}
            {until > 0 && (
              <span className="subtle">
                {until} days until your internship ({shortDate(s.settings.internshipDate)}).
              </span>
            )}
          </p>
        </div>
        <div className="row wrap">
          {queue.due.length + queue.fresh.length > 0 && (
            <Button icon={Layers} to="/review">
              Review {queue.due.length + queue.fresh.length} cards
            </Button>
          )}
          {next && (
            <Button variant="primary" icon={BookOpen} to={`/learn/${next.id}`}>
              {s.lessons[next.id]?.status === 'in_progress' ? 'Continue' : 'Start'}: {next.title}
            </Button>
          )}
        </div>
      </div>

      <div className="card stats-row">
        <Stat icon={Flame} label="Study streak" value={<>{st}<small>{st === 1 ? 'day' : 'days'}</small></>} sub={st ? 'Keep it alive today' : 'Do anything today to start one'} />
        <div className="stat">
          <span className="stat-label">
            <Timer />
            This week
          </span>
          <span className="stat-value">
            {(totalMin / 60).toFixed(1)}
            <small>/ {s.settings.weeklyHours}h</small>
          </span>
          <Progress value={totalMin / goalMin} label="Weekly hours" />
        </div>
        <Stat icon={BookOpen} label="Lessons" value={<>{overall.done}<small>/ {overall.total}</small></>} sub={`${pct(overall.done / overall.total, 0)} of the curriculum`} />
        <Stat icon={Layers} label="Cards due" value={queue.due.length} sub={`${queue.fresh.length} new available today`} />
        <Stat icon={Target} label="Drill accuracy · 7d" value={acc7 === null ? '—' : pct(acc7, 0)} sub={`${recentAttempts.length} answers`} />
      </div>

      <div className="dash-grid mt-5">
        <div className="col gap-4">
          <Card
            title={`Week ${week}: ${plan.title}`}
            icon={Calendar}
            actions={
              <Button size="sm" variant="ghost" iconRight={ArrowRight} to="/plan">
                Full plan
              </Button>
            }
            pad={false}
          >
            <div className="list">
              {plan.tasks.map((t) => {
                const ts = taskState(s, plan, t);
                return (
                  <div key={t.id} className="list-row">
                    <Checkbox checked={ts.done} onChange={() => !ts.auto && s.toggleTask(taskKey(plan.week, t))} label={ts.label} />
                    <span className="tag" style={{ height: 20, fontSize: 11 }}>
                      {TASK_LABEL[t.kind]}
                    </span>
                    {ts.to ? (
                      <Link to={ts.to} className={ts.done ? 'subtle' : undefined} style={{ textDecoration: ts.done ? 'line-through' : undefined }}>
                        {t.kind === 'drill' ? `${DRILLS.find((d) => d.id === t.ref)?.title}: ${ts.label}` : ts.label}
                      </Link>
                    ) : (
                      <span>{ts.label}</span>
                    )}
                    <span className="meta">{ts.progress}</span>
                  </div>
                );
              })}
            </div>
            {plan.milestone && (
              <div className="card-foot small subtle">
                <Trophy size={13} /> Milestone: {plan.milestone}
              </div>
            )}
          </Card>

          <Card title="Time logged, last 8 weeks" icon={Timer} actions={<Button size="sm" variant="ghost" to="/sessions">Sessions</Button>}>
            <ColumnChart
              ariaLabel="Hours logged per week by category"
              labels={weeks.map((w) => shortDate(w))}
              series={CATEGORIES.map((c) => ({ id: c.id, label: c.label, color: CAT_COLOR[c.id] }))}
              values={weekVals}
              yFormat={(v) => `${Math.round(v * 10) / 10}h`}
              target={{ value: s.settings.weeklyHours, label: `Goal ${s.settings.weeklyHours}h` }}
              height={190}
            />
            <div className="row wrap small subtle mt-3" style={{ gap: 14 }}>
              {CATEGORIES.map((c) => (
                <span key={c.id}>
                  {c.label}: <span className="ink">{duration(mins[c.id])}</span> <span className="tertiary">/ {duration(goalMin * c.share)} target</span>
                </span>
              ))}
            </div>
          </Card>
        </div>

        <div className="col gap-4">
          <Card title="Up next" icon={ArrowRight}>
            <div className="col gap-3">
              {next && (
                <Link to={`/learn/${next.id}`} className="next-item">
                  <StatusIcon status={s.lessons[next.id]?.status ?? 'todo'} />
                  <div className="grow">
                    <div className="ink medium">{next.title}</div>
                    <div className="xs subtle">
                      Lesson · {next.minutes} min
                    </div>
                  </div>
                  <ArrowRight size={14} className="subtle" />
                </Link>
              )}
              <Link to={`/practice/${suggested.id}`} className="next-item">
                <suggested.icon size={15} className="subtle" />
                <div className="grow">
                  <div className="ink medium">{suggested.title}</div>
                  <div className="xs subtle">{weakest && weakest.d.id === suggested.id ? `Your weakest drill · ${pct(weakest.st.accuracy ?? 0, 0)}` : 'Drill · this week'}</div>
                </div>
                <ArrowRight size={14} className="subtle" />
              </Link>
              <Link to="/review" className="next-item">
                <Layers size={15} className="subtle" />
                <div className="grow">
                  <div className="ink medium">Flashcards</div>
                  <div className="xs subtle">
                    {queue.due.length} due · {queue.fresh.length} new
                  </div>
                </div>
                <ArrowRight size={14} className="subtle" />
              </Link>
            </div>
          </Card>

          <Card title="Activity" icon={Flame}>
            <ActivityHeatmap activity={s.activity} today={today} weeks={20} />
          </Card>

          <Card title="Modules" icon={GraduationCap} pad={false} actions={<Button size="sm" variant="ghost" to="/learn">All lessons</Button>}>
            <div className="list">
              {MODULES.map((m) => {
                const p = moduleProgress(s, m.id);
                return (
                  <Link key={m.id} to={`/learn#${m.id}`} className="list-row" style={{ minHeight: 46 }}>
                    <span className="mod-num">{m.num}</span>
                    <div className="grow">
                      <div className="row-between">
                        <span className="medium">{m.title}</span>
                        <span className="xs subtle tabular">
                          {p.done}/{p.total}
                        </span>
                      </div>
                      <div className="mt-1">
                        <Progress value={p.frac} label={`${m.title} progress`} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card title="Drill skills" icon={Target} pad={false} actions={<Button size="sm" variant="ghost" to="/practice">All drills</Button>}>
            <div className="list">
              {drillRows
                .filter((x) => x.st.attempts > 0)
                .slice(0, 6)
                .map(({ d, st: ds }) => (
                  <Link key={d.id} to={`/practice/${d.id}`} className="list-row">
                    <span className="grow">{d.title}</span>
                    <span style={{ width: 70 }}>
                      <Sparkline values={ds.trend} />
                    </span>
                    <Badge tone={(ds.accuracy ?? 0) >= 0.8 ? 'good' : (ds.accuracy ?? 0) >= 0.6 ? 'warn' : 'bad'}>{ds.accuracy === null ? '—' : pct(ds.accuracy, 0)}</Badge>
                  </Link>
                ))}
              {drillRows.every((x) => x.st.attempts === 0) && <div className="empty" style={{ padding: 24 }}>No drills yet. Start with Pot odds.</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
