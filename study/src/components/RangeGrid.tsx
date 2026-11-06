import { useRef } from 'react';
import { GRID, gridKey, type Range } from '../engine/ranges';
import { cx } from './ui';

export interface RangeLayer {
  range: Range;
  color: string;
  label: string;
}

/**
 * 13×13 hand grid. Layers stack bottom-up within a cell by weight, so a pure
 * chart fills each cell with one colour and a mixed one splits it.
 */
export function RangeGrid({
  layers,
  highlight,
  dim,
  compact,
  onPaint,
  onHover,
  label = 'Hand range grid',
}: {
  layers: RangeLayer[];
  highlight?: string | null;
  dim?: ReadonlySet<string>;
  compact?: boolean;
  onPaint?: (key: string, mode: 'add' | 'remove') => void;
  onHover?: (key: string | null) => void;
  label?: string;
}) {
  const painting = useRef<null | 'add' | 'remove'>(null);
  const last = useRef<string | null>(null);

  const weightOf = (key: string) => layers.reduce((a, l) => a + (l.range[key] ?? 0), 0);

  const keyAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    return el?.closest<HTMLElement>('[data-key]')?.dataset.key ?? null;
  };

  const handleDown = (e: React.PointerEvent) => {
    if (!onPaint) return;
    const key = keyAt(e.clientX, e.clientY);
    if (!key) return;
    e.preventDefault();
    const mode = weightOf(key) > 0 ? 'remove' : 'add';
    painting.current = mode;
    last.current = key;
    onPaint(key, mode);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleMove = (e: React.PointerEvent) => {
    const key = keyAt(e.clientX, e.clientY);
    onHover?.(key);
    if (!painting.current || !onPaint || !key || key === last.current) return;
    last.current = key;
    onPaint(key, painting.current);
  };

  const stop = () => {
    painting.current = null;
    last.current = null;
  };

  return (
    <div
      className={cx('rgrid', compact && 'compact')}
      role="grid"
      aria-label={label}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={() => {
        onHover?.(null);
      }}
      style={{ cursor: onPaint ? 'crosshair' : undefined }}
    >
      {Array.from({ length: 169 }, (_, i) => {
        const row = Math.floor(i / 13);
        const col = i % 13;
        const key = gridKey(row, col);
        const total = weightOf(key);
        const desc = layers
          .filter((l) => (l.range[key] ?? 0) > 0)
          .map((l) => `${l.label}${(l.range[key] ?? 0) < 1 ? ` ${Math.round((l.range[key] ?? 0) * 100)}%` : ''}`)
          .join(', ');
        return (
          <div
            key={key}
            data-key={key}
            role="gridcell"
            aria-label={`${key}${desc ? `: ${desc}` : ''}`}
            className={cx('rcell', row === col && 'pair', total > 0 && 'in', highlight === key && 'hl', dim?.has(key) && 'dim')}
          >
            {total > 0 && (
              <span className="fill">
                {layers.map((l, li) => {
                  const w = l.range[key] ?? 0;
                  return w > 0 ? <i key={li} style={{ height: `${Math.min(1, w) * 100}%`, background: l.color }} /> : null;
                })}
              </span>
            )}
            <span className="t">{key.length === 3 ? key.slice(0, 2) + (compact ? '' : key[2]) : key}</span>
          </div>
        );
      })}
    </div>
  );
}

export const GRID_RANKS = GRID;
