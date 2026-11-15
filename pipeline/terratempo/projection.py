"""Formula 15 (SPEC-120): conditional projection "if the trend continues".

Never a climate forecast. The band is the confidence band of the fitted LINE (its mean),
not of individual future values: SPEC-120 asks the spec to say which band is shown, and
it is this one. It grows with the horizon because the slope is uncertain.

Note on the autocorrelation correction: `trend.linear_trend` already inflates the residual
variance s² with n_ef (Santer et al. 2000). The level term therefore uses s²/n (equivalent
to σ²/n_ef) instead of the 1/n_ef written in docs/05, to avoid correcting twice. Validated
by simulation in tests/test_projection.py (coverage between 90 % and 98 %, SPEC-120 §5).
"""

from __future__ import annotations

import math

import numpy as np
from scipy import stats

from . import trend

MIN_YEARS = 10
NOTICE_KEY = "projeccao.aviso"  # "Isto não é uma previsão do clima"


def max_horizon_years(n_years: float) -> int:
    """SPEC-120 §5 (proposal): at most half the length of the series."""
    return int(math.floor(n_years / 2))


def project(y: np.ndarray, t: np.ndarray, steps_per_year: int, last_year: int,
            horizon_years: int | None = None, alpha: float = trend.ALPHA) -> dict:
    """Central line and band, one point per future year, for a series on time axis ``t``.

    ``t`` is in steps (months or years); the projected points sit one, two, ... years after
    the last observed step. Returns the result with ``disponivel`` False and a reason key
    when the projection must be hidden for length reasons.
    """
    y = np.asarray(y, dtype=float)
    t = np.asarray(t, dtype=float)
    ok = np.isfinite(y)
    n_years = ok.sum() / steps_per_year
    base = {"condicional": True, "aviso_chave": NOTICE_KEY}
    if n_years < MIN_YEARS:
        return {**base, "disponivel": False, "motivo": "serie_curta", "pontos": []}
    h_max = max_horizon_years(n_years)
    horizon = h_max if horizon_years is None else min(int(horizon_years), h_max)
    lin = trend.linear_trend(y[ok], t[ok], alpha=alpha)
    dof = max(lin.n_eff - 2, 1.0)
    tcrit = float(stats.t.ppf(1 - alpha / 2, dof))
    t_last = float(t[ok][-1])
    points = []
    for k in range(0, horizon + 1):
        tk = t_last + k * steps_per_year
        centre = lin.intercept + lin.slope * tk
        se = lin.residual_sd * math.sqrt(1.0 / lin.n + (tk - lin.t_mean) ** 2 / lin.sxx)
        points.append({"ano": last_year + k, "centro": centre, "inferior": centre - tcrit * se,
                       "superior": centre + tcrit * se})
    # k = 0 is the fitted line at the last observed step: where the projection starts.
    return {**base, "disponivel": True, "motivo": None, "horizonte_anos": horizon,
            "inicio": points[0], "pontos": points[1:]}
