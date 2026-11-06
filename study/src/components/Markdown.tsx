// Lesson dialect: ## headings, lists, tables, > quotes, :::kind Title … ::: callouts,
// $$ formula | caption $$, ~~~lang code ~~~, ::widget name {json}.
// Inline: **bold**, *italic*, [text](/route), [[glossary term|label]], {As Kd} cards.
import { Component, Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen, Dumbbell, Info, Lightbulb, Sparkles, TrendingUp, KeyRound } from './icons';
import { parseCards } from '../engine/cards';
import { InlineCards } from './PlayingCard';
import { findTerm } from '../content/glossary';
import { WIDGETS } from '../widgets';

export type Block =
  | { t: 'h2' | 'h3'; text: string; id: string }
  | { t: 'p'; text: string }
  | { t: 'ul' | 'ol'; items: string[] }
  | { t: 'quote'; text: string }
  | { t: 'callout'; kind: string; title: string; body: Block[] }
  | { t: 'formula'; expr: string; caption?: string }
  | { t: 'code'; lang: string; code: string }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'widget'; name: string; props: Record<string, unknown> }
  | { t: 'hr' };

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function dedent(lines: string[]): string[] {
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min));
}

export function parseMarkdown(src: string): Block[] {
  return parseLines(src.replace(/\r/g, '').split('\n'));
}

function parseLines(lines: string[]): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ t: 'p', text: para.join(' ') });
    para = [];
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      flush();
      i++;
      continue;
    }
    if (line.startsWith('~~~')) {
      flush();
      const lang = line.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('~~~')) code.push(lines[i++]);
      i++;
      out.push({ t: 'code', lang, code: dedent(code).join('\n') });
      continue;
    }
    if (line.startsWith(':::')) {
      flush();
      const m = line.match(/^:::(\w+)\s*(.*)$/);
      const body: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') body.push(lines[i++]);
      i++;
      out.push({ t: 'callout', kind: m?.[1] ?? 'note', title: m?.[2] ?? '', body: parseLines(body) });
      continue;
    }
    if (line.startsWith('### ')) {
      flush();
      out.push({ t: 'h3', text: line.slice(4), id: slug(line.slice(4)) });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      flush();
      out.push({ t: 'h2', text: line.slice(3), id: slug(line.slice(3)) });
      i++;
      continue;
    }
    if (line.startsWith('$$')) {
      flush();
      const inner = line.replace(/^\$\$/, '').replace(/\$\$$/, '').trim();
      const sep = inner.indexOf(' | ');
      out.push(sep >= 0 ? { t: 'formula', expr: inner.slice(0, sep).trim(), caption: inner.slice(sep + 3).trim() } : { t: 'formula', expr: inner });
      i++;
      continue;
    }
    if (line.startsWith('::widget')) {
      flush();
      const m = line.match(/^::widget\s+([\w-]+)\s*(\{.*\})?\s*$/);
      let props: Record<string, unknown> = {};
      try {
        props = m?.[2] ? JSON.parse(m[2]) : {};
      } catch {
        props = {};
      }
      out.push({ t: 'widget', name: m?.[1] ?? '', props });
      i++;
      continue;
    }
    if (line === '---') {
      flush();
      out.push({ t: 'hr' });
      i++;
      continue;
    }
    if (line.startsWith('|')) {
      flush();
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i]
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((x) => x.trim());
        if (!cells.every((x) => /^:?-+:?$/.test(x))) rows.push(cells);
        i++;
      }
      out.push({ t: 'table', head: rows[0] ?? [], rows: rows.slice(1) });
      continue;
    }
    if (/^[-*] /.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) items.push(lines[i++].trim().slice(2));
      out.push({ t: 'ul', items });
      continue;
    }
    if (/^\d+\. /.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) items.push(lines[i++].trim().replace(/^\d+\. /, ''));
      out.push({ t: 'ol', items });
      continue;
    }
    if (line.startsWith('> ')) {
      flush();
      out.push({ t: 'quote', text: line.slice(2) });
      i++;
      continue;
    }
    para.push(line);
    i++;
  }
  flush();
  return out;
}

