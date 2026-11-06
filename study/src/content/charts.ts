// Simplified, pure-strategy study charts for 100bb 6-max. They approximate the
// shape of solver solutions; real solutions mix many of the edge hands.
import { parseRange, type Range } from '../engine/ranges';

export type ActionKind = 'raise' | 'call';

export interface ChartAction {
  id: string;
  label: string;
  kind: ActionKind;
  range: string;
}

export interface Chart {
  id: string;
  title: string;
  short: string;
  group: 'Open (RFI)' | 'Big blind defense' | 'Facing a 3-bet';
  scenario: string;
  actions: ChartAction[];
  /** Hands outside this chart's range were never in the spot (e.g. hands that did not open). */
  within?: string;
  note: string;
}

export const ACTION_COLOR: Record<ActionKind, string> = {
  raise: 'var(--act-raise)',
  call: 'var(--act-call)',
};

export const CHARTS: Chart[] = [
  {
    id: 'rfi-utg',
    title: 'UTG open',
    short: 'UTG',
    group: 'Open (RFI)',
    scenario: 'You are first to act (UTG). 100bb deep, 6-max.',
    actions: [{ id: 'raise', label: 'Raise 2.5bb', kind: 'raise', range: '44+, A2s+, KTs+, QTs+, JTs, T9s, 98s, 87s, ATo+, KJo+' }],
    note: 'Tight and strong: pairs 44+, every suited ace, suited broadways and a few suited connectors, and only the best offsuit broadways.',
  },
  {
    id: 'rfi-hj',
    title: 'HJ open',
    short: 'HJ',
    group: 'Open (RFI)',
    scenario: 'Folded to you in the hijack. 100bb deep, 6-max.',
    actions: [{ id: 'raise', label: 'Raise 2.5bb', kind: 'raise', range: '33+, A2s+, K9s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, ATo+, KTo+, QJo' }],
    note: 'One seat later: add 33, more suited kings and queens, more suited connectors, and KTo/QJo.',
  },
  {
    id: 'rfi-co',
    title: 'CO open',
    short: 'CO',
    group: 'Open (RFI)',
    scenario: 'Folded to you in the cutoff. 100bb deep, 6-max.',
    actions: [{ id: 'raise', label: 'Raise 2.5bb', kind: 'raise', range: '22+, A2s+, K7s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, A9o+, KTo+, QTo+, JTo' }],
    note: 'Every pair, suited one-gappers, and offsuit broadways down to JTo. Only the button and blinds are left behind.',
  },
  {
    id: 'rfi-btn',
    title: 'BTN open',
    short: 'BTN',
    group: 'Open (RFI)',
    scenario: 'Folded to you on the button. 100bb deep, 6-max.',
    actions: [{ id: 'raise', label: 'Raise 2.5bb', kind: 'raise', range: '22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 53s+, 43s, A2o+, K8o+, Q9o+, J9o+, T9o' }],
    note: 'The widest open: any pair, any suited ace or king, most suited hands, every ace, and offsuit hands down to K8o, Q9o, J9o and T9o.',
  },
  {
    id: 'rfi-sb',
    title: 'SB open',
    short: 'SB',
    group: 'Open (RFI)',
    scenario: 'Folded to you in the small blind; only the big blind is left. 100bb deep.',
    actions: [{ id: 'raise', label: 'Raise 3bb', kind: 'raise', range: '22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 96s+, 86s+, 75s+, 64s+, 54s, A2o+, K9o+, Q9o+, J9o+, T9o' }],
    note: 'A raise-or-fold simplification at 3bb. Full solutions also limp many hands; this chart keeps one action to learn the structure.',
  },
  {
    id: 'bb-vs-btn',
    title: 'BB vs. BTN open',
    short: 'BB v BTN',
    group: 'Big blind defense',
    scenario: 'The button opens to 2.5bb, the small blind folds. You are in the big blind.',
    actions: [
      { id: '3bet', label: '3-bet to 11bb', kind: 'raise', range: '99+, ATs+, KJs+, AJo+, A5s-A2s, 76s, 65s' },
      {
        id: 'call',
        label: 'Call',
        kind: 'call',
        range: '88-22, A9s-A6s, KTs-K2s, Q2s+, J4s+, T5s+, 95s+, 85s+, 75s-74s, 64s, 53s+, 43s, ATo-A2o, KQo-K7o, QJo-Q8o, JTo-J8o, T8o+, 97o+, 87o, 76o',
      },
    ],
    note: 'You close the action at a good price, so you defend wide: value 3-bets plus suited wheel aces and connectors as bluffs, and calls with most suited hands and connected offsuit hands.',
  },
  {
    id: 'bb-vs-utg',
    title: 'BB vs. UTG open',
    short: 'BB v UTG',
    group: 'Big blind defense',
    scenario: 'UTG opens to 2.5bb and everyone folds to you in the big blind.',
    actions: [
      { id: '3bet', label: '3-bet to 11bb', kind: 'raise', range: 'JJ+, AQs+, AKo, A5s-A4s' },
      {
        id: 'call',
        label: 'Call',
        kind: 'call',
        range: 'TT-22, AJs-A6s, A3s-A2s, KQs-K9s, QJs-Q9s, JTs-J9s, T9s-T8s, 98s-97s, 87s-86s, 76s-75s, 65s-64s, 54s, AQo-ATo, KQo-KJo, QJo',
      },
    ],
    note: 'UTG’s range is strong, so defend much tighter: 3-bet mostly value, and call hands that play well and avoid domination.',
  },
  {
    id: 'btn-vs-3bet',
    title: 'BTN open vs. BB 3-bet',
    short: 'BTN v 3bet',
    group: 'Facing a 3-bet',
    scenario: 'You opened the button to 2.5bb and the big blind 3-bets to 11bb.',
    within: 'rfi-btn',
    actions: [
      { id: '4bet', label: '4-bet to 24bb', kind: 'raise', range: 'QQ+, AKs, AKo, A5s-A4s' },
      {
        id: 'call',
        label: 'Call',
        kind: 'call',
        range: 'JJ-55, AQs-A6s, KQs-K9s, QJs-Q9s, JTs-J9s, T9s-T8s, 98s-97s, 87s, 76s, 65s, 54s, AQo-ATo, KQo-KJo',
      },
    ],
    note: 'Continue with about 42% of your opening range: 4-bet QQ+ and AK plus A5s–A4s as blocker bluffs, and call pairs and suited hands in position.',
  },
  {
    id: 'utg-vs-3bet',
    title: 'UTG open vs. BTN 3-bet',
    short: 'UTG v 3bet',
    group: 'Facing a 3-bet',
    scenario: 'You opened UTG to 2.5bb and the button 3-bets to 7.5bb. Everyone else folds.',
    within: 'rfi-utg',
    actions: [
      { id: '4bet', label: '4-bet to 22bb', kind: 'raise', range: 'QQ+, AKs, AKo, A5s' },
      { id: 'call', label: 'Call', kind: 'call', range: 'JJ-77, AQs-ATs, KQs-KTs, QJs, JTs, T9s, 98s, AQo' },
    ],
    note: 'Out of position against an in-position 3-bet: 4-bet value plus A5s, and call strong pairs and suited broadways that keep their value.',
  },
];

