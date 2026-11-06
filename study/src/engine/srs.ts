// SM-2 style spaced repetition. Grades: 0 again, 1 hard, 2 good, 3 easy.

export interface SrsState {
  ease: number;
  interval: number;
  reps: number;
  lapses: number;
  due: string;
  last?: string;
}

export type Grade = 0 | 1 | 2 | 3;

export function localDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: string, n: number): string {
  const d = parseLocalDate(date);
  d.setDate(d.getDate() + n);
  return localDate(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / 86400000);
}

export function schedule(prev: SrsState | undefined, grade: Grade, today: string): SrsState {
  let { ease, interval, reps, lapses } = prev ?? { ease: 2.5, interval: 0, reps: 0, lapses: 0 };
  if (grade === 0) {
    reps = 0;
    interval = 0;
    lapses += 1;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    if (reps === 0) interval = grade === 3 ? 3 : 1;
    else if (reps === 1) interval = grade === 1 ? 2 : grade === 2 ? 3 : 5;
    else interval = Math.round(interval * (grade === 1 ? 1.2 : grade === 2 ? ease : ease * 1.3));
    interval = Math.max(1, interval);
    reps += 1;
    ease = Math.min(3, Math.max(1.3, ease + (grade === 1 ? -0.15 : grade === 3 ? 0.15 : 0)));
  }
  return { ease, interval, reps, lapses, due: addDays(today, interval), last: today };
}

export function previewIntervals(prev: SrsState | undefined, today: string): number[] {
  return ([0, 1, 2, 3] as Grade[]).map((g) => schedule(prev, g, today).interval);
}

export function formatInterval(days: number): string {
  if (days <= 0) return '<1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}
