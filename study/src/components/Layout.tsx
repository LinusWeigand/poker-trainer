import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Keyboard, Menu, Search, Spade, Square, Timer } from './icons';
import { NAV, SETTINGS_ITEM, ALL_NAV } from './nav';
import { CommandPalette } from './CommandPalette';
import { IconButton, Kbd, Modal, Toaster, cx } from './ui';
import { CATEGORIES, useStore, type Category } from '../store/store';
import { cardQueue } from '../lib/progress';
import { useKeydown, useNow } from '../lib/hooks';
import { clock } from '../lib/format';
import { lessonById } from '../content/lessons';
import { drillById } from '../drills';
import { examById } from '../content/exams';

function useCrumbs(): { label: string; to?: string }[] {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return [{ label: 'Home' }];
  if (parts[0] === 'learn' && parts[1]) return [{ label: 'Lessons', to: '/learn' }, { label: lessonById(parts[1])?.title ?? 'Lesson' }];
  if (parts[0] === 'practice' && parts[1]) return [{ label: 'Drills & exams', to: '/practice' }, { label: drillById(parts[1])?.title ?? 'Drill' }];
  if (parts[0] === 'exam') return [{ label: 'Drills & exams', to: '/practice' }, { label: examById(parts[1] ?? '')?.title ?? 'Exam' }];
  const item = ALL_NAV.find((n) => n.to === pathname);
  if (parts[0] === 'tools') return [{ label: 'Tools' }, { label: item?.label ?? 'Tool' }];
  return [{ label: item?.label ?? 'Page' }];
}

function TimerChip() {
  const timer = useStore((s) => s.timer);
  const stopTimer = useStore((s) => s.stopTimer);
  const startTimer = useStore((s) => s.startTimer);
  const now = useNow(1000);
  const [pick, setPick] = useState(false);
  if (timer) {
    const cat = CATEGORIES.find((c) => c.id === timer.category)!;
    return (
      <div className="timer-chip">
        <span className="pulse" />
        <span className="muted">{cat.label}</span>
        <span className="tabular ink medium" style={{ marginLeft: 'auto' }}>
          {clock(now - timer.start)}
        </span>
        <IconButton icon={Square} label="Stop and log session" onClick={() => stopTimer(true)} />
      </div>
    );
  }
  if (pick) {
    return (
      <div className="timer-pick">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className="tag"
            onClick={() => {
              startTimer(c.id as Category);
              setPick(false);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <button type="button" className="nav-item" onClick={() => setPick(true)}>
      <Timer />
      Start a study timer
    </button>
  );
}

function Sidebar({ open, onClose, onSearch }: { open: boolean; onClose: () => void; onSearch: () => void }) {
  const location = useLocation();
  const due = useStore((s) => {
    const q = cardQueue(s, null);
    return q.due.length + q.fresh.length;
  });
  return (
    <aside className={cx('sidebar', open && 'open')} aria-label="Main navigation">
      <Link to="/" className="brand" onClick={onClose}>
        <span className="brand-mark">
          <Spade />
        </span>
        <span className="brand-name">Equilibrium</span>
        <span className="brand-sub">poker study</span>
      </Link>
      <button type="button" className="search-btn" onClick={onSearch}>
        <Search />
        Search
        <Kbd>⌘K</Kbd>
      </button>
      <nav className="sidebar-scroll">
        {NAV.map((sec, i) => (
          <div key={i} className={sec.section ? 'nav-section' : undefined}>
            {sec.section && <div className="nav-section-title">{sec.section}</div>}
            {sec.items.map((it) => {
              const Icon = it.icon;
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === '/'}
                  className={({ isActive }) => cx('nav-item', (isActive || (it.to === '/practice' && location.pathname.startsWith('/exam'))) && 'active')}
                  onClick={onClose}
                >
                  <Icon />
                  {it.label}
                  {it.to === '/review' && due > 0 && <span className="nav-count hot">{due}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <TimerChip />
        <NavLink to={SETTINGS_ITEM.to} className={({ isActive }) => cx('nav-item', isActive && 'active')} onClick={onClose}>
          <SETTINGS_ITEM.icon />
          {SETTINGS_ITEM.label}
        </NavLink>
      </div>
    </aside>
  );
}

const SHORTCUTS: [string, string][] = [
  ['⌘K or /', 'Search everything'],
  ['G then H', 'Home'],
  ['G then P', 'Plan'],
  ['G then L', 'Lessons'],
  ['G then D', 'Drills & exams'],
  ['G then R', 'Flashcards'],
  ['G then E', 'Equity calculator'],
  ['G then J', 'Hand journal'],
  ['G then S', 'Sessions'],
  ['G then G', 'Glossary'],
  ['Enter', 'Submit / next question (drills)'],
  ['1–4 or A–D', 'Pick an answer (drills)'],
  ['Space', 'Flip a flashcard'],
  ['1 2 3 4', 'Grade a flashcard: again, hard, good, easy'],
  ['?', 'This help'],
];

export function Layout({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const crumbs = useCrumbs();
  const navigate = useNavigate();
  const location = useLocation();
  const pageRef = useRef<HTMLDivElement>(null);
  const gPressed = useRef(0);
  const fourColor = useStore((s) => s.settings.fourColor);

  useEffect(() => {
    pageRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  useKeydown(
    (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    },
    true,
    true,
  );

  useKeydown((e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || paletteOpen) return;
    if (e.key === '/') {
      e.preventDefault();
      setPaletteOpen(true);
      return;
    }
    if (e.key === '?') {
      setHelpOpen(true);
      return;
    }
    const k = e.key.toLowerCase();
    if (Date.now() - gPressed.current < 900) {
      const item = ALL_NAV.find((n) => n.key === k);
      gPressed.current = 0;
      if (item) navigate(item.to);
      return;
    }
    if (k === 'g') gPressed.current = Date.now();
  });

  return (
    <div className={cx('app', !fourColor && 'mono-deck')}>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} onSearch={() => setPaletteOpen(true)} />
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
      <main className="main">
        <header className="topbar">
          <IconButton icon={Menu} label="Open navigation" className="menu-btn" onClick={() => setNavOpen(true)} />
          <nav className="crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i} className="row" style={{ gap: 6, minWidth: 0 }}>
                {i > 0 && <ChevronRight />}
                {c.to ? <Link to={c.to}>{c.label}</Link> : <span className={i === crumbs.length - 1 ? 'cur' : undefined}>{c.label}</span>}
              </span>
            ))}
          </nav>
          <div className="topbar-actions">
            <IconButton icon={Search} label="Search (⌘K)" onClick={() => setPaletteOpen(true)} />
            <IconButton icon={Keyboard} label="Keyboard shortcuts (?)" onClick={() => setHelpOpen(true)} />
          </div>
        </header>
        <div className="page" ref={pageRef}>
          {children}
        </div>
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Keyboard shortcuts">
        <table className="table">
          <tbody>
            {SHORTCUTS.map(([k, v]) => (
              <tr key={k}>
                <td style={{ width: 160 }}>
                  <span className="kbd">{k}</span>
                </td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
      <Toaster />
    </div>
  );
}
