import type { Lesson } from '../types';

const md = String.raw;

export const TRADING_LESSONS: Lesson[] = [
  {
    id: 'adverse-selection',
    module: 'trading',
    title: 'Adverse Selection',
    summary: 'When you get action, you are often worse off. The market maker’s problem and the poker player’s.',
    minutes: 14,
    level: 2,
    body: md`
## When you get action, you are often worse off
In poker, when a tight player raises your bet, your hand is worse than it looked a moment ago: their decision to raise is information. In markets, when your quote gets hit, it is disproportionately by someone who knows more. The trades you get are selected against you. This is [[adverse selection]].

## The market maker's problem
A dealer quotes a bid and an ask around fair value. Traders arrive; some are informed (they know the true value) and some are noise traders. The spread must be wide enough that the profit from noise traders covers the losses to informed ones. This is the intuition behind the Glosten–Milgrom model.

Play with it: widen the spread and increase the share of informed flow, and watch where your profit comes from.

::widget adverse-selection

## Poker parallels
| Market | Poker |
|---|---|
| An informed trader hits your quote | A strong range raises your bet |
| A noise trader | A recreational player calling loosely |
| Widening the spread | Folding marginal hands against aggression |
| Inventory risk | Getting committed in a bloated pot |

:::key The question to always ask
"Given that this person chose to trade (or raise) with me, what does their action tell me?" Condition on the action, not just on your prior.
:::
`,
    quiz: [
      { q: 'A very tight player min-raises your river value bet. You should…', choices: ['Update strongly towards a strong hand', 'Ignore it; min-raises are always weak'], answer: 0, explain: 'The raise itself is information; tight players rarely raise rivers as bluffs.' },
      { q: 'More informed flow means a market maker should…', choices: ['Widen the spread', 'Narrow the spread'], answer: 0, explain: 'The spread has to cover larger expected losses to informed traders.' },
    ],
  },
  {
    id: 'sizing-info',
    module: 'trading',
    title: 'Sizing as Information',
    summary: 'Bet sizes and order sizes leak information; balance them, or exploit those who don’t.',
    minutes: 10,
    level: 2,
    body: md`
## Bet sizes leak information
In equilibrium, different sizes go with different range shapes: small bets with merged ranges, large bets with polarized ones. Against humans, sizing is often the strongest tell. Many players bet big with strong hands and small with draws, or the reverse.

- Use several sizes only if your range behind each one is balanced enough.
- Exploit opponents whose sizes map onto their hand strength.

## Markets
Order size, aggressiveness (crossing the spread instead of resting a limit order) and timing all leak information. Large informed traders split their orders to hide their intent. That is the market version of balancing your bet-size ranges.

:::example Exploiting a sizing tell
If a player's river overbets are 90% value, fold your bluff-catchers to them. If his small river bets are usually weak hands, raise them more often, including as a bluff.
:::
`,
    quiz: [
      { q: 'Why do traders split a large order into small pieces?', choices: ['To reduce information leakage and market impact', 'To pay more commission'], answer: 0, explain: 'A visible large order tells the market what you know or need.' },
      { q: 'In equilibrium, large bets go with…', choices: ['Polarized ranges', 'Merged ranges'], answer: 0, explain: 'Medium hands avoid big bets, so the range splits into nuts and bluffs.' },
    ],
  },
  {
    id: 'distributions',
    module: 'trading',
    title: 'Thinking in Distributions',
    summary: 'Ranges, not hands; distributions, not price targets; and the skill of calibration.',
    minutes: 10,
    level: 1,
    body: md`
## Ranges, not hands
Good players never put villain on one hand; they assign a distribution. Trading works the same way: never a single price target, but a distribution of outcomes with probabilities.

- **Point estimates hide risk.** "He has AK" ignores the 30% of the time he has a set.
- **Expected value needs the whole distribution.**
- **Tails matter.** Small probabilities multiplied by large sizes dominate decisions: all-in pots, crash risk.

## Equity distributions
Solvers show equity distribution graphs: for each percentile of your range, its equity against villain's range. Comparing the two curves shows range and nut advantage at a glance. The breakdown below is the same idea: it shows how both ranges are distributed across hand classes on a flop.

::widget range-vs-board {"hero": "rfi-btn", "villain": "bb-vs-btn:call", "board": "Td9d4s"}

## Calibration
Practise assigning probabilities ("I think he is bluffing 30% here") and later check how often you were right. [[calibration|Calibration]] is a skill trading firms train explicitly, with estimation games and confidence intervals.
`,
    quiz: [
      { q: '“Villain has exactly AK” is an example of…', choices: ['Point-estimate thinking', 'Range thinking'], answer: 0, explain: 'A range would assign probabilities to many hands.' },
      { q: 'Being well calibrated means…', choices: ['Your 70% predictions come true about 70% of the time', 'You are always right'], answer: 0, explain: 'Calibration is about matching stated probabilities to observed frequencies.' },
    ],
  },
  {
    id: 'talk-through',
    module: 'trading',
    title: 'Talking Through Hands',
    summary: 'A template for articulating a decision the way trading firms run poker discussions.',
    minutes: 10,
    level: 1,
    body: md`
## Hand discussions
When trading firms teach poker, the value is in articulating your reasoning. A template:

1. **Setup:** game, stacks, positions, reads.
2. **Preflop:** ranges for both players, and why.
3. **Flop:** texture, who has range and nut advantage, the options and sizes, and villain's response range.
4. **Turn and river:** how each card changes the ranges, with value and bluff reasoning in combos.
5. **Decision:** the EV of the top two options, with rough numbers.
6. **Uncertainty:** which assumption, if it were wrong, would flip the decision?

## Good habits
- **Quantify.** "I need 25%, and I estimate his bluffs at about 35%."
- **Separate facts from assumptions.**
- **Name your biggest uncertainty** and the information that would resolve it.
- **Be willing to change your mind** out loud, in real time.

## Practise
Once a week, take a hand from your [journal](/journal) and write it up with the full template. Then explain it aloud in under two minutes.
`,
    quiz: [
      { q: 'Which step most distinguishes strong reasoning?', choices: ['Naming the assumption that would flip the decision', 'Describing the cards in detail'], answer: 0, explain: 'Knowing what you are uncertain about, and how much it matters, is the core of good decisions under uncertainty.' },
    ],
  },
];

