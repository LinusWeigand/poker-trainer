import type { DrillDef } from './types';
import { bayes, bluffcatch, ev, outsEquity, potOdds, quant, ratios } from './math';
import { combos, equityEst, nuts, outs, preflop } from './cards';

export const DRILLS: DrillDef[] = [potOdds, ratios, outs, outsEquity, combos, equityEst, ev, preflop, nuts, bluffcatch, bayes, quant];

const INDEX = new Map(DRILLS.map((d) => [d.id, d]));
export const drillById = (id: string) => INDEX.get(id);
export type { DrillDef, DrillQuestion } from './types';
