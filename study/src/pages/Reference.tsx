import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Cpu, Download, FileText, Library as LibraryIcon, Search, Trash, Upload } from '../components/icons';
import { Badge, Button, Card, Checkbox, NumberField, PageHeader, Progress, Segmented, Slider, Switch, cx, toast } from '../components/ui';
import { exportData, useStore, type BookProgress } from '../store/store';
import { BOOKS, MILESTONES, PAPERS, SOFTWARE } from '../content/library';
import { GLOSSARY } from '../content/glossary';
import { lessonById } from '../content/lessons';
import { localDate } from '../engine/srs';

function BookCard({ id, title, sub, why }: { id: string; title: string; sub: string; why: string }) {
  const b: BookProgress = useStore((s) => s.books[id]) ?? { status: 'not_started', progress: 0, notes: '' };
  const update = useStore((s) => s.updateBook);
  const [open, setOpen] = useState(false);
  return (
    <div className="card card-pad book">
      <div className="row-between">
        <div>
          <h3>{title}</h3>
          <div className="xs subtle mt-1">{sub}</div>
        </div>
        <Badge tone={b.status === 'done' ? 'good' : b.status === 'reading' ? 'primary' : 'default'}>{b.status === 'done' ? 'Read' : b.status === 'reading' ? 'Reading' : 'Not started'}</Badge>
      </div>
      <p className="small muted mt-2">{why}</p>
      <div className="row mt-3 wrap">
        <Segmented
          value={b.status}
          onChange={(v) => update(id, { status: v, progress: v === 'done' ? 100 : v === 'not_started' ? 0 : b.progress })}
          options={[
            { value: 'not_started', label: 'Not started' },
            { value: 'reading', label: 'Reading' },
            { value: 'done', label: 'Done' },
          ]}
        />
        <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>
          {open ? 'Hide notes' : b.notes ? 'Notes ✓' : 'Notes'}
        </Button>
      </div>
      {b.status === 'reading' && (
        <div className="mt-3">
          <Slider label="Progress" value={b.progress} min={0} max={100} step={5} onChange={(v) => update(id, { progress: v })} format={(v) => `${v}%`} />
        </div>
      )}
      {b.status !== 'reading' && b.progress > 0 && (
        <div className="mt-3">
          <Progress value={b.progress / 100} label={`${title} progress`} />
        </div>
      )}
      {open && <textarea className="textarea mt-3" value={b.notes} onChange={(e) => update(id, { notes: e.target.value })} placeholder="Key ideas, page numbers, questions…" />}
    </div>
  );
}

