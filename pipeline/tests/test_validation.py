"""validation.json: the evidence the site shows is computed, never typed."""

import numpy as np

from terratempo import validation as v


def test_reference_checks_agree_with_scipy():
    rows = {r["id"]: r for r in v.reference_checks(cases=5)}
    for key in ("theil_sen", "sen_ci", "linear", "fdr"):
        assert rows[key]["maxRelDiff"] < 1e-8, rows[key]


def test_false_alarms_on_white_noise_are_near_the_test_level():
    row = v.false_alarms(sims=200)[0]
    assert row["phi"] == 0.0 and 1.0 <= row["correctedPct"] <= 10.0


def test_hamed_rao_lowers_false_alarms_on_red_noise():
    row = v.false_alarms(sims=150)[-1]
    assert row["correctedPct"] < row["naivePct"]


def test_shuffling_years_destroys_a_planted_trend(tmp_path, monkeypatch):
    from terratempo.grid import Grid
    from terratempo.readers import save_cube
    from terratempo.synthetic import Dataset, calendar

    years, months = calendar(2000, 2019)
    g = Grid.regular(30)
    rng = np.random.default_rng(0)
    cube = rng.normal(0, 1, (len(years), *g.shape)) + 0.01 * np.arange(len(years))[:, None, None]
    save_cube(Dataset("temperatura", "°C", g, years, months, cube.astype(np.float32), "real", "teste"), tmp_path / "temperatura.npz")
    monkeypatch.setattr(v, "CUBES_DIR", tmp_path)
    r = v.shuffled_years("temperatura", shuffles=3)
    assert r["realPct"] > 90 and r["shuffledMaxPct"] < r["realPct"]
