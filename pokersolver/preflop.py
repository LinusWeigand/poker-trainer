"""Preflop reference charts for 6-max cash, 100bb deep.

These are hand-written approximations of typical solver strategies (2.5bb
opens, 3bb from the SB, ~3x in-position and ~4.4x out-of-position 3-bets).
They are study references, not computed equilibria. They also supply the
default postflop ranges for each scenario.

Each chart maps an action to a range string. Hands missing from every action
are folds.
"""

from __future__ import annotations

from .cards import NUM_COMBOS
from .ranges import parse_range

POSITIONS = ["UTG", "HJ", "CO", "BTN", "SB", "BB"]
# Postflop the blinds act first, then UTG ... BTN.
POSTFLOP_ORDER = ["SB", "BB", "UTG", "HJ", "CO", "BTN"]

RFI = {
    "UTG": "22+, A2s+, K8s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, 65s, ATo+, KJo+, KTo:0.5, QJo:0.5",
    "HJ": "22+, A2s+, K6s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, 65s, 54s:0.5, A9o+, KTo+, QTo+, JTo:0.5",
    "CO": "22+, A2s+, K3s+, Q6s+, J7s+, T7s+, 96s+, 86s+, 75s+, 64s+, 54s, A7o+, A5o, A4o:0.5, "
          "KTo+, K9o:0.5, QTo+, JTo, T9o:0.5",
    "BTN": "22+, A2s+, K2s+, Q3s+, J5s+, T6s+, 96s+, 85s+, 74s+, 64s+, 53s+, 43s:0.5, A2o+, K7o+, "
           "K6o:0.5, Q8o+, J8o+, T8o+, 98o, 87o:0.5",
    "SB": "22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, A2o+, K8o+, Q9o+, J9o+, "
          "T9o, 98o:0.5",
}

