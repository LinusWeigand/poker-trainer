import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NotebookPen, Plus, Search, Tag, Trash } from '../components/icons';
import { CardInput, InlineCards } from '../components/PlayingCard';
import { HBars } from '../components/charts';
import { Badge, Button, Card, Empty, Modal, PageHeader, Segmented, StatusIcon, Stat, cx, toast } from '../components/ui';
import { uid, useStore, type JournalHand } from '../store/store';
import { cardsStr, parseCards } from '../engine/cards';
import { localDate } from '../engine/srs';
import { shortDate, signed } from '../lib/format';

export const MISTAKE_TAGS = ['Preflop range', 'Sizing', 'Over-bluff', 'Under-bluff', 'Missed value', 'Bad bluff-catch', 'Bad fold', 'Tilt / focus', 'Good play'];
const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const POT_TYPES = ['Single-raised', '3-bet pot', '4-bet pot', 'Limped', 'Multiway'];

function blank(): JournalHand {
  return {
    id: uid(),
    created: Date.now(),
    date: localDate(),
    stakes: 'NL10',
    position: 'BTN',
    villainPos: 'BB',
    hero: '',
    board: '',
    potType: 'Single-raised',
    preflop: '',
    flop: '',
    turn: '',
    river: '',
    decision: '',
    better: '',
    concept: '',
    tags: [],
    status: 'open',
  };
}

