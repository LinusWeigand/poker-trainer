"""Builds the betting tree for a postflop spot.

The tree holds one street's worth of chance nodes as placeholders ("deal the
next card"); the C++ engine expands them into one subtree per card. Amounts
are in big blinds. Player 0 is OOP, player 1 is IP.
"""

from __future__ import annotations

from dataclasses import dataclass, field

OOP, IP = 0, 1
STREETS = ["flop", "turn", "river"]
EPS = 1e-6

# Node kinds; the numeric codes match NodeType in engine/solver.cpp.
KIND_CODES = {"oop": 0, "ip": 1, "chance": 2, "fold_oop": 3, "fold_ip": 4, "showdown": 5}


@dataclass(frozen=True)
class Size:
    kind: str  # "pot" (fraction of pot), "mult" (raise to N x the bet), "allin"
    value: float = 0.0


def parse_sizes(text: str, allow_mult: bool) -> list[Size]:
    """Parses e.g. "33, 75" (percent of pot), "2.5x" (raise multiple) and "a" (all-in)."""
    sizes = []
    for raw in text.replace(";", ",").split(","):
        tok = raw.strip().lower().rstrip("%")
        if not tok:
            continue
        if tok in ("a", "allin", "all-in", "ai"):
            sizes.append(Size("allin"))
        elif tok.endswith("x"):
            if not allow_mult:
                raise ValueError(f"bet size {raw.strip()!r}: use percent of pot for bets")
            value = float(tok[:-1])
            if value <= 1:
                raise ValueError(f"raise size {raw.strip()!r} must be more than 1x")
            sizes.append(Size("mult", value))
        else:
            try:
                value = float(tok)
            except ValueError:
                raise ValueError(f"invalid size {raw.strip()!r}") from None
            if value <= 0:
                raise ValueError(f"invalid size {raw.strip()!r}")
            sizes.append(Size("pot", value / 100.0))
    return sizes


@dataclass
class StreetSizes:
    bet: tuple[list[Size], list[Size]]    # per player
    raise_: tuple[list[Size], list[Size]]


@dataclass
class TreeConfig:
    pot: float
    stack: float  # effective stack at the start of the tree
    start_street: int  # 0 flop, 1 turn, 2 river
    sizes: list[StreetSizes]  # indexed by street
    max_raises: int = 2  # raises allowed per street after the first bet
    allin_threshold: float = 0.2  # bets leaving less than this share of the pot behind go all-in
    add_allin_spr: float = 0.0  # also offer all-in when the stack is at most this many pots


@dataclass
class TNode:
    kind: str
    street: int
    inv: tuple[float, float]  # chips put in by each player since the tree started
    street_inv: tuple[float, float] = (0.0, 0.0)
    children: list["TNode"] = field(default_factory=list)
    actions: list[dict] = field(default_factory=list)
    id: int = -1

    @property
    def player(self) -> int | None:
        return {"oop": OOP, "ip": IP}.get(self.kind)


