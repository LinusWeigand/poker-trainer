export type ModuleId = 'math' | 'preflop' | 'theory' | 'exploit' | 'integration' | 'trading' | 'solver';

export interface QuizQ {
  q: string;
  /** Multiple choice; omit for a numeric answer. */
  choices?: string[];
  /** Index of the right choice, or the numeric answer. */
  answer: number;
  tolerance?: number;
  unit?: string;
  explain: string;
}

export interface Lesson {
  id: string;
  module: ModuleId;
  title: string;
  summary: string;
  minutes: number;
  level: 1 | 2 | 3;
  body: string;
  quiz: QuizQ[];
  drills?: string[];
  tools?: string[];
}

export interface ModuleDef {
  id: ModuleId;
  num: number;
  title: string;
  phase: number;
  weeks: string;
  description: string;
}

export interface Phase {
  num: number;
  title: string;
  start: number;
  end: number;
  goal: string;
}
