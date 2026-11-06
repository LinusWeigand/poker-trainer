import {
  BookA,
  BookOpen,
  Calculator,
  ChartLine,
  Cpu,
  Grid3x3,
  House,
  Layers,
  LayoutGrid,
  Library,
  Map as MapIcon,
  NotebookPen,
  Percent,
  Puzzle,
  Settings,
  Target,
  Timer,
  Wallet,
  type LucideIcon,
} from './icons';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
  key?: string;
}

export const NAV: { section: string | null; items: NavItem[] }[] = [
  {
    section: null,
    items: [
      { to: '/', label: 'Home', icon: House, hint: 'Dashboard, today’s plan, streak', key: 'h' },
      { to: '/plan', label: 'Plan', icon: MapIcon, hint: '30-week roadmap', key: 'p' },
    ],
  },
  {
    section: 'Learn',
    items: [
      { to: '/learn', label: 'Lessons', icon: BookOpen, hint: '42 lessons in 7 modules', key: 'l' },
      { to: '/practice', label: 'Drills & exams', icon: Target, hint: 'Procedural drills and checkpoint exams', key: 'd' },
      { to: '/review', label: 'Flashcards', icon: Layers, hint: 'Spaced repetition', key: 'r' },
    ],
  },
  {
    section: 'Tools',
    items: [
      { to: '/tools/equity', label: 'Equity calculator', icon: Percent, hint: 'Hands and ranges, up to 4 players', key: 'e' },
      { to: '/tools/ranges', label: 'Range explorer', icon: Grid3x3, hint: 'Build ranges, hand classes on any board' },
      { to: '/tools/charts', label: 'Preflop charts', icon: LayoutGrid, hint: 'Study charts for 100bb 6-max' },
      { to: '/tools/calculators', label: 'Calculators', icon: Calculator, hint: 'Pot odds, MDF, implied odds, SPR, sizing' },
      { to: '/tools/variance', label: 'Variance lab', icon: ChartLine, hint: 'Win-rate noise and sample size' },
      { to: '/tools/bankroll', label: 'Bankroll & Kelly', icon: Wallet, hint: 'Kelly criterion and risk of ruin' },
      { to: '/tools/toy-games', label: 'Toy games', icon: Puzzle, hint: 'Clairvoyant and AKQ games' },
      { to: '/tools/cfr', label: 'CFR lab', icon: Cpu, hint: 'Regret matching, Kuhn CFR, node-locking' },
    ],
  },
  {
    section: 'Journal',
    items: [
      { to: '/journal', label: 'Hand journal', icon: NotebookPen, hint: 'Log and review hands', key: 'j' },
      { to: '/sessions', label: 'Sessions', icon: Timer, hint: 'Study time and results', key: 's' },
    ],
  },
  {
    section: 'Reference',
    items: [
      { to: '/library', label: 'Library', icon: Library, hint: 'Books, papers, solver project' },
      { to: '/glossary', label: 'Glossary', icon: BookA, hint: 'Every term, with links', key: 'g' },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { to: '/settings', label: 'Settings', icon: Settings, hint: 'Dates, goals, backup' };

export const ALL_NAV: NavItem[] = [...NAV.flatMap((s) => s.items), SETTINGS_ITEM];
