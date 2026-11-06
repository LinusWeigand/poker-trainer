import type { ReactNode } from 'react';
import type { LucideIcon } from '../components/icons';
import type { Rng } from '../engine/rng';

export interface DrillQuestion {
  prompt: ReactNode;
  kind: 'numeric' | 'choice';
  choices?: ReactNode[];
  /** Numeric answer, or index into choices. */
  answer: number;
  tolerance?: number;
  unit?: string;
  explain: ReactNode;
  visual?: ReactNode;
}

export type DrillCategory = 'Math' | 'Cards' | 'Preflop' | 'Reasoning' | 'Quant';

export interface DrillDef {
  id: string;
  title: string;
  description: string;
  category: DrillCategory;
  icon: LucideIcon;
  lessons: string[];
  target: string;
  generate: (rng: Rng) => DrillQuestion;
}