# (hero, opener) -> {"3bet": ..., "call": ...}
VS_OPEN = {
    ("HJ", "UTG"): {
        "3bet": "QQ+, JJ:0.25, AKs, AKo, AQs:0.4, AQo:0.4, KQs:0.3, A5s:0.6, A4s:0.4, KJs:0.2, "
                "T9s:0.15, 87s:0.15",
        "call": "JJ:0.75, TT-66, 55:0.5, AQs:0.6, AJs, ATs:0.7, KQs:0.7, KJs:0.6, KTs:0.3, QJs:0.7, "
                "QTs:0.3, JTs:0.6, T9s:0.4, 98s:0.3, AQo:0.2",
    },
    ("CO", "UTG"): {
        "3bet": "QQ+, JJ:0.3, AKs, AKo, AQs:0.5, AQo:0.5, AJs:0.2, KQs:0.4, A5s:0.7, A4s:0.5, "
                "A3s:0.2, KJs:0.2, 76s:0.2, 65s:0.2",
        "call": "JJ:0.7, TT-55, 44:0.5, AQs:0.5, AJs:0.8, ATs:0.8, A9s:0.3, KQs:0.6, KJs:0.7, "
                "KTs:0.4, QJs:0.8, QTs:0.4, JTs:0.7, T9s:0.6, 98s:0.5, 87s:0.3, AQo:0.3",
    },
    ("BTN", "UTG"): {
        "3bet": "QQ+, JJ:0.3, AKs, AKo, AQs:0.4, AQo:0.4, KQs:0.3, A5s:0.6, A4s:0.4, KJs:0.2, "
                "65s:0.2, 54s:0.2",
        "call": "JJ:0.7, TT-22, AQs:0.6, AJs-A9s, A8s:0.5, KQs:0.7, KJs:0.8, KTs, K9s:0.4, QJs, QTs, "
                "Q9s:0.4, JTs, J9s:0.6, T9s, T8s:0.4, 98s, 87s, 76s, 65s:0.6, 54s:0.4, AQo:0.6, "
                "AJo:0.4, KQo:0.4",
    },
    ("SB", "UTG"): {
        "3bet": "TT+, 99:0.4, AKs, AKo, AQs, AJs:0.6, AQo:0.6, KQs:0.7, KJs:0.3, QJs:0.2, JTs:0.2, "
                "A5s:0.6, A4s:0.4",
        "call": "99:0.3, 88:0.3, 77:0.2, AJs:0.2, KQs:0.2",
    },
    ("BB", "UTG"): {
        "3bet": "QQ+, AKs, AKo:0.8, AQs:0.4, A5s:0.5, A4s:0.4, KQs:0.2, K5s:0.15, 76s:0.1",
        "call": "JJ-22, AKo:0.2, AQs:0.6, AJs-A6s, A5s:0.5, A4s:0.6, A3s, A2s, KQs:0.8, KJs-K7s, "
                "K5s:0.5, Q8s+, J8s+, T7s+, 97s+, 86s+, 75s+, 64s+, 54s, AQo-ATo, A9o:0.3, KQo, KJo, "
                "KTo:0.4, QJo:0.6, QTo:0.2, JTo:0.4",
    },
    ("CO", "HJ"): {
        "3bet": "QQ+, JJ:0.5, AKs, AKo, AQs:0.6, AQo:0.6, AJs:0.3, KQs:0.5, KJs:0.2, A5s:0.8, "
                "A4s:0.6, A3s:0.3, 76s:0.2, 65s:0.2, T9s:0.2",
        "call": "JJ:0.5, TT-55, 44:0.4, AQs:0.4, AJs:0.7, ATs, A9s:0.4, KQs:0.5, KJs:0.8, KTs:0.6, "
                "QJs, QTs:0.6, JTs, T9s:0.6, 98s:0.5, 87s:0.3, AQo:0.3, AJo:0.2, KQo:0.2",
    },
    ("BTN", "HJ"): {
        "3bet": "QQ+, JJ:0.4, AKs, AKo, AQs:0.5, AQo:0.5, AJs:0.2, KQs:0.4, A5s:0.7, A4s:0.5, "
                "A3s:0.3, KJs:0.2, K9s:0.15, 65s:0.25, 54s:0.25",
        "call": "JJ:0.6, TT-22, AQs:0.5, AJs:0.8, ATs-A8s, A7s:0.5, A6s:0.4, KQs:0.6, KJs:0.8, KTs, "
                "K9s:0.5, QJs, QTs, Q9s:0.6, JTs, J9s:0.8, T9s, T8s:0.6, 98s, 97s:0.4, 87s, 76s, "
                "65s:0.6, 54s:0.4, AQo:0.5, AJo:0.6, ATo:0.3, KQo:0.6, KJo:0.3, QJo:0.2",
    },
    ("SB", "HJ"): {
        "3bet": "TT+, 99:0.5, 88:0.3, AKs, AKo, AQs, AJs, ATs:0.5, AQo, AJo:0.4, KQs, KJs:0.6, "
                "KTs:0.3, QJs:0.4, JTs:0.3, A5s, A4s:0.7, A3s:0.3",
        "call": "99:0.2, 88:0.2",
    },
    ("BB", "HJ"): {
        "3bet": "QQ+, JJ:0.3, AKs, AKo, AQs:0.5, AQo:0.3, KQs:0.3, A5s:0.6, A4s:0.5, A3s:0.3, "
                "K6s:0.2, K5s:0.2, Q8s:0.15, 65s:0.15, 54s:0.15",
        "call": "JJ:0.7, TT-22, AQs:0.5, AJs-A6s, A5s:0.4, A4s:0.5, A3s:0.7, A2s, KQs:0.7, KJs-K7s, "
                "K6s:0.8, K5s:0.8, K4s:0.5, Q9s+, Q8s:0.85, Q7s:0.5, J8s+, J7s:0.5, T7s+, 96s+, "
                "85s+, 75s+, 64s+, 53s+, 43s:0.4, AQo:0.7, AJo-A9o, A8o:0.4, KTo+, K9o:0.3, QTo+, "
                "JTo, T9o:0.3",
    },
    ("BTN", "CO"): {
        "3bet": "JJ+, TT:0.4, AKs, AKo, AQs, AQo:0.7, AJs:0.5, ATs:0.3, KQs:0.6, KJs:0.4, KTs:0.2, "
                "A5s, A4s:0.8, A3s:0.5, A2s:0.3, K9s:0.3, Q9s:0.2, J9s:0.2, T8s:0.2, 97s:0.2, "
                "86s:0.2, 75s:0.2, 64s:0.2, 54s:0.3, AJo:0.3, KQo:0.3",
        "call": "TT:0.6, 99-22, AQo:0.3, AJs:0.5, ATs:0.7, A9s-A6s, KQs:0.4, KJs:0.6, KTs:0.8, "
                "K9s:0.5, K8s:0.3, QJs, QTs, Q9s:0.6, JTs, J9s:0.8, T9s, T8s:0.6, 98s, 97s:0.4, 87s, "
                "76s, 65s, 54s:0.5, AJo:0.5, ATo:0.4, KQo:0.5, KJo:0.4, QJo:0.3",
    },
    ("SB", "CO"): {
        "3bet": "99+, 88:0.5, 77:0.3, AKs, AKo, AQs, AJs, ATs, A9s:0.5, AQo, AJo:0.7, ATo:0.3, KQs, "
                "KJs, KTs:0.6, K9s:0.3, QJs, QTs:0.5, JTs:0.6, T9s:0.4, 98s:0.3, 87s:0.2, 76s:0.2, "
                "A5s, A4s, A3s:0.6, A2s:0.4, KQo:0.6",
        "call": "88:0.2, 77:0.3, 66:0.3",
    },
    ("BB", "CO"): {
        "3bet": "JJ+, TT:0.3, AKs, AKo, AQs:0.6, AQo:0.5, AJs:0.3, KQs:0.4, KJs:0.2, A5s:0.6, "
                "A4s:0.5, A3s:0.3, K5s:0.3, K4s:0.3, Q7s:0.2, J7s:0.2, T7s:0.2, 96s:0.2, 85s:0.2, "
                "64s:0.2, 53s:0.2, AJo:0.2, KQo:0.2",
        "call": "TT:0.7, 99-22, AQs:0.4, AJs:0.7, ATs-A6s, A5s:0.4, A4s:0.5, A3s:0.7, A2s, KQs:0.6, "
                "KJs:0.8, KTs-K6s, K5s:0.7, K4s:0.7, K3s:0.6, K2s:0.5, Q8s+, Q7s:0.8, Q6s:0.6, "
                "Q5s:0.4, J8s+, J7s:0.8, J6s:0.3, T8s+, T7s:0.8, T6s:0.5, 97s+, 96s:0.8, 95s:0.3, "
                "86s+, 85s:0.8, 74s+, 63s+, 54s, 53s:0.8, 43s:0.6, AQo:0.5, AJo:0.8, ATo-A8o, "
                "A7o:0.5, A5o:0.4, KQo:0.8, KJo, KTo, K9o:0.6, QTo+, Q9o:0.4, J9o+, T9o, T8o:0.3, "
                "98o:0.3",
    },
    ("SB", "BTN"): {
        "3bet": "88+, 77:0.6, 66:0.5, 55:0.4, 44:0.3, AKs, AKo, AQs-A2s, AQo, AJo, ATo:0.6, A9o:0.2, "
                "KQs-K9s, K8s:0.5, K7s:0.3, KQo, KJo:0.6, KTo:0.3, QJs, QTs, Q9s:0.6, QJo:0.3, JTs, "
                "J9s:0.6, T9s, T8s:0.5, 98s, 97s:0.3, 87s, 76s:0.7, 65s:0.6, 54s:0.5",
        "call": "66:0.3, 55:0.3, 44:0.3, 33:0.3, 22:0.3",
    },
    ("BB", "BTN"): {
        "3bet": "TT+, 99:0.3, AKs, AKo, AQs, AQo:0.6, AJs:0.5, ATs:0.3, KQs:0.6, KJs:0.4, A5s:0.5, "
                "A4s:0.5, A3s:0.4, A2s:0.3, K5s:0.3, K4s:0.3, K3s:0.3, Q6s:0.3, Q5s:0.3, J6s:0.3, "
                "T6s:0.3, 96s:0.3, 85s:0.3, 74s:0.3, 63s:0.3, 53s:0.3, 43s:0.3, AJo:0.3, KQo:0.3, "
                "A5o:0.3, K9o:0.15, Q9o:0.15",
        "call": "99:0.7, 88-22, AJs:0.5, ATs:0.7, A9s-A6s, A5s:0.5, A4s:0.5, A3s:0.6, A2s:0.7, "
                "KQs:0.4, KJs:0.6, KTs-K6s, K5s:0.7, K4s:0.7, K3s:0.7, K2s, QJs-Q7s, Q6s:0.7, "
                "Q5s:0.7, Q4s-Q2s, JTs-J7s, J6s:0.7, J5s-J3s, T9s-T7s, T6s:0.7, T5s, 98s, 97s, "
                "96s:0.7, 95s, 94s:0.5, 87s, 86s, 85s:0.7, 84s:0.5, 76s, 75s, 74s:0.7, 73s:0.4, "
                "65s, 64s, 63s:0.7, 54s, 53s:0.7, 52s:0.4, 43s:0.7, 42s:0.3, 32s:0.3, AQo:0.4, "
                "AJo:0.7, ATo-A6o, A5o:0.7, A4o-A2o, KQo:0.7, KJo, KTo, K9o:0.85, K8o, K7o, K6o:0.5, "
                "K5o:0.3, QJo-Q8o, Q9o:0.85, Q7o:0.3, JTo-J8o, J7o:0.3, T9o, T8o, T7o:0.4, 98o, "
                "97o:0.5, 87o, 86o:0.3, 76o:0.6, 65o:0.4, 54o:0.3",
    },
    ("BB", "SB"): {
        "3bet": "88+, 77:0.5, AKs, AKo, AQs, AJs, ATs:0.6, AQo, AJo:0.6, KQs, KJs:0.6, KTs:0.4, "
                "QJs:0.4, A5s:0.6, A4s:0.6, A3s:0.4, K9s:0.3, Q9s:0.3, J9s:0.3, T8s:0.3, 97s:0.3, "
                "86s:0.3, 75s:0.3, 64s:0.3, 54s:0.3, KQo:0.6, KJo:0.3, A9o:0.3, A8o:0.2",
        "call": "77:0.5, 66-22, ATs:0.4, A9s-A6s, A5s:0.4, A4s:0.4, A3s:0.6, A2s, KJs:0.4, KTs:0.6, "
                "K9s:0.7, K8s-K2s, QJs:0.6, QTs, Q9s:0.7, Q8s-Q2s, JTs, J9s:0.7, J8s-J4s, T9s, "
                "T8s:0.7, T7s-T5s, 98s, 97s:0.7, 96s, 95s:0.6, 87s, 86s:0.7, 85s, 84s:0.4, 76s, "
                "75s:0.7, 74s, 65s, 64s:0.7, 63s:0.6, 54s:0.7, 53s, 43s, AJo:0.4, ATo, A9o:0.7, "
                "A8o:0.8, A7o-A2o, KQo:0.4, KJo:0.7, KTo-K5o, K4o:0.5, QJo-Q7o, Q6o:0.4, JTo-J7o, "
                "T9o-T7o, 98o, 97o, 87o, 86o:0.5, 76o, 65o:0.5",
    },
}

