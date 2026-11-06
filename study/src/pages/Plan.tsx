import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Flag, Trophy } from '../components/icons';
import { Badge, Button, Card, Checkbox, PageHeader, Progress, cx } from '../components/ui';
import { useStore } from '../store/store';
import { PHASES } from '../content/modules';
import { PLAN, TASK_LABEL, type PlanWeek } from '../content/plan';
import { DRILLS } from '../drills';
import { currentWeek, weekRange } from '../lib/plan';
import { taskKey, taskState, weekProgress } from '../lib/progress';
import { shortDate } from '../lib/format';

function Roadmap({ week }: { week: number }) {
  const s = useStore();
  const rows = [
    ...PHASES.map((p) => ({ id: `p${p.num}`, label: `Phase ${p.num} · ${p.title}`, start: p.start, end: p.end, weeks: PLAN.filter((w) => w.phase === p.num) })),
    { id: 'solver', label: 'Solver track · CFR', start: 10, end: 21, weeks: [] as PlanWeek[] },
  ];
  return (
    <Card title="Roadmap" icon={Flag} pad={false}>
      <div className="roadmap">
        <div className="roadmap-scale">
          <span />
          <div className="roadmap-weeks">
            {Array.from({ length: 30 }, (_, i) => (
              <span key={i} className={cx(i + 1 === week && 'now')}>
                {i + 1}
              </span>
            ))}
          </div>
        </div>
        {rows.map((r) => {
          const prog = r.weeks.length
            ? r.weeks.reduce((a, w) => a + weekProgress(s, w).done, 0) / Math.max(1, r.weeks.reduce((a, w) => a + w.tasks.length, 0))
            : (['rps', 'kuhn-cfr', 'kuhn-br', 'cfr-plus', 'leduc', 'river', 'turn', 'writeup'].filter((m) => s.milestones[m]).length / 8);
          const active = week >= r.start && week <= r.end;
          return (
            <div key={r.id} className="roadmap-row">
              <span className="roadmap-label">{r.label}</span>
              <div className="roadmap-track">
                <div className={cx('roadmap-bar', active && 'active')} style={{ left: `${((r.start - 1) / 30) * 100}%`, width: `${((r.end - r.start + 1) / 30) * 100}%` }} title={`Weeks ${r.start}–${r.end} · ${Math.round(prog * 100)}% done`}>
                  <span className="roadmap-fill" style={{ width: `${prog * 100}%` }} />
                  <span className="roadmap-text">
                    W{r.start}–{r.end}
                  </span>
                </div>
                <div className="roadmap-now" style={{ left: `${((week - 0.5) / 30) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WeekRow({ w, open, onToggle, isCurrent }: { w: PlanWeek; open: boolean; onToggle: () => void; isCurrent: boolean }) {
  const s = useStore();
  const r = weekRange(s.settings, w.week);
  const p = weekProgress(s, w);
  return (
    <div className={cx('week', open && 'open', isCurrent && 'current')} id={`week-${w.week}`}>
      <button type="button" className="week-head" onClick={onToggle} aria-expanded={open}>
        {open ? <ChevronDown size={14} className="subtle" /> : <ChevronRight size={14} className="subtle" />}
        <span className="week-num">W{w.week}</span>
        <span className="week-title">{w.title}</span>
        {isCurrent && <Badge tone="primary">This week</Badge>}
        {w.milestone && <Trophy size={13} className="subtle" aria-label="Milestone week" />}
        <span className="week-meta">
          <span className="xs subtle nowrap">
            {shortDate(r.start)} – {shortDate(r.end)}
          </span>
          <span style={{ width: 80 }}>
            <Progress value={p.frac} tone={p.frac === 1 ? 'good' : undefined} label={`Week ${w.week} progress`} />
          </span>
          <span className="xs subtle tabular" style={{ width: 34, textAlign: 'right' }}>
            {p.done}/{p.total}
          </span>
        </span>
      </button>
      {open && (
        <div className="week-body">
          <p className="small muted">{w.focus}</p>
          <div className="col gap-1 mt-3">
            {w.tasks.map((t) => {
              const ts = taskState(s, w, t);
              return (
                <div key={t.id} className="task-row">
                  <Checkbox checked={ts.done} onChange={() => !ts.auto && s.toggleTask(taskKey(w.week, t))} label={ts.label} />
                  <span className="tag" style={{ height: 20, fontSize: 11, minWidth: 70, justifyContent: 'center' }}>
                    {TASK_LABEL[t.kind]}
                  </span>
                  {ts.to ? (
                    <Link to={ts.to} className={cx('grow', ts.done && 'subtle')}>
                      {t.kind === 'drill' ? `${DRILLS.find((d) => d.id === t.ref)?.title}: ${ts.label}` : ts.label}
                    </Link>
                  ) : (
                    <span className="grow">{ts.label}</span>
                  )}
                  {ts.progress && <span className="xs subtle tabular">{ts.progress}</span>}
                  {ts.auto && <span className="xs tertiary">auto</span>}
                </div>
              );
            })}
          </div>
          {w.milestone && (
            <div className="notice mt-3">
              <Trophy />
              <span>
                <strong className="ink">Milestone:</strong> {w.milestone}
              </span>
            </div>
          )}
          <label className="field mt-3">
            <span className="label">Reflection: what clicked, what didn’t?</span>
            <textarea className="textarea" value={s.weekNotes[w.week] ?? ''} onChange={(e) => s.setWeekNote(w.week, e.target.value)} placeholder="Notes for future you…" />
          </label>
        </div>
      )}
    </div>
  );
}

export function Plan() {
  const settings = useStore((s) => s.settings);
  const week = currentWeek(settings);
  const [open, setOpen] = useState<Set<number>>(new Set([week]));
  const toggle = (n: number) =>
    setOpen((o) => {
      const next = new Set(o);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  return (
    <div className="page-inner">
      <PageHeader
        title="30-week plan"
        description={`From ${shortDate(settings.startDate)} to ${shortDate(weekRange(settings, 30).end)}. Lessons, drills, exams and flashcard tasks tick themselves off as you complete them; tick reading, play and review tasks yourself. Play only where it is legal for you.`}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setOpen(open.size >= 30 ? new Set([week]) : new Set(PLAN.map((w) => w.week)))}>
              {open.size >= 30 ? 'Collapse all' : 'Expand all'}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setOpen((o) => new Set([...o, week]));
                setTimeout(() => document.getElementById(`week-${week}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
              }}
            >
              Jump to week {week}
            </Button>
          </>
        }
      />
      <Roadmap week={week} />
      {PHASES.map((p) => (
        <section key={p.num} className="section">
          <div className="section-head">
            <h2>
              Phase {p.num} · {p.title}
            </h2>
            <span className="small subtle">{p.goal}</span>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {PLAN.filter((w) => w.phase === p.num).map((w) => (
              <WeekRow key={w.week} w={w} open={open.has(w.week)} onToggle={() => toggle(w.week)} isCurrent={w.week === week} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
