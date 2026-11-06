import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock } from '../components/icons';
import { PageHeader, Prio, Progress, Segmented, StatusIcon } from '../components/ui';
import { useStore } from '../store/store';
import { MODULES } from '../content/modules';
import { lessonsInModule } from '../content/lessons';
import { lessonStatus, lessonWeek, moduleProgress, overallProgress } from '../lib/progress';
import { usePref } from '../lib/hooks';

type Filter = 'all' | 'todo' | 'in_progress' | 'done';

export function Learn() {
  const s = useStore();
  const [filter, setFilter] = usePref<Filter>('learn-filter', 'all');
  const overall = overallProgress(s);
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 30);
  }, [hash]);

  return (
    <div className="page-inner">
      <PageHeader
        title="Lessons"
        description="42 lessons in seven modules. Each one has worked examples, interactive widgets and a short quiz; pass the quiz (two-thirds or better) and the lesson completes itself."
        actions={
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'todo', label: 'To do' },
              { value: 'in_progress', label: 'In progress' },
              { value: 'done', label: 'Done' },
            ]}
          />
        }
      />
      <div className="row mb-4" style={{ gap: 12 }}>
        <div style={{ width: 220 }}>
          <Progress value={overall.done / overall.total} large label="Curriculum progress" />
        </div>
        <span className="small subtle">
          {overall.done} of {overall.total} complete
        </span>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        {MODULES.map((m) => {
          const lessons = lessonsInModule(m.id).filter((l) => filter === 'all' || lessonStatus(s, l.id) === filter);
          const p = moduleProgress(s, m.id);
          if (!lessons.length && filter !== 'all') return null;
          return (
            <div key={m.id} id={m.id} style={{ scrollMarginTop: 12 }}>
              <div className="list-group-head">
                <span className="mod-num">{m.num}</span>
                <span className="ink">{m.title}</span>
                <span className="subtle" style={{ fontWeight: 400 }}>
                  {m.weeks}
                </span>
                <span className="meta" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 90 }}>
                    <Progress value={p.frac} label={`${m.title} progress`} />
                  </span>
                  <span className="xs subtle tabular">
                    {p.done}/{p.total}
                  </span>
                </span>
              </div>
              {filter === 'all' && <div className="module-desc">{m.description}</div>}
              {lessons.map((l) => {
                const st = lessonStatus(s, l.id);
                const wk = lessonWeek(l.id);
                return (
                  <Link key={l.id} to={`/learn/${l.id}`} className="list-row lesson-row">
                    <StatusIcon status={st === 'todo' ? 'todo' : st} progress={0.5} />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="medium truncate">{l.title}</div>
                      <div className="xs subtle truncate">{l.summary}</div>
                    </div>
                    <span className="meta">
                      {s.lessons[l.id]?.quizBest !== undefined && <span className="xs subtle">quiz {Math.round((s.lessons[l.id]!.quizBest ?? 0) * 100)}%</span>}
                      {wk && <span className="tag" style={{ height: 20, fontSize: 11 }}>W{wk}</span>}
                      <span className="row xs subtle" style={{ gap: 4 }}>
                        <Clock size={12} />
                        {l.minutes}m
                      </span>
                      <Prio level={l.level} />
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
