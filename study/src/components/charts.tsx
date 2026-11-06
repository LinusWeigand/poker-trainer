// Small SVG chart kit following the dataviz method: 2px lines, ≤24px bars with
// 4px rounded data ends, hairline grids, legends for ≥2 series, hover layer.
import { useMemo, useState, type ReactNode } from 'react';
import { useElementWidth } from '../lib/hooks';

export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const step = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step * 1e-6; v += step) out.push(Math.round(v / step) * step);
  return out;
}

const defaultFmt = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1000) return `${(v / 1000).toFixed(a >= 1e4 ? 0 : 1)}K`;
  if (a !== 0 && a < 1) return v.toFixed(2);
  return String(Math.round(v * 100) / 100);
};

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  points: { x: number; y: number }[];
  width?: number;
  opacity?: number;
  /** Excluded from tooltip and legend (e.g. many simulated paths). */
  quiet?: boolean;
  endDot?: boolean;
}

export interface Band {
  color: string;
  label?: string;
  points: { x: number; lo: number; hi: number }[];
}

export function LineChart({
  series,
  bands = [],
  height = 220,
  xFormat = defaultFmt,
  yFormat = defaultFmt,
  yDomain,
  xLabel,
  refLines = [],
  legend = true,
  directLabels = true,
  markers = [],
  ariaLabel,
}: {
  series: LineSeries[];
  bands?: Band[];
  height?: number;
  xFormat?: (v: number) => string;
  yFormat?: (v: number) => string;
  yDomain?: [number, number];
  xLabel?: string;
  refLines?: { y: number; label: string }[];
  legend?: boolean;
  directLabels?: boolean;
  markers?: { x: number; y: number; label?: string; color?: string }[];
  ariaLabel: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const loud = series.filter((s) => !s.quiet);
  const labelRoom = directLabels && loud.length <= 4 && loud.length > 0 ? 70 : 12;
  const m = { l: 46, r: labelRoom, t: 10, b: xLabel ? 38 : 24 };
  const W = Math.max(200, width);
  const iw = W - m.l - m.r;
  const ih = height - m.t - m.b;

  const { xMin, xMax, yTicks } = useMemo(() => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const s of series) for (const p of s.points) {
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    for (const b of bands) for (const p of b.points) { y0 = Math.min(y0, p.lo); y1 = Math.max(y1, p.hi); }
    for (const r of refLines) { y0 = Math.min(y0, r.y); y1 = Math.max(y1, r.y); }
    if (yDomain) [y0, y1] = yDomain;
    return { xMin: x0, xMax: x1 === x0 ? x0 + 1 : x1, yTicks: yDomain ? niceTicks(yDomain[0], yDomain[1], 4).filter((t) => t >= yDomain[0] - 1e-9 && t <= yDomain[1] + 1e-9) : niceTicks(y0, y1, 4) };
  }, [series, bands, refLines, yDomain]);

  const yMin = yDomain ? yDomain[0] : yTicks[0];
  const yMax = yDomain ? yDomain[1] : yTicks[yTicks.length - 1];
  const sx = (x: number) => m.l + ((x - xMin) / (xMax - xMin)) * iw;
  const sy = (y: number) => m.t + ih - ((y - yMin) / (yMax - yMin || 1)) * ih;
  const xTicks = niceTicks(xMin, xMax, Math.max(2, Math.min(6, Math.floor(iw / 90)))).filter((t) => t >= xMin - 1e-9 && t <= xMax + 1e-9);

  const ref0 = loud[0] ?? series[0];
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (!ref0 || !ref0.points.length) return;
    const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const x = xMin + ((e.clientX - rect.left) / rect.width) * (xMax - xMin);
    let best = 0;
    let bd = Infinity;
    ref0.points.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < bd) { bd = d; best = i; }
    });
    setHover(best);
  };

  const path = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const hx = hover !== null && ref0?.points[hover] ? ref0.points[hover].x : null;

  return (
    <div className="chart" ref={ref}>
      {legend && loud.length >= 2 && (
        <div className="chart-legend" aria-hidden="true">
          {loud.map((s) => (
            <span key={s.id}>
              <i className="line-key" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
          {bands.filter((b) => b.label).map((b) => (
            <span key={b.label}>
              <i className="rect-key" style={{ background: b.color, opacity: 0.25 }} />
              {b.label}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={ariaLabel}>
        {yTicks.map((t) => (
          <g key={t}>
            <line className="gridline" x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} />
            <text x={m.l - 8} y={sy(t) + 3.5} textAnchor="end">{yFormat(t)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} x={sx(t)} y={height - m.b + 16} textAnchor="middle">{xFormat(t)}</text>
        ))}
        {xLabel && <text x={m.l + iw / 2} y={height - 4} textAnchor="middle">{xLabel}</text>}
        {bands.map((b, i) => (
          <path
            key={i}
            d={`${b.points.map((p, j) => `${j ? 'L' : 'M'}${sx(p.x)},${sy(p.hi)}`).join('')}${[...b.points].reverse().map((p) => `L${sx(p.x)},${sy(p.lo)}`).join('')}Z`}
            fill={b.color}
            opacity={0.12}
          />
        ))}
        {refLines.map((r) => (
          <g key={r.label}>
            <line x1={m.l} x2={W - m.r} y1={sy(r.y)} y2={sy(r.y)} stroke="var(--ink-tertiary)" strokeWidth={1} />
            <text x={W - m.r - 4} y={sy(r.y) - 5} textAnchor="end">{r.label}</text>
          </g>
        ))}
        {series.map((s) => (
          <path key={s.id} d={path(s.points)} fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeLinejoin="round" strokeLinecap="round" opacity={s.opacity ?? 1} />
        ))}
        {loud.map((s) => {
          const last = s.points[s.points.length - 1];
          if (!last || s.endDot === false) return null;
          return <circle key={s.id} cx={sx(last.x)} cy={sy(last.y)} r={4} fill={s.color} stroke="var(--surface-2)" strokeWidth={2} />;
        })}
        {directLabels && loud.length <= 4 &&
          loud.map((s) => {
            const last = s.points[s.points.length - 1];
            if (!last) return null;
            return (
              <text key={s.id} x={sx(last.x) + 8} y={sy(last.y) + 3.5} style={{ fill: 'var(--ink-muted)' }}>
                {s.label.length > 9 ? s.label.slice(0, 9) + '…' : s.label}
              </text>
            );
          })}
        {markers.map((mk, i) => (
          <g key={i} pointerEvents="none">
            <line x1={sx(mk.x)} x2={sx(mk.x)} y1={sy(mk.y)} y2={m.t + ih} stroke="var(--ink-tertiary)" strokeWidth={1} />
            <circle cx={sx(mk.x)} cy={sy(mk.y)} r={4.5} fill={mk.color ?? 'var(--ink)'} stroke="var(--surface-2)" strokeWidth={2} />
            {mk.label && (
              <text x={sx(mk.x) + 8} y={sy(mk.y) - 7} style={{ fill: 'var(--ink)' }}>
                {mk.label}
              </text>
            )}
          </g>
        ))}
        {hx !== null && (
          <g pointerEvents="none">
            <line x1={sx(hx)} x2={sx(hx)} y1={m.t} y2={m.t + ih} stroke="var(--ink-tertiary)" strokeWidth={1} />
            {loud.map((s) => {
              const p = s.points[hover!];
              return p ? <circle key={s.id} cx={sx(p.x)} cy={sy(p.y)} r={4} fill={s.color} stroke="var(--surface-2)" strokeWidth={2} /> : null;
            })}
          </g>
        )}
        <rect x={m.l} y={m.t} width={iw} height={ih} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
      </svg>
      {hx !== null && loud.length > 0 && (
        <div className="chart-tip" style={{ left: `${(sx(hx) / W) * 100}%`, top: m.t + 8 }}>
          <div className="th">{xFormat(hx)}</div>
          {loud.map((s) => {
            const p = s.points[hover!];
            return p ? (
              <div key={s.id} className="tr">
                <i className="key" style={{ background: s.color }} />
                <span className="tv">{yFormat(p.y)}</span>
                <span>{s.label}</span>
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

function roundedBar(x: number, y0: number, y1: number, w: number, r = 4): string {
  // y0 = baseline, y1 = data end (smaller y = up)
  const up = y1 < y0;
  const h = Math.abs(y0 - y1);
  const rr = Math.min(r, h, w / 2);
  if (up) return `M${x},${y0}V${y1 + rr}Q${x},${y1} ${x + rr},${y1}H${x + w - rr}Q${x + w},${y1} ${x + w},${y1 + rr}V${y0}Z`;
  return `M${x},${y0}V${y1 - rr}Q${x},${y1} ${x + rr},${y1}H${x + w - rr}Q${x + w},${y1} ${x + w},${y1 - rr}V${y0}Z`;
}

export interface StackSeries {
  id: string;
  label: string;
  color: string;
}

/** Columns, optionally stacked. `values[i][s]` = value of series s in column i. */
export function ColumnChart({
  labels,
  series,
  values,
  height = 200,
  yFormat = defaultFmt,
  target,
  ariaLabel,
  capLabels = false,
}: {
  labels: string[];
  series: StackSeries[];
  values: number[][];
  height?: number;
  yFormat?: (v: number) => string;
  target?: { value: number; label: string };
  ariaLabel: string;
  capLabels?: boolean;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const W = Math.max(200, width);
  const m = { l: 40, r: 12, t: 14, b: 24 };
  const iw = W - m.l - m.r;
  const ih = height - m.t - m.b;
  const totals = values.map((v) => v.reduce((a, b) => a + Math.max(0, b), 0));
  const maxV = Math.max(target?.value ?? 0, ...totals, 1e-9);
  const ticks = niceTicks(0, maxV, 4);
  const top = ticks[ticks.length - 1];
  const sy = (v: number) => m.t + ih - (v / top) * ih;
  const band = iw / Math.max(1, labels.length);
  const bw = Math.min(24, band * 0.6);

  return (
    <div className="chart" ref={ref}>
      {series.length >= 2 && (
        <div className="chart-legend" aria-hidden="true">
          {series.map((s) => (
            <span key={s.id}>
              <i className="rect-key" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="gridline" x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} />
            <text x={m.l - 8} y={sy(t) + 3.5} textAnchor="end">{yFormat(t)}</text>
          </g>
        ))}
        {labels.map((lab, i) => {
          const x = m.l + band * i + (band - bw) / 2;
          let acc = 0;
          const segs = series.map((s, si) => ({ s, v: Math.max(0, values[i]?.[si] ?? 0) })).filter((x) => x.v > 0);
          return (
            <g key={lab + i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} opacity={hover === null || hover === i ? 1 : 0.55}>
              <rect x={m.l + band * i} y={m.t} width={band} height={ih} fill="transparent" />
              {segs.map(({ s, v }, k) => {
                const y0 = sy(acc) - (k > 0 ? 2 : 0);
                acc += v;
                const y1 = sy(acc);
                const isTop = k === segs.length - 1;
                if (y0 - y1 <= 0.5) return null;
                return isTop ? (
                  <path key={s.id} d={roundedBar(x, y0, y1, bw)} fill={s.color} />
                ) : (
                  <rect key={s.id} x={x} y={y1} width={bw} height={y0 - y1} fill={s.color} />
                );
              })}
              {capLabels && totals[i] > 0 && (
                <text x={x + bw / 2} y={sy(totals[i]) - 5} textAnchor="middle" style={{ fill: 'var(--ink-muted)' }}>
                  {yFormat(totals[i])}
                </text>
              )}
              <text x={x + bw / 2} y={height - 6} textAnchor="middle">{lab}</text>
            </g>
          );
        })}
        <line className="axis" x1={m.l} x2={W - m.r} y1={sy(0)} y2={sy(0)} />
        {target && (
          <g>
            <line x1={m.l} x2={W - m.r} y1={sy(target.value)} y2={sy(target.value)} stroke="var(--ink-subtle)" strokeWidth={1} />
            <text x={W - m.r} y={sy(target.value) - 5} textAnchor="end" style={{ fill: 'var(--ink-muted)' }}>{target.label}</text>
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${((m.l + band * hover + band / 2) / W) * 100}%`, top: Math.max(10, sy(totals[hover]) - 4) }}>
          <div className="th">{labels[hover]}</div>
          {series.length > 1 && (
            <div className="tr">
              <span className="tv">{yFormat(totals[hover])}</span>
              <span>total</span>
            </div>
          )}
          {series.map((s, si) => (
            <div key={s.id} className="tr">
              <i className="key" style={{ background: s.color }} />
              <span className="tv">{yFormat(values[hover]?.[si] ?? 0)}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Horizontal bars with labels and values; a compact distribution view. */
export function HBars({
  rows,
  max,
  format = (v) => `${(v * 100).toFixed(1)}%`,
  thickness = 10,
}: {
  rows: { label: ReactNode; value: number; color?: string; sub?: ReactNode; key?: string }[];
  max?: number;
  format?: (v: number) => string;
  thickness?: number;
}) {
  const M = max ?? Math.max(1e-9, ...rows.map((r) => r.value));
  return (
    <div className="col" style={{ gap: 8 }}>
      {rows.map((r, i) => (
        <div key={r.key ?? i} className="hbar-row" title={typeof r.label === 'string' ? `${r.label}: ${format(r.value)}` : undefined}>
          <div className="row-between small" style={{ marginBottom: 4 }}>
            <span className="muted">{r.label}</span>
            <span className="ink tabular medium">
              {format(r.value)}
              {r.sub && <span className="subtle" style={{ marginLeft: 6, fontWeight: 400 }}>{r.sub}</span>}
            </span>
          </div>
          <div className="hbar-track" style={{ height: thickness }} aria-hidden="true">
            {r.value > 0 && <div className="hbar-fill" style={{ width: `${Math.max(0.8, (r.value / M) * 100)}%`, background: r.color ?? 'var(--s1)' }} />}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Sparkline({ values, height = 30, color = 'var(--ink-tertiary)', accent = 'var(--primary-hover)' }: { values: number[]; height?: number; color?: string; accent?: string }) {
  if (values.length < 2) return <div style={{ height }} />;
  const W = 120;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const sx = (i: number) => 2 + (i / (values.length - 1)) * (W - 6);
  const sy = (v: number) => 3 + (height - 6) * (1 - (v - lo) / (hi - lo || 1));
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join('');
  const lx = sx(values.length - 1);
  const ly = sy(values[values.length - 1]);
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" aria-hidden="true" style={{ overflow: 'visible' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r={2.5} fill={accent} />
    </svg>
  );
}

/** GitHub-style activity calendar: columns are weeks (Mon–Sun). */
export function ActivityHeatmap({ activity, weeks = 26, today }: { activity: Record<string, number>; weeks?: number; today: string }) {
  const [y, mo, d] = today.split('-').map(Number);
  const end = new Date(y, mo - 1, d);
  const dow = (end.getDay() + 6) % 7;
  const start = new Date(end);
  start.setDate(end.getDate() - dow - (weeks - 1) * 7);
  const cells: { date: string; v: number; future: boolean }[] = [];
  const vals = Object.values(activity).filter((v) => v > 0).sort((a, b) => a - b);
  const q = (p: number) => (vals.length ? vals[Math.min(vals.length - 1, Math.floor(p * vals.length))] : 1);
  const cuts = [q(0.25), q(0.5), q(0.8)];
  for (let i = 0; i < weeks * 7; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    cells.push({ date: iso, v: activity[iso] ?? 0, future: dt > end });
  }
  const level = (v: number) => (v <= 0 ? 0 : v <= cuts[0] ? 1 : v <= cuts[1] ? 2 : v <= cuts[2] ? 3 : 4);
  return (
    <div>
      <div className="heat" role="img" aria-label={`Study activity over the last ${weeks} weeks`}>
        {cells.map((c) => (
          <i
            key={c.date}
            data-l={c.future ? undefined : level(c.v)}
            className={c.date === today ? 'today' : undefined}
            title={c.future ? '' : `${c.date}: ${c.v > 0 ? Math.round(c.v) + ' activity points' : 'no activity'}`}
            style={c.future ? { opacity: 0.25 } : undefined}
          />
        ))}
      </div>
      <div className="row small subtle mt-2" style={{ gap: 6 }}>
        Less
        <span className="heat" style={{ gridTemplateRows: '11px', display: 'inline-grid' }}>
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} data-l={l} />
          ))}
        </span>
        More
      </div>
    </div>
  );
}
