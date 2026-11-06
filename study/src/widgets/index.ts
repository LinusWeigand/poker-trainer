import type { ComponentType } from 'react';
import { AlphaMdfWidget, BayesWidget, EvCallWidget, FoldEquityWidget, GeometricWidget, ImpliedOddsWidget, PotOddsCurveWidget, RiverCalcWidget, RuleOf24Widget, SprWidget } from './math';
import { BlockersWidget, ComboCounterWidget, EquityMiniWidget, PolarVsLinearWidget, PositionTableWidget, RangeChartWidget, RangeVsBoardWidget, TextureWidget } from './cards';
import { AkqWidget, ClairvoyantWidget, KuhnCfrWidget, KuhnLockWidget, RpsRegretWidget } from './theory';
import { AdverseSelectionWidget, KellyWidget, VarianceWidget } from './quant';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const WIDGETS: Record<string, ComponentType<any>> = {
  'ev-call': EvCallWidget,
  'pot-odds-curve': PotOddsCurveWidget,
  'rule-of-24': RuleOf24Widget,
  'fold-equity': FoldEquityWidget,
  'alpha-mdf': AlphaMdfWidget,
  'implied-odds': ImpliedOddsWidget,
  geometric: GeometricWidget,
  spr: SprWidget,
  'river-calc': RiverCalcWidget,
  bayes: BayesWidget,
  'equity-mini': EquityMiniWidget,
  'combo-counter': ComboCounterWidget,
  'position-table': PositionTableWidget,
  'range-chart': RangeChartWidget,
  'range-vs-board': RangeVsBoardWidget,
  texture: TextureWidget,
  blockers: BlockersWidget,
  'polar-vs-linear': PolarVsLinearWidget,
  'rps-regret': RpsRegretWidget,
  clairvoyant: ClairvoyantWidget,
  akq: AkqWidget,
  'kuhn-cfr': KuhnCfrWidget,
  'kuhn-lock': KuhnLockWidget,
  variance: VarianceWidget,
  kelly: KellyWidget,
  'adverse-selection': AdverseSelectionWidget,
};