const BY_ID = new Map(CHARTS.map((c) => [c.id, c]));
export const chartById = (id: string) => BY_ID.get(id);

const rangeCache = new Map<string, Range>();
function cachedRange(text: string): Range {
  let r = rangeCache.get(text);
  if (!r) {
    r = parseRange(text).range;
    rangeCache.set(text, r);
  }
  return r;
}

/** Each action's range, with earlier actions taking precedence for duplicates. */
export function chartLayers(chart: Chart): { action: ChartAction; range: Range }[] {
  const seen = new Set<string>();
  return chart.actions.map((a) => {
    const r: Range = {};
    for (const [k, w] of Object.entries(cachedRange(a.range))) {
      if (!seen.has(k)) {
        r[k] = w;
        seen.add(k);
      }
    }
    return { action: a, range: r };
  });
}

/** The action id for a hand class, or 'fold'. */
export function chartAction(chart: Chart, key: string): string {
  for (const { action, range } of chartLayers(chart)) if ((range[key] ?? 0) > 0) return action.id;
  return 'fold';
}

/** Union of all non-fold actions. */
export function chartRange(chart: Chart): Range {
  const r: Range = {};
  for (const { range } of chartLayers(chart)) Object.assign(r, range);
  return r;
}

/** "rfi-btn" → whole chart range; "bb-vs-btn:call" → one action's range. */
export function resolveRangeRef(ref: string): Range {
  const [id, action] = ref.split(':');
  const chart = chartById(id);
  if (!chart) return cachedRange(ref);
  if (!action) return chartRange(chart);
  return chartLayers(chart).find((l) => l.action.id === action)?.range ?? {};
}

export function rangeRefLabel(ref: string): string {
  const [id, action] = ref.split(':');
  const chart = chartById(id);
  if (!chart) return ref;
  if (!action) return chart.title;
  const a = chart.actions.find((x) => x.id === action);
  return `${chart.title} · ${a?.label ?? action}`;
}
