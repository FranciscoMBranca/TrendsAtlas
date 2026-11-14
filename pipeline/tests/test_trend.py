import numpy as np
import pymannkendall as pmk
import pytest
from scipy import stats

from terratempo import trend
from terratempo.anomaly import monthly_anomaly, weighted_mean


def ar1(n, phi, sd, seed):
    rng = np.random.default_rng(seed)
    x = np.zeros(n)
    for k in range(1, n):
        x[k] = phi * x[k - 1] + rng.normal(0, sd)
    return x


# formula 1
def test_anomaly_pure_seasonal_cycle_is_zero_mean_per_month():
    months = np.tile(np.arange(1, 13), 20)
    x = 10 + 5 * np.sin(2 * np.pi * months / 12)
    a = monthly_anomaly(x, months)
    for m in range(1, 13):
        assert abs(a[months == m].mean()) < 1e-12
    assert np.allclose(a, 0)


def test_anomaly_keeps_nan():
    months = np.tile(np.arange(1, 13), 3)
    x = np.arange(36, dtype=float)
    x[5] = np.nan
    a = monthly_anomaly(x, months)
    assert np.isnan(a[5]) and np.isfinite(a[17])


# formula 2
def test_weighted_mean_constant_latitude_equals_simple_mean():
    rng = np.random.default_rng(1)
    f = rng.normal(size=(4, 1, 10))
    assert np.allclose(weighted_mean(f, np.array([30.0])), f.mean(axis=(1, 2)))


# formula 3
def test_theil_sen_matches_scipy():
    rng = np.random.default_rng(2)
    y = 0.01 * np.arange(200) + rng.normal(size=200)
    s, i = trend.theil_sen(y)
    ref = stats.theilslopes(y)
    assert s == pytest.approx(ref.slope)
    assert i == pytest.approx(ref.intercept)


# formula 4 (no correction)
def test_mann_kendall_matches_pymannkendall_original():
    rng = np.random.default_rng(3)
    y = 0.005 * np.arange(240) + rng.normal(size=240)
    mk = trend.mann_kendall(y, hamed_rao=False)
    ref = pmk.original_test(y)
    assert mk.s == ref.s
    assert mk.var_s == pytest.approx(ref.var_s)
    assert mk.z == pytest.approx(ref.z)
    assert mk.p == pytest.approx(ref.p)


def test_mann_kendall_with_ties_matches_pymannkendall():
    y = np.round(np.random.default_rng(4).normal(size=100) + 0.02 * np.arange(100), 0)
    assert trend.mann_kendall(y, hamed_rao=False).var_s == pytest.approx(pmk.original_test(y).var_s)


# formula 5
@pytest.mark.parametrize("seed", [5, 6, 7])
def test_hamed_rao_matches_pymannkendall_when_factor_above_one(seed):
    y = ar1(288, 0.6, 1.0, seed) + 0.003 * np.arange(288)
    mk = trend.mann_kendall(y, hamed_rao=True)
    ref = pmk.hamed_rao_modification_test(y)
    assert ref.var_s / pmk.original_test(y).var_s >= 1  # precondition of the comparison
    assert mk.var_s == pytest.approx(ref.var_s, rel=1e-9)
    assert mk.p == pytest.approx(ref.p, rel=1e-9, abs=1e-12)


def test_hamed_rao_factor_never_below_one():
    y = np.tile([1.0, -1.0], 100) + 0.001 * np.arange(200)  # strong negative lag-1
    assert trend.mann_kendall(y).f >= 1.0


# formula 6
def test_sen_ci_matches_scipy_without_correction():
    rng = np.random.default_rng(8)
    y = 0.01 * np.arange(150) + rng.normal(size=150)
    mk = trend.mann_kendall(y, hamed_rao=False)
    lo, hi = trend.sen_confidence_interval(y, mk.var_s)
    ref = stats.theilslopes(y, alpha=0.95)
    assert lo == pytest.approx(ref.low_slope)
    assert hi == pytest.approx(ref.high_slope)


# formula 7
def test_benjamini_hochberg_matches_scipy():
    p = np.random.default_rng(9).uniform(size=500) ** 3
    adj = stats.false_discovery_control(p)
    assert np.array_equal(trend.benjamini_hochberg(p, 0.10), adj <= 0.10)


def test_benjamini_hochberg_ignores_nan():
    p = np.array([0.001, np.nan, 0.9])
    assert trend.benjamini_hochberg(p, 0.1).tolist() == [True, False, False]


# formulas 13 and 14
def test_linear_trend_equals_linregress_without_autocorrelation():
    rng = np.random.default_rng(10)
    y = 0.02 * np.arange(120) + rng.normal(size=120)
    lt = trend.linear_trend(y, autocorrelation=False)
    ref = stats.linregress(np.arange(120), y)
    assert lt.slope == pytest.approx(ref.slope)
    assert lt.r2 == pytest.approx(ref.rvalue**2)
    assert lt.se == pytest.approx(ref.stderr)
    assert lt.p == pytest.approx(ref.pvalue)


def test_autocorrelation_correction_only_widens_interval():
    y = ar1(288, 0.7, 1.0, 11) + 0.004 * np.arange(288)
    plain = trend.linear_trend(y, autocorrelation=False)
    corr = trend.linear_trend(y)
    assert corr.n_eff < plain.n_eff
    assert corr.ci_high - corr.ci_low > plain.ci_high - plain.ci_low
    assert corr.slope == pytest.approx(plain.slope)


def test_mk_false_positive_rate_on_red_noise_is_controlled():
    # Hamed-Rao should keep the false positive rate well below the naive test's
    hits_naive = hits_hr = 0
    for seed in range(60):
        y = ar1(240, 0.6, 1.0, 100 + seed)
        hits_naive += trend.mann_kendall(y, hamed_rao=False).p < 0.05
        hits_hr += trend.mann_kendall(y, hamed_rao=True).p < 0.05
    assert hits_hr <= hits_naive
