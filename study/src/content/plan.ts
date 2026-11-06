export type TaskKind = 'lesson' | 'drill' | 'exam' | 'cards' | 'read' | 'play' | 'review' | 'project' | 'tool';

export interface PlanTask {
  id: string;
  kind: TaskKind;
  label?: string;
  ref?: string;
  /** drill: sessions at ≥ 80%; cards: days with reviews; exam: score */
  target?: number;
  to?: string;
}

export interface PlanWeek {
  week: number;
  phase: number;
  title: string;
  focus: string;
  tasks: PlanTask[];
  milestone?: string;
}

let n = 0;
const id = () => `t${++n}`;
const L = (ref: string): PlanTask => ({ id: `lesson:${ref}`, kind: 'lesson', ref });
const D = (ref: string, target = 3): PlanTask => ({ id: `drill:${ref}:${target}`, kind: 'drill', ref, target });
const E = (ref: string): PlanTask => ({ id: `exam:${ref}`, kind: 'exam', ref, target: 0.8 });
const C = (days = 5): PlanTask => ({ id: `cards:${days}`, kind: 'cards', target: days });
const R = (label: string): PlanTask => ({ id: id(), kind: 'read', label, to: '/library' });
const P = (label: string): PlanTask => ({ id: id(), kind: 'play', label, to: '/sessions' });
const V = (label: string): PlanTask => ({ id: id(), kind: 'review', label, to: '/journal' });
const J = (label: string): PlanTask => ({ id: id(), kind: 'project', label, to: '/library' });
const T = (label: string, to: string): PlanTask => ({ id: id(), kind: 'tool', label, to });

