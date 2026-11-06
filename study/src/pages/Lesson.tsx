import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Clock, NotebookPen, Target, Wrench } from '../components/icons';
import { Markdown, parseMarkdown } from '../components/Markdown';
import { Quiz } from '../components/Quiz';
import { Badge, Button, Empty, Prio, StatusIcon, toast } from '../components/ui';
import { useStore } from '../store/store';
import { lessonById, neighbours } from '../content/lessons';
import { moduleById } from '../content/modules';
import { drillById } from '../drills';
import { ALL_NAV } from '../components/nav';
import { lessonWeek } from '../lib/progress';

const TOOL_ROUTES: Record<string, string> = {
  equity: '/tools/equity',
  ranges: '/tools/ranges',
  charts: '/tools/charts',
  calculators: '/tools/calculators',
  variance: '/tools/variance',
  bankroll: '/tools/bankroll',
  'toy-games': '/tools/toy-games',
  cfr: '/tools/cfr',
};

function useActiveHeading(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    const root = document.querySelector('.page');
    if (!root) return;
    const onScroll = () => {
      let cur: string | null = ids[0] ?? null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.35) cur = id;
      }
      setActive(cur);
    };
    onScroll();
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, [ids]);
  return active;
}

export function Lesson() {
  const { id = '' } = useParams();
  const lesson = lessonById(id);
  const progress = useStore((s) => s.lessons[id]);
  const startLesson = useStore((s) => s.startLesson);
  const completeLesson = useStore((s) => s.completeLesson);
  const recordQuiz = useStore((s) => s.recordQuiz);
  const setNotes = useStore((s) => s.setLessonNotes);
  const blocks = useMemo(() => (lesson ? parseMarkdown(lesson.body) : []), [lesson]);
  const headings = useMemo(() => blocks.filter((b) => b.t === 'h2') as { t: 'h2'; text: string; id: string }[], [blocks]);
  const active = useActiveHeading(useMemo(() => headings.map((h) => h.id), [headings]));
  const [notes, setLocalNotes] = useState(progress?.notes ?? '');

  useEffect(() => {
    if (lesson) startLesson(lesson.id);
    setLocalNotes(useStore.getState().lessons[id]?.notes ?? '');
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => {
      if (lesson && notes !== (useStore.getState().lessons[lesson.id]?.notes ?? '')) setNotes(lesson.id, notes);
    }, 400);
    return () => clearTimeout(t);
  }, [notes, lesson, setNotes]);

  if (!lesson) {
    return (
      <div className="page-inner">
        <Empty icon={NotebookPen} title="Lesson not found" action={<Button to="/learn">All lessons</Button>} />
      </div>
    );
  }

  const mod = moduleById(lesson.module)!;
  const { prev, next } = neighbours(lesson.id);
  const status = progress?.status ?? 'todo';
  const wk = lessonWeek(lesson.id);

  const onQuiz = (score: number) => {
    recordQuiz(lesson.id, score);
    if (score >= 0.66 && status !== 'done') {
      completeLesson(lesson.id);
      toast(`Lesson complete: ${lesson.title}`);
    }
  };

  return (
    <div className="page-inner wide">
      <div className="lesson-layout">
        <article>
          <header className="lesson-hero">
            <div className="row wrap small subtle">
              <Link to={`/learn#${mod.id}`} className="link">
                Module {mod.num} · {mod.title}
              </Link>
              {wk && <span>· Week {wk}</span>}
            </div>
            <h1>{lesson.title}</h1>
            <p className="lead">{lesson.summary}</p>
            <div className="row wrap mt-4" style={{ gap: 12 }}>
              <span className="row small subtle" style={{ gap: 6 }}>
                <StatusIcon status={status} />
                {status === 'done' ? 'Completed' : status === 'in_progress' ? 'In progress' : 'Not started'}
              </span>
              <span className="row small subtle" style={{ gap: 6 }}>
                <Clock size={13} />
                {lesson.minutes} min
              </span>
              <span className="row small subtle" style={{ gap: 6 }}>
                <Prio level={lesson.level} />
                {['', 'Foundational', 'Intermediate', 'Advanced'][lesson.level]}
              </span>
              <span style={{ marginLeft: 'auto' }}>
                {status === 'done' ? (
                  <Button size="sm" variant="ghost" onClick={() => completeLesson(lesson.id, false)}>
                    Mark as not done
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    icon={Check}
                    onClick={() => {
                      completeLesson(lesson.id);
                      toast(`Lesson complete: ${lesson.title}`);
                    }}
                  >
                    Mark complete
                  </Button>
                )}
              </span>
            </div>
          </header>

          <Markdown blocks={blocks} />

          {(lesson.drills?.length || lesson.tools?.length) && (
            <div className="related mt-6">
              <div className="eyebrow mb-3">Practice this</div>
              <div className="row wrap">
                {lesson.drills?.map((d) => {
                  const def = drillById(d);
                  return def ? (
                    <Button key={d} size="sm" icon={Target} to={`/practice/${d}`}>
                      {def.title}
                    </Button>
                  ) : null;
                })}
                {lesson.tools?.map((t) => (
                  <Button key={t} size="sm" variant="ghost" icon={Wrench} to={TOOL_ROUTES[t]}>
                    {ALL_NAV.find((n) => n.to === TOOL_ROUTES[t])?.label ?? t}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="prose-width">
            <Quiz key={lesson.id} questions={lesson.quiz} onComplete={onQuiz} />
            {progress?.quizBest !== undefined && (
              <p className="xs subtle mt-2">
                Best score {Math.round(progress.quizBest * 100)}% over {progress.quizAttempts} attempt{progress.quizAttempts === 1 ? '' : 's'}.
              </p>
            )}

            <label className="field mt-5">
              <span className="label">Your notes on this lesson</span>
              <textarea className="textarea" rows={4} value={notes} onChange={(e) => setLocalNotes(e.target.value)} placeholder="Insights, questions, spots to look up in the solver…" />
            </label>

            <nav className="lesson-nav mt-5">
              {prev ? (
                <Link to={`/learn/${prev.id}`} className="card card-link lesson-nav-item">
                  <span className="xs subtle row" style={{ gap: 4 }}>
                    <ArrowLeft size={12} /> Previous
                  </span>
                  <span className="medium">{prev.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link to={`/learn/${next.id}`} className="card card-link lesson-nav-item right">
                  <span className="xs subtle row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                    Next <ArrowRight size={12} />
                  </span>
                  <span className="medium">{next.title}</span>
                </Link>
              )}
            </nav>
          </div>
        </article>
        <aside className="lesson-toc" aria-label="On this page">
          <div className="eyebrow">On this page</div>
          {headings.map((h) => (
            <a
              key={h.id}
              href={`#${h.id}`}
              className={active === h.id ? 'on' : undefined}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {h.text.replace(/\*\*/g, '')}
            </a>
          ))}
          <div className="mt-4">
            <Badge tone={status === 'done' ? 'good' : 'default'}>{status === 'done' ? 'Completed' : 'Quiz at the end'}</Badge>
          </div>
        </aside>
      </div>
    </div>
  );
}
