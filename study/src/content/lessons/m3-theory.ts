import type { Lesson } from '../types';

const md = String.raw;

export const THEORY_LESSONS: Lesson[] = [
  {
    id: 'nash',
    module: 'theory',
    title: 'Nash Equilibrium & GTO',
    summary: 'What “unexploitable” means, why equilibrium strategies mix, and what GTO is not.',
    minutes: 14,
    level: 2,
    tools: ['cfr'],
    body: md`
## Unexploitable strategies
A [[Nash equilibrium]] is a set of strategies where no player can gain by changing only their own. In two-player zero-sum games such as heads-up poker, equilibrium strategies are also **unexploitable**: playing one guarantees you at least the value of the game whatever your opponent does. "[[GTO]]" (game theory optimal) is poker slang for an equilibrium strategy.

## Rock, paper, scissors
The equilibrium is to play each option 1/3 of the time. Against it every strategy has EV 0, so you cannot be exploited, but you also do not exploit the player who throws rock half the time. That is the central trade-off:

- **GTO is defensive.** In heads-up zero-sum games it guarantees you do not lose in expectation against anyone.
- **Exploitative play is offensive.** It deviates to punish mistakes, but it opens you up to counter-exploitation.

::widget rps-regret

## Mixed strategies
Equilibrium strategies in poker mix: the same hand sometimes bets and sometimes checks. That is not randomness for its own sake. Mixing keeps the opponent **indifferent**, so that all of their best responses tie and none of them gains.

## What GTO is not
- **Not maximally profitable against weak players.** Exploitation is.
- **Not unique.** Many equilibria can exist; Kuhn poker has a whole family of them.
- **Not computed for real 6-max.** Solvers solve simplified trees (fixed bet sizes, mostly heads-up postflop). "GTO" for multiway spots is approximate, and in multiplayer games equilibria lose their guarantees.

:::sig Trading lens
A market maker quoting a fair mid with a symmetric spread plays the GTO-style baseline: hard to pick off. When you learn a counterparty is systematically wrong you skew your quotes. That is exploitation, and it costs you if you misjudged them.
:::
`,
    quiz: [
      {
        q: 'In a two-player zero-sum game, a Nash equilibrium strategy…',
        choices: ['Guarantees at least the game value against any opponent', 'Maximises profit against every opponent', 'Wins every hand', 'Requires reading opponents'],
        answer: 0,
        explain: 'Equilibrium is about guarantees, not maximum profit. Against a specific weak opponent, an exploitative strategy earns more.',
      },
      { q: 'The RPS equilibrium (⅓ each) against an opponent who always plays rock has EV…', choices: ['0', 'Positive', 'Negative'], answer: 0, explain: 'Every strategy has EV 0 against the uniform mix, and vice versa: equilibrium does not exploit.' },
      {
        q: 'Why do equilibrium strategies mix actions with the same hand?',
        choices: ['To keep the opponent indifferent between their options', 'To confuse humans', 'Because solvers are random', 'To save time'],
        answer: 0,
        explain: 'If you never mixed, the opponent could find one response that beats you. Mixing makes their options tie.',
      },
    ],
  },
  {
    id: 'indifference',
    module: 'theory',
    title: 'The Indifference Principle',
    summary: 'The key that solves poker games: each side’s frequencies are set to make the other side indifferent.',
    minutes: 14,
    level: 2,
    drills: ['bluffcatch', 'ratios'],
    body: md`
## The key to solving games
At equilibrium, if a player mixes between two actions, those actions must have **equal EV**. Otherwise they would just pick the better one. So equilibrium strategies are found by making the *opponent* indifferent: the [[indifference principle]].

Take a river spot where a polarized bettor (nuts or air) faces a [[bluff-catcher]]. With the pot normalised to 1 and a bet of s:

1. **The bettor's bluffs make the caller indifferent.** That fixes the bluff share at s / (1 + 2s).
2. **The caller's defense makes the bettor's bluffs indifferent.** That fixes the call frequency at 1 / (1 + s).

## Derivation
For the caller, calling s wins 1 + s against a bluff and loses s against value. Setting the EV of calling equal to folding (0):

$$ P(\text{bluff}) \times (1 + s) - P(\text{value}) \times s = 0 \;\Rightarrow\; P(\text{bluff}) = \frac{s}{1 + 2s} $$

For the bettor, a bluff wins 1 when villain folds and loses s when villain calls. Setting the EV of bluffing equal to checking (0):

$$ (1 - c) \times 1 - c \times s = 0 \;\Rightarrow\; c = \frac{1}{1 + s} $$

:::key Notice
Your bluffing frequency is set by the *caller's* odds, and your calling frequency is set by the *bluffer's* odds. Each player chooses frequencies to make the other indifferent, not to maximise their own EV directly.
:::

::widget clairvoyant

## Indifferent does not mean "it doesn't matter"
If the caller is indifferent, any calling frequency gives them the same EV *against this particular bluffing frequency*. But only the equilibrium frequency stops the bettor from switching to something better. Deviate, and the bettor's best response punishes you. Try it in the widget: move the call frequency away from the equilibrium and watch the bettor's best response change.
`,
    quiz: [
      { q: 'River, pot 100, bet 100. At equilibrium, what percentage of the bettor’s range is bluffs?', answer: 33.3, tolerance: 1, unit: '%', explain: 's / (1 + 2s) with s = 1 gives 1/3.' },
      { q: 'Same spot: how often must the bluff-catcher call?', answer: 50, tolerance: 1, unit: '%', explain: '1 / (1 + s) = 1/2, which is MDF.' },
      { q: 'Half-pot river bet: equilibrium bluff share?', answer: 25, tolerance: 1, unit: '%', explain: '0.5 / (1 + 1) = 25%.' },
      {
        q: 'If the caller calls more often than the equilibrium frequency, the bettor’s best response is to…',
        choices: ['Bluff less (value bet only)', 'Bluff more', 'Change nothing'],
        answer: 0,
        explain: 'Bluffs now lose money, while value bets earn more. The best response stops bluffing.',
      },
    ],
  },
  {
    id: 'clairvoyant',
    module: 'theory',
    title: 'Toy Game: The Clairvoyant Game',
    summary: 'Nuts or air against a bluff-catcher: the cleanest model of polarized betting.',
    minutes: 15,
    level: 2,
    tools: ['toy-games'],
    body: md`
## Setup
Player X knows whether they hold the nuts (a fraction v of the time) or air. Player Y holds a bluff-catcher that beats air and loses to the nuts. X can bet s (as a fraction of the pot) or check; Y calls or folds. This is the [[toy game]] behind almost every river decision.

## Solution
- X bets every nut hand and bluffs with v · s / (1 + s) of their total range.
- Y calls with frequency 1 / (1 + s).
- X's share of the pot is:

$$ EV_X = v \times \left(1 + \frac{s}{1 + s}\right) $$

| Bet size s | Bluffs per value bet | Y calls | X's EV (v = 50%) |
|---|---|---|---|
| ½ pot | 0.33 | 66.7% | 0.667 |
| Pot | 0.50 | 50.0% | 0.750 |
| 2× pot | 0.67 | 33.3% | 0.833 |
| 5× pot | 0.83 | 16.7% | 0.917 |

Without the option to bet, X would win exactly v = 0.5 of the pot.

::widget clairvoyant {"advanced": true}

## Lessons
1. **Polarized ranges want big bets.** The bigger the bet, the more the value hands earn and the more bluffs X can carry.
2. **Bluffs are profitable as a group, not one by one.** At equilibrium each bluff has EV 0, the same as checking. They earn their keep by forcing Y to call, which pays off the value bets.
3. **Information is money.** X's whole edge comes from knowing who is ahead, plus the option to bet.

:::example Exploit mode
If Y over-folds (calling 30% instead of 50% against a pot bet), X's best response is to bluff with all of their air. If Y over-calls, X stops bluffing and only value bets. Switch the widget to exploit mode to see the EV swing.
:::
`,
    quiz: [
      { q: 'v = 50% nuts, pot-size bet. What is X’s equilibrium share of the pot, in %?', answer: 75, tolerance: 1, unit: '%', explain: '0.5 × (1 + 1/2) = 0.75.' },
      { q: 'As the allowed bet size grows in the clairvoyant game, X’s EV…', choices: ['Increases', 'Decreases', 'Stays the same'], answer: 0, explain: 'EV_X = v(1 + s/(1+s)) increases with s. Polarized ranges love big bets.' },
      { q: 'At equilibrium, each individual bluff has EV…', choices: ['Equal to checking (0)', 'Positive', 'Negative'], answer: 0, explain: 'The caller’s frequency makes bluffs exactly break even.' },
    ],
  },
  {
    id: 'akq',
    module: 'theory',
    title: 'Toy Game: The AKQ Game',
    summary: 'Three cards, one bet: bluff with your worst hands, check your medium ones, call at mixed frequencies.',
    minutes: 15,
    level: 2,
    tools: ['toy-games'],
    body: md`
## Setup
Three cards: A, K, Q. Each player gets one and the pot is 1. X checks in the dark. Y (in position) can bet s or check. If Y bets, X calls or folds.

## Remove the dominated strategies first
- Y with **A** always bets: it cannot lose.
- Y with **K** never bets. X would only call with the A and fold the Q, so betting the K only gets called by better hands. Checking already beats the Q.
- X with **A** always calls; X with **Q** always folds.

Only two decisions remain: how often Y bluffs with the Q (β), and how often X calls with the K (c).

## Solution
$$ \beta = \frac{s}{1 + s}, \qquad c = \frac{1 - s}{1 + s} $$

For a half-pot bet, β = c = 1/3, and Y wins about **52.8%** of the pot instead of 50% from checking down. Y's edge is largest at a bet of √2 − 1 ≈ **41% of the pot**. For a pot-size bet, c = 0 and Y gains nothing at all from betting.

::widget akq

## What it teaches
- **Bluff with your worst hands.** Y bluffs the Q, which has no showdown value, not the K, which wins at showdown against the Q.
- **Bluff-catchers call at mixed frequencies.** The K is X's bluff-catcher; it calls just enough to make the Q's bluffs break even.
- **Hands with showdown value check.** The K checks behind; it does not want to bet into a range that only calls when it is better.
- **Bet size is a strategic choice.** Too small and value earns little; too large and bluffs need too many folds.
`,
    quiz: [
      { q: 'Half-pot bet: how often does Y bluff with the Q?', answer: 33.3, tolerance: 1, unit: '%', explain: 'β = s / (1 + s) = 0.5 / 1.5 = 1/3.' },
      { q: 'Why does Y never bet the K?', choices: ['It only gets called by the A and folds out the Q it already beats', 'The K is the nuts', 'X always folds', 'Because of the rules'], answer: 0, explain: 'Betting the K turns a winning showdown against the Q into nothing and loses more against the A.' },
      { q: 'Which hand is X’s bluff-catcher?', choices: ['K', 'A', 'Q'], answer: 0, explain: 'The K beats only Y’s bluffs (the Q) and loses to Y’s value (the A).' },
    ],
  },
  {
    id: 'polarization',
    module: 'theory',
    title: 'Polarization & Range Shapes',
    summary: 'Polarized, merged, condensed, capped: range shapes decide bet sizes, and vice versa.',
    minutes: 13,
    level: 2,
    drills: ['ratios'],
    body: md`
## Range shapes
- **[[polarized range|Polarized]]:** very strong hands plus bluffs, with no medium hands. Nuts or air.
- **[[merged range|Linear or merged]]:** the top X% of hands, from strong to medium, with no air.
- **Condensed:** mostly medium-strength hands with few nuts and little air. This is typical of a range that just called.
- **[[capped range|Capped]]** ranges lack the strongest hands; **uncapped** ranges can still hold the nuts.

::widget polar-vs-linear

## Who bets what
- **Big bets ↔ polarized ranges.** Medium hands do not want to bet big: only worse hands fold and only better hands call.
- **Small bets ↔ merged ranges.** You can bet many medium hands for thin value and protection, and villain has to defend wide.
- **A condensed range facing a polarized one** plays as a bluff-catcher.

## Value-to-bluff ratios
For a polarized river bet of size s, bluffs make up s / (1 + 2s) of the betting range:

| Bet | Value : bluff | Bluff share |
|---|---|---|
| ⅓ pot | 4 : 1 | 20% |
| ½ pot | 3 : 1 | 25% |
| ¾ pot | 2.33 : 1 | 30% |
| Pot | 2 : 1 | 33% |
| 2× pot | 1.5 : 1 | 40% |

On earlier streets you can bluff more than this, because bluffs have equity (they can improve) and value hands can still be outdrawn.

:::key Polarize with big, merge with small
Choosing a bet size means choosing which hands belong in the betting range. Pick the size your whole range shape wants, not the size that suits one hand.
:::
`,
    quiz: [
      { q: 'A range of “sets and missed draws” is…', choices: ['Polarized', 'Linear', 'Condensed'], answer: 0, explain: 'Strong hands and air, nothing in between.' },
      { q: 'River ¾-pot bet: what share of a balanced betting range is bluffs?', answer: 30, tolerance: 1, unit: '%', explain: '0.75 / 2.5 = 30%, a 2.33 : 1 value-to-bluff ratio.' },
      { q: 'Which range shape typically uses small bets?', choices: ['Linear / merged', 'Polarized'], answer: 0, explain: 'Small bets let many medium hands bet for thin value and protection.' },
    ],
  },
  {
    id: 'advantage',
    module: 'theory',
    title: 'Range Advantage vs. Nut Advantage',
    summary: 'Who has more equity, who has more of the very best hands, and how each changes strategy.',
    minutes: 15,
    level: 2,
    tools: ['ranges'],
    body: md`
## Two kinds of advantage
- **[[range advantage|Range (equity) advantage]]:** your whole range has more equity than villain's on this board.
- **[[nut advantage|Nut advantage]]:** you hold more of the very strongest hands (sets, two pair and better, straights).

They often go together, but not always.

## What each implies (rules of thumb)
| Situation | Typical strategy |
|---|---|
| Range advantage, no big nut advantage | Bet often and small (⅓ pot) |
| Nut advantage | Bet bigger and polarize, perhaps less often |
| Neither | Check a lot |
| Both | Bet often and mix sizes |

## Example: BTN opens, BB calls
On {Ah 7c 2d} the button has more strong aces: the big blind 3-bets many of its best aces and folds weak offsuit ones. Both players have some sets. The button has the range advantage without a big nut advantage, so it c-bets small and often.

On {7h 6h 5c} the big blind has more two pairs, straights and sets from its suited connectors and small pairs. The big blind has the nut advantage; the button checks more and bets bigger with its strongest hands and draws.

Explore it below: the widget runs the button's opening range against the big blind's calling range on any flop, and breaks both down by hand class.

::widget range-vs-board {"hero": "rfi-btn", "villain": "bb-vs-btn:call", "board": "Ah7c2d"}

:::tip Read the top of the distribution
To judge nut advantage, compare only the strongest categories (sets, two pair, straights, flushes) between the two ranges. Range advantage is the overall equity number.
:::
`,
    quiz: [
      { q: 'Which flop gives the button (opener) the biggest range advantage against a big blind caller?', choices: ['A♠ K♦ 2♣', '7♥ 6♥ 5♣', '5♦ 4♦ 3♠', '8♠ 7♠ 6♦'], answer: 0, explain: 'High cards favour the preflop raiser, who holds more AK, AA, KK and strong aces.' },
      { q: 'A nut advantage suggests…', choices: ['Larger, polarized bets', 'Tiny bets', 'Checking everything'], answer: 0, explain: 'If you have more of the nuts, big bets put villain’s whole range in a bind.' },
      { q: 'On 7♥ 6♥ 5♣, who usually has the nut advantage in BTN vs. BB?', choices: ['BB', 'BTN'], answer: 0, explain: 'The big blind defends many small suited connectors and pairs that make straights, sets and two pair here.' },
    ],
  },
  {
    id: 'texture',
    module: 'theory',
    title: 'Board Texture',
    summary: 'Suits, pairing, connectivity and height; static vs. dynamic boards; and classifying turns.',
    minutes: 13,
    level: 2,
    drills: ['nuts'],
    tools: ['ranges'],
    body: md`
## Reading a flop
1. **Suits:** rainbow, two-tone (flush draws possible) or monotone (flush possible).
2. **Pairing:** unpaired, paired or trips.
3. **Connectivity:** how many straights and straight draws exist.
4. **Height:** ace-high, broadway, middling or low.

## Static vs. dynamic
- **[[static board|Static]] (dry):** few turn cards change the best hand, as on {Ks 7d 2c}. Equities are stable, so there is little urgency to bet. Small bets and slow-playing work.
- **[[dynamic board|Dynamic]] (wet):** many turns change who is ahead, as on {Jh Th 9c}. Equities run close, and protection and equity denial matter, so bets get bigger and check-raises appear.

The widget below measures this directly: it counts how many turn cards change the category of the nuts.

::widget texture

## Classifying turn cards
- **Blanks** change nothing.
- **Overcards** shift range advantage, often towards the preflop raiser when they are broadway cards.
- **Flush and straight completers** shift nut advantage to whoever holds more of those draws.
- **Pairing cards** reduce the value of straights and flushes and improve trips and full houses.
`,
    quiz: [
      { q: 'Which flop is most dynamic?', choices: ['J♥ T♥ 9♣', 'K♠ 7♦ 2♣', 'A♠ A♦ 4♣', 'Q♣ 7♦ 2♥'], answer: 0, explain: 'Straights, straight draws and flush draws everywhere: many turns change the best hand.' },
      { q: 'On a static board you should generally…', choices: ['Bet smaller', 'Bet bigger to protect'], answer: 0, explain: 'With few bad turn cards there is less need to deny equity. Small bets go a long way.' },
      { q: '“Two-tone” means…', choices: ['Two cards of one suit', 'All three cards the same suit', 'All different suits'], answer: 0, explain: 'Two of one suit, so flush draws are possible.' },
    ],
  },
  {
    id: 'cbet',
    module: 'theory',
    title: 'Continuation Betting',
    summary: 'When the preflop raiser should keep betting, how often, and how big, by texture.',
    minutes: 14,
    level: 2,
    tools: ['ranges'],
    body: md`
## The preflop raiser's edge
The preflop aggressor usually has the stronger range on most flops: they raised, and the caller removed many premium hands by not 3-betting. A [[c-bet|continuation bet]] uses that edge.

## Frequency and size by texture (BTN vs. BB, single-raised pot)
| Flop type | C-bet frequency | Size |
|---|---|---|
| A-high or K-high, dry ({Ah 7c 2d}) | High (≈70–90%) | Small (25–33%) |
| Paired, low ({5c 5d 2h}) | High | Small |
| Middling, connected ({9h 8c 6d}) | Medium to low (≈40–60%) | Larger (50–75%) |
| Low, connected ({6h 5h 4c}) | Low (≈30–50%) | Large, or check |
| Monotone | Medium to low | Small |

These are typical patterns, not solver output. Use them as hypotheses to test in a solver.

## Range bet or split range?
- **Range bet:** bet 100% of hands at a small size when your range advantage is overwhelming and villain's range is weak or capped.
- **Split range:** bet strong hands, draws and some air, and check medium-strength hands with showdown value plus some traps.

## Out of position
As the out-of-position raiser (UTG against a BTN caller, say), c-bet less often. You cannot control the pot, villain realises more of their equity, and your checking range needs some strong hands to protect it.

::widget range-vs-board {"hero": "rfi-btn", "villain": "bb-vs-btn:call", "board": "Kd7s2c"}
`,
    quiz: [
      { q: 'Best spot for a small, high-frequency c-bet?', choices: ['K♦ 7♠ 2♣ as BTN vs. BB', '7♥ 6♥ 5♣ as BTN vs. BB', '9♥ 8♥ 6♦ as UTG vs. BTN'], answer: 0, explain: 'High card, dry, and a strong range advantage for the raiser.' },
      { q: 'On wet boards, medium-strength hands with showdown value should often…', choices: ['Check', 'Bet big'], answer: 0, explain: 'They gain little from betting (better hands call, worse fold) and like to control the pot.' },
      { q: 'Why c-bet less as the out-of-position raiser?', choices: ['The in-position caller realises more equity and you cannot control the pot', 'Because you have a worse range preflop', 'C-bets are illegal out of position'], answer: 0, explain: 'Position shifts realization and pot control towards the caller.' },
    ],
  },
  {
    id: 'sizing',
    module: 'theory',
    title: 'Bet Sizing Theory',
    summary: 'Sizes are a choice of range; geometric sizing gets stacks in by the river; when to overbet.',
    minutes: 15,
    level: 3,
    tools: ['calculators'],
    body: md`
## A size is a choice of range
- **Small bets (25–33%)** support a wide, merged betting range. Villain must defend wide (MDF 75–80%) and gets a good price.
- **Medium bets (50–75%)** suit value plus draws on dynamic boards.
- **Large bets and [[overbet|overbets]] (100–200%+)** are polarized: nutted hands and bluffs. Use them when you have a nut advantage and villain's range is capped.

## Geometric sizing
To get all-in by the river with the same bet fraction on every street, each called bet multiplies the pot by (1 + 2s). Solving P(1 + 2s)ⁿ = P + 2S for n streets gives:

$$ s = \frac{(1 + 2S/P)^{1/n} - 1}{2} | P = pot, S = effective stack, n = streets left $$

- Single-raised pot (P ≈ 5.5bb, S ≈ 97.5bb, 3 streets): s ≈ **116% pot** every street.
- 3-bet pot (P ≈ 22.5bb, S ≈ 89bb, 3 streets): s ≈ **54% pot** every street.

::widget geometric

## Why geometric?
When a polarized range plays against a bluff-catching range, the bettor maximises EV by building the pot so that all the money goes in by the river. Equal fractions spread the pressure evenly, so the defender's MDF is the same on every street. Solvers often land near [[geometric sizing|geometric sizes]] with nutty, polarized ranges.

## When to overbet
Overbet when you have many nutted hands that villain cannot have and villain's range is capped. For example, after villain calls the flop and checks the turn, their strongest hands would often have raised or bet.
`,
    quiz: [
      { q: 'Big bets correspond to…', choices: ['Polarized ranges', 'Merged ranges'], answer: 0, explain: 'Medium hands do not want to bet big, so the range splits into nuts and bluffs.' },
      { q: 'Pot 10, stack 45, two streets left. What is the geometric bet, as a % of the pot?', answer: 108, tolerance: 3, unit: '%', explain: '(1 + 90/10)^(1/2) = √10 ≈ 3.162, so s = (3.162 − 1)/2 ≈ 1.08.' },
      { q: 'MDF against a ⅓-pot c-bet?', choices: ['75%', '50%', '33%'], answer: 0, explain: '1 / (1 + 1/3) = 75%.' },
    ],
  },
  {
    id: 'blockers',
    module: 'theory',
    title: 'Blockers & Unblockers',
    summary: 'One card can flip a river decision: choose bluffs and bluff-catchers by what they remove.',
    minutes: 14,
    level: 3,
    drills: ['bluffcatch', 'combos'],
    body: md`
## Card removal at the top of the range
Holding a card removes combos from villain's range. When ranges are a few dozen combos wide, one card can change the math. A card that does this is a [[blocker]].

- **Bluff with blockers:** hold cards that block villain's *calling* hands. The nut-flush blocker on a three-flush board is the classic case.
- **Bluff with unblockers:** prefer bluffs that *do not* block villain's folding hands, such as the missed draws he would fold.
- **Bluff-catch with the reverse:** prefer catchers that block villain's value and unblock his bluffs.

:::example One ace flips the decision
On a king-high river, villain's value range is AK: 4 aces × 3 kings = **12 combos**. He has **5** bluff combos and bets the pot (you need 33.3%).

Without an ace: bluffs are 5 / 17 = **29.4%**. That is less than 33.3%, so you fold.

With an ace in your hand: AK drops to 3 × 3 = 9 combos, and bluffs are 5 / 14 = **35.7%**. Now you call.
:::

::widget blockers

## Don't overdo it
Blockers are tie-breakers between hands of similar strength. They rarely turn a clear fold into a call on their own, except when ranges are very narrow: on rivers and in 4-bet pots.
`,
    quiz: [
      { q: 'Good river bluffs on a three-flush board, when you have no pair, often hold…', choices: ['The ace of that suit', 'Two small cards of other suits'], answer: 0, explain: 'Holding the nut-flush card removes villain’s nut flushes, the hands that never fold.' },
      { q: 'Villain has 12 value combos and 5 bluffs. Your hand removes 3 of his value combos. What is his bluff share now?', answer: 35.7, tolerance: 1, unit: '%', explain: '5 / (9 + 5) ≈ 35.7%.' },
      { q: 'A good bluff-catcher…', choices: ['Blocks value and unblocks bluffs', 'Blocks bluffs and unblocks value'], answer: 0, explain: 'You want villain to have fewer value hands and more bluffs.' },
    ],
  },
  {
    id: 'spr',
    module: 'theory',
    title: 'SPR & Commitment',
    summary: 'Stack-to-pot ratio tells you how strong a hand must be to stack off, before you bet the flop.',
    minutes: 11,
    level: 2,
    tools: ['calculators'],
    body: md`
## Stack-to-pot ratio
[[SPR]] is measured on the flop:

$$ SPR = \frac{\text{effective stack}}{\text{pot}} $$

| Pot type (100bb) | Pot | Stack | SPR |
|---|---|---|---|
| Single-raised (2.5bb open, BB calls) | ≈ 5.5bb | 97.5bb | ≈ 18 |
| 3-bet pot (to 11bb, called) | ≈ 22.5bb | 89bb | ≈ 4 |
| 4-bet pot (to 25bb, called) | ≈ 50.5bb | 75bb | ≈ 1.5 |

## What SPR tells you
- **Low SPR (under 3).** Top pair or better is usually happy to get all-in. There is little room to manoeuvre, and draws lose their implied odds.
- **Medium SPR (3–8).** Top pair with a good kicker facing aggression is a judgement call. Plan street by street.
- **High SPR (over 10).** One-pair hands shrink in value. Implied-odds hands (small pairs, suited connectors) gain, and skill and position matter most.

## Plan before you bet
Before betting the flop, ask: if I bet and get called, which turns do I keep betting, and will I be committed? With an SPR of 4, a pot-size flop bet that gets called leaves an SPR of exactly 1, so shoving the turn becomes natural.

::widget spr
`,
    quiz: [
      { q: 'Pot 20bb, effective stack 80bb. What is the SPR?', answer: 4, tolerance: 0, explain: '80 / 20 = 4.' },
      { q: 'Which hand gains value at high SPR?', choices: ['A small pocket pair, for its implied odds', 'Top pair, weak kicker'], answer: 0, explain: 'Deep stacks pay off sets; weak one-pair hands become harder to play.' },
      { q: 'SPR 4. You bet pot on the flop and get called. What is the SPR on the turn?', answer: 1, tolerance: 0, explain: 'Pot P becomes 3P and the stack 4P becomes 3P, so 3P / 3P = 1.' },
    ],
  },
  {
    id: 'solver-study',
    module: 'theory',
    title: 'How to Study With a Solver',
    summary: 'Predict, solve, compare, simplify, drill: a loop that turns solver output into intuition.',
    minutes: 12,
    level: 2,
    tools: ['ranges', 'cfr'],
    body: md`
## The loop
1. **Pick one spot,** for example BTN vs. BB in a single-raised pot at 100bb.
2. **Predict first.** Write down your intended strategy (frequency, sizes, which hands) and why.
3. **Solve or look up** the solution.
4. **Compare.** Find your biggest deviation and explain the solver's reason: range advantage, blockers, protection or realization.
5. **Simplify.** Compress it into a heuristic you can use at the table, such as "on A-high dry boards, bet ⅓ pot with my whole range".
6. **Drill** the spot until your intuition matches.

## Reading solver output
- **Aggregate reports** across many flops show patterns, like c-bet frequency by flop class. Study these before individual flops.
- **Strategy by hand class.** Look at what sets, top pairs, draws and air do, not at 1,326 individual combos.
- **EV by hand** shows how much a deviation costs. A small EV difference means you can mix freely.
- **Equity distributions** show range and nut advantage at a glance.

## Common pitfalls
- Memorising frequencies without understanding them.
- Studying spots that rarely happen.
- Copying solver lines against players who play nothing like the solver. That is what [[node-locking]] is for.
- Over-trusting simplified trees. A solution is only optimal **within the bet sizes you gave it**.

:::tip Your own solver
Your Poker-Solver repository already solves heads-up postflop spots with Discounted CFR. Use it for step 3. The Solver Track in this app explains what it is doing under the hood.
:::
`,
    quiz: [
      { q: 'What should you do first when studying a new spot?', choices: ['Predict your strategy before looking', 'Memorise the frequencies', 'Solve every flop'], answer: 0, explain: 'Predicting first exposes the gaps in your understanding.' },
      { q: 'A solver’s solution is optimal…', choices: ['Only within the tree and bet sizes it was given', 'In every possible game'], answer: 0, explain: 'Change the tree and the solution can change.' },
      { q: 'A tiny EV difference between two actions means…', choices: ['Either action is fine', 'One of them is a huge mistake'], answer: 0, explain: 'When EVs are close, mixing or simplifying costs very little.' },
    ],
  },
];
