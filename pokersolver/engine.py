"""ctypes bindings for the C++ engine; compiles it on first use."""

from __future__ import annotations

import ctypes
import math
import os
import platform
import subprocess
import threading
from pathlib import Path

from .cards import NUM_COMBOS

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "engine" / "solver.cpp"
LIB = ROOT / "build" / ("libpokersolver.dylib" if platform.system() == "Darwin" else "libpokersolver.so")

_lib = None
_lib_lock = threading.Lock()


def build_library(force: bool = False) -> Path:
    if not force and LIB.exists() and LIB.stat().st_mtime >= SOURCE.stat().st_mtime:
        return LIB
    LIB.parent.mkdir(exist_ok=True)
    cxx = os.environ.get("CXX", "clang++")
    cmd = [cxx, "-O3", "-std=c++17", "-shared", "-fPIC", "-o", str(LIB), str(SOURCE), "-pthread"]
    if platform.machine() in ("arm64", "aarch64"):
        cmd.insert(2, "-mcpu=native")
    else:
        cmd.insert(2, "-march=native")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"failed to compile the engine:\n{' '.join(cmd)}\n{result.stderr}")
    return LIB


def lib() -> ctypes.CDLL:
    global _lib
    with _lib_lock:
        if _lib is None:
            _lib = ctypes.CDLL(str(build_library()))
            _declare(_lib)
        return _lib


def _declare(L: ctypes.CDLL) -> None:
    P = ctypes.POINTER
    f32, i32 = ctypes.c_float, ctypes.c_int32
    L.ps_last_error.restype = ctypes.c_char_p
    L.ps_create.restype = ctypes.c_void_p
    L.ps_create.argtypes = [P(ctypes.c_uint8), ctypes.c_int, f32, P(f32), P(f32), ctypes.c_int,
                            P(ctypes.c_uint8), P(i32), P(i32), ctypes.c_int, P(i32), P(f32), P(f32)]
    L.ps_destroy.argtypes = [ctypes.c_void_p]
    L.ps_num_nodes.restype = ctypes.c_int64
    L.ps_num_nodes.argtypes = [ctypes.c_void_p]
    L.ps_storage.restype = ctypes.c_int64
    L.ps_storage.argtypes = [ctypes.c_void_p]
    L.ps_hands.argtypes = [ctypes.c_void_p, ctypes.c_int]
    L.ps_allocate.argtypes = [ctypes.c_void_p, ctypes.c_int]
    L.ps_set_threads.argtypes = [ctypes.c_void_p, ctypes.c_int]
    L.ps_run.argtypes = [ctypes.c_void_p, ctypes.c_int]
    L.ps_iteration.argtypes = [ctypes.c_void_p]
    L.ps_exploitability.restype = ctypes.c_double
    L.ps_exploitability.argtypes = [ctypes.c_void_p]
    L.ps_query.argtypes = [ctypes.c_void_p, P(i32), ctypes.c_int, P(i32), P(f32), P(f32), P(f32), P(f32),
                           P(f32), P(f32), ctypes.c_int]
    L.ps_evaluate.restype = ctypes.c_uint32
    L.ps_evaluate.argtypes = [P(ctypes.c_uint8), ctypes.c_int]


def _arr(ctype, values):
    return (ctype * len(values))(*values)


def evaluate(cards: list[int]) -> int:
    return lib().ps_evaluate(_arr(ctypes.c_uint8, cards), len(cards))


class Game:
    """A solved (or solving) spot inside the engine."""

    def __init__(self, board: list[int], pot: float, range_oop: list[float], range_ip: list[float], flat: dict):
        L = lib()
        self._lib = L
        self._max_actions = max(flat["count"]) if flat["count"] else 1
        self._ptr = L.ps_create(
            _arr(ctypes.c_uint8, board), len(board), pot,
            _arr(ctypes.c_float, range_oop), _arr(ctypes.c_float, range_ip),
            len(flat["type"]), _arr(ctypes.c_uint8, flat["type"]), _arr(ctypes.c_int32, flat["first"]),
            _arr(ctypes.c_int32, flat["count"]), len(flat["child"]), _arr(ctypes.c_int32, flat["child"] or [0]),
            _arr(ctypes.c_float, flat["inv_oop"]), _arr(ctypes.c_float, flat["inv_ip"]),
        )
        if not self._ptr:
            raise ValueError(L.ps_last_error().decode())

    def close(self) -> None:
        if self._ptr:
            self._lib.ps_destroy(self._ptr)
            self._ptr = None

    def __del__(self):
        self.close()

    @property
    def num_nodes(self) -> int:
        return self._lib.ps_num_nodes(self._ptr)

    @property
    def storage(self) -> int:
        return self._lib.ps_storage(self._ptr)

    def hands(self, player: int) -> int:
        return self._lib.ps_hands(self._ptr, player)

    def allocate(self, compressed: bool) -> None:
        if self._lib.ps_allocate(self._ptr, int(compressed)) != 0:
            raise MemoryError(self._lib.ps_last_error().decode())

    def set_threads(self, n: int) -> None:
        self._lib.ps_set_threads(self._ptr, n)

    def run(self, iterations: int) -> None:
        self._lib.ps_run(self._ptr, iterations)

    @property
    def iteration(self) -> int:
        return self._lib.ps_iteration(self._ptr)

    def exploitability(self) -> float:
        return self._lib.ps_exploitability(self._ptr)

    def query(self, path: list[int], ev: bool = True, equity: bool = True) -> dict:
        """Node state after following `path`; arrays are indexed by combo id, None outside a range."""
        A = self._max_actions
        f32 = ctypes.c_float
        info = (ctypes.c_int32 * 3)()
        reach, compat, eq, evs = ((f32 * (2 * NUM_COMBOS))() for _ in range(4))
        strat, aev = ((f32 * (A * NUM_COMBOS))() for _ in range(2))
        flags = (1 if ev else 0) | (2 if equity else 0)
        rc = self._lib.ps_query(self._ptr, _arr(ctypes.c_int32, path or [0]), len(path), info, reach, compat,
                                eq, evs, strat, aev, flags)
        if rc != 0:
            raise ValueError("invalid path")
        num = info[2] if info[0] in (0, 1) else 0

        def split(buf, parts):
            vals = [None if math.isnan(x) else x for x in buf[: parts * NUM_COMBOS]]
            return [vals[i * NUM_COMBOS:(i + 1) * NUM_COMBOS] for i in range(parts)]

        return {
            "type": info[0],
            "tmpl": info[1],
            "num": info[2],
            "reach": split(reach, 2),
            "compat": split(compat, 2),
            "equity": split(eq, 2),
            "ev": split(evs, 2),
            "strategy": split(strat, num),
            "action_ev": split(aev, num),
        }
