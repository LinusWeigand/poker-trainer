"""Hand-range strings in the usual solver notation.

Examples: "22+, A2s+, KTo+, QJs:0.5, T9s-T7s, AhKh:0.25". A token without a
weight means weight 1; later tokens override earlier ones. A range is held as
a list of 1326 weights indexed by combo id.
"""

from __future__ import annotations

import re

from .cards import (
    CLASS_COMBOS,
    COMBO_CARDS,
    GRID_CLASSES,
    NUM_COMBOS,
    RANKS,
    SUITS,
    class_combos,
    combo_index,
    combo_str,
    parse_card,
)

_DESC = RANKS[::-1]


def _norm(token: str) -> str:
    """Upper-cases ranks and lower-cases the s/o marker."""
    out = []
    for ch in token:
        out.append(ch.upper() if ch.upper() in RANKS else ch.lower())
    return "".join(out)


def _is_specific(token: str) -> bool:
    return len(token) == 4 and token[1].lower() in SUITS and token[3].lower() in SUITS


def _classes_for(token: str) -> list[str]:
    """Expands a class token (with optional + or range dash) into class names."""
    if "-" in token:
        lo_tok, hi_tok = token.split("-", 1)
        a, b = _norm(lo_tok), _norm(hi_tok)
        if len(a) != len(b) or len(a) not in (2, 3) or (len(a) == 3 and a[2] != b[2]):
            raise ValueError(f"invalid range {token!r}")
        kind = a[2:] if len(a) == 3 else ""
        if a[0] == a[1] and b[0] == b[1]:  # pairs, e.g. KK-TT
            r1, r2 = sorted((RANKS.index(a[0]), RANKS.index(b[0])))
            return [RANKS[r] * 2 for r in range(r1, r2 + 1)]
        if a[0] != b[0]:
            raise ValueError(f"invalid range {token!r}: first ranks differ")
        top = RANKS.index(a[0])
        k1, k2 = sorted((RANKS.index(a[1]), RANKS.index(b[1])))
        if k2 >= top:
            raise ValueError(f"invalid range {token!r}")
        return [a[0] + RANKS[k] + kind for k in range(k1, k2 + 1)]

    plus = token.endswith("+")
    body = _norm(token[:-1] if plus else token)
    if len(body) not in (2, 3) or body[0] not in RANKS or body[1] not in RANKS:
        raise ValueError(f"invalid hand {token!r}")
    kind = body[2:] if len(body) == 3 else ""
    if kind not in ("", "s", "o"):
        raise ValueError(f"invalid hand {token!r}")
    r1, r2 = RANKS.index(body[0]), RANKS.index(body[1])
    if r1 == r2:
        if kind:
            raise ValueError(f"invalid hand {token!r}")
        return [RANKS[r] * 2 for r in range(r1, 13)] if plus else [body]
    if r1 < r2:  # written low-high, e.g. "KA"
        r1, r2 = r2, r1
    high = RANKS[r1]
    if plus:
        return [high + RANKS[k] + kind for k in range(r2, r1)]
    return [high + RANKS[r2] + kind]


def parse_range(text: str) -> list[float]:
    weights = [0.0] * NUM_COMBOS
    for raw in re.split(r"[,\s]+", text.strip()):
        if not raw:
            continue
        token, _, weight_text = raw.partition(":")
        weight = 1.0
        if weight_text:
            try:
                weight = float(weight_text.rstrip("%"))
            except ValueError:
                raise ValueError(f"invalid weight in {raw!r}") from None
            if weight_text.endswith("%") or weight > 1:
                weight /= 100.0
            if not 0 <= weight <= 1:
                raise ValueError(f"weight out of range in {raw!r}")
        if _is_specific(token):
            weights[combo_index(parse_card(token[:2]), parse_card(token[2:]))] = weight
            continue
        for name in _classes_for(token):
            for c in class_combos(name):
                weights[c] = weight
    return weights


def _fmt_weight(w: float) -> str:
    return "" if w >= 0.9995 else ":" + f"{w:.3f}".rstrip("0").rstrip(".")


def format_range(weights: list[float]) -> str:
    """Compact range string; classes with uneven combo weights are listed combo by combo."""
    class_w: dict[str, float] = {}
    specific: list[str] = []
    for name in GRID_CLASSES:
        ws = [round(weights[c], 4) for c in CLASS_COMBOS[name]]
        if all(w == ws[0] for w in ws):
            if ws[0] > 0:
                class_w[name] = ws[0]
        else:
            specific += [combo_str(c) + _fmt_weight(weights[c]) for c in CLASS_COMBOS[name] if weights[c] > 0]

    tokens: list[str] = []

    def emit_runs(names: list[str], top_name: str, plus_fmt, dash_fmt) -> None:
        """names are ordered strongest first; consecutive equal weights form a run."""
        i = 0
        while i < len(names):
            w = class_w.get(names[i], 0.0)
            j = i
            while j + 1 < len(names) and class_w.get(names[j + 1], 0.0) == w:
                j += 1
            if w > 0:
                if i == j and names[i] != top_name:
                    tok = names[i]
                elif names[i] == top_name and j > i:
                    tok = plus_fmt(names[j])
                elif names[i] == top_name:
                    tok = names[i]
                else:
                    tok = dash_fmt(names[i], names[j])
                tokens.append(tok + _fmt_weight(w))
            i = j + 1

    pairs = [r * 2 for r in _DESC]
    emit_runs(pairs, "AA", lambda last: last + "+", lambda first, last: f"{first}-{last}")
    for kind in ("s", "o"):
        for hi in _DESC[:-1]:
            kickers = [k for k in _DESC if RANKS.index(k) < RANKS.index(hi)]
            names = [hi + k + kind for k in kickers]
            emit_runs(names, names[0], lambda last: last + "+", lambda first, last: f"{first}-{last}")
    return ", ".join(tokens + specific)


def class_weights(weights: list[float], dead: list[int] | None = None) -> dict[str, float]:
    """Average weight per grid class over combos not blocked by dead cards."""
    dead = dead or []
    out = {}
    for name in GRID_CLASSES:
        live = [c for c in CLASS_COMBOS[name] if COMBO_CARDS[c][0] not in dead and COMBO_CARDS[c][1] not in dead]
        out[name] = sum(weights[c] for c in live) / len(live) if live else 0.0
    return out


def from_class_weights(classes: dict[str, float]) -> list[float]:
    weights = [0.0] * NUM_COMBOS
    for name, w in classes.items():
        w = max(0.0, min(1.0, float(w)))
        for c in class_combos(name):
            weights[c] = w
    return weights


def combo_count(weights: list[float], dead: list[int] | None = None) -> float:
    dead = dead or []
    return sum(w for c, w in enumerate(weights) if COMBO_CARDS[c][0] not in dead and COMBO_CARDS[c][1] not in dead)
