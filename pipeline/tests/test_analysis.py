import numpy as np
import pytest

from terratempo import LABEL_DEMO
from terratempo.analysis import AnalysisError, Series, analyse
from terratempo.catalog import manifest
from terratempo.emergence import years_remaining
from terratempo.grid import Grid, polygon_mask
from terratempo.regions import region_series
from terratempo.seasonal import normalise_months, season_year, seasonal_series
from terratempo.synthetic import DEMO_VARIABLES, calendar, make_dataset

FORBIDDEN = ("causa", "devido", "culpa")


def summer_only_series(seed=0, years=(2001, 2024)):
    yrs, mons = calendar(*years)
    rng = np.random.default_rng(seed)
    yr_index = yrs - yrs.min()
    summer = np.isin(mons, [6, 7, 8])
    x = 5 * np.cos(2 * np.pi * mons / 12) + np.where(summer, 0.15 * yr_index, 0) + rng.normal(0, 0.4, yrs.size)
    # compensate in winter so the 12-month mean has no trend
    winter = np.isin(mons, [12, 1, 2])
    x = x - np.where(winter, 0.15 * yr_index, 0)
    return Series(x, yrs, mons)


# SPEC-102 criterion 1
def test_seasonal_trend_detected_only_with_summer_months():
    s = summer_only_series()
    summer = analyse(s, months=[6, 7, 8])
    full = analyse(s)
    assert summer["selo"] == "significativa"
    assert full["selo"] != "significativa"
    assert summer["passo"] == "ano"
    assert summer["n_pontos"] == 24


# SPEC-102 criterion 2 / point 10
def test_twelve_months_equals_normal():
    s = summer_only_series(1)
    assert analyse(s, months=list(range(1, 13))) == analyse(s)


# SPEC-102 criterion 3
def test_season_crossing_year_boundary():
    ms = normalise_months([12, 1, 2])
    assert season_year(2019, 12, ms) == 2020
    assert season_year(2020, 1, ms) == 2020
    assert season_year(2020, 2, ms) == 2020
    yrs, mons = calendar(2001, 2003)
    ss = seasonal_series(np.zeros(yrs.size), yrs, mons, ms)
    # 2001 lacks Dec 2000; 2004 has only Dec 2003
    assert ss.years.tolist() == [2002, 2003]
    assert {e["ano"] for e in ss.excluded} == {2001, 2004}


def test_non_wrapping_season_keeps_calendar_year():
    ms = normalise_months([6, 7, 8])
    assert season_year(2010, 6, ms) == 2010


# SPEC-102 criterion 4 / SPEC-101 criterion 6
def test_less_than_ten_years_is_an_error():
    yrs, mons = calendar(2015, 2023)
    s = Series(np.random.default_rng(0).normal(size=yrs.size), yrs, mons)
    with pytest.raises(AnalysisError) as e:
        analyse(s)
    assert e.value.key == "periodo_curto"
    with pytest.raises(AnalysisError):
        analyse(summer_only_series(), start_year=2015, end_year=2020)


# SPEC-102 criterion 5
def test_month_order_does_not_matter():
    s = summer_only_series(2)
    assert analyse(s, months=[8, 6, 7]) == analyse(s, months=[6, 7, 8])


@pytest.mark.parametrize("bad", [[0], [13], [1, 1], []])
def test_invalid_months_rejected(bad):
    with pytest.raises(ValueError):
        normalise_months(bad)


# SPEC-101 criterion 4: sentence numbers equal response numbers
def test_sentence_parameters_come_from_statistics():
    r = analyse(summer_only_series(3), months=[6, 7, 8])
    assert r["frase"]["parametros"]["declive_decada"] == r["estatisticas"]["sen_declive_decada"]
    assert r["frase"]["parametros"]["meses"] == [6, 7, 8]
    assert r["frase"]["chave"].startswith(f"frase.{r['selo']}.")


def test_result_has_no_sentences_only_keys():
    r = analyse(summer_only_series(4))
    flat = repr(r).lower()
    assert not any(w in flat for w in FORBIDDEN)


def test_strong_trend_is_significant_and_has_no_years_remaining():
    yrs, mons = calendar(2001, 2024)
    x = 0.004 * np.arange(yrs.size) + np.random.default_rng(5).normal(0, 0.2, yrs.size)
    r = analyse(Series(x, yrs, mons))
    assert r["selo"] == "significativa"
    assert r["quanto_falta_anos"] is None
    assert r["estatisticas"]["sen_declive_decada"] == pytest.approx(0.48, abs=0.1)


def test_years_remaining_decreases_with_larger_slope():
    a = years_remaining(0.001, 1.0, 1.0, 120, 12)
    b = years_remaining(0.003, 1.0, 1.0, 120, 12)
    assert a > b >= 1
    assert years_remaining(0.0, 1.0, 1.0, 120, 12) is None


# SPEC-101 criterion 7: whole world equals the global series
def test_world_equals_global_weighted_mean():
    ds = make_dataset("temperatura")
    s, info = region_series(ds, {"tipo": "globo"})
    from terratempo.anomaly import weighted_mean
    assert np.allclose(s.values, weighted_mean(ds.cube, ds.grid.lats))
    assert info["n_celulas"] == 36 * 72


def test_small_polygon_uses_containing_cell_and_warns():
    g = Grid.regular(5)
    ring = [[13.1, -8.9], [13.3, -8.9], [13.3, -8.7], [13.1, -8.7], [13.1, -8.9]]
    mask, small = polygon_mask(g, [ring])
    assert small and mask.sum() == 1


def test_rectangle_selects_expected_cells():
    ds = make_dataset("precipitacao")
    _, info = region_series(ds, {"tipo": "rectangulo", "oeste": 0, "sul": 0, "este": 20, "norte": 10})
    assert info["n_celulas"] == 8 and not info["menor_que_resolucao"]


# demo label (docs/03 section 7)
def test_every_synthetic_dataset_is_labelled_demo():
    datasets = {v: make_dataset(v) for v in DEMO_VARIABLES}
    assert all(ds.label == LABEL_DEMO for ds in datasets.values())
    m = manifest(datasets)
    assert m["contem_demonstracao"] is True
    assert all(v["rotulo"] == LABEL_DEMO for v in m["variaveis"])


def test_named_place_uses_exactly_its_cells():
    from terratempo import places
    ds = make_dataset("temperatura")
    _, info = region_series(ds, {"tipo": "lugar", "chave": "ago"})
    named = sum(1 for k in places.load()["cells"].values() if k == "ago")
    assert info["n_celulas"] == named > 0 and info["lugar"] == "ago"
    assert places.name("ago", "pt") == "Angola" and places.search("angola")[0]["chave"] == "ago"


def test_tiny_place_falls_back_to_its_centroid_cell():
    from terratempo import places
    ds = make_dataset("temperatura")
    tiny = next(k for k, p in places.load()["places"].items()
                if p["kind"] == "country" and k not in set(places.load()["cells"].values()))
    _, info = region_series(ds, {"tipo": "lugar", "chave": tiny})
    assert info["n_celulas"] == 1 and info["menor_que_resolucao"]
