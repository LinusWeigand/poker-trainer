import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { localDate, schedule, type Grade, type SrsState } from '../engine/srs';

export type LessonStatus = 'todo' | 'in_progress' | 'done';
export type Category = 'study' | 'play' | 'review' | 'drills';

export const CATEGORIES: { id: Category; label: string; share: number }[] = [
  { id: 'study', label: 'Study', share: 0.35 },
  { id: 'play', label: 'Play', share: 0.4 },
  { id: 'review', label: 'Hand review', share: 0.2 },
  { id: 'drills', label: 'Drills', share: 0.05 },
];

export interface LessonProgress {
  status: LessonStatus;
  startedAt?: number;
  completedAt?: number;
  quizBest?: number;
  quizAttempts: number;
  notes?: string;
}

export interface DrillAttempt {
  d: string;
  t: number;
  ok: boolean;
  err?: number;
  ms: number;
}

export interface DrillSession {
  d: string;
  t: number;
  n: number;
  correct: number;
  ms: number;
}

export interface StudySession {
  id: string;
  date: string;
  minutes: number;
  category: Category;
  note?: string;
  hands?: number;
  resultBb?: number;
  auto?: boolean;
}

export interface JournalHand {
  id: string;
  created: number;
  date: string;
  stakes: string;
  position: string;
  villainPos: string;
  hero: string;
  board: string;
  potType: string;
  preflop: string;
  flop: string;
  turn: string;
  river: string;
  resultBb?: number;
  decision: string;
  better: string;
  concept: string;
  tags: string[];
  status: 'open' | 'reviewed';
}

export interface BookProgress {
  status: 'not_started' | 'reading' | 'done';
  progress: number;
  notes: string;
}

export interface Settings {
  name: string;
  startDate: string;
  internshipDate: string;
  weeklyHours: number;
  newCardsPerDay: number;
  fourColor: boolean;
}

export interface ExamResult {
  best: number;
  attempts: number;
  last: number;
  at: number;
}

export interface Timer {
  start: number;
  category: Category;
  note: string;
}

interface Data {
  settings: Settings;
  lessons: Record<string, LessonProgress>;
  tasks: Record<string, boolean>;
  weekNotes: Record<string, string>;
  attempts: DrillAttempt[];
  drillSessions: DrillSession[];
  cards: Record<string, SrsState>;
  reviewLog: { t: number; id: string; g: Grade }[];
  sessions: StudySession[];
  timer: Timer | null;
  hands: JournalHand[];
  books: Record<string, BookProgress>;
  milestones: Record<string, boolean>;
  exams: Record<string, ExamResult>;
  activity: Record<string, number>;
  onboarded: boolean;
}

interface Actions {
  updateSettings: (s: Partial<Settings>) => void;
  startLesson: (id: string) => void;
  completeLesson: (id: string, done?: boolean) => void;
  recordQuiz: (id: string, score: number) => void;
  setLessonNotes: (id: string, notes: string) => void;
  toggleTask: (key: string) => void;
  setWeekNote: (week: number, note: string) => void;
  recordAttempt: (a: Omit<DrillAttempt, 't'>) => void;
  recordDrillSession: (s: Omit<DrillSession, 't'>) => void;
  reviewCard: (id: string, grade: Grade) => void;
  resetCard: (id: string) => void;
  addSession: (s: Omit<StudySession, 'id'>) => void;
  updateSession: (id: string, s: Partial<StudySession>) => void;
  deleteSession: (id: string) => void;
  startTimer: (category: Category, note?: string) => void;
  stopTimer: (save?: boolean) => void;
  saveHand: (h: JournalHand) => void;
  deleteHand: (id: string) => void;
  updateBook: (id: string, b: Partial<BookProgress>) => void;
  toggleMilestone: (id: string) => void;
  recordExam: (id: string, score: number) => void;
  bump: (points: number) => void;
  finishOnboarding: () => void;
  importData: (json: string) => void;
  resetAll: () => void;
}

export type AppState = Data & Actions;

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);

function defaults(): Data {
  return {
    settings: {
      name: '',
      startDate: localDate(),
      internshipDate: '2027-06-07',
      weeklyHours: 9,
      newCardsPerDay: 12,
      fourColor: true,
    },
    lessons: {},
    tasks: {},
    weekNotes: {},
    attempts: [],
    drillSessions: [],
    cards: {},
    reviewLog: [],
    sessions: [],
    timer: null,
    hands: [],
    books: {},
    milestones: {},
    exams: {},
    activity: {},
    onboarded: false,
  };
}

const MAX_LOG = 5000;
const cap = <T>(arr: T[]) => (arr.length > MAX_LOG ? arr.slice(arr.length - MAX_LOG) : arr);

