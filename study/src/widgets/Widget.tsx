import type { ReactNode } from 'react';
import { Sparkles, type LucideIcon } from '../components/icons';
import { cx } from '../components/ui';

export function Widget({
  title,
  icon: Icon = Sparkles,
  right,
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('widget', className)}>
      <div className="widget-head">
        <Icon />
        <span className="title">{title}</span>
        <span className="subtle">· interactive</span>
        {right && <span className="right">{right}</span>}
      </div>
      <div className="widget-body">{children}</div>
    </div>
  );
}

export function KV({ items }: { items: { k: ReactNode; v: ReactNode; sub?: ReactNode }[] }) {
  return (
    <div className="kv">
      {items.map((it, i) => (
        <div key={i}>
          <div className="k">{it.k}</div>
          <div className="v">
            {it.v}
            {it.sub && <small>{it.sub}</small>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A 0–100% meter with a required-threshold tick: is "have" enough? */
export function ThresholdBar({ have, need, haveLabel, needLabel }: { have: number; need: number; haveLabel: string; needLabel: string }) {
  const ok = have >= need;
  return (
    <div className="threshold" aria-label={`${haveLabel} ${(have * 100).toFixed(1)}%, ${needLabel} ${(need * 100).toFixed(1)}%`}>
      <div className="threshold-track">
        <div className="threshold-fill" style={{ width: `${Math.min(100, have * 100)}%`, background: ok ? 'var(--success)' : 'var(--danger)' }} />
        <div className="threshold-tick" style={{ left: `${Math.min(100, need * 100)}%` }} />
      </div>
      <div className="row-between xs subtle mt-1">
        <span>
          {haveLabel}: <span className="ink medium">{(have * 100).toFixed(1)}%</span>
        </span>
        <span>
          {needLabel}: <span className="ink medium">{(need * 100).toFixed(1)}%</span>
        </span>
      </div>
    </div>
  );
}