# The opener's response to a 3-bet, grouped by opener and whether the
# 3-bettor has position postflop. (opener, "ip" | "oop") -> {"4bet", "call"}
VS_3BET = {
    ("UTG", "ip"): {
        "4bet": "KK+, QQ:0.5, AKs:0.6, AKo:0.5, A5s:0.4, A4s:0.2",
        "call": "QQ:0.5, JJ-88, 77:0.5, AKs:0.4, AKo:0.5, AQs, AJs:0.8, ATs:0.5, KQs, KJs:0.6, "
                "QJs:0.6, JTs:0.6, T9s:0.4, A5s:0.4, AQo:0.4",
    },
    ("UTG", "oop"): {
        "4bet": "KK+, QQ:0.4, AKs:0.5, AKo:0.5, A5s:0.4",
        "call": "QQ:0.6, JJ-77, 66:0.5, AKs:0.5, AKo:0.5, AQs, AJs, ATs:0.6, KQs, KJs:0.7, KTs:0.3, "
                "QJs:0.7, JTs:0.7, T9s:0.5, 98s:0.3, A5s:0.4, A4s:0.3, AQo:0.5",
    },
    ("HJ", "ip"): {
        "4bet": "KK+, QQ:0.6, AKs:0.6, AKo:0.6, A5s:0.4, A4s:0.3, KQs:0.1",
        "call": "QQ:0.4, JJ-77, 66:0.5, AKs:0.4, AKo:0.4, AQs, AJs, ATs:0.6, AQo:0.5, KQs:0.9, "
                "KJs:0.7, KTs:0.3, QJs:0.7, QTs:0.3, JTs:0.7, T9s:0.5, 98s:0.3, A5s:0.4, A4s:0.2",
    },
    ("HJ", "oop"): {
        "4bet": "KK+, QQ:0.5, AKs:0.6, AKo:0.6, A5s:0.4, A4s:0.3",
        "call": "QQ:0.5, JJ-66, 55:0.5, AKs:0.4, AKo:0.4, AQs, AJs, ATs:0.8, A9s:0.3, AQo:0.6, "
                "AJo:0.2, KQs, KJs:0.8, KTs:0.5, QJs:0.8, QTs:0.4, JTs:0.8, T9s:0.6, 98s:0.4, "
                "87s:0.3, A5s:0.5, A4s:0.4, KQo:0.3",
    },
    ("CO", "ip"): {
        "4bet": "QQ+, JJ:0.3, AKs, AKo:0.8, AQs:0.2, A5s:0.5, A4s:0.4, A3s:0.2, KJs:0.1",
        "call": "JJ:0.7, TT-55, 44:0.4, AKo:0.2, AQs:0.8, AJs, ATs, A9s:0.5, AQo:0.6, AJo:0.2, KQs, "
                "KJs:0.8, KTs:0.7, K9s:0.3, QJs, QTs:0.7, JTs, J9s:0.4, T9s:0.8, 98s:0.6, 87s:0.5, "
                "76s:0.4, 65s:0.3, A5s:0.4, A4s:0.4, KQo:0.4",
    },
    ("CO", "oop"): {
        "4bet": "QQ+, JJ:0.3, AKs, AKo:0.8, AQs:0.2, A5s:0.5, A4s:0.4, A3s:0.2",
        "call": "JJ:0.7, TT-44, 33:0.4, AKo:0.2, AQs:0.8, AJs, ATs, A9s:0.6, A8s:0.3, AQo:0.7, "
                "AJo:0.4, KQs, KJs, KTs:0.8, K9s:0.4, QJs, QTs:0.8, Q9s:0.3, JTs, J9s:0.5, T9s:0.9, "
                "98s:0.7, 87s:0.6, 76s:0.5, 65s:0.4, A5s:0.5, A4s:0.5, A3s:0.4, KQo:0.5",
    },
    ("BTN", "oop"): {
        "4bet": "QQ+, JJ:0.4, AKs, AKo, AQs:0.3, AQo:0.2, A5s:0.5, A4s:0.4, A3s:0.3, K9s:0.1",
        "call": "JJ:0.6, TT-33, 22:0.5, AQs:0.7, AJs-A6s, A5s:0.5, A4s:0.6, A3s:0.6, A2s:0.5, "
                "AQo:0.8, AJo:0.6, ATo:0.3, KQs-K9s, K8s:0.4, KQo:0.7, KJo:0.4, QJs, QTs, Q9s:0.6, "
                "JTs, J9s:0.7, T9s, T8s:0.5, 98s, 97s:0.3, 87s, 76s, 65s:0.8, 54s:0.6",
    },
    ("SB", "ip"): {
        "4bet": "QQ+, JJ:0.4, AKs, AKo, AQs:0.4, A5s:0.4, A4s:0.4, K9s:0.1",
        "call": "JJ:0.6, TT-22, AQs:0.6, AJs-A6s, A5s:0.6, A4s:0.6, A3s, A2s:0.6, AQo, AJo:0.7, "
                "ATo:0.4, KQs-K8s, KQo, KJo:0.5, QJs-Q9s, JTs, J9s, T9s, T8s:0.6, 98s, 87s, 76s, "
                "65s, 54s:0.7",
    },
}


