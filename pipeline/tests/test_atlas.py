import json

import numpy as np
import pytest

from terratempo import LABEL_REAL
from terratempo.atlas import analyse_cube, build_files, export_variable, first_persistent_year, write_manifest
from terratempo.synthetic import make_dataset


@pytest.fixture(scope="module")
def small():
    # 20° grid (9 x 18 cells) keeps the test fast; same code path as 5°.
    return make_dataset("temperatura", resolution=20)


def test_first_persistent_year_needs_the_final_run():
    years = np.array([2010, 2011, 2012, 2013])
    flags = np.array([[True, False], [False, True], [True, True], [True, True]])
    out = first_persistent_year(flags, years)
    assert out.tolist() == [2012.0, 2011.0]
    assert np.isnan(first_persistent_year(np.array([[True], [False]]), np.array([1, 2]))[0])


def test_atlas_files_follow_schema_v3(small, tmp_path):
    folder = export_variable(small, tmp_path)
    meta = json.loads((folder / "meta.json").read_text(encoding="utf-8"))
    grid = json.loads((folder / "grid_trend.json").read_text(encoding="utf-8"))
    regions = json.loads((folder / "regions.json").read_text(encoding="utf-8"))
    series = json.loads((folder / "series_global.json").read_text(encoding="utf-8"))
    assert folder.name == "temperature"
    assert meta["schemaVersion"] == 3 and meta["isDemo"] is True
    assert "inventados" in meta["source"]["note"]
    assert meta["period"] == {"start": "2001-01", "end": "2024-12", "months": 288}
    assert len(meta["emergence"]["byYear"]) == 15  # windows ending 2010..2024
    assert len(grid) == 9 * 18
    assert set(grid[0]) == {"lat", "lon", "trend", "p", "ci", "sig", "sigFdr", "emergence", "emergenceFdr", "yearsToDetect"}
    assert len(series) == 288 and series[0]["date"] == "2001-01-01"
    assert regions and len(regions[0]["series"]) == 288
    # a cell that emerged has no "years to detect"
    assert all(c["yearsToDetect"] is None for c in grid if c["emergence"] is not None)
    write_manifest(tmp_path)
    manifest = json.loads((tmp_path / "variables.json").read_text(encoding="utf-8"))
    assert manifest["variables"][0]["id"] == "temperature"


def test_real_cube_is_labelled_real_in_meta(small):
    small.label = LABEL_REAL
    r = analyse_cube(small)
    meta = build_files(small, "temperature", r, [])["meta.json"]
    assert meta["isDemo"] is False and meta["source"]["name"] == "NASA MERRA-2"


def test_global_trend_sign_matches_synthetic_warming(small):
    small.label = LABEL_REAL
    meta = build_files(small, "temperature", analyse_cube(small), [])["meta.json"]
    assert meta["highlights"]["globalTrend"]["trend"] > 0


def test_months_not_yet_published_are_trimmed_and_never_null(tmp_path):
    ds = make_dataset("precipitacao", resolution=20)
    ds.cube = ds.cube.copy()
    ds.cube[-3:] = np.nan  # Oct-Dec of the last year not published yet
    ds.cube[50, :, :] = np.nan  # one missing month inside the series
    ds.label = LABEL_REAL
    folder = export_variable(ds, tmp_path)
    meta = json.loads((folder / "meta.json").read_text(encoding="utf-8"))
    series = json.loads((folder / "series_global.json").read_text(encoding="utf-8"))
    regions = json.loads((folder / "regions.json").read_text(encoding="utf-8"))
    assert meta["period"]["end"] == "2024-09" and meta["period"]["months"] == 285
    assert all(p["anomaly"] is not None for p in series) and len(series) == 284
    assert all(p["anomaly"] is not None for r in regions for p in r["series"])


def test_annual_anomaly_file_for_presentation_mode(small, tmp_path):
    folder = export_variable(small, tmp_path)
    a = json.loads((folder / "annual_anomaly.json").read_text(encoding="utf-8"))
    assert a["years"] == list(range(2001, 2025))
    assert len(a["values"]) == len(a["years"]) and all(len(row) == len(a["cells"]) for row in a["values"])
    assert a["extent"] > 0 and a["unit"] == "°C"
    # the warming synthetic series: the last year is warmer than the first on average
    first = np.nanmean([v for v in a["values"][0] if v is not None])
    last = np.nanmean([v for v in a["values"][-1] if v is not None])
    assert last > first


def test_sources_file_lists_every_variable_with_its_nasa_doi(tmp_path):
    import json

    from terratempo.atlas import VARIABLES, write_sources

    data = json.loads(write_sources(tmp_path).read_text(encoding="utf-8"))
    ids = [r["id"] for r in data["sources"]]
    assert ids == list(VARIABLES)
    for r in data["sources"]:
        assert r["doi"].startswith("10.5067/") and r["product"] and r["version"]
        assert r["status"] == "pending" and r["period"] is None  # no meta.json in tmp_path: nothing real
    sea = next(r for r in data["sources"] if r["id"] == "sea_level")
    assert sea["product"] == "NASA_SSH_REF_SIMPLE_GRID_V11" and sea["doi"] == "10.5067/NSREF-SG0V11"
