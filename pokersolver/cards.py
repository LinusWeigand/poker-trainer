"""Cards, hole-card combos and the 13x13 hand grid.

Card id = rank * 4 + suit with ranks 2..A = 0..12 and suits c, d, h, s = 0..3.
Combo id for cards a > b = a * (a - 1) / 2 + b, giving 1326 combos. The C++
engine uses the same numbering.
"""

from __future__ import annotations

RANKS = "23456789TJQKA"
SUITS = "cdhs"
NUM_COMBOS = 1326


def parse_card(text: str) -> int:
    if len(text) != 2 or text[0].upper() not in RANKS or text[1].lower() not in SUITS:
        raise ValueError(f"invalid card {text!r}")
    return RANKS.index(text[0].upper()) * 4 + SUITS.index(text[1].lower())


def card_str(card: int) -> str:
    return RANKS[card // 4] + SUITS[card % 4]


def parse_cards(text: str) -> list[int]:
    """Parses e.g. "Ks7d2c" or "Ks 7d 2c" into card ids; rejects duplicates."""
    compact = "".join(ch for ch in text if not ch.isspace() and ch != ",")
    if len(compact) % 2:
        raise ValueError(f"invalid cards {text!r}")
    cards = [parse_card(compact[i:i + 2]) for i in range(0, len(compact), 2)]
    if len(set(cards)) != len(cards):
        raise ValueError(f"duplicate card in {text!r}")
    return cards


def combo_index(a: int, b: int) -> int:
    if a == b:
        raise ValueError("a combo needs two different cards")
    if a < b:
        a, b = b, a
    return a * (a - 1) // 2 + b


COMBO_CARDS: list[tuple[int, int]] = [(a, b) for a in range(1, 52) for b in range(a)]


def combo_str(combo: int) -> str:
    hi, lo = COMBO_CARDS[combo]
    return card_str(hi) + card_str(lo)


def combo_class(combo: int) -> str:
    """The 169-grid hand class of a combo, e.g. "AKs", "T9o" or "77"."""
    hi, lo = COMBO_CARDS[combo]
    r1, r2 = hi // 4, lo // 4
    if r1 == r2:
        return RANKS[r1] * 2
    return RANKS[r1] + RANKS[r2] + ("s" if hi % 4 == lo % 4 else "o")


# Grid rows and columns run A..2; suited hands above the diagonal.
GRID_RANKS = RANKS[::-1]


def grid_class(row: int, col: int) -> str:
    if row == col:
        return GRID_RANKS[row] * 2
    if row < col:
        return GRID_RANKS[row] + GRID_RANKS[col] + "s"
    return GRID_RANKS[col] + GRID_RANKS[row] + "o"


GRID_CLASSES: list[str] = [grid_class(r, c) for r in range(13) for c in range(13)]


def class_combos(name: str) -> list[int]:
    """All combo ids of a hand class such as "AKs", "AKo", "AK" or "QQ"."""
    if len(name) not in (2, 3) or name[0] not in RANKS or name[1] not in RANKS:
        raise ValueError(f"invalid hand {name!r}")
    r1, r2 = RANKS.index(name[0]), RANKS.index(name[1])
    kind = name[2] if len(name) == 3 else ""
    if kind not in ("", "s", "o"):
        raise ValueError(f"invalid hand {name!r}")
    if r1 == r2 and kind:
        raise ValueError(f"invalid hand {name!r}")
    out = []
    for s1 in range(4):
        for s2 in range(4):
            a, b = r1 * 4 + s1, r2 * 4 + s2
            if a == b:
                continue
            if r1 == r2 and s1 >= s2:
                continue
            if kind == "s" and s1 != s2 or kind == "o" and s1 == s2:
                continue
            out.append(combo_index(a, b))
    return out


CLASS_COMBOS: dict[str, list[int]] = {name: class_combos(name) for name in GRID_CLASSES}
COMBO_CLASS: list[str] = [combo_class(c) for c in range(NUM_COMBOS)]


def combo_blocked(combo: int, cards: list[int]) -> bool:
    hi, lo = COMBO_CARDS[combo]
    return hi in cards or lo in cards
