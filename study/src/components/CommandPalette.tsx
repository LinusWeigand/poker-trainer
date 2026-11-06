import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookA, BookOpen, CornerDownLeft, GraduationCap, NotebookPen, Play, Search, Target, Timer, type LucideIcon } from './icons';
import { ALL_NAV } from './nav';
import { LESSONS } from '../content/lessons';
import { moduleById } from '../content/modules';
import { GLOSSARY } from '../content/glossary';
import { EXAMS } from '../content/exams';
import { DRILLS } from '../drills';
import { CATEGORIES, useStore } from '../store/store';
import { cx, toast } from './ui';

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
  keywords?: string;
}

function score(item: Item, q: string): number {
  if (!q) return 1;
  const label = item.label.toLowerCase();
  const hay = `${label} ${item.hint ?? ''} ${item.keywords ?? ''}`.toLowerCase();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  let s = 0;
  for (const w of words) {
    if (label.startsWith(w)) s += 6;
    else if (label.split(/[\s:·–-]+/).some((t) => t.startsWith(w))) s += 4;
    else if (label.includes(w)) s += 2;
    else if (hay.includes(w)) s += 1;
    else return 0;
  }
  return s;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const startTimer = useStore((s) => s.startTimer);

  const items = useMemo<Item[]>(() => {
    const go = (to: string) => () => navigate(to);
    return [
      ...ALL_NAV.map((n) => ({ id: `nav${n.to}`, group: 'Go to', label: n.label, hint: n.hint, icon: n.icon, run: go(n.to) })),
      { id: 'act-hand', group: 'Actions', label: 'Log a hand', icon: NotebookPen, run: go('/journal?new=1') },
      { id: 'act-review', group: 'Actions', label: 'Start flashcard review', icon: Play, run: go('/review?start=1') },
      ...CATEGORIES.map((c) => ({
        id: `act-timer-${c.id}`,
        group: 'Actions',
        label: `Start ${c.label.toLowerCase()} timer`,
        icon: Timer,
        run: () => {
          startTimer(c.id);
          toast(`${c.label} timer started`);
        },
      })),
      ...LESSONS.map((l) => ({
        id: `lesson-${l.id}`,
        group: 'Lessons',
        label: l.title,
        hint: moduleById(l.module)?.title,
        icon: BookOpen,
        keywords: l.summary,
        run: go(`/learn/${l.id}`),
      })),
      ...DRILLS.map((d) => ({ id: `drill-${d.id}`, group: 'Drills', label: d.title, hint: d.category, icon: Target, keywords: d.description, run: go(`/practice/${d.id}`) })),
      ...EXAMS.map((e) => ({ id: `exam-${e.id}`, group: 'Exams', label: e.title, icon: GraduationCap, run: go(`/exam/${e.id}`) })),
      ...GLOSSARY.map((t) => ({
        id: `term-${t.term}`,
        group: 'Glossary',
        label: t.term,
        hint: t.def,
        icon: BookA,
        keywords: (t.aliases ?? []).join(' '),
        run: go(`/glossary?q=${encodeURIComponent(t.term)}`),
      })),
    ];
  }, [navigate, startTimer]);

  const results = useMemo(() => {
    const scored = items.map((it) => ({ it, s: score(it, q.trim()) })).filter((x) => x.s > 0);
    if (!q.trim()) return scored.filter((x) => x.it.group === 'Go to' || x.it.group === 'Actions').map((x) => x.it);
    return scored
      .sort((a, b) => b.s - a.s)
      .slice(0, 40)
      .map((x) => x.it);
  }, [items, q]);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);
  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  if (!open) return null;

  const run = (it: Item | undefined) => {
    if (!it) return;
    onClose();
    it.run();
  };

  const groups: { group: string; list: { it: Item; idx: number }[] }[] = [];
  results.forEach((it, idx) => {
    const g = groups.find((x) => x.group === it.group);
    if (g) g.list.push({ it, idx });
    else groups.push({ group: it.group, list: [{ it, idx }] });
  });

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command menu">
        <div className="palette-input">
          <Search />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lessons, drills, tools, glossary…"
            aria-label="Search"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((s) => Math.min(results.length - 1, s + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                run(results[sel]);
              } else if (e.key === 'Escape') onClose();
            }}
          />
        </div>
        <div className="palette-list" ref={listRef} role="listbox">
          {results.length === 0 && <div className="empty" style={{ padding: 32 }}>No results for “{q}”.</div>}
          {groups.map((g) => (
            <div key={g.group}>
              <div className="palette-group">{g.group}</div>
              {g.list.map(({ it, idx }) => {
                const Icon = it.icon;
                return (
                  <div key={it.id} data-idx={idx} role="option" aria-selected={idx === sel} className={cx('palette-item', idx === sel && 'on')} onMouseMove={() => setSel(idx)} onClick={() => run(it)}>
                    <Icon />
                    <span>{it.label}</span>
                    {it.hint && <span className="hint-r">{it.hint}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="palette-foot">
          <span>
            <span className="kbd">↑</span>
            <span className="kbd">↓</span> navigate
          </span>
          <span>
            <span className="kbd">
              <CornerDownLeft size={10} />
            </span>{' '}
            open
          </span>
          <span>
            <span className="kbd">esc</span> close
          </span>
        </div>
      </div>
    </div>
  );
}
