import type { AppState, Category, DrillSession, LessonStatus, StudySession } from '../store/store';
import { LESSONS, lessonById } from '../content/lessons';
import { PLAN, type PlanTask, type PlanWeek } from '../content/plan';
import { FLASHCARDS, type Flashcard } from '../content/flashcards';
import type { ModuleId } from '../content/types';
import { addDays, localDate } from '../engine/srs';
import { inRange, weekRange } from './plan';

export const lessonStatus = (s: AppState, id: string): LessonStatus => s.lessons[id]?.status ?? 'todo';

export function moduleProgress(s: AppState, module: ModuleId) {
  const ls = LESSONS.filter((l) => l.module === module);
  const done = ls.filter((l) => lessonStatus(s, l.id) === 'done').length;
  const started = ls.filter((l) => lessonStatus(s, l.id) === 'in_progress').length;
  return { done, started, total: ls.length, frac: ls.length ? done / ls.length : 0 };
}

export function overallProgress(s: AppState) {
  const done = LESSONS.filter((l) => lessonStatus(s, l.id) === 'done').length;
  return { done, total: LESSONS.length };
}

export const taskKey = (week: number, task: PlanTask) => `w${week}:${task.id}`;

export interface TaskState {
  done: boolean;
  auto: boolean;
  progress?: string;
  label: string;
  to?: string;
}

const dateOf = (t: number) => localDate(new Date(t));

export function taskState(s: AppState, week: PlanWeek, task: PlanTask): TaskState {
  const manual = !!s.tasks[taskKey(week.week, task)];
  const r = weekRange(s.settings, week.week);
  switch (task.kind) {
    case 'lesson': {
      const l = lessonById(task.ref!);
      const done = lessonStatus(s, task.ref!) === 'done';
      return { done: done || manual, auto: done, label: l?.title ?? task.ref!, to: `/learn/${task.ref}` };
    }
    case 'drill': {
      const n = s.drillSessions.filter((d) => d.d === task.ref && d.n > 0 && d.correct / d.n >= 0.8 && inRange(dateOf(d.t), r)).length;
      const target = task.target ?? 3;
      return { done: n >= target || manual, auto: n >= target, progress: `${Math.min(n, target)}/${target}`, label: `${target} sessions at 80%+`, to: `/practice/${task.ref}` };
    }
    case 'exam': {
      const best = s.exams[task.ref!]?.best ?? 0;
      return { done: best >= (task.target ?? 0.8) || manual, auto: best >= (task.target ?? 0.8), progress: best ? `best ${Math.round(best * 100)}%` : undefined, label: 'Score 80% or more', to: `/exam/${task.ref}` };
    }
    case 'cards': {
      const days = new Set(s.reviewLog.filter((x) => inRange(dateOf(x.t), r)).map((x) => dateOf(x.t))).size;
      const target = task.target ?? 5;
      return { done: days >= target || manual, auto: days >= target, progress: `${Math.min(days, target)}/${target} days`, label: `Review flashcards on ${target} days`, to: '/review' };
    }
    default:
      return { done: manual, auto: false, label: task.label ?? '', to: task.to };
  }
}

export function weekProgress(s: AppState, week: PlanWeek) {
  const states = week.tasks.map((t) => taskState(s, week, t));
  const done = states.filter((x) => x.done).length;
  return { done, total: states.length, frac: states.length ? done / states.length : 0 };
}

export function introducedToday(s: AppState, today = localDate()): number {
  const first = new Map<string, number>();
  for (const r of s.reviewLog) if (!first.has(r.id)) first.set(r.id, r.t);
  let n = 0;
  for (const t of first.values()) if (dateOf(t) === today) n++;
  return n;
}

export function cardQueue(s: AppState, decks: ModuleId[] | null, today = localDate()): { due: Flashcard[]; fresh: Flashcard[] } {
  const inDeck = (f: Flashcard) => !decks || decks.includes(f.deck);
  const due = FLASHCARDS.filter((f) => inDeck(f) && s.cards[f.id] && s.cards[f.id].due <= today).sort((a, b) => s.cards[a.id].due.localeCompare(s.cards[b.id].due));
  const allowance = Math.max(0, s.settings.newCardsPerDay - introducedToday(s, today));
  const fresh = FLASHCARDS.filter((f) => inDeck(f) && !s.cards[f.id]).slice(0, allowance);
  return { due, fresh };
}

export function streak(activity: Record<string, number>, today = localDate()): number {
  let d = (activity[today] ?? 0) > 0 ? today : addDays(today, -1);
  let n = 0;
  while ((activity[d] ?? 0) > 0) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function minutesByCategory(sessions: StudySession[], r?: { start: string; end: string }): Record<Category, number> {
  const out: Record<Category, number> = { study: 0, play: 0, review: 0, drills: 0 };
  for (const x of sessions) if (!r || inRange(x.date, r)) out[x.category] += x.minutes;
  return out;
}

export function drillStats(s: AppState, id: string) {
  const attempts = s.attempts.filter((a) => a.d === id);
  const recent = attempts.slice(-50);
  const sessions = s.drillSessions.filter((d) => d.d === id);
  return {
    attempts: attempts.length,
    accuracy: recent.length ? recent.filter((a) => a.ok).length / recent.length : null,
    avgMs: recent.length ? recent.reduce((a, b) => a + b.ms, 0) / recent.length : null,
    sessions: sessions.length,
    lastAt: sessions.length ? sessions[sessions.length - 1].t : null,
    trend: sessions.slice(-12).map((x: DrillSession) => (x.n ? x.correct / x.n : 0)),
  };
}

/** The next lesson to study: earliest unfinished one scheduled up to this week, else the first unfinished overall. */
export function nextLesson(s: AppState, week: number) {
  for (const w of PLAN.filter((p) => p.week <= week)) {
    for (const t of w.tasks) if (t.kind === 'lesson' && lessonStatus(s, t.ref!) !== 'done') return lessonById(t.ref!);
  }
  return LESSONS.find((l) => lessonStatus(s, l.id) !== 'done');
}

/** Week in which a lesson is scheduled. */
export const lessonWeek = (() => {
  const m = new Map<string, number>();
  for (const w of PLAN) for (const t of w.tasks) if (t.kind === 'lesson' && !m.has(t.ref!)) m.set(t.ref!, w.week);
  return (id: string) => m.get(id);
})();
