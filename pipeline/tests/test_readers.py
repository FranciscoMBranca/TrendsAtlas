"""Readers (P02, P03) tested with SMALL FAKE files that mimic the NASA layouts.

These fakes check conversion, orientation, fill values and aggregation. They do NOT
prove the readers work on real files: that needs one real file per product (P00).
"""

import numpy as np
import pytest

h5py = pytest.importorskip("h5py")
netCDF4 = pytest.importorskip("netCDF4")

from terratempo import LABEL_REAL  # noqa: E402
from terratempo.grid import Grid  # noqa: E402
from terratempo.readers import (  # noqa: E402
    build_dataset, load_cube, month_of, read_imerg_month, read_merra2_month, save_cube, to_grid,
)

G = Grid.regular(5)


def fake_imerg(path, value_mm_hr, fill_cell=False):
    lats = -89.95 + 0.1 * np.arange(1800)
    lons = -179.95 + 0.1 * np.arange(3600)
    data = np.full((1, 3600, 1800), value_mm_hr, dtype=np.float32)  # V07: (time, lon, lat)
    if fill_cell:
        data[0, :50, :50] = -9999.9
    with open(path, "wb") as fh, h5py.File(fh, "w") as f:
        g = f.create_group("Grid")
        d = g.create_dataset("precipitation", data=data)
        d.attrs["units"] = b"mm/hr"
        d.attrs["_FillValue"] = np.float32(-9999.9)
        g.create_dataset("lat", data=lats)
        g.create_dataset("lon", data=lons)


def fake_merra(path, t_kelvin, qv=0.01):
    nc = netCDF4.Dataset("fake.nc4", "w", memory=1024)
    if True:
        nc.createDimension("time", 1)
        nc.createDimension("lat", 361)
        nc.createDimension("lon", 576)
        nc.createVariable("lat", "f8", ("lat",))[:] = -90 + 0.5 * np.arange(361)
        nc.createVariable("lon", "f8", ("lon",))[:] = -180 + 0.625 * np.arange(576)
        t = nc.createVariable("T2M", "f4", ("time", "lat", "lon"), fill_value=1e15)
        t.units = "K"
        t[:] = np.full((1, 361, 576), t_kelvin)
        q = nc.createVariable("QV2M", "f4", ("time", "lat", "lon"), fill_value=1e15)
        q.units = "kg kg-1"
        q[:] = np.full((1, 361, 576), qv)
    with open(path, "wb") as fh:
        fh.write(bytes(nc.close()))


def test_month_from_names():
    assert month_of("3B-MO.MS.MRG.3IMERG.20010101-S000000-E235959.01.V07B.HDF5") == (2001, 1)
    assert month_of("MERRA2_400.tavgM_2d_slv_Nx.202412.nc4") == (2024, 12)
    with pytest.raises(ValueError):
        month_of("qualquer.txt")


def test_to_grid_constant_field_stays_constant():
    lats = np.linspace(-89.75, 89.75, 360)
    lons = np.linspace(-179.75, 179.75, 720)
    out = to_grid(np.full((360, 720), 3.0), lats, lons, G)
    assert out.shape == G.shape and np.allclose(out, 3.0)


def test_imerg_converts_mm_hr_to_mm_day_and_handles_lon_first(tmp_path):
    p = tmp_path / "3B-MO.MS.MRG.3IMERG.20050301-S000000-E235959.03.V07B.HDF5"
    fake_imerg(p, 0.5, fill_cell=True)
    out = read_imerg_month(p, G)
    assert np.allclose(out[np.isfinite(out)], 12.0)
    # the fill covers the whole first 5° cell (50 x 50 points of 0.1°): missing, never zero
    assert np.isnan(out[0, 0])
    assert np.isfinite(out).sum() == out.size - 1


def test_merra2_converts_units(tmp_path):
    p = tmp_path / "MERRA2_300.tavgM_2d_slv_Nx.200501.nc4"
    fake_merra(p, 288.15, qv=0.012)
    assert np.allclose(read_merra2_month(p, "T2M", G), 15.0, atol=1e-4)
    assert np.allclose(read_merra2_month(p, "QV2M", G), 12.0, atol=1e-3)


def test_build_dataset_is_labelled_real_with_gaps_as_nan(tmp_path):
    for ym, k in [("200501", 280.0), ("200503", 290.0)]:
        fake_merra(tmp_path / f"MERRA2_300.tavgM_2d_slv_Nx.{ym}.nc4", k)
    ds = build_dataset("temperatura", sorted(tmp_path.glob("*.nc4")))
    assert ds.label == LABEL_REAL
    assert ds.cube.shape[0] == 3 and np.isnan(ds.cube[1]).all()
    assert ds.meta["missing_months"] == 1
    save_cube(ds, tmp_path / "temperatura.npz")
    back = load_cube(tmp_path / "temperatura.npz")
    assert back.label == LABEL_REAL and back.unit == "degC"
    assert "MERRA-2" in back.meta["citation"]
    assert np.allclose(back.cube[0], 6.85, atol=1e-4)
