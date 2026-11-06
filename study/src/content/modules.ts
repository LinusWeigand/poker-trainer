import type { ModuleDef, Phase } from './types';

export const MODULES: ModuleDef[] = [
  {
    id: 'math',
    num: 1,
    title: 'Poker Math',
    phase: 1,
    weeks: 'Weeks 1–5',
    description: 'EV, pot odds, outs, equity, combinatorics, bluffing math and MDF — the arithmetic under every decision.',
  },
  {
    id: 'preflop',
    num: 2,
    title: 'Preflop',
    phase: 2,
    weeks: 'Weeks 4–9',
    description: 'Position, opening ranges, 3-bets, big blind defense and 3-bet pots, with the reasons behind every chart.',
  },
  {
    id: 'theory',
    num: 3,
    title: 'Game Theory & Postflop',
    phase: 3,
    weeks: 'Weeks 8–18',
    description: 'Equilibrium, indifference, toy games, polarization, range and nut advantage, texture, c-bets, sizing, blockers and SPR.',
  },
  {
    id: 'exploit',
    num: 4,
    title: 'Exploitation & Hand Reading',
    phase: 4,
    weeks: 'Weeks 15–24',
    description: 'Bayesian hand reading, population exploits, node-locking, and the big decisions on the turn and river.',
  },
  {
    id: 'integration',
    num: 5,
    title: 'Integration & Mental Game',
    phase: 5,
    weeks: 'Weeks 22–30',
    description: 'Variance and sample size, bankroll and Kelly, the mental game, and a system for reviewing your hands.',
  },
  {
    id: 'trading',
    num: 6,
    title: 'Poker ↔ Trading',
    phase: 5,
    weeks: 'Weeks 26–30',
    description: 'Adverse selection, sizing as information, thinking in distributions, and talking through hands like a trader.',
  },
  {
    id: 'solver',
    num: 7,
    title: 'Solver Track: CFR',
    phase: 3,
    weeks: 'Parallel, weeks 10–21',
    description: 'Regret matching, counterfactual regret minimization, Kuhn poker, and how real solvers scale to hold’em.',
  },
];

export const PHASES: Phase[] = [
  { num: 1, title: 'Poker Math', start: 1, end: 5, goal: 'Compute pot odds, equity, combos, alpha and MDF quickly and correctly.' },
  { num: 2, title: 'Preflop', start: 4, end: 9, goal: 'Play solid, reasoned preflop ranges from every seat.' },
  { num: 3, title: 'Game Theory & Postflop', start: 8, end: 18, goal: 'Understand equilibrium logic and apply it to flop, turn and river strategy.' },
  { num: 4, title: 'Exploitation & Hand Reading', start: 15, end: 24, goal: 'Read ranges with Bayes, find exploits, and make strong turn and river decisions.' },
  { num: 5, title: 'Integration', start: 22, end: 30, goal: 'Variance, bankroll, the mental game, and articulating decisions SIG-style.' },
];

export const moduleById = (id: string) => MODULES.find((m) => m.id === id);
