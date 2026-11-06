import type { Lesson, ModuleId } from '../types';
import { MODULES } from '../modules';
import { MATH_LESSONS } from './m1-math';
import { PREFLOP_LESSONS } from './m2-preflop';
import { THEORY_LESSONS } from './m3-theory';
import { EXPLOIT_LESSONS, INTEGRATION_LESSONS } from './m4-exploit';
import { TRADING_LESSONS, SOLVER_LESSONS } from './m6-trading';

const BY_MODULE: Record<ModuleId, Lesson[]> = {
  math: MATH_LESSONS,
  preflop: PREFLOP_LESSONS,
  theory: THEORY_LESSONS,
  exploit: EXPLOIT_LESSONS,
  integration: INTEGRATION_LESSONS,
  trading: TRADING_LESSONS,
  solver: SOLVER_LESSONS,
};

/** All lessons in curriculum order (module by module). */
export const LESSONS: Lesson[] = MODULES.flatMap((m) => BY_MODULE[m.id]);

const INDEX = new Map(LESSONS.map((l) => [l.id, l]));

export const lessonById = (id: string) => INDEX.get(id);
export const lessonsInModule = (id: ModuleId) => BY_MODULE[id];

export function neighbours(id: string): { prev?: Lesson; next?: Lesson } {
  const i = LESSONS.findIndex((l) => l.id === id);
  return { prev: LESSONS[i - 1], next: LESSONS[i + 1] };
}