export function Library() {
  const s = useStore();
  const done = MILESTONES.filter((m) => s.milestones[m.id]).length;
  return (
    <div className="page-inner wide">
      <PageHeader title="Library" description="The reading list from your plan, the solver papers, the software worth knowing, and your own solver project." />
      <section>
        <div className="section-head">
          <h2>Books</h2>
        </div>
        <div className="grid-3">
          {BOOKS.map((b) => (
            <BookCard key={b.id} id={b.id} title={b.title} sub={`${b.author} · ${b.year} · ${b.phase}`} why={b.why} />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Solver project</h2>
          <span className="small subtle">
            {done}/{MILESTONES.length} milestones
          </span>
        </div>
        <Card pad={false}>
          <div style={{ padding: '14px 16px 4px' }}>
            <Progress value={done / MILESTONES.length} large label="Solver project progress" />
          </div>
          <div className="list">
            {MILESTONES.map((m, i) => (
              <div key={m.id} className="list-row" style={{ minHeight: 50 }}>
                <Checkbox checked={!!s.milestones[m.id]} onChange={() => s.toggleMilestone(m.id)} label={m.title} />
                <span className="xs subtle tabular" style={{ width: 18 }}>
                  {i + 1}
                </span>
                <div className="grow">
                  <div className={cx('medium', s.milestones[m.id] && 'subtle')}>{m.title}</div>
                  <div className="xs subtle">{m.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="card-foot small subtle">
            <Cpu size={13} /> Watch the reference implementation in the <Link to="/tools/cfr" className="link">CFR lab</Link>, then build your own next to your C++ engine.
          </div>
        </Card>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Papers</h2>
        </div>
        <Card pad={false}>
          <div className="list">
            {PAPERS.map((p) => {
              const read = s.books[`paper:${p.id}`]?.status === 'done';
              return (
                <div key={p.id} className="list-row" style={{ minHeight: 56 }}>
                  <Checkbox checked={read} onChange={() => s.updateBook(`paper:${p.id}`, { status: read ? 'not_started' : 'done' })} label={`Mark ${p.title} as read`} />
                  <FileText size={15} className="subtle" />
                  <div className="grow">
                    <div className={cx('medium', read && 'subtle')}>{p.title}</div>
                    <div className="xs subtle">
                      {p.authors} · {p.venue} {p.year} — {p.why}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Software</h2>
        </div>
        <div className="grid-2">
          {SOFTWARE.map((x) => (
            <div key={x.name} className="card card-pad-sm">
              <div className="row-between">
                <span className="medium">{x.name}</span>
                <span className="xs subtle">{x.kind}</span>
              </div>
              <p className="small muted mt-1">{x.why}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function Glossary() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const focus = params.get('q');
  useEffect(() => {
    if (focus) {
      setQ(focus);
      setTimeout(() => document.getElementById(`term-${focus}`)?.scrollIntoView({ block: 'center' }), 50);
    }
  }, [focus]);
  const list = useMemo(() => {
    const t = q.toLowerCase().trim();
    return GLOSSARY.filter((g) => !t || g.term.toLowerCase().includes(t) || g.def.toLowerCase().includes(t) || (g.aliases ?? []).some((a) => a.toLowerCase().includes(t))).sort((a, b) =>
      a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }),
    );
  }, [q]);
  const letters = [...new Set(list.map((g) => g.term[0].toUpperCase()))];
  return (
    <div className="page-inner narrow">
      <PageHeader title="Glossary" description={`${GLOSSARY.length} terms. Terms with a dotted underline in lessons link here.`} />
      <div className="input-group mb-4">
        <input
          className="input"
          placeholder="Search terms and definitions"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (params.get('q')) setParams({}, { replace: true });
          }}
          autoFocus
        />
        <span className="input-suffix">
          <Search size={14} />
        </span>
      </div>
      {letters.map((L) => (
        <section key={L} className="mb-4">
          <div className="eyebrow mb-2">{L}</div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {list
              .filter((g) => g.term[0].toUpperCase() === L)
              .map((g) => {
                const lesson = g.lesson ? lessonById(g.lesson) : undefined;
                return (
                  <div key={g.term} id={`term-${g.term}`} className={cx('term', focus === g.term && 'focus')}>
                    <div className="row-between">
                      <span className="ink semibold">{g.term}</span>
                      {lesson && (
                        <Link to={`/learn/${lesson.id}`} className="xs link row" style={{ gap: 4 }}>
                          <BookOpen size={12} />
                          {lesson.title}
                          <ArrowRight size={11} />
                        </Link>
                      )}
                    </div>
                    <p className="small muted mt-1">{g.def}</p>
                    {g.aliases && <p className="xs tertiary mt-1">Also: {g.aliases.join(', ')}</p>}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
      {list.length === 0 && <p className="subtle">No terms match “{q}”.</p>}
    </div>
  );
}

export function Settings() {
  const s = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState(false);
  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `equilibrium-backup-${localDate()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Backup downloaded');
  };
  const upload = async (f: File) => {
    try {
      s.importData(await f.text());
      toast('Backup restored');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not read that file.');
    }
  };
  return (
    <div className="page-inner narrow">
      <PageHeader title="Settings" description="Everything is stored locally in this browser. Export a backup now and then." />
      <Card title="Plan">
        <div className="grid-2">
          <label className="field">
            <span className="label">Name</span>
            <input className="input" value={s.settings.name} onChange={(e) => s.updateSettings({ name: e.target.value })} />
          </label>
          <NumberField label="Study hours per week" value={s.settings.weeklyHours} onChange={(v) => s.updateSettings({ weeklyHours: Math.max(1, v) })} min={1} max={60} />
          <label className="field">
            <span className="label">Plan start date (week 1)</span>
            <input className="input" type="date" value={s.settings.startDate} onChange={(e) => e.target.value && s.updateSettings({ startDate: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Internship start date</span>
            <input className="input" type="date" value={s.settings.internshipDate} onChange={(e) => e.target.value && s.updateSettings({ internshipDate: e.target.value })} />
          </label>
          <NumberField label="New flashcards per day" value={s.settings.newCardsPerDay} onChange={(v) => s.updateSettings({ newCardsPerDay: Math.max(0, v) })} min={0} max={100} />
          <div className="field">
            <span className="label">Four-colour deck</span>
            <div className="row" style={{ height: 34 }}>
              <Switch on={s.settings.fourColor} onChange={(v) => s.updateSettings({ fourColor: v })} label="Four-colour deck" />
              <span className="small subtle">{s.settings.fourColor ? '♠ white · ♥ red · ♦ blue · ♣ green' : 'Two colours'}</span>
            </div>
          </div>
        </div>
      </Card>
      <Card className="mt-4" title="Data" icon={LibraryIcon}>
        <p className="small muted mb-3">
          {s.hands.length} hands, {s.sessions.length} sessions, {s.attempts.length} drill answers and {Object.keys(s.cards).length} flashcards in progress.
        </p>
        <div className="row wrap">
          <Button icon={Download} onClick={download}>
            Export backup
          </Button>
          <Button icon={Upload} onClick={() => fileRef.current?.click()}>
            Import backup
          </Button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <span className="grow" />
          {confirm ? (
            <>
              <span className="small bad">Delete all progress?</span>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                icon={Trash}
                onClick={() => {
                  s.resetAll();
                  setConfirm(false);
                  toast('All data reset');
                }}
              >
                Yes, reset
              </Button>
            </>
          ) : (
            <Button variant="danger" icon={Trash} onClick={() => setConfirm(true)}>
              Reset everything
            </Button>
          )}
        </div>
      </Card>
      <Card className="mt-4" title="About">
        <p className="small muted">
          Equilibrium is a local study app built around a 30-week plan for poker theory. The design follows the Linear design system in DESIGN.md. The engine (hand evaluator, equity, ranges, CFR) lives in src/engine and is covered by unit tests: run npm test.
        </p>
      </Card>
    </div>
  );
}
