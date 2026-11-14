"""Formula 9: "how long until detectable" (conditional, never a forecast)."""

from __future__ import annotations

import math

import numpy as np
from scipy import stats

from .trend import ALPHA

# Ratio between Sen and least-squares slope variances (formula 9, r = 1 / 0.955).
SEN_EFFICIENCY_R = 1 / 0.955


def steps_needed(slope: float, residual_sd: float, f: float, alpha: float = ALPHA) -> float:
    """Number of steps n at which |slope| = z * SE(n), SE(n) = sd sqrt(12 f r / (n (n^2 - 1))).

    Uses the approximation n^3 ~ n (n^2 - 1). Returns +inf when the slope is zero.
    """
    if not np.isfinite(slope) or slope == 0 or not np.isfinite(residual_sd):
        return float("inf")
    z = stats.norm.ppf(1 - alpha / 2)
    return float((z * residual_sd * math.sqrt(12 * f * SEN_EFFICIENCY_R) / abs(slope)) ** (2.0 / 3.0))


def years_remaining(slope: float, residual_sd: float, f: float, n_have: int,
                    steps_per_year: int, alpha: float = ALPHA) -> int | None:
    """Formula 9: years still missing (rounded up, at least 1) if the trend continues.

    ``slope`` is per step (month or year); ``steps_per_year`` is 12 or 1.
    Returns None when the slope is zero (nothing to detect).
    """
    need = steps_needed(slope, residual_sd, f, alpha)
    if not math.isfinite(need):
        return None
    missing_steps = need - n_have
    return max(1, math.ceil(missing_steps / steps_per_year))


def sen_residual_sd(y: np.ndarray, slope: float, intercept: float) -> float:
    """Standard deviation of residuals around the Sen line (sigma in formula 9)."""
    y = np.asarray(y, dtype=float)
    t = np.arange(y.size, dtype=float)
    ok = np.isfinite(y)
    res = y[ok] - (intercept + slope * t[ok])
    return float(np.std(res, ddof=2)) if res.size > 2 else float("nan")