function HandForm({ hand, onClose }: { hand: JournalHand; onClose: () => void }) {
  const save = useStore((s) => s.saveHand);
  const del = useStore((s) => s.deleteHand);
  const exists = useStore((s) => s.hands.some((h) => h.id === hand.id));
  const [h, setH] = useState(hand);
  const set = (patch: Partial<JournalHand>) => setH((x) => ({ ...x, ...patch }));
  const heroCards = parseCards(h.hero);
  const boardCards = parseCards(h.board);
  const field = (k: keyof JournalHand, label: string, placeholder: string, rows = 2) => (
    <label className="field">
      <span className="label">{label}</span>
      <textarea className="textarea" rows={rows} style={{ minHeight: 0 }} value={String(h[k] ?? '')} placeholder={placeholder} onChange={(e) => set({ [k]: e.target.value } as Partial<JournalHand>)} />
    </label>
  );
  return (
    <Modal
      open
      onClose={onClose}
      title={exists ? 'Edit hand' : 'Log a hand'}
      size="lg"
      footer={
        <>
          {exists && (
            <Button
              variant="danger"
              icon={Trash}
              onClick={() => {
                del(h.id);
                onClose();
              }}
            >
              Delete
            </Button>
          )}
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              save(h);
              toast(exists ? 'Hand updated' : 'Hand logged');
              onClose();
            }}
          >
            Save hand
          </Button>
        </>
      }
    >
      <div className="col gap-4">
        <div className="grid-4">
          <label className="field">
            <span className="label">Date</span>
            <input className="input" type="date" value={h.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Game / stakes</span>
            <input className="input" value={h.stakes} onChange={(e) => set({ stakes: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Your position</span>
            <select className="select" value={h.position} onChange={(e) => set({ position: e.target.value })}>
              {POSITIONS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Villain</span>
            <select className="select" value={h.villainPos} onChange={(e) => set({ villainPos: e.target.value })}>
              {[...POSITIONS, 'Multiple'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid-3">
          <CardInput label="Your hand" value={heroCards} onChange={(cs) => set({ hero: cardsStr(cs) })} max={2} dead={boardCards} />
          <CardInput label="Board" value={boardCards} onChange={(cs) => set({ board: cardsStr(cs) })} max={5} dead={heroCards} />
          <div className="col gap-3">
            <label className="field">
              <span className="label">Pot type</span>
              <select className="select" value={h.potType} onChange={(e) => set({ potType: e.target.value })}>
                {POT_TYPES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Result (bb)</span>
              <input className="input tabular" type="number" value={h.resultBb ?? ''} onChange={(e) => set({ resultBb: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </label>
          </div>
        </div>
        <div className="grid-2">
          {field('preflop', 'Preflop', 'BTN opens 2.5bb, BB calls…')}
          {field('flop', 'Flop', 'BB checks, I bet 1/3…')}
          {field('turn', 'Turn', '')}
          {field('river', 'River', '')}
        </div>
        {field('decision', 'The decision and what you did', 'River, facing a 75% pot bet with top pair weak kicker, I called…', 2)}
        {field('better', 'Better line (after review)', 'Fold: his range here is 70% value; I needed 30% bluffs…', 2)}
        {field('concept', 'Key concept in one sentence', 'Population under-bluffs big river bets.', 1)}
        <div className="field">
          <span className="label">Tags</span>
          <div className="row wrap" style={{ gap: 6 }}>
            {MISTAKE_TAGS.map((t) => (
              <button key={t} type="button" className={cx('tag', h.tags.includes(t) && 'on')} onClick={() => set({ tags: h.tags.includes(t) ? h.tags.filter((x) => x !== t) : [...h.tags, t] })}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          <span className="label">Status</span>
          <Segmented value={h.status} onChange={(v) => set({ status: v })} options={[{ value: 'open', label: 'To review' }, { value: 'reviewed', label: 'Reviewed' }]} />
        </div>
      </div>
    </Modal>
  );
}

export function Journal() {
  const hands = useStore((s) => s.hands);
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<JournalHand | null>(null);
  const [status, setStatus] = useState<'all' | 'open' | 'reviewed'>('all');
  const [tag, setTag] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    if (params.get('new')) {
      setEditing(blank());
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const list = useMemo(
    () =>
      hands
        .filter((h) => status === 'all' || h.status === status)
        .filter((h) => !tag || h.tags.includes(tag))
        .filter((h) => !q || `${h.decision} ${h.better} ${h.concept} ${h.preflop} ${h.flop} ${h.turn} ${h.river} ${h.stakes}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created),
    [hands, status, tag, q],
  );

  const tagCounts = MISTAKE_TAGS.map((t) => ({ t, n: hands.filter((h) => h.tags.includes(t)).length })).filter((x) => x.n > 0 && x.t !== 'Good play');
  const total = tagCounts.reduce((a, b) => a + b.n, 0);
  const top = [...tagCounts].sort((a, b) => b.n - a.n)[0];

  return (
    <div className="page-inner wide">
      <PageHeader
        title="Hand journal"
        description="Mark hands during play, review them later with the six-step loop, and tag the mistake. Your most common tag is your next study topic."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setEditing(blank())}>
            Log a hand
          </Button>
        }
      />
      <div className="journal-layout">
        <div>
          <div className="row wrap mb-3">
            <Segmented value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'To review' }, { value: 'reviewed', label: 'Reviewed' }]} />
            <select className="select input-sm" style={{ width: 170 }} value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag">
              <option value="">All tags</option>
              {MISTAKE_TAGS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <span className="input-group" style={{ width: 220 }}>
              <input className="input input-sm" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} />
              <span className="input-suffix">
                <Search size={13} />
              </span>
            </span>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {list.length === 0 ? (
              <Empty
                icon={NotebookPen}
                title={hands.length ? 'No hands match' : 'No hands yet'}
                action={!hands.length && (
                  <Button variant="primary" icon={Plus} onClick={() => setEditing(blank())}>
                    Log your first hand
                  </Button>
                )}
              >
                {hands.length ? 'Try a different filter.' : 'Log interesting or difficult hands right after your session, then review them with fresh eyes.'}
              </Empty>
            ) : (
              <div className="list">
                {list.map((h) => (
                  <button key={h.id} type="button" className="list-row hand-row" onClick={() => setEditing(h)}>
                    <StatusIcon status={h.status === 'reviewed' ? 'done' : 'todo'} />
                    <span className="xs subtle nowrap" style={{ width: 52 }}>
                      {shortDate(h.date)}
                    </span>
                    <span className="badge" style={{ width: 74, justifyContent: 'center' }}>
                      {h.position} v {h.villainPos === 'Multiple' ? 'MW' : h.villainPos}
                    </span>
                    <span className="nowrap" style={{ width: 70 }}>
                      {h.hero ? <InlineCards cards={parseCards(h.hero)} /> : <span className="tertiary">—</span>}
                    </span>
                    <span className="nowrap" style={{ width: 150 }}>
                      {h.board ? <InlineCards cards={parseCards(h.board)} /> : <span className="tertiary xs">preflop</span>}
                    </span>
                    <span className="grow truncate small muted" style={{ textAlign: 'left' }}>
                      {h.concept || h.decision || h.preflop || 'No notes yet'}
                    </span>
                    <span className="meta">
                      {h.tags.slice(0, 2).map((t) => (
                        <span key={t} className="tag" style={{ height: 20, fontSize: 11 }}>
                          {t}
                        </span>
                      ))}
                      {h.resultBb !== undefined && <span className="tabular ink xs" style={{ width: 54, textAlign: 'right' }}>{signed(h.resultBb, 1)} bb</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="col gap-4">
          <div className="card stats-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Stat label="Hands logged" value={hands.length} />
            <Stat label="To review" value={hands.filter((h) => h.status === 'open').length} />
          </div>
          <Card title="Mistake tags" icon={Tag}>
            {tagCounts.length === 0 ? (
              <p className="small subtle">Tag hands to see where your leaks are.</p>
            ) : (
              <>
                <HBars rows={[...tagCounts].sort((a, b) => b.n - a.n).map((x) => ({ key: x.t, label: x.t, value: x.n / total, sub: `${x.n}` }))} max={1} format={(v) => `${Math.round(v * 100)}%`} />
                {top && (
                  <p className="small muted mt-3">
                    Most common: <Badge tone="warn">{top.t}</Badge>. Make it next week’s study focus.
                  </p>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
      {editing && <HandForm hand={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
