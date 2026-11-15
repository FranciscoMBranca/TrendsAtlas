"""SPEC-120 tests. Thresholds fixed before looking at results (SPEC-120 §5)."""

import numpy as np
import pytest

from terratempo.analysis import Series, analyse
from terratempo.projection import NOTICE_KEY, project
from terratempo.synthetic import calendar

COVERAGE_RANGE = (0.90, 0.98)


def ar1(n, phi, sd, rng):
    e = rng.normal(0, sd * np.sqrt(1 - phi**2), n)
    x = np.empty(n)
    x[0] = rng.normal(0, sd)
    for k in range(1, n):
        x[k] = phi * x[k - 1] + e[k]
    return x


def test_band_grows_with_horizon():
    rng = np.random.default_rng(1)
    t = np.arange(288.0)
    y = 0.002 * t + rng.normal(0, 0.3, 288)
    p = project(y, t, 12, 2024)
    widths = [q["superior"] - q["inferior"] for q in p["pontos"]]
    assert p["disponivel"] and p["condicional"] and p["aviso_chave"] == NOTICE_KEY
    assert widths[-1] > widths[0]
    assert all(b > a for a, b in zip(widths, widths[1:]))


def test_horizon_is_at_most_half_the_series():
    t = np.arange(288.0)
    p = project(0.001 * t, t, 12, 2024, horizon_years=50)
    assert p["horizonte_anos"] == 12 and p["pontos"][-1]["ano"] == 2036


def test_short_series_hides_projection():
    t = np.arange(96.0)
    p = project(np.random.default_rng(0).normal(size=96), t, 12, 2024)
    assert not p["disponivel"] and p["motivo"] == "serie_curta" and p["aviso_chave"] == NOTICE_KEY


@pytest.mark.parametrize("phi", [0.0, 0.5])
def test_band_coverage_in_simulation(phi):
    """True line value at the final horizon falls inside the 95 % band 90-98 % of the time."""
    rng = np.random.default_rng(42)
    n, slope, sims, hits = 288, 0.002, 400, 0
    t = np.arange(float(n))
    for _ in range(sims):
        y = slope * t + ar1(n, phi, 0.3, rng)
        p = project(y, t, 12, 2024)
        last = p["pontos"][-1]
        truth = slope * (t[-1] + 12 * p["horizonte_anos"])
        hits += last["inferior"] <= truth <= last["superior"]
    coverage = hits / sims
    assert COVERAGE_RANGE[0] <= coverage <= COVERAGE_RANGE[1], coverage


def test_analysis_hides_projection_when_not_significant():
    yrs, mons = calendar(2001, 2024)
    flat = Series(np.random.default_rng(3).normal(0, 1, yrs.size), yrs, mons)
    r = analyse(flat)
    assert r["selo"] != "significativa"
    assert r["projeccao"]["disponivel"] is False and r["projeccao"]["motivo"] == "nao_significativa"
    assert r["projeccao"]["aviso_chave"] == NOTICE_KEY


def test_analysis_projection_starts_after_last_year():
    yrs, mons = calendar(2001, 2024)
    x = 0.004 * np.arange(yrs.size) + np.random.default_rng(5).normal(0, 0.2, yrs.size)
    r = analyse(Series(x, yrs, mons))
    assert r["selo"] == "significativa" and r["projeccao"]["disponivel"]
    assert r["projeccao"]["pontos"][0]["ano"] == 2025
    assert r["frase"]["parametros"]["declive_decada"] == r["estatisticas"]["sen_declive_decada"]


def test_projection_starts_on_the_fitted_line_at_the_last_step():
    t = np.arange(288.0)
    y = 0.002 * t + 1.0 + np.random.default_rng(7).normal(0, 0.1, t.size)
    p = project(y, t, 12, 2024)
    assert p["inicio"]["ano"] == 2024 and p["pontos"][0]["ano"] == 2025
    assert p["inicio"]["centro"] == pytest.approx(1.0 + 0.002 * 287, abs=0.05)
    width0 = p["inicio"]["superior"] - p["inicio"]["inferior"]
    assert width0 < p["pontos"][0]["superior"] - p["pontos"][0]["inferior"]
