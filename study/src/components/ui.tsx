import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { create } from 'zustand';
import { Check, CircleCheck, X, type LucideIcon } from 'lucide-react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  to?: string;
  block?: boolean;
}

export function Button({ variant = 'secondary', size = 'md', icon: Icon, iconRight: IconR, to, block, className, children, ...rest }: ButtonProps) {
  const cls = cx('btn', `btn-${variant}`, size !== 'md' && `btn-${size}`, block && 'btn-block', className);
  const inner = (
    <>
      {Icon && <Icon />}
      {children}
      {IconR && <IconR />}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {inner}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className, ...rest }: { icon: LucideIcon; label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cx('icon-btn', className)} aria-label={label} title={label} {...rest}>
      <Icon />
    </button>
  );
}

export function Card({
  title,
  icon: Icon,
  actions,
  children,
  pad = true,
  className,
}: {
  title?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children?: ReactNode;
  pad?: boolean;
  className?: string;
}) {
  return (
    <section className={cx('card', className)}>
      {(title || actions) && (
        <header className="card-head">
          <div className="row">
            {Icon && <Icon size={14} className="subtle" />}
            {typeof title === 'string' ? <h3>{title}</h3> : title}
          </div>
          {actions && <div className="row">{actions}</div>}
        </header>
      )}
      {pad ? <div className="card-body">{children}</div> : children}
    </section>
  );
}

export function Badge({
  tone = 'default',
  dot,
  icon: Icon,
  children,
  title,
}: {
  tone?: 'default' | 'primary' | 'good' | 'bad' | 'warn';
  dot?: string;
  icon?: LucideIcon;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span className={cx('badge', tone !== 'default' && `badge-${tone}`, dot && 'badge-dot')} style={dot ? ({ '--dot': dot } as React.CSSProperties) : undefined} title={title}>
      {Icon && <Icon />}
      {children}
    </span>
  );
}

export const Kbd = ({ children }: { children: ReactNode }) => <kbd className="kbd">{children}</kbd>;

export function Progress({ value, tone, large, label }: { value: number; tone?: 'good'; large?: boolean; label?: string }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className={cx('progress', tone, large && 'progress-lg')} role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${v * 100}%` }} />
    </div>
  );
}

/** Linear-style status circle. */
export function StatusIcon({ status, progress = 0.5, size = 14 }: { status: 'backlog' | 'todo' | 'in_progress' | 'done'; progress?: number; size?: number }) {
  const r = 5.5;
  const c = 7;
  if (status === 'done') {
    return (
      <svg className="status-icon" width={size} height={size} viewBox="0 0 14 14" aria-label="Done">
        <circle cx={c} cy={c} r={6.5} fill="var(--primary)" />
        <path d="M4.3 7.2 6.1 9l3.6-3.8" fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === 'backlog') {
    return (
      <svg className="status-icon" width={size} height={size} viewBox="0 0 14 14" aria-label="Not started">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--ink-tertiary)" strokeWidth={1.5} strokeDasharray="1.6 1.9" />
      </svg>
    );
  }
  if (status === 'todo') {
    return (
      <svg className="status-icon" width={size} height={size} viewBox="0 0 14 14" aria-label="To do">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--ink-subtle)" strokeWidth={1.5} />
      </svg>
    );
  }
  const p = Math.max(0.08, Math.min(0.92, progress));
  const a = p * 2 * Math.PI;
  const ir = 3.2;
  const x = c + ir * Math.sin(a);
  const y = c - ir * Math.cos(a);
  return (
    <svg className="status-icon" width={size} height={size} viewBox="0 0 14 14" aria-label="In progress">
      <circle cx={c} cy={c} r={r} fill="none" stroke="#f2c94c" strokeWidth={1.5} />
      <path d={`M${c} ${c} L${c} ${c - ir} A${ir} ${ir} 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y} Z`} fill="#f2c94c" />
    </svg>
  );
}

export function Prio({ level }: { level: number }) {
  return (
    <span className="prio" aria-label={`Difficulty ${level} of 3`} title={['', 'Foundational', 'Intermediate', 'Advanced'][level]}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= level ? 'on' : undefined} />
      ))}
    </span>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
  hint,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: ReactNode;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="slider">
      <span className="slider-head">
        <span className="label">{label}</span>
        <span className="slider-value">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--fill': `${fill}%` } as React.CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  min,
  max,
  hint,
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  hint?: ReactNode;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <span className="input-group">
        <input
          className="input tabular"
          type="number"
          value={Number.isFinite(value) ? value : ''}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </span>
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : undefined} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={t.value === value} className={t.value === value ? 'on' : undefined} onClick={() => onChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={cx('switch', on && 'on')} onClick={() => onChange(!on)} />;
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className={cx('check', checked && 'on')} onClick={onChange}>
      {checked && <Check />}
    </button>
  );
}

export function Stat({ label, value, sub, icon: Icon }: { label: ReactNode; value: ReactNode; sub?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="stat">
      <span className="stat-label">
        {Icon && <Icon />}
        {label}
      </span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function Empty({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <Icon />
      <h3>{title}</h3>
      {children && <p style={{ maxWidth: 420 }}>{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="row wrap">{actions}</div>}
    </div>
  );
}

export function Section({ title, actions, children, className }: { title: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('section', className)}>
      <div className="section-head">
        <h2>{title}</h2>
        {actions && <div className="row">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('modal', size === 'lg' && 'modal-lg')} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

interface ToastState {
  toasts: { id: number; msg: string }[];
  push: (msg: string) => void;
}

const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (msg) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, msg }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2600);
  },
}));

export const toast = (msg: string) => useToasts.getState().push(msg);

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <CircleCheck />
          {t.msg}
        </div>
      ))}
    </div>
  );
}