class TreeBuilder:
    def __init__(self, cfg: TreeConfig):
        if cfg.pot <= 0:
            raise ValueError("the pot must be positive")
        if cfg.stack <= 0:
            raise ValueError("the effective stack must be positive")
        self.cfg = cfg

    def build(self) -> list[TNode]:
        """Returns all nodes in pre-order; nodes[0] is the root."""
        root = self._decision(OOP, self.cfg.start_street, (0.0, 0.0), (0.0, 0.0), 0, 0.0)
        nodes: list[TNode] = []

        def number(node: TNode) -> None:
            node.id = len(nodes)
            nodes.append(node)
            for child in node.children:
                number(child)

        number(root)
        return nodes

    # -- helpers ---------------------------------------------------------------

    def _left(self, inv: tuple[float, float], p: int) -> float:
        return self.cfg.stack - inv[p]

    def _pot(self, inv: tuple[float, float]) -> float:
        return self.cfg.pot + inv[0] + inv[1]

    def _commit(self, amount: float, left: float, pot_after_call: float) -> float:
        """Rounds a bet and turns it into an all-in when too little would remain behind."""
        amount = min(round(amount, 2), left)
        if left - amount <= self.cfg.allin_threshold * pot_after_call + EPS:
            return left
        return amount

    @staticmethod
    def _add(inv: tuple[float, float], p: int, amount: float) -> tuple[float, float]:
        out = list(inv)
        out[p] = round(out[p] + amount, 4)
        return out[0], out[1]

    # -- nodes -----------------------------------------------------------------

    def _decision(self, p: int, street: int, inv, street_inv, nbets: int, last_inc: float) -> TNode:
        cfg = self.cfg
        q = 1 - p
        node = TNode("oop" if p == OOP else "ip", street, inv, street_inv)
        left = self._left(inv, p)
        to_call = round(street_inv[q] - street_inv[p], 4)
        pot = self._pot(inv)
        sizes = cfg.sizes[street]

        def add(action: dict, child: TNode) -> None:
            node.actions.append(action)
            node.children.append(child)

        if to_call <= EPS:
            if p == OOP:
                child = self._decision(IP, street, inv, street_inv, nbets, last_inc)
            else:
                child = self._street_end(street, inv)
            add({"kind": "check", "amount": 0.0, "label": "Check"}, child)
            if left > EPS:
                amounts = []
                for size in sizes.bet[p]:
                    if size.kind == "allin":
                        amounts.append(left)
                    elif size.kind == "pot":
                        amt = max(size.value * pot, min(1.0, left))
                        amounts.append(self._commit(amt, left, pot + 2 * amt))
                if cfg.add_allin_spr > 0 and left <= cfg.add_allin_spr * pot + EPS:
                    amounts.append(left)
                for amt in sorted(set(amounts)):
                    new_inv = self._add(inv, p, amt)
                    new_street = self._add(street_inv, p, amt)
                    child = self._decision(q, street, new_inv, new_street, nbets + 1, amt)
                    allin = abs(amt - left) <= EPS
                    pct = round(100 * amt / pot)
                    add({
                        "kind": "allin" if allin else "bet",
                        "amount": amt,
                        "label": f"All-in {_fmt(amt)}" if allin else f"Bet {_fmt(amt)} ({pct}%)",
                    }, child)
            return node

        # Facing a bet or raise.
        fold_kind = "fold_oop" if p == OOP else "fold_ip"
        add({"kind": "fold", "amount": 0.0, "label": "Fold"}, TNode(fold_kind, street, inv, street_inv))
        call = min(to_call, left)
        after_call = self._add(inv, p, call)
        add({"kind": "call", "amount": call, "label": f"Call {_fmt(call)}"}, self._street_end(street, after_call))

        opp_left = self._left(inv, q)
        if nbets - 1 < cfg.max_raises and left > to_call + EPS and opp_left > EPS:
            pot_after_call = pot + to_call
            min_to = street_inv[q] + max(last_inc, 1.0)
            targets = []  # street totals to raise to
            for size in sizes.raise_[p]:
                if size.kind == "allin":
                    targets.append(street_inv[p] + left)
                    continue
                if size.kind == "mult":
                    raise_to = street_inv[q] * size.value
                else:
                    raise_to = street_inv[q] + size.value * pot_after_call
                raise_to = max(raise_to, min_to)
                extra = raise_to - street_inv[p]
                final_pot = pot + extra + (raise_to - street_inv[q])
                targets.append(street_inv[p] + self._commit(extra, left, final_pot))
            if cfg.add_allin_spr > 0 and left <= cfg.add_allin_spr * pot_after_call + EPS:
                targets.append(street_inv[p] + left)
            for raise_to in sorted(set(round(t, 4) for t in targets)):
                extra = round(raise_to - street_inv[p], 4)
                new_inv = self._add(inv, p, extra)
                new_street = self._add(street_inv, p, extra)
                child = self._decision(q, street, new_inv, new_street, nbets + 1, raise_to - street_inv[q])
                allin = abs(extra - left) <= EPS
                add({
                    "kind": "allin" if allin else "raise",
                    "amount": extra,
                    "label": f"All-in {_fmt(raise_to)}" if allin else f"Raise to {_fmt(raise_to)}",
                }, child)
        return node

    def _street_end(self, street: int, inv) -> TNode:
        if street == 2:
            return TNode("showdown", street, inv)
        all_in = self._left(inv, OOP) <= EPS or self._left(inv, IP) <= EPS
        chance = TNode("chance", street, inv)
        if all_in:
            # No more betting: deal out the remaining cards and show down.
            chance.children.append(self._street_end(street + 1, inv))
        else:
            chance.children.append(self._decision(OOP, street + 1, inv, (0.0, 0.0), 0, 0.0))
        return chance


def _fmt(x: float) -> str:
    return f"{x:.2f}".rstrip("0").rstrip(".")


def flatten(nodes: list[TNode]) -> dict:
    """Arrays for the engine: kind codes, child ranges and investments."""
    types, first, count, child, inv_oop, inv_ip = [], [], [], [], [], []
    for node in nodes:
        types.append(KIND_CODES[node.kind])
        first.append(len(child))
        count.append(len(node.children))
        child.extend(c.id for c in node.children)
        inv_oop.append(node.inv[0])
        inv_ip.append(node.inv[1])
    return {"type": types, "first": first, "count": count, "child": child, "inv_oop": inv_oop, "inv_ip": inv_ip}


def estimate(nodes: list[TNode], board_len: int, hands: tuple[int, int]) -> dict:
    """Counts expanded nodes and (action, hand) storage slots without building the game."""
    slots = 0
    total = 0

    def walk(node: TNode, mult: int, ncards: int) -> None:
        nonlocal slots, total
        total += mult
        if node.kind in ("oop", "ip"):
            slots += mult * len(node.children) * hands[node.player]
            for c in node.children:
                walk(c, mult, ncards)
        elif node.kind == "chance":
            walk(node.children[0], mult * (52 - ncards), ncards + 1)

    walk(nodes[0], 1, board_len)
    return {"nodes": total, "slots": slots}
