"""P22: labelled synthetic data generator.

Everything produced here carries the label ``demonstracao``. It exists only to
develop and test while real readers (P02, P03) are not ready. It must never be
used in validation or in any number of the pitch.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from . import LABEL_DEMO
from .grid import Grid

DEFAULT_START = 2001
DEFAULT_END = 2024  # last complete year of the synthetic series


@dataclass
class Dataset:
    id: str
    unit: str
    grid: Grid
    years: np.ndarray
    months: np.ndarray
    cube: np.ndarray  # (time, lat, lon), float32, NaN = missing
    label: str
    source: str
    meta: dict = field(default_factory=dict)

    @property
    def n_months(self) -> int:
        return int(self.years.size)


def calendar(start: int = DEFAULT_START, end: int = DEFAULT_END) -> tuple[np.ndarray, np.ndarray]:
    years = np.repeat(np.arange(start, end + 1), 12)
    months = np.tile(np.arange(1, 13), end - start + 1)
    return years, months


def _ar1(rng: np.random.Generator, shape: tuple[int, ...], phi: float, sd: float) -> np.ndarray:
    eps = rng.normal(0, sd * np.sqrt(1 - phi**2), size=shape)
    out = np.empty(shape)
    out[0] = rng.normal(0, sd, size=shape[1:])
    for k in range(1, shape[0]):
        out[k] = phi * out[k - 1] + eps[k]
    return out


def _season(months: np.ndarray, lats: np.ndarray) -> np.ndarray:
    # +1 in July for the north, +1 in January for the south, scaled by |lat|
    phase = np.cos(2 * np.pi * (months - 7) / 12.0)[:, None, None]
    return phase * np.sign(lats)[None, :, None] * (np.abs(lats)[None, :, None] / 90.0)


def make_dataset(var_id: str, resolution: float = 5.0, start: int = DEFAULT_START,
                 end: int = DEFAULT_END, seed: int = 20261114) -> Dataset:
    """Build a deterministic synthetic cube for one variable."""
    grid = Grid.regular(resolution)
    years, months = calendar(start, end)
    n = years.size
    nlat, nlon = grid.shape
    rng = np.random.default_rng(seed + sum(ord(c) for c in var_id))
    tyears = ((np.arange(n) / 12.0))[:, None, None]
    lat = grid.lats[None, :, None]
    lon = grid.lons[None, None, :]
    season = _season(months, grid.lats)

    if var_id == "temperatura":
        base = 27 - 0.45 * np.abs(lat) ** 1.1
        trend = (0.12 + 0.45 * (np.abs(lat) / 90) ** 2 + 0.05 * np.sin(np.deg2rad(lon))) / 10
        x = base + 12 * season + trend * tyears + _ar1(rng, (n, nlat, nlon), 0.5, 0.6)
        unit = "degC"
    elif var_id == "precipitacao":
        base = 1.0 + 5 * np.exp(-((lat / 12.0) ** 2)) + 1.5 * np.exp(-(((np.abs(lat) - 50) / 10) ** 2))
        trend = 0.03 * np.sin(np.deg2rad(2 * lon)) * np.cos(np.deg2rad(lat)) / 10
        x = base * (1 + 0.3 * season) + trend * tyears + _ar1(rng, (n, nlat, nlon), 0.3, 0.5)
        x = np.clip(x, 0, None)
        unit = "mm/day"
    elif var_id == "humidade":
        base = 18 * np.cos(np.deg2rad(lat)) ** 2 + 1
        trend = 0.08 * np.cos(np.deg2rad(lat)) / 10
        x = base + 2.5 * season + trend * tyears + _ar1(rng, (n, nlat, nlon), 0.4, 0.4)
        x = np.clip(x, 0.1, None)
        unit = "g/kg"
    elif var_id == "aerossois":
        # Trend only in Jun-Aug over northern mid-latitudes: lets the seasonal
        # analysis (SPEC-102) show something the 12-month analysis hides.
        base = 0.12 + 0.1 * np.exp(-(((lat - 20) / 15) ** 2))
        summer = np.isin(months, [6, 7, 8])[:, None, None]
        band = ((lat > 30) & (lat < 55)).astype(float)
        trend = np.where(summer, 0.003 * band, 0.0)
        x = base + 0.03 * season + trend * tyears + _ar1(rng, (n, nlat, nlon), 0.2, 0.02)
        x = np.clip(x, 0.0, None)
        unit = "1"
    else:
        raise KeyError(var_id)

    cube = np.broadcast_to(x, (n, nlat, nlon)).astype(np.float32)
    return Dataset(var_id, unit, grid, years, months, cube, LABEL_DEMO,
                   source="synthetic", meta={"seed": seed})


DEMO_VARIABLES = ("temperatura", "precipitacao", "humidade", "aerossois")
