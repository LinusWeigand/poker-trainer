import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, CircleCheck, CircleX, CornerDownLeft, GraduationCap, Play, RotateCcw, Target, Timer } from '../components/icons';
import { Sparkline } from '../components/charts';
import { Badge, Button, Card, Empty, PageHeader, Progress, Segmented, cx } from '../components/ui';
import { Quiz } from '../components/Quiz';
import { useStore } from '../store/store';
import { DRILLS, drillById, type DrillDef, type DrillQuestion } from '../drills';
import type { DrillCategory } from '../drills/types';
import { EXAMS, examById, examPoolSize, examQuestions } from '../content/exams';
import { lessonById } from '../content/lessons';
import { drillStats } from '../lib/progress';
import { useKeydown, usePref } from '../lib/hooks';
import { pct, timeAgo } from '../lib/format';

type Cat = 'All' | DrillCategory;

export function Practice() {
  const s = useStore();
  const [cat, setCat] = usePref<Cat>('practice-cat', 'All');
  const cats: Cat[] = ['All', 'Math', 'Cards', 'Preflop', 'Reasoning', 'Quant'];
  return (
    <div className="page-inner">
      <PageHeader
        title="Drills & exams"
        description="Drills generate endless fresh questions with worked answers. Ten questions make a session; sessions at 80% or better count towards your weekly plan."
        actions={<Segmented value={cat} onChange={setCat} options={cats.map((c) => ({ value: c, label: c }))} />}
      />
      <div className="grid-auto">
        {DRILLS.filter((d) => cat === 'All' || d.category === cat).map((d) => {
          const st = drillStats(s, d.id);
          const Icon = d.icon;
          return (
            <Link key={d.id} to={`/practice/${d.id}`} className="card card-link drill-card">
              <div className="row-between">
                <span className="drill-icon">
                  <Icon />
                </span>
                <span className="tag" style={{ height: 20, fontSize: 11 }}>
                  {d.category}
                </span>
              </div>
              <h3 className="mt-3">{d.title}</h3>
              <p className="small subtle mt-1" style={{ minHeight: 40 }}>
                {d.description}
              </p>
              <div className="row-between mt-3">
                <span className="xs subtle">
                  {st.sessions ? `${st.sessions} session${st.sessions === 1 ? '' : 's'} · ${timeAgo(st.lastAt!)}` : `Target: ${d.target}`}
                </span>
                {st.accuracy !== null ? <Badge tone={st.accuracy >= 0.8 ? 'good' : st.accuracy >= 0.6 ? 'warn' : 'bad'}>{pct(st.accuracy, 0)}</Badge> : <Badge>New</Badge>}
              </div>
              {st.trend.length >= 2 && (
                <div className="mt-2">
                  <Sparkline values={st.trend} height={24} />
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Checkpoint exams</h2>
          <span className="small subtle">Questions drawn at random from each module’s lesson quizzes. Score 80% to tick off the plan task.</span>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          {EXAMS.map((e) => {
            const r = s.exams[e.id];
            return (
              <Link key={e.id} to={`/exam/${e.id}`} className="list-row" style={{ minHeight: 48 }}>
                <GraduationCap size={15} className="subtle" />
                <span className="grow medium">{e.title}</span>
                <span className="meta">
                  <span className="xs subtle">
                    {Math.min(e.count, examPoolSize(e))} questions
                  </span>
                  {r ? <Badge tone={r.best >= 0.8 ? 'good' : 'warn'}>best {pct(r.best, 0)}</Badge> : <Badge>Not taken</Badge>}
                  <ArrowRight size={14} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const SESSION = 10;

interface Answered {
  q: DrillQuestion;
  value: string;
  ok: boolean;
  ms: number;
}

function check(q: DrillQuestion, value: string): boolean {
  if (q.kind === 'choice') return Number(value) === q.answer;
  const v = parseFloat(value.replace(/[,%$\s]/g, '').replace('−', '-'));
  return Number.isFinite(v) && Math.abs(v - q.answer) <= (q.tolerance ?? 0) + 1e-9;
}

function formatAnswer(q: DrillQuestion): string {
  if (q.kind === 'choice') return '';
  const u = q.unit ?? '';
  return u === '$' ? `$${q.answer}` : u === '%' ? `${q.answer}%` : `${q.answer}${u ? ' ' + u : ''}`;
}

export function DrillRunner() {
  const { id = '' } = useParams();
  const drill = drillById(id);
  if (!drill) {
    return (
      <div className="page-inner">
        <Empty icon={Target} title="Drill not found" action={<Button to="/practice">All drills</Button>} />
      </div>
    );
  }
  return <DrillSession key={drill.id} drill={drill} />;
}

function DrillSession({ drill }: { drill: DrillDef }) {
  const recordAttempt = useStore((s) => s.recordAttempt);
  const recordDrillSession = useStore((s) => s.recordDrillSession);
  const stats = useStore((s) => drillStats(s, drill.id));
  const [round, setRound] = useState(0);
  const [q, setQ] = useState<DrillQuestion>(() => drill.generate(Math.random));
  const [value, setValue] = useState('');
  const [done, setDone] = useState<Answered | null>(null);
  const [history, setHistory] = useState<Answered[]>([]);
  const started = useRef(Date.now());
  const sessionStart = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = history.length >= SESSION && !done;

  useEffect(() => {
    started.current = Date.now();
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [q]);

  const submit = useCallback(
    (v: string) => {
      if (done || !v.trim()) return;
      const ok = check(q, v);
      const ms = Date.now() - started.current;
      const a = { q, value: v, ok, ms };
      setDone(a);
      setHistory((h) => [...h, a]);
      recordAttempt({ d: drill.id, ok, ms, err: q.kind === 'numeric' ? Math.abs(parseFloat(v) - q.answer) : undefined });
    },
    [done, q, drill.id, recordAttempt],
  );

  const next = useCallback(() => {
    setDone(null);
    setValue('');
    if (history.length >= SESSION) {
      const correct = history.filter((h) => h.ok).length;
      recordDrillSession({ d: drill.id, n: history.length, correct, ms: Date.now() - sessionStart.current });
      return;
    }
    setQ(drill.generate(Math.random));
  }, [history, drill, recordDrillSession]);

  const restart = () => {
    setHistory([]);
    setDone(null);
    setValue('');
    sessionStart.current = Date.now();
    setRound((r) => r + 1);
    setQ(drill.generate(Math.random));
  };

  useKeydown(
    (e) => {
      if (finished) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (done) next();
        else if (q.kind === 'numeric') submit(value);
        return;
      }
      if (!done && q.kind === 'choice' && q.choices) {
        const n = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
        if (n >= 0 && n < q.choices.length) submit(String(n));
      }
    },
    true,
    true,
  );

  const correct = history.filter((h) => h.ok).length;
  const avgS = history.length ? history.reduce((a, b) => a + b.ms, 0) / history.length / 1000 : 0;

  return (
    <div className="page-inner narrow">
      <PageHeader
        eyebrow={`${drill.category} drill · target ${drill.target}`}
        title={drill.title}
        description={drill.description}
        actions={
          <Button size="sm" variant="ghost" icon={RotateCcw} onClick={restart}>
            Restart
          </Button>
        }
      />
      <div className="row mb-4" style={{ gap: 12 }}>
        <div className="grow">
          <Progress value={history.length / SESSION} label="Session progress" />
        </div>
        <span className="small subtle tabular nowrap">
          {Math.min(history.length + (done || finished ? 0 : 1), SESSION)} / {SESSION}
        </span>
        <span className="small subtle tabular nowrap">
          {correct} correct · {avgS.toFixed(1)}s avg
        </span>
      </div>

      {finished ? (
        <Card title="Session complete" icon={CircleCheck}>
          <div className="kv">
            <div>
              <div className="k">Score</div>
              <div className="v">
                {correct}/{history.length}
              </div>
            </div>
            <div>
              <div className="k">Accuracy</div>
              <div className="v">{pct(correct / history.length, 0)}</div>
            </div>
            <div>
              <div className="k">Average time</div>
              <div className="v">
                {avgS.toFixed(1)}
                <small>s</small>
              </div>
            </div>
            <div>
              <div className="k">All-time (last 50)</div>
              <div className="v">{stats.accuracy === null ? '—' : pct(stats.accuracy, 0)}</div>
            </div>
          </div>
          <p className="small muted mt-4">{correct / history.length >= 0.8 ? 'Counts towards this week’s plan. ' : 'Below 80%: review the misses and go again. '}</p>
          <div className="row mt-4">
            <Button variant="primary" icon={Play} onClick={restart}>
              Another session
            </Button>
            {drill.lessons.map((l) => (
              <Button key={l} variant="ghost" icon={BookOpen} to={`/learn/${l}`}>
                {lessonById(l)?.title}
              </Button>
            ))}
          </div>
          {history.some((h) => !h.ok) && (
            <div className="mt-5">
              <div className="eyebrow mb-2">Misses</div>
              <div className="col gap-3">
                {history
                  .filter((h) => !h.ok)
                  .map((h, i) => (
                    <div key={i} className="panel-inset" style={{ padding: 12 }}>
                      <div className="small ink">{h.q.prompt}</div>
                      <div className="small muted mt-2">{h.q.explain}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Card>
      ) : (
        <div className="card drill-q" key={round}>
          {q.visual && <div className="drill-visual">{q.visual}</div>}
          <div className="drill-body">
            <div className="drill-prompt">{q.prompt}</div>
            {q.kind === 'choice' ? (
              <div className="choices">
                {q.choices!.map((c, i) => {
                  const picked = done && Number(done.value) === i;
                  const right = done && i === q.answer;
                  return (
                    <button key={i} type="button" disabled={!!done} className={cx('choice', picked && 'picked', right && 'correct', picked && !done!.ok && 'wrong')} onClick={() => submit(String(i))}>
                      <span className="key">{i + 1}</span>
                      <span>{c}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="row mt-4" style={{ maxWidth: 420 }}>
                <span className="input-group grow">
                  <input
                    ref={inputRef}
                    className="input input-lg tabular"
                    inputMode="decimal"
                    placeholder="Your answer"
                    value={done ? done.value : value}
                    disabled={!!done}
                    onChange={(e) => setValue(e.target.value)}
                    aria-label="Answer"
                  />
                  {q.unit && <span className="input-suffix">{q.unit}</span>}
                </span>
                <Button variant="primary" onClick={() => submit(value)} disabled={!!done || !value.trim()}>
                  Check
                </Button>
              </div>
            )}
            {done && (
              <div className={cx('feedback', done.ok ? 'ok' : 'no')}>
                <div className="row">
                  {done.ok ? <CircleCheck className="good" /> : <CircleX className="bad" />}
                  <strong>{done.ok ? 'Correct' : q.kind === 'numeric' ? `Answer: ${formatAnswer(q)}` : 'Not quite'}</strong>
                  {q.kind === 'numeric' && q.tolerance ? <span className="xs subtle">(within ±{q.tolerance} counts)</span> : null}
                  <span className="xs subtle row" style={{ marginLeft: 'auto', gap: 4 }}>
                    <Timer size={12} />
                    {(done.ms / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="small muted mt-2">{q.explain}</div>
                <div className="row mt-4">
                  <Button variant="primary" iconRight={ArrowRight} onClick={next}>
                    {history.length >= SESSION ? 'See results' : 'Next'}
                  </Button>
                  <span className="xs subtle row" style={{ gap: 4 }}>
                    or press <span className="kbd"><CornerDownLeft size={10} /></span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Exam() {
  const { id = '' } = useParams();
  const exam = examById(id);
  const record = useStore((s) => s.recordExam);
  const result = useStore((s) => s.exams[id]);
  const [seed, setSeed] = useState(0);
  const questions = useMemo(
    () =>
      exam
        ? examQuestions(exam).map((q) => ({ ...q, explain: `${q.explain} *From: [${q.lessonTitle}](/learn/${q.lesson}).*` }))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exam, seed],
  );
  if (!exam) {
    return (
      <div className="page-inner">
        <Empty icon={GraduationCap} title="Exam not found" action={<Button to="/practice">All exams</Button>} />
      </div>
    );
  }
  return (
    <div className="page-inner narrow">
      <PageHeader
        eyebrow="Checkpoint exam"
        title={exam.title}
        description={`${questions.length} questions drawn at random from the lesson quizzes. Score 80% or better to pass.`}
        actions={
          <>
            {result && <Badge tone={result.best >= 0.8 ? 'good' : 'warn'}>Best {pct(result.best, 0)} · {result.attempts} attempts</Badge>}
            <Button size="sm" icon={RotateCcw} onClick={() => setSeed(seed + 1)}>
              New set of questions
            </Button>
          </>
        }
      />
      <Quiz key={seed} questions={questions} onComplete={(sc) => record(exam.id, sc)} title={`${questions.length} questions`} />
    </div>
  );
}
