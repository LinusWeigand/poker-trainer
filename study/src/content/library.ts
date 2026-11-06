export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  phase: string;
  why: string;
}

export interface Paper {
  id: string;
  title: string;
  authors: string;
  venue: string;
  year: number;
  why: string;
}

export interface Software {
  name: string;
  kind: string;
  why: string;
}

export interface Milestone {
  id: string;
  title: string;
  detail: string;
}

export const BOOKS: Book[] = [
  { id: 'pop', title: 'Play Optimal Poker', author: 'Andrew Brokos', year: 2019, phase: 'Phases 1–3', why: 'The most accessible introduction to game theory in poker. Read it first.' },
  { id: 'mpt', title: 'Modern Poker Theory', author: 'Michael Acevedo', year: 2019, phase: 'Phases 2–3', why: 'A thorough, solver-era treatment of GTO preflop and postflop strategy.' },
  { id: 'mop', title: 'The Mathematics of Poker', author: 'Bill Chen & Jerrod Ankenman', year: 2006, phase: 'Phase 3', why: 'The source of the toy games. Dense and mathematical, which suits a quant.' },
  { id: 'anlhe', title: 'Applications of No-Limit Hold’em', author: 'Matthew Janda', year: 2013, phase: 'Phase 4', why: 'Range construction and balance applied to real no-limit spots.' },
  { id: 'mgp', title: 'The Mental Game of Poker', author: 'Jared Tendler', year: 2011, phase: 'Phase 5', why: 'Tilt, confidence and the inchworm model of learning.' },
  { id: 'tib', title: 'Thinking in Bets', author: 'Annie Duke', year: 2018, phase: 'Phase 5', why: 'Decision quality vs. outcomes; resulting; calibrated beliefs.' },
];

export const PAPERS: Paper[] = [
  { id: 'neller', title: 'An Introduction to Counterfactual Regret Minimization', authors: 'T. Neller & M. Lanctot', venue: 'Tutorial', year: 2013, why: 'Start here for the solver track; includes Kuhn poker code.' },
  { id: 'zinkevich', title: 'Regret Minimization in Games with Incomplete Information', authors: 'M. Zinkevich, M. Johanson, M. Bowling, C. Piccione', venue: 'NeurIPS', year: 2007, why: 'The original CFR paper.' },
  { id: 'cfrplus', title: 'Solving Large Imperfect Information Games Using CFR+', authors: 'O. Tammelin', venue: 'arXiv', year: 2014, why: 'Regret-matching+ and linear averaging.' },
  { id: 'cepheus', title: 'Heads-up Limit Hold’em Poker Is Solved', authors: 'M. Bowling, N. Burch, M. Johanson, O. Tammelin', venue: 'Science', year: 2015, why: 'CFR+ at scale: Cepheus.' },
  { id: 'deepstack', title: 'DeepStack: Expert-Level Artificial Intelligence in Heads-Up No-Limit Poker', authors: 'M. Moravčík et al.', venue: 'Science', year: 2017, why: 'Depth-limited solving with learned value functions.' },
  { id: 'libratus', title: 'Superhuman AI for Heads-Up No-Limit Poker: Libratus Beats Top Professionals', authors: 'N. Brown & T. Sandholm', venue: 'Science', year: 2018, why: 'Abstraction plus nested subgame solving.' },
  { id: 'dcfr', title: 'Solving Imperfect-Information Games via Discounted Regret Minimization', authors: 'N. Brown & T. Sandholm', venue: 'AAAI', year: 2019, why: 'Discounted CFR, the algorithm in your C++ engine.' },
  { id: 'pluribus', title: 'Superhuman AI for Multiplayer Poker', authors: 'N. Brown & T. Sandholm', venue: 'Science', year: 2019, why: 'Pluribus beats elite pros at six-player no-limit.' },
];

export const SOFTWARE: Software[] = [
  { name: 'GTO Wizard', kind: 'Solutions library & trainer', why: 'Browse precomputed solutions and drill spots; the free tier is enough to start.' },
  { name: 'Equilab', kind: 'Equity calculator', why: 'Free desktop equity calculator; the equity tool here covers most of the same ground.' },
  { name: 'PioSolver / GTO+', kind: 'Desktop solvers', why: 'Full custom trees and node-locking. Your own engine can play this role.' },
  { name: 'PokerTracker / Hold’em Manager / Hand2Note', kind: 'Hand trackers', why: 'Import hand histories, track stats, filter spots for review.' },
];

export const MILESTONES: Milestone[] = [
  { id: 'rps', title: 'RPS regret matching', detail: 'Self-play and vs. a fixed opponent; plot current vs. average strategy.' },
  { id: 'kuhn-cfr', title: 'Kuhn poker vanilla CFR', detail: 'Reproduce the game value of −1/18 and the α-family of equilibria.' },
  { id: 'kuhn-br', title: 'Best response & exploitability', detail: 'Compute exploitability every N iterations and plot it on a log scale.' },
  { id: 'cfr-plus', title: 'CFR+ and DCFR', detail: 'Implement both and compare convergence speed against vanilla CFR.' },
  { id: 'leduc', title: 'Leduc hold’em CFR', detail: 'Chance nodes for the public card, two betting rounds, exploitability.' },
  { id: 'river', title: 'No-limit river subgame', detail: 'Fixed board and ranges, two bet sizes, vector-form CFR over all combos.' },
  { id: 'turn', title: 'Turn + river with a chance node', detail: 'Compare your Python results with your C++ DCFR engine on the same spot.' },
  { id: 'writeup', title: 'One-page write-up', detail: 'Results, convergence plots and lessons learned; good material for SIG conversations.' },
];
