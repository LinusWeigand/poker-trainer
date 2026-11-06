import type { ModuleId, QuizQ } from './types';
import { LESSONS } from './lessons';
import { shuffle, type Rng } from '../engine/rng';

export interface ExamDef {
  id: string;
  title: string;
  modules: ModuleId[];
  count: number;
}

export const EXAMS: ExamDef[] = [
  { id: 'math', title: 'Phase 1 checkpoint · Poker Math', modules: ['math'], count: 12 },
  { id: 'preflop', title: 'Phase 2 checkpoint · Preflop', modules: ['preflop'], count: 10 },
  { id: 'theory', title: 'Phase 3 checkpoint · Game Theory & Postflop', modules: ['theory'], count: 15 },
  { id: 'exploit', title: 'Phase 4 checkpoint · Exploitation & Hand Reading', modules: ['exploit'], count: 10 },
  { id: 'solver', title: 'Solver track checkpoint · CFR', modules: ['solver'], count: 8 },
  { id: 'integration', title: 'Integration & Mental Game', modules: ['integration'], count: 8 },
  { id: 'trading', title: 'Poker ↔ Trading', modules: ['trading'], count: 6 },
  { id: 'final', title: 'Final exam · Everything', modules: ['math', 'preflop', 'theory', 'exploit', 'integration', 'trading', 'solver'], count: 30 },
];

export const examById = (id: string) => EXAMS.find((e) => e.id === id);

export type ExamQuestion = QuizQ & { lesson: string; lessonTitle: string };

export function examQuestions(exam: ExamDef, rng: Rng = Math.random): ExamQuestion[] {
  const pool: ExamQuestion[] = LESSONS.filter((l) => exam.modules.includes(l.module)).flatMap((l) => l.quiz.map((q) => ({ ...q, lesson: l.id, lessonTitle: l.title })));
  return shuffle(pool, rng).slice(0, Math.min(exam.count, pool.length));
}

export const examPoolSize = (exam: ExamDef) => LESSONS.filter((l) => exam.modules.includes(l.module)).reduce((a, l) => a + l.quiz.length, 0);
