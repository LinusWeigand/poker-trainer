import type { Lesson } from '../types';

const md = String.raw;

export const MATH_LESSONS: Lesson[] = [
  {
    id: 'ev',
    module: 'math',
    title: 'Thinking in Expected Value',
    summary: 'Every poker decision is a bet with a distribution of outcomes. Expected value is the scoreboard that matters.',
    minutes: 12,
    level: 1,
    drills: ['ev'],
    body: md`
## Decisions, not results
Poker is a long sequence of decisions under uncertainty. A decision is good if it maximises **expected value** ([[EV]]): the average result you would get if you could replay the exact same spot thousands of times. The result of a single hand is noise; EV is the signal.

$$ EV = \sum_i p_i \times v_i | Sum over every outcome i: its probability times its value $$

:::key The core habit
Before every decision ask: what are the outcomes, how likely is each, and what do I win or lose in each? Then compare the EV of **every** option (fold, call, raise), not just whether one option is +EV.
:::

## A first example
The pot is $100. Villain bets $50 and you hold a draw that wins 25% of the time by the river. Assume no more betting.

- **Fold:** EV = 0. The money already in the pot is not yours anymore.
- **Call:** you win $150 (the pot plus villain's bet) 25% of the time and lose your $50 call 75% of the time.

$$ EV_{call} = 0.25 \times 150 - 0.75 \times 50 = 37.5 - 37.5 = 0 $$

Break-even. With 30% equity the same call is worth 0.30 × 150 − 0.70 × 50 = **+$10** every time you make it.

:::note Sunk cost
Measure EV from the current decision point. Chips you already put in the pot are gone; folding is always worth exactly 0 and is the baseline every other option is compared against.
:::

::widget ev-call

## The EV of a bluff
You bet $75 into $100 with a hand that never wins at showdown. If villain folds a fraction f of the time:

$$ EV_{bluff} = f \times 100 - (1 - f) \times 75 $$

This is break-even at f = 75 / 175 ≈ 43%. The ratio *risk / (risk + reward)* shows up everywhere in poker; we will call it [[alpha]].

## Variance is not the enemy
A +EV decision still loses often. A 30%-equity call loses 70% of the time and is still correct. Winning players repeat small edges many times and let the law of large numbers do the work. Judge yourself by the quality of the decision, not the outcome. Judging by outcomes has a name, [[resulting]], and it is the most common way players learn the wrong lessons.

:::sig Trading lens
A market maker quoting with a one-tick edge loses money on many individual trades. The question is never "did this trade make money?" but "was my expected edge positive given what I knew?" It is the same habit at a different table.
:::
`,
    quiz: [
      {
        q: 'The pot is $60 and villain bets $20. You estimate 20% equity and there is no more betting. What is the EV of calling, in dollars?',
        answer: 0,
        tolerance: 0.5,
        unit: '$',
        explain: 'EV = 0.20 × (60 + 20) − 0.80 × 20 = 16 − 16 = 0. A break-even call.',
      },
      {
        q: 'You called a river bet with 35% equity and lost. The call was…',
        choices: ['A mistake, because you lost', 'Correct if the price required less than 35% equity', 'Always correct', 'Impossible to evaluate'],
        answer: 1,
        explain: 'A decision is judged by its EV given the information at the time. If the price required, say, 25% equity, calling with 35% is correct whatever card came.',
      },
      {
        q: 'You bluff $50 into a $50 pot with a hand that never wins. What fold percentage do you need to break even?',
        answer: 50,
        tolerance: 1,
        unit: '%',
        explain: 'Risk / (risk + reward) = 50 / (50 + 50) = 50%.',
      },
      {
        q: 'What is the right EV baseline for folding?',
        choices: ['0', 'Minus what you have invested', 'The size of the pot', 'It depends on your stack'],
        answer: 0,
        explain: 'Folding neither wins nor loses anything from this point on, so its EV is 0. Money already invested is a sunk cost.',
      },
    ],
  },
  {
    id: 'pot-odds',
    module: 'math',
    title: 'Pot Odds & Required Equity',
    summary: 'The price the pot lays you, the equity you need to call, and five numbers to memorise.',
    minutes: 12,
    level: 1,
    drills: ['pot-odds'],
    tools: ['calculators'],
    body: md`
## The price of a call
When villain bets, the pot lays you a price. If you call C to win a final pot that contains everything in the middle after your call, you need to win at least C / final pot of the time:

$$ \text{Required equity} = \frac{\text{Call}}{\text{Pot} + \text{Bet} + \text{Call}} | Pot is the pot before villain's bet $$

Pot $100, villain bets $50: you call $50 into a final pot of $200, so you need **25%**.

If you write the bet as a fraction s of the pot, the formula collapses to:

$$ \text{Required equity} = \frac{s}{1 + 2s} $$

## Bet size → price
| Villain bets | You call | Final pot | Required equity |
|---|---|---|---|
| ¼ pot | 25 | 150 | 16.7% |
| ⅓ pot | 33 | 167 | 20.0% |
| ½ pot | 50 | 200 | 25.0% |
| ⅔ pot | 67 | 233 | 28.6% |
| ¾ pot | 75 | 250 | 30.0% |
| Pot | 100 | 300 | 33.3% |
| 1.5× pot | 150 | 400 | 37.5% |
| 2× pot | 200 | 500 | 40.0% |

::widget pot-odds-curve

:::tip Memorise five numbers
⅓ pot → 20%, ½ pot → 25%, ⅔ pot → 28.6%, pot → 33%, 2× pot → 40%. Everything in between you can interpolate at the table.
:::

## Odds format
Players also quote odds: calling 50 to win 150 is "3 to 1". To turn odds of a : b against into a probability, take b / (a + b). Here that is 1 / (3 + 1) = 25%. It is the same number as before, written another way.

## Pot odds are only the starting point
Pot odds assume the hand ends after your call, as it does when you are all-in or on the river. With money still behind you also need:

- **Equity realization.** Out of position you will not realise your raw equity. See [Equity & realization](/learn/equity).
- **Implied odds.** The extra money you win when you hit. See [Implied odds](/learn/implied-odds).
- **Reverse implied odds.** The extra money you lose when you make a second-best hand.

:::drill Practice
The [Pot odds drill](/practice/pot-odds) generates random spots. Aim for ±2% accuracy in under five seconds per question.
:::
`,
    quiz: [
      { q: 'Pot is 80, villain bets 40. What equity do you need to call?', answer: 25, tolerance: 1, unit: '%', explain: 'Call 40 into a final pot of 80 + 40 + 40 = 160: 40 / 160 = 25%.' },
      { q: 'Villain shoves 300 into a pot of 100. What equity do you need to call?', answer: 42.9, tolerance: 1, unit: '%', explain: 's = 3, so s / (1 + 2s) = 3 / 7 ≈ 42.9%.' },
      { q: 'You are getting 4 : 1 on a call. What is the break-even probability?', answer: 20, tolerance: 1, unit: '%', explain: '1 / (4 + 1) = 20%.' },
      { q: 'Against a ⅔-pot bet you need about…', choices: ['20%', '25%', '28.6%', '33%'], answer: 2, explain: '(2/3) / (1 + 4/3) = 2/7 ≈ 28.6%.' },
    ],
  },
  {
    id: 'outs',
    module: 'math',
    title: 'Outs & the Rule of 2 and 4',
    summary: 'Count the cards that win, turn them into probabilities, and know when the shortcut lies.',
    minutes: 14,
    level: 1,
    drills: ['outs', 'outs-equity'],
    body: md`
## Counting outs
An [[outs|out]] is an unseen card that improves you to what is probably the best hand. Learn these by heart:

| Draw | Outs |
|---|---|
| Flush draw | 9 |
| Open-ended straight draw | 8 |
| Gutshot | 4 |
| Two overcards vs. one pair | 6 |
| Flush draw + gutshot | 12 |
| Flush draw + open-ender | 15 |
| Set → full house or better (flop to turn) | 7 |
| Set → full house or better (turn to river) | 10 |

## Exact probabilities
On the flop you have seen 5 cards, so 47 are unseen. On the turn, 46 are unseen. The probability of hitting at least once with two cards to come is:

$$ P(\text{hit by river}) = 1 - \frac{47 - \text{outs}}{47} \times \frac{46 - \text{outs}}{46} $$

For a flush draw: 1 − (38/47)(37/46) = **35.0%**. With one card to come it is 9/46 = **19.6%**.

## The rule of 2 and 4
- With **one card** to come, equity ≈ outs × 2%.
- With **two cards** to come, and only if you will certainly see both (for example, all-in on the flop), equity ≈ outs × 4%.

The shortcut overestimates big draws: 15 outs × 4 = 60%, but the exact figure is 54.1%. A good refinement for more than 8 outs is outs × 4 − (outs − 8). For 15 outs that gives 60 − 7 = 53%.

::widget rule-of-24

## Discounting outs
Not every out is clean:
- **Tainted outs** complete your hand but also improve villain more. A flush card that pairs the board can give a set a full house.
- **Shared outs** improve you only to a split, or to a hand villain's kicker still beats. An ace is not a clean out for AK if villain might hold an ace too.
- **Reverse outs** are cards that complete a bigger draw for villain.

A practical habit: count the clean outs, then count questionable outs at half value.

:::warn ×4 needs two free cards
Use ×4 only when you are guaranteed to see both cards. Facing a flop bet with more betting to come on the turn, compare the price against your one-card equity (×2) and then think about implied odds.
:::
`,
    quiz: [
      { q: 'How many outs does a flush draw plus an open-ended straight draw have?', answer: 15, tolerance: 0, explain: '9 flush cards + 8 straight cards − 2 counted twice (the two straight cards of your suit) = 15.' },
      { q: 'On the turn with 9 outs, what is your exact chance to hit on the river?', answer: 19.6, tolerance: 1.5, unit: '%', explain: '9 / 46 ≈ 19.6%. The rule of 2 gives 18%, which is close enough at the table.' },
      { q: 'All-in on the flop with an open-ended straight draw (8 outs). Approximate equity?', answer: 31.5, tolerance: 2, unit: '%', explain: 'Rule of 4: 32%. Exact: 1 − (39/47)(38/46) ≈ 31.5%.' },
      {
        q: 'You hold AK on a Q-high board against an unknown range. Why might an ace not be a clean out?',
        choices: ['Villain may also hold an ace, so the ace may not give you the best hand', 'Aces are always clean outs', 'The rule of 4 says so', 'Because the board is rainbow'],
        answer: 0,
        explain: 'If villain holds AQ, an ace improves you to a pair that still loses. Shared outs should be discounted.',
      },
    ],
  },
  {
    id: 'equity',
    module: 'math',
    title: 'Equity & Equity Realization',
    summary: 'Equity is your share of the pot. Position, playability and initiative decide how much of it you keep.',
    minutes: 14,
    level: 1,
    drills: ['equity-est'],
    tools: ['equity'],
    body: md`
## Equity is a share of the pot
[[Equity]] is the share of the pot you would win on average if all remaining cards were dealt with no more betting. Some benchmark preflop all-in matchups:

| Matchup | Example | Equity |
|---|---|---|
| Big pair vs. smaller pair | {Ah As} vs {Kd Kc} | ≈ 82 / 18 |
| Pair vs. two overcards | {Qh Qd} vs {Ac Ks} | ≈ 57 / 43 |
| Small pair vs. two overcards | {2h 2d} vs {Ac Ks} | ≈ 53 / 47 |
| Dominated kicker | {As Kd} vs {Ah Qc} | ≈ 74 / 26 |
| Pair vs. one overcard | {8h 8d} vs {Ac 7s} | ≈ 71 / 29 |
| Overcards vs. connected undercards | {As Kd} vs {8h 7h} | ≈ 59 / 41 |

The famous "coin flip" (pair vs. two overcards) is not quite 50/50: the pair is a modest favourite.

::widget equity-mini

## Hand vs. range
You never know villain's exact hand. Your real equity is against their [[range]], the weighted set of hands they could hold. AK against {QQ+, AK} is a very different proposition from AK against {QQ}. The [Equity calculator](/tools/equity) accepts ranges for exactly this reason.

## Equity realization
Raw equity assumes the hand goes to showdown with no more betting. Real hands do not. How much of your equity you actually capture is called [[equity realization]]:

- **Position.** The player in position realises more: they act last, take free cards and bluff more effectively.
- **Playability.** Suited and connected hands make nutted hands and strong draws and continue on many boards. Offsuit, disconnected hands realise less.
- **Initiative and stack depth.** The aggressor tends to realise more; deep stacks magnify all of these effects.

$$ \text{Realized equity} \approx \text{Raw equity} \times R | R is the realization factor $$

R is often 0.7–0.9 for weak hands out of position, and 1 or more for good hands in position.

:::example Two hands, same raw equity
K8s and K8o have almost the same raw equity against a button open. K8s makes flushes and backdoor draws and realises far more, so it is a comfortable big blind defend while K8o is often a fold out of position.
:::
`,
    quiz: [
      {
        q: 'Equity is best defined as…',
        choices: ['Your share of the pot if all cards are dealt with no more betting', 'The money you have invested', 'The chance you are ahead right now', 'Your stack divided by the pot'],
        answer: 0,
        explain: 'Equity is the average share of the pot at showdown across all runouts. Being ahead now is not the same thing: a draw can be behind and still have 45% equity.',
      },
      { q: 'You have 40% raw equity but expect to realise only 75% of it out of position. What is your effective equity?', answer: 30, tolerance: 1, unit: '%', explain: '0.40 × 0.75 = 30%. Compare that, not the 40%, with your pot odds.' },
      { q: 'QQ vs. AKo all-in preflop is closest to…', choices: ['80 / 20', '57 / 43 for QQ', '50 / 50', '43 / 57 for QQ'], answer: 1, explain: 'The pair is a modest favourite, about 57% to 43%.' },
      { q: 'Which realises more equity?', choices: ['The same hand in position', 'The same hand out of position'], answer: 0, explain: 'Acting last gives information, free cards and better bluffing opportunities.' },
    ],
  },
  {
    id: 'combos',
    module: 'math',
    title: 'Combinatorics',
    summary: 'Count hands exactly: 6, 4, 12, card removal, and why "he always has it" is a number.',
    minutes: 15,
    level: 1,
    drills: ['combos'],
    tools: ['ranges'],
    body: md`
## Counting starting hands
- A pocket pair has C(4, 2) = **6** [[combo|combos]].
- A suited non-pair has **4** (one per suit).
- An offsuit non-pair has **12** (4 × 4 − 4).
- A non-pair in total (suited plus offsuit) has **16**.
- All hands together: 13 pairs × 6 + 78 non-pairs × 16 = **1,326** = C(52, 2).

The 13×13 grid has 169 hand classes, but they are not equally likely. AKo is three times as common as AKs, and twice as common as any single pair.

## Card removal
Visible cards (yours and the board) shrink villain's combos:

| Situation | Combos |
|---|---|
| Pair, one card of that rank visible | C(3, 2) = 3 |
| Pair, two cards visible | 1 |
| Non-pair XY, one X visible | 3 × 4 = 12 |
| Non-pair XY, one X and one Y visible | 3 × 3 = 9 |

In general, a non-pair has (cards left of X) × (cards left of Y) combos, and a pair has C(n, 2) where n is the number of cards of that rank left.

:::example Board {Ks 9d 4c}, you hold {Ah Kd}
**Sets.** KK: two kings are gone, so C(2, 2) = 1. 99: C(3, 2) = 3. 44: 3. That is **7** sets in total.

**AK.** Aces left: 3. Kings left: 2. That makes **6** combos.

**K9.** Kings left: 2. Nines left: 3. That makes **6** combos of two pair.
:::

## Why it matters
Facing a big bet, the question is always how many value combos villain has against how many bluff combos. If his value is 7 sets plus 6 combos of K9 (13) and his plausible bluffs are 20 missed-draw combos, the decision looks very different than "he always has it".

::widget combo-counter

:::tip Weighting
Real ranges are weighted. Villain might 3-bet AK always but A5s only half the time: 4 combos × 50% = 2 weighted combos. Weighted counting is how solvers think.
:::
`,
    quiz: [
      { q: 'How many combos of AKo are there with no cards removed?', answer: 12, tolerance: 0, explain: '4 aces × 4 kings − 4 suited combos = 12.' },
      { q: 'An ace is on the board. How many combos of AA can villain have?', answer: 3, tolerance: 0, explain: 'Three aces left: C(3, 2) = 3.' },
      { q: 'You hold {Ah Kh}; the board is {As 7c 2d}. How many AK combos can villain hold?', answer: 6, tolerance: 0, explain: 'Aces left: 2 (Ac, Ad). Kings left: 3. So 2 × 3 = 6.' },
      { q: 'How many pocket-pair combos are there in total?', answer: 78, tolerance: 0, explain: '13 ranks × 6 combos = 78, about 5.9% of all hands.' },
    ],
  },
  {
    id: 'fold-equity',
    module: 'math',
    title: 'Bluffing Math: Alpha & Fold Equity',
    summary: 'How often a bluff must work, and why semi-bluffs need far fewer folds.',
    minutes: 14,
    level: 2,
    drills: ['ratios', 'ev'],
    body: md`
## Alpha: how often a bluff must work
If you bet B into a pot P with a hand that never wins, you risk B to win P. The bluff breaks even when villain folds a fraction [[alpha]] of the time:

$$ \alpha = \frac{B}{P + B} = \frac{s}{1 + s} | s = bet as a fraction of the pot $$

| Bet size | α (folds needed) |
|---|---|
| ⅓ pot | 25.0% |
| ½ pot | 33.3% |
| ¾ pot | 42.9% |
| Pot | 50.0% |
| 1.5× pot | 60.0% |
| 2× pot | 66.7% |

## Semi-bluffs: fold equity plus draw equity
Most bluffs are not pure: they have equity when called. A [[semi-bluff]] wins when villain folds now *or* when you hit later. Assuming you get all-in when called:

$$ EV = f \times P + (1 - f) \times (e \times (P + 2B) - B) $$

Here f is the fold frequency, e is your equity when called, P is the pot before your bet and B is your bet.

:::example Flush draw shove
Pot 100. You shove 100 with a flush draw on the flop (about 35% when called). If villain folds 30%:
EV = 0.3 × 100 + 0.7 × (0.35 × 300 − 100) = 30 + 0.7 × 5 = **+33.5**.
Even with zero folds the shove is slightly profitable (0.35 × 300 − 100 = +5), because 35% beats the 33% you need when called.
:::

::widget fold-equity

:::key Two ways to win
Draws make the best bluffs because their equity when called lowers the fold frequency they need. That is why solvers bluff with flush draws and gutshots long before they bluff with pure air.
:::
`,
    quiz: [
      { q: 'You bet 75 into 100 with pure air. What fold percentage breaks even?', answer: 42.9, tolerance: 1, unit: '%', explain: '75 / (100 + 75) ≈ 42.9%.' },
      { q: 'A pot-size bluff needs villain to fold how often?', answer: 50, tolerance: 1, unit: '%', explain: 'B / (P + B) = 1 / 2.' },
      {
        q: 'You shove 50 into 100 with 25% equity when called, and villain folds 40%. What is the EV of the shove?',
        answer: 40,
        tolerance: 1,
        explain: '0.4 × 100 + 0.6 × (0.25 × 200 − 50) = 40 + 0.6 × 0 = 40.',
      },
      {
        q: 'Why are draws better bluffs than pure air?',
        choices: ['They win some of the time when called, so they need fewer folds', 'Villains never call draws', 'They are easier to hide', 'They always have position'],
        answer: 0,
        explain: 'Equity when called is a second way to win, so the break-even fold frequency drops.',
      },
    ],
  },
  {
    id: 'mdf',
    module: 'math',
    title: 'Defending: Minimum Defense Frequency',
    summary: 'How often you must continue so any-two-cards bluffs don’t print money, and when to ignore it.',
    minutes: 13,
    level: 2,
    drills: ['ratios', 'bluffcatch'],
    body: md`
## Minimum defense frequency
If you fold too often, villain profits by betting any two cards. To stop that, you must continue (call or raise) with at least:

$$ MDF = \frac{P}{P + B} = 1 - \alpha = \frac{1}{1 + s} $$

| Bet | MDF |
|---|---|
| ⅓ pot | 75.0% |
| ½ pot | 66.7% |
| ¾ pot | 57.1% |
| Pot | 50.0% |
| 2× pot | 33.3% |

::widget alpha-mdf

## When MDF applies, and when it doesn't
[[MDF]] is the defensive mirror of alpha: it is the defense frequency that makes a bluff with any two cards break even. It is a benchmark, not a law.

- **It ignores villain's actual range.** If villain under-bluffs, folding more than MDF is correct.
- **It ignores bluff equity.** Semi-bluffs do not need you to fold as often.
- **It is loosest on early streets,** where ranges still have equity and more betting follows. It is closest to exact on the river against a polarized range.
- **It is about your whole range,** never about one specific hand.

:::sig Trading lens
MDF is a no-arbitrage condition. If you fold too much, someone makes free money by "bluffing" you, exactly the way a quote that runs too easily gets picked off.
:::

## The river bluff ratio
For a polarized bettor (nuts or air), the share of bluffs that makes a [[bluff-catcher]] indifferent is:

$$ \frac{\text{bluffs}}{\text{bets}} = \frac{s}{1 + 2s} $$

This is the same number as the equity needed to call, and that is no coincidence. A pot-size bet supports one bluff for every two value bets; a half-pot bet supports one for every three.
`,
    quiz: [
      { q: 'MDF against a half-pot bet?', answer: 66.7, tolerance: 1, unit: '%', explain: '1 / (1 + 0.5) ≈ 66.7%.' },
      { q: 'MDF against a 2× pot overbet?', answer: 33.3, tolerance: 1, unit: '%', explain: '1 / (1 + 2) ≈ 33.3%.' },
      { q: 'River pot-size bet: what share of a balanced polarized betting range is bluffs?', answer: 33.3, tolerance: 1, unit: '%', explain: 's / (1 + 2s) = 1/3.' },
      {
        q: 'You know villain never bluffs the river. Facing a pot-size bet you should defend…',
        choices: ['At least 50%, by MDF', 'Only hands that beat his value range', 'Exactly 50%', 'With all bluff-catchers'],
        answer: 1,
        explain: 'MDF protects you against an opponent who might bluff. Against a known non-bluffer, every bluff-catcher is a fold.',
      },
    ],
  },
  {
    id: 'implied-odds',
    module: 'math',
    title: 'Implied & Reverse Implied Odds',
    summary: 'Paying now for money later, set mining, and the draws that cost you when they hit.',
    minutes: 12,
    level: 2,
    drills: ['ev'],
    tools: ['calculators'],
    body: md`
## Paying now for money later
When you call with a draw and there is money behind, you win more than the current pot when you hit. [[implied odds|Implied odds]] are that extra money. If you call C into a pot of P + B and hit with probability e, the call breaks even when the extra winnings X satisfy:

$$ X \ge \frac{C}{e} - (P + B + C) $$

:::example Flush draw on the turn
Pot 100, villain bets 50, you have 9 outs (e = 9/46 ≈ 19.6%).
C / e = 50 / 0.196 ≈ 255, and the pot after your call is 200. You need to win about **$55 more** on the river, on average, when you hit.
:::

::widget implied-odds

## What makes implied odds good
- Deep effective stacks, so there is money left to win.
- Hidden draws, like gutshots and small pairs drawing to sets, that villain will not see coming.
- A strong, sticky villain range, such as overpairs that pay off.
- Position, which makes it easier to extract value.

## Reverse implied odds
These are the times you hit and still lose, or make a hand that pays off a better one:

- Drawing to a non-nut flush when villain can hold a higher flush.
- Weak top pair facing big action.
- The low end of a straight, or a straight draw on a flush-draw board, where your card can give villain a flush.

## Set mining
With a pocket pair you flop a set or better about **11.8%** of the time, roughly 7.5 to 1 against. A classic rule of thumb is to call to set mine only when you can expect to win about 15–20× the call when you hit. With 100bb, that is why small pairs call raises but rarely call 3-bets.
`,
    quiz: [
      { q: 'Pot 100, villain bets 50, you have a flush draw on the turn (19.6%). Roughly how much extra must you win when you hit?', answer: 55, tolerance: 4, unit: '$', explain: '50 / 0.196 − 200 ≈ 55.' },
      { q: 'How often does a pocket pair flop a set or better?', answer: 11.8, tolerance: 0.6, unit: '%', explain: '1 − C(48,3)/C(50,3) ≈ 11.8%.' },
      {
        q: 'Which draw has the worst reverse implied odds?',
        choices: ['Nut flush draw', 'Low end of a straight draw on a two-tone board', 'Set on a dry board', 'Ace-high flush draw'],
        answer: 1,
        explain: 'The low end of a straight can lose to higher straights, and on a two-tone board the card that completes it may give villain a flush.',
      },
    ],
  },
];
