import { addDays, daysBetween, localDate } from '../engine/srs';
import type { Settings } from '../store/store';

export const TOTAL_WEEKS = 30;

export function currentWeek(settings: Settings, today = localDate()): number {
  const d = daysBetween(settings.startDate, today);
  if (d < 0) return 1;
  return Math.min(TOTAL_WEEKS, Math.floor(d / 7) + 1);
}

/** Raw (unclamped) week index, so callers can tell if the plan is finished. */
export function weekIndex(settings: Settings, today = localDate()): number {
  return Math.floor(daysBetween(settings.startDate, today) / 7) + 1;
}

export function weekRange(settings: Settings, week: number): { start: string; end: string } {
  const start = addDays(settings.startDate, (week - 1) * 7);
  return { start, end: addDays(start, 6) };
}

export function inRange(date: string, r: { start: string; end: string }): boolean {
  return date >= r.start && date <= r.end;
}

export function daysUntil(date: string, today = localDate()): number {
  return daysBetween(today, date);
}

/** Monday-based week key for grouping sessions by calendar week. */
export function weekStartOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - day);
  return localDate(dt);
}
