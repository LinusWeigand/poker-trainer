import { useEffect, useState } from 'react';
import { Shuffle, X } from 'lucide-react';
import { type Card, RANKS, SUIT_SYMBOLS, SUITS, cardsStr, dealRandom, makeCard, parseCards, rankOf, suitOf } from '../engine/cards';
import { IconButton, cx } from './ui';

const suitClass = (c: Card) => `suit-${SUITS[suitOf(c)]}`;

export function PlayingCard({ card, size, back }: { card?: Card | null; size?: 'sm' | 'lg'; back?: boolean }) {
  if (back) return <span className={cx('pcard back', size)} aria-label="Face-down card" />;
  if (card === undefined || card === null) return <span className={cx('pcard empty', size)} aria-hidden="true" />;
  return (
    <span className={cx('pcard', size, suitClass(card))} aria-label={`${RANKS[rankOf(card)]} of ${SUITS[suitOf(card)]}`}>
      <span className="r">{RANKS[rankOf(card)]}</span>
      <span className="s">{SUIT_SYMBOLS[suitOf(card)]}</span>
    </span>
  );
}

export function CardRow({ cards, slots, size, gap }: { cards: readonly Card[]; slots?: number; size?: 'sm' | 'lg'; gap?: boolean }) {
  const n = Math.max(slots ?? 0, cards.length);
  return (
    <span className={cx('cards', gap && 'gap')}>
      {Array.from({ length: n }, (_, i) => (
        <PlayingCard key={i} card={cards[i] ?? null} size={size} />
      ))}
    </span>
  );
}

export function InlineCards({ cards }: { cards: readonly Card[] }) {
  return (
    <>
      {cards.map((c, i) => (
        <span key={i} className={cx('icard', suitClass(c))}>
          {RANKS[rankOf(c)]}
          {SUIT_SYMBOLS[suitOf(c)]}
        </span>
      ))}
    </>
  );
}

export function CardPicker({ selected, disabled, onToggle }: { selected: readonly Card[]; disabled?: ReadonlySet<Card>; onToggle: (c: Card) => void }) {
  const suitsOrder = [3, 2, 1, 0];
  return (
    <div className="picker" role="grid" aria-label="Choose cards">
      {suitsOrder.map((s) =>
        Array.from({ length: 13 }, (_, i) => {
          const r = 12 - i;
          const c = makeCard(r, s);
          const sel = selected.includes(c);
          return (
            <button
              key={c}
              type="button"
              className={cx(`suit-${SUITS[s]}`, sel && 'sel')}
              disabled={!sel && disabled?.has(c)}
              onClick={() => onToggle(c)}
              aria-pressed={sel}
              aria-label={`${RANKS[r]}${SUITS[s]}`}
            >
              {RANKS[r]}
              {SUIT_SYMBOLS[s]}
            </button>
          );
        }),
      )}
    </div>
  );
}

/** Slots + text entry + picker for choosing up to `max` cards. */
export function CardInput({
  label,
  value,
  onChange,
  max,
  dead = [],
  size,
}: {
  label?: string;
  value: Card[];
  onChange: (cards: Card[]) => void;
  max: number;
  dead?: readonly Card[];
  size?: 'sm' | 'lg';
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(cardsStr(value, ' '));
  useEffect(() => setText(cardsStr(value, ' ')), [value]);
  const deadSet = new Set(dead);

  const toggle = (c: Card) => {
    if (value.includes(c)) onChange(value.filter((x) => x !== c));
    else if (value.length < max) onChange([...value, c]);
    else onChange([...value.slice(0, max - 1), c]);
  };

  return (
    <div className="field">
      {label && <span className="label">{label}</span>}
      <div className="row wrap">
        <button type="button" className={cx('slot-btn', open && 'active')} onClick={() => setOpen(!open)} aria-label={`${label ?? 'Cards'}: choose`}>
          <CardRow cards={value} slots={max} size={size} />
        </button>
        <input
          className="input input-sm input-mono"
          style={{ width: Math.max(84, max * 30) }}
          value={text}
          placeholder={max === 2 ? 'AsKd' : 'Qh7c2d'}
          aria-label={`${label ?? 'Cards'} as text`}
          onChange={(e) => {
            setText(e.target.value);
            const cs = parseCards(e.target.value).filter((c) => !deadSet.has(c)).slice(0, max);
            if (cs.length === 0 && e.target.value.trim() === '') onChange([]);
            else if (cs.length) onChange(cs);
          }}
        />
        <IconButton icon={Shuffle} label="Random cards" onClick={() => onChange(dealRandom(max, dead))} />
        {value.length > 0 && <IconButton icon={X} label="Clear" onClick={() => onChange([])} />}
      </div>
      {open && (
        <div className="mt-2" style={{ maxWidth: 520 }}>
          <CardPicker selected={value} disabled={deadSet} onToggle={toggle} />
        </div>
      )}
    </div>
  );
}
