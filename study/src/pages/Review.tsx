import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleCheck, Eye, Layers, Play, RotateCcw, Search } from '../components/icons';
import { Badge, Button, Card, PageHeader, Stat, Tabs, cx } from '../components/ui';
import { renderInline } from '../components/Markdown';
import { useStore } from '../store/store';
import { FLASHCARDS, type Flashcard } from '../content/flashcards';
import { MODULES } from '../content/modules';
import type { ModuleId } from '../content/types';
import { formatInterval, localDate, previewIntervals, type Grade } from '../engine/srs';
import { cardQueue } from '../lib/progress';
import { useKeydown, usePref } from '../lib/hooks';
import { shortDate } from '../lib/format';

const GRADES: { g: Grade; label: string; key: string }[] = [
  { g: 0, label: 'Again', key: '1' },
  { g: 1, label: 'Hard', key: '2' },
  { g: 2, label: 'Good', key: '3' },
  { g: 3, label: 'Easy', key: '4' },
];

function Session({ queue, onDone }: { queue: Flashcard[]; onDone: (n: number) => void }) {
  const reviewCard = useStore((s) => s.reviewCard);
  const cards = useStore((s) => s.cards);
  const [list, setList] = useState(queue);
  const [flipped, setFlipped] = useState(false);
  const [count, setCount] = useState(0);
  const card = list[0];
  const today = localDate();
  const intervals = card ? previewIntervals(cards[card.id], today) : [];
  const deck = card ? MODULES.find((m) => m.id === card.deck) : undefined;

  const grade = (g: Grade) => {
    if (!card) return;
    reviewCard(card.id, g);
    setCount((c) => c + 1);
    setFlipped(false);
    const rest = list.slice(1);
    const next = g === 0 ? [...rest, card] : rest;
    setList(next);
    if (!next.length) onDone(count + 1);
  };

  useKeydown((e) => {
    if (!card) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!flipped) setFlipped(true);
      else grade(2);
      return;
    }
    if (flipped) {
      const g = GRADES.find((x) => x.key === e.key);
      if (g) grade(g.g);
    }
  });

  if (!card) return null;
  return (
    <div className="flash-wrap">
      <div className="row-between small subtle mb-3">
        <span>
          {deck?.title} · {cards[card.id] ? 'review' : 'new card'}
        </span>
        <span className="tabular">{list.length} left</span>
      </div>
      <button type="button" className={cx('flashcard', flipped && 'flipped')} onClick={() => setFlipped(true)} aria-label={flipped ? 'Answer shown' : 'Show answer'}>
        <div className="flash-front">{renderInline(card.front, 'f')}</div>
        {flipped ? (
          <div className="flash-back">{renderInline(card.back, 'b')}</div>
        ) : (
          <div className="flash-hint">
            <Eye size={14} /> Show answer <span className="kbd">Space</span>
          </div>
        )}
      </button>
      {flipped && (
        <div className="grade-row">
          {GRADES.map((x, i) => (
            <button key={x.g} type="button" className={cx('grade', `g${x.g}`)} onClick={() => grade(x.g)}>
              <span className="medium">{x.label}</span>
              <span className="xs subtle">
                {formatInterval(intervals[i])} · <span className="kbd">{x.key}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Review() {
  const s = useStore();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<'review' | 'browse'>('review');
  const [decks, setDecks] = usePref<ModuleId[]>('review-decks', []);
  const [active, setActive] = useState<Flashcard[] | null>(null);
  const [finished, setFinished] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const queue = cardQueue(s, decks.length ? decks : null);
  const learned = FLASHCARDS.filter((f) => (s.cards[f.id]?.reps ?? 0) > 0).length;
  const mature = FLASHCARDS.filter((f) => (s.cards[f.id]?.interval ?? 0) >= 21).length;
  const start = () => {
    setFinished(null);
    setActive([...queue.due, ...queue.fresh]);
  };
  const wantsStart = !!params.get('start');
  useEffect(() => {
    if (!wantsStart) return;
    setParams({}, { replace: true });
    if (queue.due.length + queue.fresh.length > 0) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsStart]);
  const browse = useMemo(
    () =>
      FLASHCARDS.filter((f) => (!decks.length || decks.includes(f.deck)) && (!q || `${f.front} ${f.back}`.toLowerCase().includes(q.toLowerCase()))),
    [decks, q],
  );
  const toggleDeck = (id: ModuleId) => setDecks(decks.includes(id) ? decks.filter((d) => d !== id) : [...decks, id]);

  return (
    <div className="page-inner narrow">
      <PageHeader
        title="Flashcards"
        description="Spaced repetition for every formula and concept in the curriculum. Grade honestly: “Again” brings the card back in this session, and “Easy” pushes it out for longer."
      />
      <div className="card stats-row mb-4" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <Stat label="Due now" value={queue.due.length} />
        <Stat label="New today" value={queue.fresh.length} sub={`limit ${s.settings.newCardsPerDay}/day`} />
        <Stat label="Learned" value={<>{learned}<small>/ {FLASHCARDS.length}</small></>} />
        <Stat label="Mature (21d+)" value={mature} />
      </div>
      <div className="row wrap mb-4" style={{ gap: 6 }}>
        <span className="small subtle" style={{ marginRight: 4 }}>
          Decks:
        </span>
        <button type="button" className={cx('tag', !decks.length && 'on')} onClick={() => setDecks([])}>
          All
        </button>
        {MODULES.map((m) => (
          <button key={m.id} type="button" className={cx('tag', decks.includes(m.id) && 'on')} onClick={() => toggleDeck(m.id)}>
            {m.title}
          </button>
        ))}
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'review', label: 'Review' },
          { value: 'browse', label: `Browse (${browse.length})` },
        ]}
      />
      {tab === 'review' &&
        (active && active.length ? (
          <Session
            key={active.map((c) => c.id).join()}
            queue={active}
            onDone={(n) => {
              setActive(null);
              setFinished(n);
            }}
          />
        ) : (
          <Card>
            <div className="empty" style={{ padding: '36px 16px' }}>
              {finished !== null ? <CircleCheck /> : <Layers />}
              <h3>{finished !== null ? `Session done: ${finished} reviews` : queue.due.length + queue.fresh.length ? 'Ready when you are' : 'All caught up'}</h3>
              <p>
                {queue.due.length + queue.fresh.length
                  ? `${queue.due.length} due and ${queue.fresh.length} new cards in the selected decks.`
                  : 'Nothing is due right now. New cards unlock tomorrow; come back then.'}
              </p>
              {queue.due.length + queue.fresh.length > 0 && (
                <Button variant="primary" icon={Play} onClick={start}>
                  Start review
                </Button>
              )}
            </div>
          </Card>
        ))}
      {tab === 'browse' && (
        <>
          <div className="input-group mb-3">
            <input className="input" placeholder="Search cards" value={q} onChange={(e) => setQ(e.target.value)} />
            <span className="input-suffix">
              <Search size={14} />
            </span>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Card</th>
                  <th>Deck</th>
                  <th>Due</th>
                  <th className="num">Interval</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {browse.map((f) => {
                  const st = s.cards[f.id];
                  return (
                    <tr key={f.id}>
                      <td>
                        <div className="ink">{renderInline(f.front, f.id + 'f')}</div>
                        <div className="xs subtle mt-1">{renderInline(f.back, f.id + 'b')}</div>
                      </td>
                      <td className="nowrap xs">{MODULES.find((m) => m.id === f.deck)?.title}</td>
                      <td className="nowrap xs">{st ? (st.due <= localDate() ? <Badge tone="primary">Due</Badge> : shortDate(st.due)) : <Badge>New</Badge>}</td>
                      <td className="num xs">{st ? formatInterval(st.interval) : '—'}</td>
                      <td>{st && <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => s.resetCard(f.id)} aria-label="Reset card" />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