function addActivity(activity: Record<string, number>, points: number): Record<string, number> {
  const d = localDate();
  return { ...activity, [d]: (activity[d] ?? 0) + points };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...defaults(),

      updateSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),

      startLesson: (id) =>
        set((st) => {
          const cur = st.lessons[id];
          if (cur && cur.status !== 'todo') return {};
          return { lessons: { ...st.lessons, [id]: { ...(cur ?? { quizAttempts: 0 }), status: 'in_progress', startedAt: Date.now() } } };
        }),

      completeLesson: (id, done = true) =>
        set((st) => {
          const cur = st.lessons[id] ?? { quizAttempts: 0, status: 'todo' as LessonStatus };
          const status: LessonStatus = done ? 'done' : 'in_progress';
          return {
            lessons: { ...st.lessons, [id]: { ...cur, status, completedAt: done ? Date.now() : undefined } },
            activity: done && cur.status !== 'done' ? addActivity(st.activity, 10) : st.activity,
          };
        }),

      recordQuiz: (id, score) =>
        set((st) => {
          const cur = st.lessons[id] ?? { quizAttempts: 0, status: 'in_progress' as LessonStatus };
          return {
            lessons: {
              ...st.lessons,
              [id]: { ...cur, quizAttempts: cur.quizAttempts + 1, quizBest: Math.max(cur.quizBest ?? 0, score) },
            },
            activity: addActivity(st.activity, 3),
          };
        }),

      setLessonNotes: (id, notes) =>
        set((st) => ({
          lessons: { ...st.lessons, [id]: { ...(st.lessons[id] ?? { quizAttempts: 0, status: 'todo' }), notes } },
        })),

      toggleTask: (key) => set((st) => ({ tasks: { ...st.tasks, [key]: !st.tasks[key] } })),

      setWeekNote: (week, note) => set((st) => ({ weekNotes: { ...st.weekNotes, [week]: note } })),

      recordAttempt: (a) =>
        set((st) => ({ attempts: cap([...st.attempts, { ...a, t: Date.now() }]), activity: addActivity(st.activity, 1) })),

      recordDrillSession: (s) =>
        set((st) => {
          const minutes = Math.round(s.ms / 60000);
          const sessions =
            minutes >= 1
              ? [...st.sessions, { id: uid(), date: localDate(), minutes, category: 'drills' as Category, note: `Drill: ${s.d}`, auto: true }]
              : st.sessions;
          return { drillSessions: cap([...st.drillSessions, { ...s, t: Date.now() }]), sessions };
        }),

      reviewCard: (id, grade) =>
        set((st) => ({
          cards: { ...st.cards, [id]: schedule(st.cards[id], grade, localDate()) },
          reviewLog: cap([...st.reviewLog, { t: Date.now(), id, g: grade }]),
          activity: addActivity(st.activity, 0.5),
        })),

      resetCard: (id) =>
        set((st) => {
          const cards = { ...st.cards };
          delete cards[id];
          return { cards };
        }),

      addSession: (s) =>
        set((st) => ({ sessions: [...st.sessions, { ...s, id: uid() }], activity: addActivity(st.activity, s.minutes) })),

      updateSession: (id, s) => set((st) => ({ sessions: st.sessions.map((x) => (x.id === id ? { ...x, ...s } : x)) })),

      deleteSession: (id) => set((st) => ({ sessions: st.sessions.filter((x) => x.id !== id) })),

      startTimer: (category, note = '') => set({ timer: { start: Date.now(), category, note } }),

      stopTimer: (save = true) => {
        const t = get().timer;
        if (!t) return;
        const minutes = Math.round((Date.now() - t.start) / 60000);
        set({ timer: null });
        if (save && minutes >= 1) get().addSession({ date: localDate(new Date(t.start)), minutes, category: t.category, note: t.note });
      },

      saveHand: (h) =>
        set((st) => {
          const exists = st.hands.some((x) => x.id === h.id);
          return {
            hands: exists ? st.hands.map((x) => (x.id === h.id ? h : x)) : [h, ...st.hands],
            activity: exists ? st.activity : addActivity(st.activity, 4),
          };
        }),

      deleteHand: (id) => set((st) => ({ hands: st.hands.filter((x) => x.id !== id) })),

      updateBook: (id, b) =>
        set((st) => ({
          books: { ...st.books, [id]: { ...(st.books[id] ?? { status: 'not_started', progress: 0, notes: '' }), ...b } },
        })),

      toggleMilestone: (id) => set((st) => ({ milestones: { ...st.milestones, [id]: !st.milestones[id] } })),

      recordExam: (id, score) =>
        set((st) => {
          const cur = st.exams[id];
          return {
            exams: {
              ...st.exams,
              [id]: { best: Math.max(cur?.best ?? 0, score), attempts: (cur?.attempts ?? 0) + 1, last: score, at: Date.now() },
            },
            activity: addActivity(st.activity, 5),
          };
        }),

      bump: (points) => set((st) => ({ activity: addActivity(st.activity, points) })),

      finishOnboarding: () => set({ onboarded: true }),

      importData: (json) => {
        const parsed = JSON.parse(json);
        const data = parsed.state ?? parsed;
        if (typeof data !== 'object' || !data.settings) throw new Error('This file is not an Equilibrium backup.');
        set({ ...defaults(), ...data, settings: { ...defaults().settings, ...data.settings } });
      },

      resetAll: () => set({ ...defaults() }),
    }),
    {
      name: 'equilibrium-study',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const out: Partial<AppState> = {};
        for (const [k, v] of Object.entries(s)) if (typeof v !== 'function') (out as Record<string, unknown>)[k] = v;
        return out as AppState;
      },
    },
  ),
);

export function exportData(): string {
  const s = useStore.getState();
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) if (typeof v !== 'function') out[k] = v;
  return JSON.stringify({ app: 'equilibrium', version: 1, exportedAt: new Date().toISOString(), state: out }, null, 2);
}
