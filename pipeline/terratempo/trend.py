"""Formulas 3 to 7, 13 and 14: trend magnitude and significance.

All functions take a 1-D series ``y`` sampled at equal steps (months or years).
NaN values are dropped together with their time index; the code never assumes
a fixed length.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import stats

ALPHA = 0.05


def _clean(y: np.ndarray, t: np.ndarray | None = None) -> tuple[np.ndarray, np.ndarray]:
    y = np.asarray(y, dtype=float)
    t = np.arange(y.size, dtype=float) if t is None else np.asarray(t, dtype=float)
    ok = np.isfinite(y)
    return t[ok], y[ok]


def _pair_slopes(t: np.ndarray, y: np.ndarray) -> np.ndarray:
    i, j = np.triu_indices(t.size, k=1)
    dt = t[j] - t[i]
    keep = dt != 0
    return (y[j] - y[i])[keep] / dt[keep]


# ---------------------------------------------------------------- formula 3
def theil_sen(y: np.ndarray, t: np.ndarray | None = None) -> tuple[float, float]:
    """Formula 3: median of pairwise slopes. Returns (slope, intercept)."""
    t, y = _clean(y, t)
    if y.size < 2:
        return float("nan"), float("nan")
    slope = float(np.median(_pair_slopes(t, y)))
    # Conover intercept, as scipy.stats.theilslopes(method="separate")
    intercept = float(np.median(y) - slope * np.median(t))
    return slope, intercept


# ------------------------------------------------------------ formulas 4, 5
def _acf(x: np.ndarray, nlags: int) -> np.ndarray:
    y = x - x.mean()
    n = x.size
    acov = np.correlate(y, y, "full")[n - 1:] / n
    if acov[0] == 0:
        return np.zeros(nlags + 1)
    return acov[: nlags + 1] / acov[0]


def mk_s_and_var(y: np.ndarray) -> tuple[float, float]:
    """Formula 4: Mann-Kendall S and Var(S) with the tie correction."""
    n = y.size
    i, j = np.triu_indices(n, k=1)
    s = float(np.sign(y[j] - y[i]).sum())
    _, counts = np.unique(y, return_counts=True)
    ties = counts[counts > 1]
    var = (n * (n - 1) * (2 * n + 5) - np.sum(ties * (ties - 1) * (2 * ties + 5))) / 18.0
    return s, float(var)


def hamed_rao_factor(y: np.ndarray, slope: float, alpha: float = ALPHA) -> float:
    """Formula 5: variance inflation factor f from significant rank autocorrelation.

    Ranks are taken after removing the Sen trend. Only lags whose autocorrelation
    exceeds the ``z / sqrt(n)`` band count. ``f`` is never allowed below 1.
    """
    n = y.size
    if n < 4:
        return 1.0
    detrended = y - slope * np.arange(1, n + 1)
    ranks = stats.rankdata(detrended)
    rho = _acf(ranks, n - 1)
    band = stats.norm.ppf(1 - alpha / 2) / np.sqrt(n)
    k = np.arange(1, n - 1)
    r = rho[1 : n - 1]
    sig = np.abs(r) > band
    total = np.sum(((n - k) * (n - k - 1) * (n - k - 2) * r)[sig])
    f = 1 + 2.0 / (n * (n - 1) * (n - 2)) * total
    return float(max(1.0, f))


@dataclass(frozen=True)
class MannKendall:
    s: float
    var_s: float
    f: float
    z: float
    p: float


def mann_kendall(y: np.ndarray, hamed_rao: bool = True, alpha: float = ALPHA) -> MannKendall:
    """Formulas 4 and 5: Mann-Kendall test, optionally with Hamed-Rao correction."""
    _, y = _clean(y)
    n = y.size
    if n < 3:
        return MannKendall(float("nan"), float("nan"), 1.0, float("nan"), float("nan"))
    s, var = mk_s_and_var(y)
    f = 1.0
    if hamed_rao:
        slope, _ = theil_sen(y)
        f = hamed_rao_factor(y, slope, alpha)
    var_star = var * f
    if var_star <= 0:
        z = 0.0
    elif s > 0:
        z = (s - 1) / np.sqrt(var_star)
    elif s < 0:
        z = (s + 1) / np.sqrt(var_star)
    else:
        z = 0.0
    p = 2 * (1 - stats.norm.cdf(abs(z)))
    return MannKendall(s, var_star, f, float(z), float(p))


# ---------------------------------------------------------------- formula 6
def sen_confidence_interval(y: np.ndarray, var_s: float, alpha: float = ALPHA,
                            t: np.ndarray | None = None) -> tuple[float, float]:
    """Formula 6: confidence interval of the Sen slope from Var*(S)."""
    t, y = _clean(y, t)
    slopes = np.sort(_pair_slopes(t, y))
    if slopes.size == 0 or not np.isfinite(var_s):
        return float("nan"), float("nan")
    nt = slopes.size
    c = stats.norm.ppf(1 - alpha / 2) * np.sqrt(var_s)
    lo = max(int(np.round((nt - c) / 2.0)) - 1, 0)
    hi = min(int(np.round((nt + c) / 2.0)), nt - 1)
    return float(slopes[lo]), float(slopes[hi])


# ---------------------------------------------------------------- formula 7
def benjamini_hochberg(p: np.ndarray, q: float = 0.10) -> np.ndarray:
    """Formula 7: boolean mask of discoveries at false discovery rate ``q``.

    NaN p-values are never discoveries and do not count in ``m``.
    """
    p = np.asarray(p, dtype=float)
    out = np.zeros(p.shape, dtype=bool)
    flat = p.ravel()
    ok = np.flatnonzero(np.isfinite(flat))
    m = ok.size
    if m == 0:
        return out
    order = ok[np.argsort(flat[ok])]
    ranked = flat[order]
    below = ranked <= (np.arange(1, m + 1) / m) * q
    if below.any():
        k = np.max(np.flatnonzero(below))
        out.ravel()[order[: k + 1]] = True
    return out


# -------------------------------------------------------- formulas 13 and 14
@dataclass(frozen=True)
class LinearTrend:
    slope: float
    intercept: float
    r2: float
    se: float
    t: float
    p: float
    ci_low: float
    ci_high: float
    rho1: float
    n: int
    n_eff: float
    residual_sd: float
    t_mean: float
    sxx: float


def linear_trend(y: np.ndarray, t: np.ndarray | None = None, alpha: float = ALPHA,
                 autocorrelation: bool = True) -> LinearTrend:
    """Formulas 13 and 14: OLS slope, R², t-test and CI with lag-1 correction.

    Effective sample size n_eff = n (1 - rho1) / (1 + rho1), only when rho1 > 0
    (never larger than n). Residual variance and degrees of freedom use n_eff - 2
    (Santer et al. 2000), so the correction only widens the interval. Without
    autocorrelation the result equals ``scipy.stats.linregress``.
    """
    t, y = _clean(y, t)
    n = y.size
    if n < 3:
        nan = float("nan")
        return LinearTrend(nan, nan, nan, nan, nan, nan, nan, nan, nan, n, nan, nan, nan, nan)
    tm, ym = t.mean(), y.mean()
    sxx = float(np.sum((t - tm) ** 2))
    slope = float(np.sum((t - tm) * (y - ym)) / sxx)
    intercept = float(ym - slope * tm)
    res = y - (intercept + slope * t)
    sst = float(np.sum((y - ym) ** 2))
    r2 = 1 - float(np.sum(res**2)) / sst if sst > 0 else float("nan")
    rho1 = float(np.corrcoef(res[:-1], res[1:])[0, 1]) if n > 3 and np.std(res) > 0 else 0.0
    if not np.isfinite(rho1):
        rho1 = 0.0
    n_eff = float(n)
    if autocorrelation and rho1 > 0:
        n_eff = n * (1 - rho1) / (1 + rho1)
    n_eff = max(n_eff, 3.0)
    dof = n_eff - 2
    s2 = float(np.sum(res**2)) / dof
    se = float(np.sqrt(s2 / sxx))
    if se == 0:
        tstat = float("inf") if slope != 0 else 0.0
        p = 0.0 if slope != 0 else 1.0
    else:
        tstat = slope / se
        p = float(2 * stats.t.sf(abs(tstat), dof))
    tcrit = float(stats.t.ppf(1 - alpha / 2, dof))
    return LinearTrend(
        slope=slope, intercept=intercept, r2=float(r2), se=se, t=float(tstat), p=p,
        ci_low=slope - tcrit * se, ci_high=slope + tcrit * se, rho1=rho1, n=n,
        n_eff=float(n_eff), residual_sd=float(np.sqrt(s2)), t_mean=float(tm), sxx=sxx,
    )
