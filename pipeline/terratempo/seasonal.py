"""Formula 17 (SPEC-102): trend of a season made of chosen months, one value per year."""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np


def normalise_months(months: list[int] | None) -> tuple[int, ...] | None:
    """Validate and sort a month list. None or all 12 months means "all months"."""
    if months is None:
        return None
    if len(months) == 0:
        raise ValueError("meses_vazio")
    if any((not isinstance(m, (int, np.integer))) or m < 1 or m > 12 for m in months):
        raise ValueError("meses_invalidos")
    if len(set(months)) != len(months):
        raise ValueError("meses_repetidos")
    ms = tuple(sorted(int(m) for m in months))
    return None if len(ms) == 12 else ms


def season_start(months: tuple[int, ...]) -> int:
    """First month of the season: the month that follows the largest circular gap."""
    ms = sorted(months)
    if len(ms) == 1:
        return ms[0]
    gaps = [((ms[(i + 1) % len(ms)] - ms[i]) % 12, ms[(i + 1) % len(ms)]) for i in range(len(ms))]
    # largest gap; ties broken by the earliest calendar month to stay deterministic
    _, start = max(gaps, key=lambda g: (g[0], -g[1]))
    return start


def season_year(year: int, month: int, months: tuple[int, ...]) -> int:
    """Season year = year in which the season ends (Dec 2019 + Jan/Feb 2020 -> 2020)."""
    start = season_start(months)
    wraps = start != min(months)
    if wraps and month >= start:
        return year + 1
    return year


@dataclass
class SeasonalSeries:
    years: np.ndarray
    values: np.ndarray
    months: tuple[int, ...]
    excluded: list[dict] = field(default_factory=list)


def seasonal_series(anomalies: np.ndarray, years: np.ndarray, months_of_series: np.ndarray,
                    months: tuple[int, ...]) -> SeasonalSeries:
    """A_Y = mean of the anomalies of the chosen months for each season year.

    Anomalies must already be computed over all months (formula 1). A season year
    enters only if every chosen month is present and finite (SPEC-102 point 4,
    proposal); the others are listed in ``excluded`` with a reason key.
    """
    anomalies = np.asarray(anomalies, dtype=float)
    years = np.asarray(years)
    months_of_series = np.asarray(months_of_series)
    want = set(months)
    buckets: dict[int, dict[int, float]] = {}
    for a, y, m in zip(anomalies, years, months_of_series):
        m = int(m)
        if m not in want:
            continue
        sy = season_year(int(y), m, months)
        buckets.setdefault(sy, {})[m] = float(a)
    out_years, out_vals, excluded = [], [], []
    for sy in sorted(buckets):
        got = buckets[sy]
        if set(got) != want:
            excluded.append({"ano": sy, "motivo": "estacao_incompleta"})
            continue
        vals = np.array([got[m] for m in months])
        if not np.all(np.isfinite(vals)):
            excluded.append({"ano": sy, "motivo": "meses_em_falta"})
            continue
        out_years.append(sy)
        out_vals.append(float(vals.mean()))
    return SeasonalSeries(np.array(out_years, dtype=int), np.array(out_vals, dtype=float),
                          months, excluded)
