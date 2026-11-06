# Equilibrium: poker study app

A local study app for the 30-week plan: math → preflop → game theory → exploitation → integration, plus a
trading lens and a solver (CFR) track that builds toward the C++ engine in `../engine`.

```bash
cd study
npm install      # first time only
npm run dev      # http://localhost:5173
```

From the repository root you can also run `npm --prefix study run dev`.

## What's inside

| Area | Where |
|---|---|
| 30-week plan with auto-ticking tasks | `src/content/plan.ts`, `src/pages/Plan.tsx` |
| 42 lessons (7 modules) with quizzes | `src/content/lessons/*.ts` |
| 26 interactive lesson widgets | `src/widgets/` |
| 12 procedural drills + 8 checkpoint exams | `src/drills/`, `src/content/exams.ts` |
| ~115 spaced-repetition flashcards (SM-2) | `src/content/flashcards.ts`, `src/engine/srs.ts` |
| Equity calculator (web worker), range explorer, preflop charts | `src/pages/tools/` |
| Variance, Kelly, toy games, CFR lab | `src/pages/tools/Labs.tsx` |
| Hand journal, sessions & results tracker, library, glossary | `src/pages/` |

Lessons use a small markdown dialect (see `src/components/Markdown.tsx`): `$$ formula | caption $$`,
`:::tip Title … :::` callouts, `::widget name {json}`, `{As Kd}` card chips and `[[term]]` glossary links.

## Engine

`src/engine` holds a 7-card evaluator, exact/Monte Carlo equity, range parsing, hand classification,
board texture, Kuhn poker CFR/CFR+ with exact best responses, toy-game solutions and SM-2 scheduling.
Card ids match the C++ engine (rank × 4 + suit).

```bash
npm test             # engine unit tests (includes all 2,598,960 five-card hands)
npm run typecheck
npm run precompute   # regenerate preflop equity vs. a random hand
```

## Data

Progress lives in this browser's localStorage under `equilibrium-study`. Export a backup from Settings.
The design follows `DESIGN.md` (Linear), dark only.
