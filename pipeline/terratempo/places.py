"""Named places: every 5° cell belongs to a country or an ocean (places.json, built by
web/scripts/build-places.mjs from Natural Earth borders and ISO 3166 names)."""

from __future__ import annotations

import json
import unicodedata
from functools import lru_cache
from pathlib import Path

import numpy as np

from .grid import Grid

PLACES_FILE = Path(__file__).with_name("places.json")


@lru_cache(maxsize=1)
def load() -> dict:
    return json.loads(PLACES_FILE.read_text(encoding="utf-8"))


def _norm(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in text if unicodedata.category(c) != "Mn").strip()


def _key(v: float) -> str:
    return f"{v:g}"


def name(key: str, lang: str = "pt") -> str:
    p = load()["places"][key]
    return p["names"].get(lang) or p["names"]["en"]


def search(query: str, limit: int = 5) -> list[dict]:
    """Places whose name (in any language) contains the query; exact matches first."""
    q = _norm(query)
    if not q:
        return []
    hits = []
    for key, p in load()["places"].items():
        names = {_norm(n) for n in p["names"].values()}
        if q in names or key == q:
            hits.append((0, key))
        elif any(q in n for n in names):
            hits.append((1, key))
    hits.sort()
    return [{"chave": k, "nome": name(k), "tipo": load()["places"][k]["kind"],
             "bbox": load()["places"][k]["bbox"]} for _, k in hits[:limit]]


def mask(grid: Grid, key: str) -> tuple[np.ndarray, bool]:
    """Cells named ``key``. A place too small for any cell gets the cell holding its centroid
    (the flag is then True, like a region smaller than the resolution)."""
    data = load()
    if key not in data["places"]:
        raise ValueError("lugar_desconhecido")
    if abs(grid.resolution - data["stepDeg"]) > 1e-9:
        raise ValueError("resolucao_incompativel")
    cells = data["cells"]
    m = np.zeros(grid.shape, dtype=bool)
    for i, lat in enumerate(grid.lats):
        for j, lon in enumerate(grid.lons):
            if cells.get(f"{_key(lat)},{_key(lon)}") == key:
                m[i, j] = True
    if m.any():
        return m, False
    lon, lat = data["places"][key]["centroid"]
    m[grid.cell_index(lon, lat)] = True
    return m, True
