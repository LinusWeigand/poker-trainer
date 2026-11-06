import type { Lesson } from '../types';

const md = String.raw;

export const PREFLOP_LESSONS: Lesson[] = [
  {
    id: 'position',
    module: 'preflop',
    title: 'Position & Table Dynamics',
    summary: 'Six seats, who acts when, and why acting last is worth so much money.',
    minutes: 11,
    level: 1,
    drills: ['preflop'],
    body: md`
## Six seats
In 6-max the seats, in preflop order of action, are **UTG** (under the gun), **HJ** (hijack), **CO** (cutoff), **BTN** (button), **SB** (small blind) and **BB** (big blind). Preflop, UTG acts first and the BB acts last. Postflop the order flips: the SB acts first and the BTN acts last.

::widget position-table

## Why position is worth so much
- **Information.** You see what villain does before you decide.
- **Pot control.** You can check behind for a free card or a cheap showdown.
- **Bluffing.** You can bet when villain shows weakness by checking.
- **Realization.** The in-position player realises more than their raw equity; the out-of-position player realises less.

Every position-based range follows from this. The later your seat, the fewer players are left to act behind you, and the more often you will have position after the flop. So you can open wider.

## Players behind you
From UTG, five players can wake up with a strong hand; from the BTN, only the blinds. A given player holds JJ+ or AK about (24 + 16) / 1326 ≈ 3.0% of the time.

| Players behind | P(someone has JJ+ or AK) |
|---|---|
| 5 (UTG) | ≈ 14.2% |
| 4 (HJ) | ≈ 11.5% |
| 3 (CO) | ≈ 8.8% |
| 2 (BTN) | ≈ 5.9% |

These are approximations that ignore card removal, but they show how fast the risk grows.

## The blinds
The blinds have money in already, so they get a discount when calling. But they play out of position after the flop (the SB against everyone, the BB against everyone but the SB). For almost every winning player the blinds lose money over time; the goal there is to **lose less**.
`,
    quiz: [
      { q: 'Who acts last after the flop in 6-max, if they are in the hand?', choices: ['UTG', 'SB', 'BTN', 'BB'], answer: 2, explain: 'The button always acts last postflop.' },
      {
        q: 'Why can the BTN open much wider than UTG?',
        choices: ['Fewer players left behind, and position after the flop', 'The button gets better cards', 'The blinds always fold', 'The button pays less rake'],
        answer: 0,
        explain: 'Only two players can wake up with a hand, and the button will be in position whoever calls.',
      },
      { q: 'Roughly how likely is it that at least one of five players behind you holds JJ+ or AK?', answer: 14, tolerance: 2, unit: '%', explain: '1 − 0.97⁵ ≈ 14%.' },
    ],
  },
  {
    id: 'rfi',
    module: 'preflop',
    title: 'Opening Ranges (RFI)',
    summary: 'The skeleton every good opening range shares, and how it widens seat by seat.',
    minutes: 15,
    level: 1,
    drills: ['preflop'],
    tools: ['charts'],
    body: md`
## Raise first in
When everyone folds to you, you either raise or fold. Open-limping is rarely right outside the small blind. Standard opens at 100bb 6-max are **2.5bb** from UTG to BTN (some players use 2–2.3bb on the button) and **3bb** from the small blind. An open is also called [[RFI]].

## The shape of a good opening range
Look at any solver opening range and the same skeleton appears:
- **Pocket pairs.** All of them from late position. Small pairs drop out early because they need implied odds and flop poorly.
- **Suited aces.** A5s–A2s stay in even from early position: they make nut flushes and wheels, and they block AA and AK.
- **Suited broadways and connectors.** These have playability: they make strong draws and two pairs.
- **Offsuit broadways.** Only the best from early position; more of them later.
- **Offsuit junk.** Never. It realises poorly and is dominated.

::widget range-chart {"charts": ["rfi-utg", "rfi-hj", "rfi-co", "rfi-btn", "rfi-sb"]}

| Position | Open % (study charts) |
|---|---|
| UTG | ≈ 17% |
| HJ | ≈ 21% |
| CO | ≈ 26% |
| BTN | ≈ 43% |
| SB | ≈ 40% (raise-or-fold simplification) |

:::warn These are study charts
The charts in this app are simplified, pure-strategy approximations of 100bb solver output. Real solutions mix many hands (22 opened some of the time from UTG, for example). Learn the shape and the reasons, and do not treat the edge hands as sacred.
:::

## Sizing
Smaller opens from late position risk less to win the blinds. A bigger open from the small blind discourages the big blind, who will have position, from defending wide. The exact size matters less than a consistent structure with good reasons behind it.
`,
    quiz: [
      {
        q: 'Why do A5s–A2s stay in early-position opening ranges while A9o does not?',
        choices: ['Nut-flush and wheel potential plus an ace blocker', 'They win more preflop all-ins', 'They are never dominated', 'They flop more pairs'],
        answer: 0,
        explain: 'Suited wheel aces have playability and block premiums. A9o is dominated by stronger aces and makes few strong hands.',
      },
      { q: 'About what percentage of hands does the button open in the study charts?', answer: 43, tolerance: 4, unit: '%', explain: 'Around 43%. Solver button ranges are in the 40–50% range depending on rake and sizing.' },
      { q: 'Which open is usually the largest?', choices: ['UTG 2.5bb', 'BTN 2.5bb', 'SB 3bb', 'CO 2.5bb'], answer: 2, explain: 'The SB raises bigger because it will be out of position against the BB.' },
    ],
  },
  {
    id: '3bet',
    module: 'preflop',
    title: '3-Betting: Linear vs. Polarized',
    summary: 'Two range shapes, when each is right, what makes a good 3-bet bluff, and how big to go.',
    minutes: 14,
    level: 2,
    drills: ['preflop'],
    tools: ['charts'],
    body: md`
## Two shapes
- **Linear (merged).** 3-bet the top X% of hands: QQ+, AK, AQ, AJs, KQs, JJ, TT and so on. Use it when villain calls 3-bets a lot, because you get value from worse hands. It is typical in position against late opens and against loose players.
- **Polarized.** 3-bet the strongest hands plus hands that would otherwise fold or call poorly (A5s, K9s, 76s), and *call* with the middle (TT–77, AQ, KQ). Use it when calling is a real option and villain folds a lot to 3-bets. It is typical out of position from the blinds.

## A good 3-bet bluff has
- **Blockers.** A5s blocks AA and AK; suited kings block KK and AK.
- **Playability.** Suited hands can make nut hands when called.
- **Low value as a call.** It would be a marginal flat anyway.

## Sizing
In position, 3-bet to about **3×** the open (2.5bb → 7.5–8bb). Out of position, go to about **4×** (→ 10–11bb), because you will play the pot from behind and want to deny equity.

::widget range-chart {"charts": ["bb-vs-btn", "bb-vs-utg"]}

:::key Why 3-bet bluff at all?
If you only 3-bet value, observant opponents fold everything but premiums and your value hands get no action. Bluffs make your 3-bets credible, and they win dead money (the open plus the blinds) immediately whenever villain folds.
:::

Notice how the BB's 3-bet range against UTG is tight and value-heavy, while against the BTN it widens and includes more suited bluffs. UTG's range is strong, so it calls and 4-bets well; the BTN's is wide and folds more.
`,
    quiz: [
      { q: 'A polarized 3-bet range consists of…', choices: ['Strong value hands plus some bluffs', 'The top X% of hands', 'Only premium pairs', 'Random hands'], answer: 0, explain: 'Polarized means strong hands and bluffs with the middle removed, usually to the calling range.' },
      { q: 'Which is the classic 3-bet bluff?', choices: ['A5s', 'KJo', '99', 'AQo'], answer: 0, explain: 'A5s blocks AA and AK and plays well when called. KJo and AQo are better as calls, and 99 is value or a call.' },
      { q: 'A standard out-of-position 3-bet against a 2.5bb open is…', choices: ['7bb', '10–11bb', '20bb', '5bb'], answer: 1, explain: 'About 4× the open, because you will be out of position.' },
    ],
  },
  {
    id: 'bb-defense',
    module: 'preflop',
    title: 'Big Blind Defense',
    summary: 'The best price at the table: how wide to defend, with what, and against whom.',
    minutes: 13,
    level: 2,
    drills: ['preflop', 'pot-odds'],
    tools: ['charts'],
    body: md`
## The best price at the table
The BB has already invested 1bb. Facing a 2.5bb button open with the SB folding, the pot is 2.5 + 1 + 0.5 = 4bb. You call 1.5bb to win 5.5bb:

$$ \text{Required equity} = \frac{1.5}{5.5} \approx 27\% $$

Almost every hand has 30% or more equity against a wide button range, but you will be out of position and will not realise all of it.

## How wide?
Full solver solutions defend the big blind very wide against late-position opens (often well over half of all hands against a button min-raise) and much tighter against early opens. The simplified charts here defend about 52% against the button and about 22% against UTG; real solutions add many marginal hands at mixed frequencies.

## What to defend
- **Suited hands.** Nearly all of them against late opens, because they realise well.
- **Connected offsuit hands** such as T9o and 87o. Decent against the button.
- **Offsuit junk** such as K3o, Q4o and 72o. Fold: it is dominated and realises badly.
- **3-bets.** The strongest hands plus blocker bluffs; call the middle.

::widget range-chart {"charts": ["bb-vs-btn", "bb-vs-utg"]}

## Defending against the small blind
The SB opens wide and the BB has position after the flop, so the BB defends wider and 3-bets more against the SB than against any other seat.

:::example Smaller opens, wider defense
Against a 2.2bb button open (SB folds) the pot is 3.7bb and you call 1.2bb into a final pot of 4.9bb, so you need only 24.5%. Smaller opens mean wider big blind defense.
:::
`,
    quiz: [
      { q: 'BB facing a 2.5bb BTN open, SB folds: what equity do you need to call?', answer: 27.3, tolerance: 1, unit: '%', explain: '1.5 / (2.5 + 0.5 + 1 + 1.5) = 1.5 / 5.5 ≈ 27.3%.' },
      { q: 'Which is a clearer BB defend against a BTN open?', choices: ['K7s', 'K3o'], answer: 0, explain: 'Suited hands realise much better. K3o is dominated and makes few strong hands.' },
      { q: 'Against which opener does the BB defend widest?', choices: ['SB', 'UTG', 'HJ', 'CO'], answer: 0, explain: 'The SB opens widest, and the BB has position on it.' },
    ],
  },
  {
    id: 'vs-3bet',
    module: 'preflop',
    title: 'Facing 3-Bets & 4-Bets',
    summary: 'How much you must continue, what calls and what 4-bets, and why SPR changes everything.',
    minutes: 14,
    level: 2,
    drills: ['preflop'],
    tools: ['charts'],
    body: md`
## How much must you continue?
Facing a 3-bet you can fold, call or 4-bet. If you fold too much, villain's 3-bet bluffs print money. The benchmark works like alpha:

:::example BTN opens 2.5bb, BB 3-bets to 11bb
The BB risks 10 more (the 1bb blind is already in) to win the 4bb in the pot. A pure 3-bet bluff needs folds 10 / (10 + 4) ≈ **71%** of the time. So the BTN should continue with at least about 29% of its opening range. The study chart continues with about 42%.
:::

## Calling 3-bets
Good calls have playability and dominate villain's bluffs: pocket pairs (JJ–55 in position), suited broadways (AQs, KQs) and suited connectors in position. Position matters even more in 3-bet pots, and calling out of position is much worse.

## 4-betting
At 100bb, a polarized 4-bet range (QQ+ and AK for value, A5s–A4s as blocker bluffs) is standard. A 4-bet is usually about 2.2–2.5× the 3-bet in position, and somewhat larger out of position.

::widget range-chart {"charts": ["btn-vs-3bet", "utg-vs-3bet"]}

## SPR in 3-bet pots
A 3-bet to 11bb that gets called makes the pot 11 + 11 + 0.5 = 22.5bb with 89bb behind, an [[SPR]] of about **4**. At that depth, top pair with a good kicker is often strong enough to get all-in. That is another reason 3-bet ranges are tighter and why hands like AJo and KQo become marginal.

Compare the two charts: UTG's range is already strong, so it continues with a larger share of it. The BTN's range is wide, so it folds more of it but still defends far more hands in absolute terms.
`,
    quiz: [
      { q: 'BTN opens 2.5bb and the BB 3-bets to 11bb. What fold percentage does a pure 3-bet bluff need?', answer: 71, tolerance: 2, unit: '%', explain: 'Risk 10 to win 4: 10 / 14 ≈ 71%.' },
      { q: 'With 100bb stacks, what is the SPR after a 3-bet to 11bb is called?', answer: 4, tolerance: 0.4, explain: 'Pot ≈ 22.5bb, stacks 89bb, so 89 / 22.5 ≈ 4.' },
      { q: 'A typical 4-bet bluff is…', choices: ['A5s', '72o', 'KQo', '22'], answer: 0, explain: 'It blocks AA and AK, and it has playability on the occasions it gets called.' },
    ],
  },
];