def postflop_order(pos: str) -> int:
    return POSTFLOP_ORDER.index(pos)


def opens_to(opener: str) -> float:
    return 3.0 if opener == "SB" else 2.5


def three_bet_to(opener: str, three_bettor: str) -> float:
    open_size = opens_to(opener)
    in_position = postflop_order(three_bettor) > postflop_order(opener)
    return round(open_size * (3.0 if in_position else 4.4), 1)


def _blind_posts(pos: str) -> float:
    return {"SB": 0.5, "BB": 1.0}.get(pos, 0.0)


def _pot(final_bet: float, players: tuple[str, str]) -> float:
    """Pot after both players have put in `final_bet`, plus folded blinds."""
    dead = sum(_blind_posts(p) for p in ("SB", "BB") if p not in players)
    return round(2 * final_bet + dead, 2)


def chart(kind: str, hero: str, villain: str | None = None) -> dict[str, str]:
    """Returns {action: range string} for a preflop decision.

    kind = "rfi" (folded to hero), "vs_open" (villain opened), or
    "vs_3bet" (hero opened, villain 3-bet).
    """
    if kind == "rfi":
        if hero not in RFI:
            raise ValueError(f"no open-raise chart for {hero}")
        return {"raise": RFI[hero]}
    if kind == "vs_open":
        key = (hero, villain)
        if key not in VS_OPEN:
            raise ValueError(f"{hero} cannot face an open from {villain}")
        return {"3bet": VS_OPEN[key]["3bet"], "call": VS_OPEN[key]["call"]}
    if kind == "vs_3bet":
        if (villain, hero) not in VS_OPEN:
            raise ValueError(f"{villain} cannot 3-bet an open from {hero}")
        side = "ip" if postflop_order(villain) > postflop_order(hero) else "oop"
        key = (hero, side)
        if key not in VS_3BET:
            raise ValueError(f"no chart for {hero} facing a 3-bet")
        return {"4bet": VS_3BET[key]["4bet"], "call": VS_3BET[key]["call"]}
    raise ValueError(f"unknown chart kind {kind!r}")