export const PLAN: PlanWeek[] = [
  {
    week: 1,
    phase: 1,
    title: 'Expected value & pot odds',
    focus: 'Build the EV habit and memorise the five pot-odds numbers.',
    tasks: [L('ev'), L('pot-odds'), D('pot-odds'), C(4), R('Start Play Optimal Poker (about 40 pages)'), P('Set up a play-money or legal micro-stakes account and play 500 hands'), V('Log 3 interesting hands in the journal')],
  },
  {
    week: 2,
    phase: 1,
    title: 'Outs & equity',
    focus: 'Count outs exactly, convert them to equity, and feel how position changes realization.',
    tasks: [L('outs'), L('equity'), D('outs'), D('outs-equity', 2), C(5), T('Run 10 matchups in the equity calculator', '/tools/equity'), P('Play 1,000 hands'), V('Review 3 hands: were your calls priced correctly?')],
  },
  {
    week: 3,
    phase: 1,
    title: 'Combinatorics',
    focus: 'Count combos with card removal until it is automatic.',
    tasks: [L('combos'), D('combos'), D('equity-est', 2), C(5), T('Build three ranges in the range explorer and count their combos', '/tools/ranges'), P('Play 1,000 hands'), V('Review 3 hands, counting villain’s value vs. bluff combos')],
  },
  {
    week: 4,
    phase: 1,
    title: 'Bluffing math & position',
    focus: 'Alpha, fold equity, MDF, and why seats matter.',
    tasks: [L('fold-equity'), L('mdf'), L('position'), D('ratios'), D('ev', 2), C(5), P('Play 1,500 hands'), V('Review 3 bluffs: did they need more folds than you got?')],
  },
  {
    week: 5,
    phase: 1,
    title: 'Implied odds & math checkpoint',
    focus: 'Finish Phase 1 and prove it on the checkpoint exam.',
    tasks: [L('implied-odds'), E('math'), D('pot-odds', 2), D('combos', 2), C(5), R('Finish Play Optimal Poker part one'), P('Play 1,500 hands')],
    milestone: 'Phase 1 complete: fluent poker math.',
  },
  {
    week: 6,
    phase: 2,
    title: 'Opening ranges',
    focus: 'Learn the opening charts from every seat and the reasons behind their shape.',
    tasks: [L('rfi'), D('preflop', 4), C(5), T('Study all five opening charts', '/tools/charts'), P('Play 2,000 hands with strict opening discipline'), V('Tag any preflop range errors in the journal')],
  },
  {
    week: 7,
    phase: 2,
    title: '3-betting',
    focus: 'Linear vs. polarized 3-bets, blocker bluffs and sizing.',
    tasks: [L('3bet'), D('preflop', 3), C(5), R('Start Modern Poker Theory: preflop sections'), P('Play 2,000 hands'), V('Review 3 hands where you faced or made a 3-bet')],
  },
  {
    week: 8,
    phase: 2,
    title: 'Big blind defense & equilibrium',
    focus: 'Defend the big blind correctly, and start the theory of equilibrium.',
    tasks: [L('bb-defense'), L('nash'), D('preflop', 3), C(5), P('Play 2,000 hands'), V('Review 3 big blind defends')],
  },
  {
    week: 9,
    phase: 2,
    title: '3-bet pots & preflop checkpoint',
    focus: 'Facing 3-bets and 4-bets, SPR in 3-bet pots, and the Phase 2 exam.',
    tasks: [L('vs-3bet'), E('preflop'), D('preflop', 3), C(5), P('Play 2,000 hands')],
    milestone: 'Phase 2 complete: solid preflop from every seat.',
  },
  {
    week: 10,
    phase: 3,
    title: 'Indifference & regret',
    focus: 'The indifference principle, and the first solver algorithm.',
    tasks: [L('indifference'), L('regret-matching'), D('bluffcatch'), C(5), J('Solver project: implement RPS regret matching in Python'), P('Play 2,000 hands')],
  },
  {
    week: 11,
    phase: 3,
    title: 'Toy games',
    focus: 'Solve the clairvoyant and AKQ games yourself, then check with the widgets.',
    tasks: [L('clairvoyant'), L('akq'), C(5), T('Explore exploit mode in the toy games lab', '/tools/toy-games'), R('The Mathematics of Poker: the toy-game material'), J('Solver project: solve the AKQ game by hand'), P('Play 2,000 hands')],
  },
  {
    week: 12,
    phase: 3,
    title: 'Polarization & CFR',
    focus: 'Range shapes and bet sizes; counterfactual regret minimization.',
    tasks: [L('polarization'), L('cfr'), D('ratios', 2), C(5), J('Solver project: implement vanilla CFR for Kuhn poker'), P('Play 2,000 hands')],
  },
  {
    week: 13,
    phase: 3,
    title: 'Range & nut advantage',
    focus: 'Who has more equity, who has more nuts, and how that drives strategy.',
    tasks: [L('advantage'), L('kuhn'), C(5), T('Compare BTN vs. BB on 6 different flops in the range explorer', '/tools/ranges'), J('Solver project: add exploitability via best response to your Kuhn CFR'), P('Play 2,000 hands')],
  },
  {
    week: 14,
    phase: 3,
    title: 'Board texture',
    focus: 'Static vs. dynamic boards, nuts, and turn card classes.',
    tasks: [L('texture'), D('nuts', 3), C(5), P('Play 2,000 hands'), V('Review 4 hands, classifying flop texture and turn cards')],
  },
  {
    week: 15,
    phase: 3,
    title: 'C-betting & Bayesian hand reading',
    focus: 'Continuation bets by texture, and the start of Phase 4: ranges as priors.',
    tasks: [L('cbet'), L('bayes'), D('bayes'), C(5), P('Play 2,000 hands'), V('Review 4 c-bet decisions')],
  },
  {
    week: 16,
    phase: 3,
    title: 'Bet sizing',
    focus: 'Sizes as range choices, geometric sizing and overbets.',
    tasks: [L('sizing'), L('scaling'), C(5), T('Compute geometric sizes for 5 spots in the calculators', '/tools/calculators'), J('Solver project: start a Leduc hold’em CFR'), P('Play 2,000 hands')],
  },
  {
    week: 17,
    phase: 3,
    title: 'Blockers',
    focus: 'Use card removal as a tie-breaker for bluffs and bluff-catchers.',
    tasks: [L('blockers'), D('bluffcatch', 3), D('combos', 2), C(5), P('Play 2,000 hands'), V('Review 3 river decisions with blocker reasoning')],
  },
  {
    week: 18,
    phase: 3,
    title: 'SPR, solver workflow & theory checkpoint',
    focus: 'Commitment planning, how to study with a solver, and the Phase 3 exam.',
    tasks: [L('spr'), L('solver-study'), E('theory'), C(5), J('Use your solver on one BTN vs. BB spot: predict, solve, compare'), P('Play 2,000 hands')],
    milestone: 'Phase 3 complete: equilibrium thinking on every street.',
  },
  {
    week: 19,
    phase: 4,
    title: 'Population exploits',
    focus: 'Identify leaks, estimate them, and adjust with discipline.',
    tasks: [L('exploits'), D('bluffcatch', 2), C(5), P('Play 2,500 hands, noting one exploit per session'), V('Tag exploit opportunities in 4 hands')],
  },
  {
    week: 20,
    phase: 4,
    title: 'Node-locking',
    focus: 'Turn reads into best responses, and learn what they cost when wrong.',
    tasks: [L('node-locking'), C(5), T('Lock P2 in the Kuhn node-locking lab and find the best responses', '/tools/cfr'), J('Solver project: Leduc exploitability via best response'), P('Play 2,500 hands')],
  },
  {
    week: 21,
    phase: 4,
    title: 'Turn play',
    focus: 'Barrel or check, delayed c-bets, and turn card classes.',
    tasks: [L('turn'), C(5), J('Solver project: a no-limit river subgame with vector-form CFR'), P('Play 2,500 hands'), V('Review 4 turn decisions')],
  },
  {
    week: 22,
    phase: 4,
    title: 'River play & variance',
    focus: 'Value, bluffs and bluff-catchers on the river; start Phase 5 with variance.',
    tasks: [L('river'), L('variance'), D('bluffcatch', 3), C(5), T('Simulate your own win rate in the variance lab', '/tools/variance'), P('Play 2,500 hands')],
  },
  {
    week: 23,
    phase: 4,
    title: 'Hand-reading reps',
    focus: 'No new theory: deliberate practice on ranges and river decisions.',
    tasks: [D('bayes', 3), D('bluffcatch', 3), D('equity-est', 2), C(5), V('Deep review of 10 hands with full range reconstruction'), P('Play 2,500 hands')],
  },
  {
    week: 24,
    phase: 4,
    title: 'Exploitation checkpoint',
    focus: 'The Phase 4 exam and a cleanup week.',
    tasks: [E('exploit'), E('solver'), C(5), J('Solver project: add a turn chance node; compare with your C++ engine'), P('Play 2,500 hands')],
    milestone: 'Phase 4 complete: reads, exploits and big-pot decisions.',
  },
  {
    week: 25,
    phase: 5,
    title: 'Bankroll & Kelly',
    focus: 'Edge over variance; sizing your risk in poker and in trading.',
    tasks: [L('kelly'), D('quant', 3), C(5), T('Compare full and half Kelly in the bankroll lab', '/tools/bankroll'), P('Play 2,500 hands')],
  },
  {
    week: 26,
    phase: 5,
    title: 'Mental game',
    focus: 'Tilt, resulting, and routines that protect decision quality.',
    tasks: [L('mental'), C(5), R('The Mental Game of Poker (about 60 pages)'), P('Play 2,500 hands using the warm-up and cool-down routine'), V('Note your tilt triggers after each session')],
  },
  {
    week: 27,
    phase: 5,
    title: 'Hand review system & adverse selection',
    focus: 'Make your review process systematic, and start the trading lens.',
    tasks: [L('hand-review'), L('adverse-selection'), C(5), V('Review 6 hands with the six-step loop'), P('Play 2,500 hands')],
  },
  {
    week: 28,
    phase: 5,
    title: 'Information & distributions',
    focus: 'Sizing as information and thinking in distributions.',
    tasks: [L('sizing-info'), L('distributions'), D('quant', 3), C(5), P('Play 2,500 hands')],
  },
  {
    week: 29,
    phase: 5,
    title: 'Talking through hands',
    focus: 'Articulate decisions out loud, SIG-style.',
    tasks: [L('talk-through'), E('trading'), E('integration'), C(5), V('Write up 3 hands with the full discussion template'), P('Play 2,500 hands')],
  },
  {
    week: 30,
    phase: 5,
    title: 'Final review',
    focus: 'The final exam across all modules, and your solver write-up.',
    tasks: [E('final'), C(6), J('Write a one-page summary of your solver project'), V('Explain your 3 best hand write-ups aloud in under 2 minutes each'), P('Play 2,500 hands')],
    milestone: 'Ready for Susquehanna.',
  },
];

export const TASK_LABEL: Record<TaskKind, string> = {
  lesson: 'Lesson',
  drill: 'Drill',
  exam: 'Exam',
  cards: 'Flashcards',
  read: 'Reading',
  play: 'Play',
  review: 'Review',
  project: 'Project',
  tool: 'Tool',
};
