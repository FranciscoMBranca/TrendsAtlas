"""Ingestion without network (--skip-download), with SMALL FAKE MERRA-2 files."""

import numpy as np
import pytest

netCDF4 = pytest.importorskip("netCDF4")

from terratempo import LABEL_REAL, ingest  # noqa: E402
from terratempo.readers import load_cube  # noqa: E402


def fake_merra(path, t_kelvin, qv):
    nc = netCDF4.Dataset("fake.nc4", "w", memory=1024)
    nc.createDimension("time", 1)
    nc.createDimension("lat", 361)
    nc.createDimension("lon", 576)
    nc.createVariable("lat", "f8", ("lat",))[:] = -90 + 0.5 * np.arange(361)
    nc.createVariable("lon", "f8", ("lon",))[:] = -180 + 0.625 * np.arange(576)
    for name, units, value in (("T2M", "K", t_kelvin), ("QV2M", "kg kg-1", qv)):
        v = nc.createVariable(name, "f4", ("time", "lat", "lon"), fill_value=1e15)
        v.units = units
        v[:] = np.full((1, 361, 576), value)
    path.write_bytes(bytes(nc.close()))


def test_ingest_builds_both_merra_cubes_from_one_set_of_files(tmp_path, monkeypatch):
    raw = tmp_path / "raw"
    folder = raw / "M2TMNXSLV" / "2005"
    folder.mkdir(parents=True)
    for m in (1, 2, 4):  # March missing on purpose
        fake_merra(folder / f"MERRA2_300.tavgM_2d_slv_Nx.2005{m:02d}.nc4", 273.15 + m, 0.001 * m)
    monkeypatch.setattr(ingest, "RAW", raw)
    monkeypatch.setattr(ingest, "CUBES", tmp_path / "cubes")

    out = ingest.ingest(["temperatura", "humidade"], "2005-01", "2005-04", skip_download=True, keep_raw=True)
    assert [p.name for p in out] == ["temperatura.npz", "humidade.npz"]
    t = load_cube(tmp_path / "cubes" / "temperatura.npz")
    q = load_cube(tmp_path / "cubes" / "humidade.npz")
    assert t.label == LABEL_REAL and t.cube.shape == (4, 36, 72)
    assert np.allclose(t.cube[1], 2.0, atol=1e-4) and np.isnan(t.cube[2]).all()
    assert np.allclose(q.cube[3], 4.0, atol=1e-3)


def test_ingest_refuses_mixing_products():
    with pytest.raises(SystemExit):
        ingest.ingest(["temperatura", "precipitacao"], "2005-01", "2005-02", True, True)