export const SOLVER_LESSONS: Lesson[] = [
  {
    id: 'regret-matching',
    module: 'solver',
    title: 'Regret Matching',
    summary: 'Play in proportion to positive regret, and the average strategy converges to equilibrium.',
    minutes: 13,
    level: 2,
    tools: ['cfr'],
    body: md`
## Learning from regret
The [[regret]] of an action is how much better you would have done by always playing it instead of your actual strategy. **Regret matching** plays each action with probability proportional to its positive cumulative regret:

$$ \sigma^{t+1}(a) = \frac{R^t_+(a)}{\sum_b R^t_+(b)} $$

The key theorem: in self-play in a two-player zero-sum game, the **average** strategy of regret-minimising players converges to a Nash equilibrium.

::widget rps-regret

## The algorithm
~~~python
regret = [0.0, 0.0, 0.0]
strategy_sum = [0.0, 0.0, 0.0]
for t in range(T):
    positive = [max(r, 0.0) for r in regret]
    total = sum(positive)
    strategy = [p / total for p in positive] if total > 0 else [1 / 3] * 3
    strategy_sum = [s + p for s, p in zip(strategy_sum, strategy)]
    utility = [expected_payoff(a, opponent_strategy) for a in range(3)]
    ev = sum(p * u for p, u in zip(strategy, utility))
    regret = [r + u - ev for r, u in zip(regret, utility)]
average = [s / sum(strategy_sum) for s in strategy_sum]
~~~

:::note Current vs. average
The current strategy can oscillate; in RPS self-play it cycles around the equilibrium. It is the time-average that converges. Switch the widget to self-play to see it.
:::
`,
    quiz: [
      { q: 'In self-play, what converges to the equilibrium?', choices: ['The average strategy', 'The current strategy'], answer: 0, explain: 'The current strategy can cycle; the average converges.' },
      { q: 'Regret matching plays actions in proportion to…', choices: ['Positive cumulative regret', 'Total payoff', 'How often they were played'], answer: 0, explain: 'Negative regrets are treated as zero.' },
    ],
  },
  {
    id: 'cfr',
    module: 'solver',
    title: 'Counterfactual Regret Minimization',
    summary: 'Regret matching at every information set, weighted by how likely the others are to get you there.',
    minutes: 16,
    level: 3,
    tools: ['cfr'],
    body: md`
## From matrices to game trees
Poker is an extensive-form game with hidden information. CFR applies regret matching at every [[information set]]: a decision point the player cannot tell apart from others, because the cards they hold and the action history are the same.

The **counterfactual value** of an information set is its expected value weighted by the probability that the *opponents and chance* play to reach it, assuming you play to get there.

## The algorithm
On every iteration:
1. Traverse the game tree, enumerating or sampling chance.
2. At each information set, compute the counterfactual value of each action.
3. Update regrets: R(I, a) += π₋ᵢ(I) × (v(I, a) − v(I)).
4. Add the current strategy to the average, weighted by your own reach probability πᵢ(I).

The average strategy converges to an equilibrium, with exploitability falling like O(1/√T) or faster in practice.

~~~python
def cfr(cards, history, p0, p1):
    if is_terminal(history):
        return payoff(cards, history)          # for the player to act
    player = len(history) % 2
    node = nodes[info_set(cards[player], history)]
    strategy = node.regret_matching()
    node.strategy_sum += (p0 if player == 0 else p1) * strategy
    util = np.zeros(2)
    for a, action in enumerate("pb"):
        if player == 0:
            util[a] = -cfr(cards, history + action, p0 * strategy[a], p1)
        else:
            util[a] = -cfr(cards, history + action, p0, p1 * strategy[a])
    node_util = strategy @ util
    opponent_reach = p1 if player == 0 else p0
    node.regret_sum += opponent_reach * (util - node_util)
    return node_util
~~~

This negamax form flips the sign of utilities between the two players, which works because the game is zero-sum.

## Variants
- **CFR+** floors regrets at zero and uses linear averaging. It is much faster in practice.
- **Discounted CFR (DCFR)** discounts early iterations' regrets and is state of the art for many poker solvers. Your repository's engine uses it.
- **Monte Carlo CFR (MCCFR)** samples chance and actions so that it scales to huge games.
`,
    quiz: [
      { q: 'Regret updates are weighted by…', choices: ['The opponent’s (and chance’s) reach probability', 'Your own reach probability', 'Nothing'], answer: 0, explain: 'That is what makes the value counterfactual.' },
      { q: 'Which variant floors negative regrets at zero?', choices: ['CFR+', 'Vanilla CFR', 'MCCFR'], answer: 0, explain: 'CFR+ uses regret-matching+, which clips cumulative regrets at 0.' },
    ],
  },
  {
    id: 'kuhn',
    module: 'solver',
    title: 'Kuhn Poker',
    summary: 'The smallest real poker game, its family of equilibria, and CFR solving it live.',
    minutes: 16,
    level: 3,
    tools: ['cfr'],
    body: md`
## The smallest real poker
[[Kuhn poker]] uses three cards: J, Q and K. Each player antes 1 and gets one card. Player 1 checks or bets 1. If P1 checks, P2 can check (showdown) or bet 1. A player facing a bet calls or folds. The higher card wins at showdown.

There are 12 information sets. P1 has 6 (card × first decision, or facing a bet after checking), and P2 has 6 (card × after a check, or after a bet).

## The equilibrium family
Kuhn poker has infinitely many equilibria, parameterised by α ∈ [0, 1/3]:
- P1 bets the J with probability α (a bluff), bets the K with probability 3α, and always checks the Q.
- After checking and facing a bet, P1 calls with the Q at α + 1/3, always calls with the K and folds the J.
- P2 always bets and calls with the K. With the Q, P2 checks behind and calls a bet 1/3 of the time. With the J, P2 bluffs 1/3 of the time after a check and folds to bets.

The game value is **−1/18 ≈ −0.056** per hand for P1: acting first costs money.

::widget kuhn-cfr

:::tip Watch for
- Exploitability falling towards 0 as iterations accumulate.
- P1's J-bet frequency settling somewhere in [0, 1/3], with the K-bet frequency tracking 3× it.
- How much faster CFR+ converges than vanilla CFR.
:::
`,
    quiz: [
      { q: 'What is the game value of Kuhn poker for P1, in chips per hand (three decimals)?', answer: -0.056, tolerance: 0.003, explain: '−1/18 ≈ −0.0556. The first player is at a disadvantage.' },
      { q: 'If P1 bluffs the J with α = 0.2, how often should P1 bet the K?', choices: ['0.6', '0.2', '1.0', '0.33'], answer: 0, explain: 'In the equilibrium family, the K is bet 3α of the time.' },
      { q: 'What does P2 do with the K facing a bet?', choices: ['Always call', 'Fold', 'Call one third of the time'], answer: 0, explain: 'The K is the nuts and never folds.' },
    ],
  },
  {
    id: 'scaling',
    module: 'solver',
    title: 'Leduc, Abstraction & Real Solvers',
    summary: 'From Kuhn to hold’em: abstraction, subgame solving, and the milestones of poker AI.',
    minutes: 13,
    level: 3,
    body: md`
## Leduc hold'em
Leduc uses six cards (J, Q and K in two suits). Each player gets one private card, a public card comes after the first betting round, and there are two betting rounds with fixed raise sizes (2, then 4) and at most two raises per round. It has on the order of a thousand information sets: small enough for vanilla CFR to solve in seconds, large enough to need a real implementation.

## Scaling to hold'em
Heads-up no-limit hold'em has more than 10^160 decision points. The main techniques:
- **Card abstraction:** bucket strategically similar hands together, for example by equity distribution.
- **Action abstraction:** allow only a few bet sizes.
- **Subgame solving:** re-solve the current part of the game in real time with more detail (Libratus, Pluribus).
- **Vector-form CFR:** process all 1,326 hands at once at each node. This is what postflop solvers do.
- **Depth-limited search with value networks** (DeepStack, ReBeL).

## Milestones
| Year | System | Result |
|---|---|---|
| 2015 | Cepheus | Essentially solved heads-up limit hold'em, using CFR+ |
| 2017 | DeepStack | Beat professionals at heads-up no-limit |
| 2017 | Libratus | Beat top heads-up no-limit specialists |
| 2019 | Pluribus | Beat elite professionals at six-player no-limit |

## Your project path
1. Kuhn CFR. You have watched it here; now reimplement it yourself in Python.
2. Leduc CFR, with exploitability from a best-response computation.
3. A no-limit river subgame: fixed ranges, two bet sizes, vector-form CFR.
4. Turn and river with a chance node, compared against your C++ DCFR engine.

Track these milestones in the [Library](/library).
`,
    quiz: [
      { q: 'Libratus beat top professionals at…', choices: ['Heads-up no-limit hold’em', 'Six-player no-limit', 'Limit hold’em'], answer: 0, explain: 'In January 2017. Pluribus (2019) was the six-player result.' },
      { q: 'Action abstraction means…', choices: ['Restricting the bet sizes', 'Grouping similar hands', 'Sampling chance outcomes'], answer: 0, explain: 'Grouping hands is card abstraction; sampling is Monte Carlo CFR.' },
    ],
  },
];
