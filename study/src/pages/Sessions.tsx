import { useState } from 'react';
import { ChartLine, Plus, Square, Timer, Trash } from '../components/icons';
import { LineChart } from '../components/charts';
import { Button, Card, Empty, IconButton, NumberField, PageHeader, Progress, Segmented, toast } from '../components/ui';
import { CATEGORIES, useStore, type Category } from '../store/store';
import { localDate } from '../engine/srs';
import { currentWeek, weekRange } from '../lib/plan';
import { minutesByCategory } from '../lib/progress';
import { useNow } from '../lib/hooks';
import { clock, duration, num, shortDate, signed } from '../lib/format';

export function Sessions() {
  const s = useStore();
  const now = useNow(1000);
  const [cat, setCat] = useState<Category>('study');
  const [date, setDate] = useState(localDate());
  const [minutes, setMinutes] = useState(45);
  const [note, setNote] = useState('');
  const [hands, setHands] = useState(0);
  const [result, setResult] = useState(0);
  const [sd, setSd] = useState(90);

  const week = currentWeek(s.settings);
  const r = weekRange(s.settings, week);
  const mins = minutesByCategory(s.sessions, r);
  const goal = s.settings.weeklyHours * 60;

  const play = s.sessions.filter((x) => x.category === 'play' && (x.hands ?? 0) > 0).sort((a, b) => a.date.localeCompare(b.date));
  let cumHands = 0;
  let cumBb = 0;
  const pts = [{ x: 0, y: 0 }, ...play.map((x) => ({ x: (cumHands += x.hands ?? 0), y: (cumBb += x.resultBb ?? 0) }))];
  const wr = cumHands ? (cumBb / cumHands) * 100 : 0;
  const se = cumHands ? sd / Math.sqrt(cumHands / 100) : 0;

  const add = () => {
    if (minutes <= 0) return;
    s.addSession({ date, minutes, category: cat, note: note.trim() || undefined, hands: cat === 'play' && hands ? hands : undefined, resultBb: cat === 'play' && hands ? result : undefined });
    setNote('');
    setHands(0);
    setResult(0);
    toast(`Logged ${duration(minutes)} of ${CATEGORIES.find((c) => c.id === cat)!.label.toLowerCase()}`);
  };

  return (
    <div className="page-inner wide">
      <PageHeader title="Sessions" description="Log study time by category against the weekly rhythm (35% study, 40% play, 20% review, 5% drills). Drill and flashcard sessions are logged automatically when they last at least a minute." />
      <div className="grid-2">
        <Card title="Timer" icon={Timer}>
          {s.timer ? (
            <div className="row-between">
              <div>
                <div className="xs subtle">{CATEGORIES.find((c) => c.id === s.timer!.category)?.label} session running</div>
                <div className="timer-big tabular">{clock(now - s.timer.start)}</div>
              </div>
              <div className="row">
                <Button variant="ghost" onClick={() => s.stopTimer(false)}>
                  Discard
                </Button>
                <Button variant="primary" icon={Square} onClick={() => s.stopTimer(true)}>
                  Stop & log
                </Button>
              </div>
            </div>
          ) : (
            <div className="col gap-3">
              <p className="small subtle">Start a timer when you sit down; it keeps running if you leave this page.</p>
              <div className="row wrap">
                {CATEGORIES.map((c) => (
                  <Button key={c.id} onClick={() => s.startTimer(c.id)}>
                    Start {c.label.toLowerCase()}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>
        <Card title={`Week ${week}: ${duration(Object.values(mins).reduce((a, b) => a + b, 0))} of ${s.settings.weeklyHours}h`} icon={ChartLine}>
          <div className="col gap-3">
            {CATEGORIES.map((c) => (
              <div key={c.id}>
                <div className="row-between small mb-1">
                  <span className="muted">{c.label}</span>
                  <span className="xs subtle tabular">
                    {duration(mins[c.id])} / {duration(goal * c.share)}
                  </span>
                </div>
                <Progress value={mins[c.id] / (goal * c.share)} tone={mins[c.id] >= goal * c.share ? 'good' : undefined} label={`${c.label} vs target`} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4" title="Log a session manually" icon={Plus}>
        <div className="session-form">
          <div className="field">
            <span className="label">Category</span>
            <Segmented value={cat} onChange={setCat} options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
          </div>
          <label className="field">
            <span className="label">Date</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <NumberField label="Minutes" value={minutes} onChange={setMinutes} min={1} step={5} />
          {cat === 'play' && (
            <>
              <NumberField label="Hands played" value={hands} onChange={setHands} min={0} step={100} />
              <NumberField label="Result (bb)" value={result} onChange={setResult} step={1} />
            </>
          )}
          <label className="field grow" style={{ minWidth: 200 }}>
            <span className="label">Note</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Read Modern Poker Theory ch. 3…" />
          </label>
          <Button variant="primary" onClick={add} style={{ alignSelf: 'flex-end' }}>
            Add
          </Button>
        </div>
      </Card>

      <Card className="mt-4" title="Results tracker" icon={ChartLine}>
        {play.length === 0 ? (
          <p className="small subtle">Log play sessions with hands and results (in big blinds) to track your win rate, with an honest confidence interval.</p>
        ) : (
          <div className="col gap-4">
            <div className="kv">
              <div>
                <div className="k">Hands</div>
                <div className="v">{num(cumHands)}</div>
              </div>
              <div>
                <div className="k">Won</div>
                <div className="v">{signed(cumBb, 1)}<small>bb</small></div>
              </div>
              <div>
                <div className="k">Win rate</div>
                <div className="v">{signed(wr, 1)}<small>bb/100</small></div>
              </div>
              <div>
                <div className="k">95% interval</div>
                <div className="v">
                  {signed(wr - 1.96 * se, 0)} to {signed(wr + 1.96 * se, 0)}
                </div>
              </div>
            </div>
            <LineChart ariaLabel="Cumulative big blinds won by hands played" height={220} series={[{ id: 'bb', label: 'Big blinds won', color: 'var(--s1)', points: pts }]} xFormat={(v) => num(v)} xLabel="Hands" directLabels={false} />
            <div style={{ maxWidth: 260 }}>
              <NumberField label="Assumed SD (bb/100) for the interval" value={sd} onChange={setSd} min={30} step={5} />
            </div>
          </div>
        )}
      </Card>

      <Card className="mt-4" title="All sessions" pad={false}>
        {s.sessions.length === 0 ? (
          <Empty icon={Timer} title="No sessions yet">
            Start a timer or log a session above.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th className="num">Time</th>
                  <th>Note</th>
                  <th className="num">Hands</th>
                  <th className="num">Result</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...s.sessions]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 200)
                  .map((x) => (
                    <tr key={x.id}>
                      <td className="nowrap">{shortDate(x.date)}</td>
                      <td>
                        {CATEGORIES.find((c) => c.id === x.category)?.label}
                        {x.auto && <span className="xs tertiary"> · auto</span>}
                      </td>
                      <td className="num">{duration(x.minutes)}</td>
                      <td className="small">{x.note}</td>
                      <td className="num">{x.hands ? num(x.hands) : ''}</td>
                      <td className="num">{x.resultBb !== undefined ? `${signed(x.resultBb, 1)} bb` : ''}</td>
                      <td>
                        <IconButton icon={Trash} label="Delete session" onClick={() => s.deleteSession(x.id)} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
