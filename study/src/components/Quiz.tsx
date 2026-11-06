import { useEffect, useRef, useState } from 'react';
import type { QuizQ } from '../content/types';
import { renderInline } from './Markdown';
import { Button, Badge, cx } from './ui';
import { CircleCheck, CircleX, RotateCcw } from './icons';

export interface QuizAnswer {
  value: string;
  correct: boolean;
}

export function isCorrect(q: QuizQ, value: string): boolean {
  if (q.choices) return Number(value) === q.answer;
  const v = parseFloat(value.replace(/[,%$\s]/g, '').replace('−', '-'));
  if (!Number.isFinite(v)) return false;
  return Math.abs(v - q.answer) <= (q.tolerance ?? 0) + 1e-9;
}

export function formatAnswer(q: QuizQ): string {
  if (q.choices) return q.choices[q.answer];
  return `${q.unit === '$' ? '$' : ''}${q.answer}${q.unit && q.unit !== '$' ? (q.unit === '%' ? '%' : ' ' + q.unit) : ''}`;
}

function Question({ q, index, answer, onAnswer }: { q: QuizQ; index: number; answer?: QuizAnswer; onAnswer: (a: QuizAnswer) => void }) {
  const [text, setText] = useState('');
  const done = !!answer;
  const submitNumeric = () => {
    if (!text.trim() || done) return;
    onAnswer({ value: text, correct: isCorrect(q, text) });
  };
  return (
    <div className="quiz-q">
      <div className="row-top">
        <span className="badge" style={{ flexShrink: 0, marginTop: 2 }}>
          {index + 1}
        </span>
        <div className="grow">
          <div className="q">{renderInline(q.q, `q${index}`)}</div>
          {q.choices ? (
            <div className="choices">
              {q.choices.map((c, i) => {
                const picked = answer && Number(answer.value) === i;
                const right = done && i === q.answer;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={done}
                    className={cx('choice', picked && 'picked', right && 'correct', picked && !answer.correct && 'wrong')}
                    onClick={() => onAnswer({ value: String(i), correct: i === q.answer })}
                  >
                    <span className="key">{String.fromCharCode(65 + i)}</span>
                    <span>{renderInline(c, `q${index}c${i}`)}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="row mt-3" style={{ maxWidth: 360 }}>
              <span className="input-group grow">
                <input
                  className="input tabular"
                  inputMode="decimal"
                  placeholder="Your answer"
                  value={done ? answer.value : text}
                  disabled={done}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitNumeric()}
                  aria-label={`Answer to question ${index + 1}`}
                />
                {q.unit && <span className="input-suffix">{q.unit}</span>}
              </span>
              <Button variant="secondary" onClick={submitNumeric} disabled={done || !text.trim()}>
                Check
              </Button>
            </div>
          )}
          {done && (
            <div className="explain">
              <div className="row mb-2">
                {answer.correct ? <CircleCheck className="good" /> : <CircleX className="bad" />}
                <strong className={answer.correct ? 'good' : 'bad'}>{answer.correct ? 'Correct' : `Not quite. Answer: ${formatAnswer(q)}`}</strong>
              </div>
              {renderInline(q.explain, `q${index}e`)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Quiz({ questions, onComplete, title = 'Check your understanding' }: { questions: QuizQ[]; onComplete?: (score: number) => void; title?: string }) {
  const [answers, setAnswers] = useState<(QuizAnswer | undefined)[]>([]);
  const [round, setRound] = useState(0);
  const reported = useRef(false);
  const answered = answers.filter(Boolean).length;
  const correct = answers.filter((a) => a?.correct).length;
  const finished = answered === questions.length && questions.length > 0;

  useEffect(() => {
    if (finished && !reported.current) {
      reported.current = true;
      onComplete?.(correct / questions.length);
    }
  }, [finished, correct, questions.length, onComplete]);

  const reset = () => {
    setAnswers([]);
    reported.current = false;
    setRound((r) => r + 1);
  };

  return (
    <section className="card quiz" aria-label={title}>
      <header className="card-head">
        <h3>{title}</h3>
        <div className="row">
          {finished ? (
            <Badge tone={correct / questions.length >= 0.67 ? 'good' : 'warn'}>
              {correct} / {questions.length} correct
            </Badge>
          ) : (
            <span className="small subtle">
              {answered} / {questions.length} answered
            </span>
          )}
          {answered > 0 && (
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={reset}>
              Retry
            </Button>
          )}
        </div>
      </header>
      {questions.map((q, i) => (
        <Question
          key={`${round}-${i}`}
          q={q}
          index={i}
          answer={answers[i]}
          onAnswer={(a) =>
            setAnswers((prev) => {
              const next = [...prev];
              next[i] = a;
              return next;
            })
          }
        />
      ))}
    </section>
  );
}