def chart_weights(actions: dict[str, str]) -> dict[str, list[float]]:
    """Parsed weights per action; overlapping weights are scaled so they sum to at most 1."""
    parsed = {a: parse_range(text) for a, text in actions.items()}
    for c in range(NUM_COMBOS):
        total = sum(w[c] for w in parsed.values())
        if total > 1:
            for w in parsed.values():
                w[c] /= total
    return parsed


def scenarios() -> list[dict]:
    """Postflop spots derived from the charts: single-raised and 3-bet pots."""
    out = []
    for (caller, opener), ranges in VS_OPEN.items():
        oop, ip = sorted((caller, opener), key=postflop_order)
        bet = opens_to(opener)
        out.append({
            "id": f"srp-{opener}-{caller}",
            "name": f"SRP · {opener} open, {caller} call",
            "kind": "srp",
            "oop": oop,
            "ip": ip,
            "oop_range": RFI[opener] if oop == opener else ranges["call"],
            "ip_range": RFI[opener] if ip == opener else ranges["call"],
            "pot": _pot(bet, (opener, caller)),
            "stack": round(100 - bet, 2),
        })
    for (three_bettor, opener), ranges in VS_OPEN.items():
        oop, ip = sorted((three_bettor, opener), key=postflop_order)
        opener_call = chart("vs_3bet", opener, three_bettor)["call"]
        bet = three_bet_to(opener, three_bettor)
        out.append({
            "id": f"3bp-{opener}-{three_bettor}",
            "name": f"3BP · {opener} open, {three_bettor} 3-bet, {opener} call",
            "kind": "3bp",
            "oop": oop,
            "ip": ip,
            "oop_range": ranges["3bet"] if oop == three_bettor else opener_call,
            "ip_range": ranges["3bet"] if ip == three_bettor else opener_call,
            "pot": _pot(bet, (opener, three_bettor)),
            "stack": round(100 - bet, 2),
        })
    return out
