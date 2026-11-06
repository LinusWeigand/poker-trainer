export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;

export const num = (x: number, d = 0) =>
  x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

export const signed = (x: number, d = 1) => {
  const v = Math.abs(x).toFixed(d);
  if (Number(v) === 0) return (0).toFixed(d);
  return (x > 0 ? '+' : '−') + v;
};

export const money = (x: number, d = 0) => (x < 0 ? '−$' : '$') + num(Math.abs(x), d);

export const compact = (x: number) => Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(x);

export function duration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}${y !== new Date().getFullYear() ? `, ${y}` : ''}`;
}

export function dayName(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return DAYS[new Date(y, m - 1, d).getDay()];
}

export function timeAgo(t: number): string {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export const round = (x: number, d = 0) => {
  const f = 10 ** d;
  return Math.round(x * f) / f;
};