const INLINE = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(\[\[([^\]|]+)(?:\|([^\]]+))?\]\])|(\[([^\]]+)\]\(([^)\s]+)\))|(\{((?:[2-9TJQKA][cdhs]\s?)+)\})/g;

export function renderInline(text: string, keyBase = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  INLINE.lastIndex = 0;
  const re = new RegExp(INLINE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${k++}`;
    if (m[1]) out.push(<strong key={key}>{renderInline(m[2], key)}</strong>);
    else if (m[3]) out.push(<em key={key}>{renderInline(m[4], key)}</em>);
    else if (m[5]) {
      const term = findTerm(m[6]);
      const label = m[7] ?? m[6];
      out.push(
        term ? (
          <Link key={key} to={`/glossary?q=${encodeURIComponent(term.term)}`} className="gloss" data-tip={`${term.term}: ${term.def}`}>
            {label}
          </Link>
        ) : (
          <span key={key}>{label}</span>
        ),
      );
    } else if (m[8]) {
      const href = m[10];
      out.push(
        href.startsWith('/') ? (
          <Link key={key} to={href}>
            {renderInline(m[9], key)}
          </Link>
        ) : (
          <a key={key} href={href} target="_blank" rel="noreferrer">
            {renderInline(m[9], key)}
          </a>
        ),
      );
    } else if (m[11]) out.push(<InlineCards key={key} cards={parseCards(m[12])} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const SYMBOLS: Record<string, string> = {
  times: '×',
  cdot: '·',
  approx: '≈',
  le: '≤',
  ge: '≥',
  ne: '≠',
  pm: '±',
  sum: 'Σ',
  alpha: 'α',
  beta: 'β',
  sigma: 'σ',
  mu: 'μ',
  pi: 'π',
  Delta: 'Δ',
  infty: '∞',
  to: '→',
  Rightarrow: '⇒',
  mid: '∣',
  ln: 'ln',
  left: '',
  right: '',
  quad: ' ',
  qquad: '  ',
  ';': ' ',
  ',': ' ',
};

/** A tiny LaTeX subset: \frac, \text, \sqrt, ^, _, and symbol commands. */
export function renderFormula(src: string, keyBase = 'f'): ReactNode[] {
  const out: ReactNode[] = [];
  let buf = '';
  let i = 0;
  let k = 0;
  const flushBuf = () => {
    if (buf) out.push(buf);
    buf = '';
  };
  const readGroup = (): string => {
    while (src[i] === ' ') i++;
    if (src[i] !== '{') {
      const ch = src[i] ?? '';
      i++;
      return ch;
    }
    let depth = 0;
    const start = i;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    const inner = src.slice(start + 1, i);
    i++;
    return inner;
  };
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      const m = src.slice(i).match(/^\\([a-zA-Z]+|.)/);
      const cmd = m ? m[1] : '';
      i += m ? m[0].length : 1;
      const key = `${keyBase}-${k++}`;
      if (cmd === 'frac') {
        flushBuf();
        const a = readGroup();
        const b = readGroup();
        out.push(
          <span key={key} className="frac">
            <span>{renderFormula(a, key + 'n')}</span>
            <span>{renderFormula(b, key + 'd')}</span>
          </span>,
        );
      } else if (cmd === 'text') {
        buf += readGroup();
      } else if (cmd === 'sqrt') {
        flushBuf();
        const a = readGroup();
        out.push(
          <span key={key}>
            √<span style={{ borderTop: '1px solid var(--ink-subtle)', paddingTop: 1 }}>{renderFormula(a, key)}</span>
          </span>,
        );
      } else buf += SYMBOLS[cmd] ?? cmd;
    } else if (ch === '^' || ch === '_') {
      flushBuf();
      i++;
      const g = readGroup();
      const key = `${keyBase}-${k++}`;
      out.push(ch === '^' ? <sup key={key}>{renderFormula(g, key)}</sup> : <sub key={key}>{renderFormula(g, key)}</sub>);
    } else if (ch === '{' || ch === '}') {
      i++;
    } else {
      buf += ch === '-' ? '−' : ch === '*' ? '×' : ch;
      i++;
    }
  }
  flushBuf();
  return out;
}

const CALLOUT: Record<string, { icon: typeof Info; label: string }> = {
  note: { icon: Info, label: 'Note' },
  tip: { icon: Lightbulb, label: 'Tip' },
  warn: { icon: AlertTriangle, label: 'Careful' },
  key: { icon: KeyRound, label: 'Key idea' },
  example: { icon: BookOpen, label: 'Example' },
  sig: { icon: TrendingUp, label: 'Trading lens' },
  drill: { icon: Dumbbell, label: 'Practice' },
};

class WidgetBoundary extends Component<{ name: string; children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error) return <div className="notice warn">The “{this.props.name}” widget failed to load.</div>;
    return this.props.children;
  }
}

function renderBlock(b: Block, key: string): ReactNode {
  switch (b.t) {
    case 'h2':
      return (
        <h2 key={key} id={b.id}>
          {renderInline(b.text, key)}
        </h2>
      );
    case 'h3':
      return (
        <h3 key={key} id={b.id}>
          {renderInline(b.text, key)}
        </h3>
      );
    case 'p':
      return <p key={key}>{renderInline(b.text, key)}</p>;
    case 'ul':
      return (
        <ul key={key}>
          {b.items.map((it, j) => (
            <li key={j}>{renderInline(it, `${key}-${j}`)}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol key={key}>
          {b.items.map((it, j) => (
            <li key={j}>{renderInline(it, `${key}-${j}`)}</li>
          ))}
        </ol>
      );
    case 'quote':
      return <blockquote key={key}>{renderInline(b.text, key)}</blockquote>;
    case 'hr':
      return <hr key={key} />;
    case 'formula':
      return (
        <div key={key} className="formula" role="math" aria-label={b.expr}>
          <span className="fx">{renderFormula(b.expr, key)}</span>
          {b.caption && <span className="cap">{renderInline(b.caption, key + 'c')}</span>}
        </div>
      );
    case 'code':
      return (
        <Fragment key={key}>
          {b.lang && <div className="code-lang">{b.lang}</div>}
          <pre>
            <code>{b.code}</code>
          </pre>
        </Fragment>
      );
    case 'table':
      return (
        <div key={key} className="table-box">
          <table>
            <thead>
              <tr>
                {b.head.map((h, j) => (
                  <th key={j}>{renderInline(h, `${key}-h${j}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, j) => (
                <tr key={j}>
                  {r.map((cell, x) => (
                    <td key={x}>{renderInline(cell, `${key}-${j}-${x}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'callout': {
      const meta = CALLOUT[b.kind] ?? { icon: Sparkles, label: '' };
      const Icon = meta.icon;
      return (
        <div key={key} className={`callout ${b.kind}`}>
          <Icon />
          <div className="callout-body">
            <div className="callout-title">{b.title || meta.label}</div>
            {b.body.map((x, j) => renderBlock(x, `${key}-${j}`))}
          </div>
        </div>
      );
    }
    case 'widget': {
      const W = WIDGETS[b.name];
      if (!W) return <div key={key} className="notice warn">Unknown widget “{b.name}”.</div>;
      return (
        <WidgetBoundary key={key} name={b.name}>
          <W {...b.props} />
        </WidgetBoundary>
      );
    }
  }
}

export function Markdown({ blocks }: { blocks: Block[] }) {
  return <div className="prose">{blocks.map((b, i) => renderBlock(b, `b${i}`))}</div>;
}
