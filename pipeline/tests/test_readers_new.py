"""Readers for aerosols, sea ice, NDVI and sea level, tested with SMALL FAKE files that
mimic the NASA layouts. They check units, orientation, fill values and aggregation;
they do NOT prove the field names of the real products (P00, first real run)."""

import os
import shutil
import tempfile

import numpy as np
import pytest

netCDF4 = pytest.importorskip("netCDF4")

from terratempo.grid import Grid  # noqa: E402
from terratempo.readers import (  # noqa: E402
    PRODUCTS, block_to_grid, build_dataset, mask_never_ice, month_of, read_file,
)

G = Grid.regular(5)


def merra_file(path, field, value, units="1"):
    nc = netCDF4.Dataset("fake.nc4", "w", memory=1024)
    nc.createDimension("time", 1)
    nc.createDimension("lat", 361)
    nc.createDimension("lon", 576)
    nc.createVariable("lat", "f8", ("lat",))[:] = -90 + 0.5 * np.arange(361)
    nc.createVariable("lon", "f8", ("lon",))[:] = -180 + 0.625 * np.arange(576)
    v = nc.createVariable(field, "f4", ("time", "lat", "lon"), fill_value=1e15)
    v.units = units
    v[:] = value if np.ndim(value) else np.full((1, 361, 576), value)
    path.write_bytes(bytes(nc.close()))


def ssh_file(path, sla_m):
    nc = netCDF4.Dataset("fake.nc", "w", memory=1024)
    nc.createDimension("Time", 1)
    nc.createDimension("Latitude", 960)
    nc.createDimension("Longitude", 2160)
    nc.createVariable("Latitude", "f4", ("Latitude",))[:] = -79.9166 + np.arange(960) / 6
    nc.createVariable("Longitude", "f4", ("Longitude",))[:] = 1 / 12 + np.arange(2160) / 6
    v = nc.createVariable("SLA", "f4", ("Time", "Latitude", "Longitude"), fill_value=-9999.0)
    v.units = "m"
    data = np.full((1, 960, 2160), sla_m, dtype=np.float32)
    data[0, :, :600] = -9999.0  # "land" on part of the grid
    v[:] = data
    path.write_bytes(bytes(nc.close()))


def test_month_from_new_file_names():
    assert month_of("MOD13C2.A2000032.061.2020061141300.hdf") == (2000, 2)
    assert month_of("MOD13C2.A2024336.061.2025005000000.hdf") == (2024, 12)
    assert month_of("ssh_grids_v2205_2010011512.nc") == (2010, 1)
    assert month_of("MERRA2_400.tavgM_2d_aer_Nx.202305.nc4") == (2023, 5)


def test_aerosols_keep_aod_units(tmp_path):
    p = tmp_path / "MERRA2_400.tavgM_2d_aer_Nx.201001.nc4"
    merra_file(p, "TOTEXTTAU", 0.15)
    out = read_file(PRODUCTS["aerossois"], p, G)
    assert np.allclose(out, 0.15, atol=1e-6)


def test_sea_ice_fraction_becomes_percent_and_never_ice_cells_are_masked(tmp_path):
    lat = -90 + 0.5 * np.arange(361)
    ice = np.where(np.abs(lat)[:, None] > 70, 0.8, 0.0) * np.ones((1, 1, 576))
    for m in (1, 2):
        merra_file(tmp_path / f"MERRA2_400.tavgM_2d_ocn_Nx.20100{m}.nc4", "FRSEAICE", ice)
    ds = build_dataset("gelo_marinho", sorted(tmp_path.glob("*.nc4")))
    assert ds.unit == "%"
    polar = ds.cube[0][-1]  # northernmost row
    tropic = ds.cube[0][18]
    assert np.allclose(polar[np.isfinite(polar)], 80.0, atol=1e-3)
    assert np.isnan(tropic).all()  # never any ice: outside the variable


def test_mask_never_ice_threshold():
    cube = np.zeros((3, 2, 2))
    cube[:, 0, 0] = [0, 5, 0]
    out = mask_never_ice(cube)
    assert np.isfinite(out[:, 0, 0]).all() and np.isnan(out[:, 1, 1]).all()


def test_sea_level_metres_to_mm_and_monthly_mean_of_5_day_grids(tmp_path):
    ssh_file(tmp_path / "ssh_grids_v2205_2010010312.nc", 0.010)
    ssh_file(tmp_path / "ssh_grids_v2205_2010011812.nc", 0.030)
    ds = build_dataset("nivel_mar", sorted(tmp_path.glob("*.nc")))
    assert ds.cube.shape[0] == 1
    vals = ds.cube[0][np.isfinite(ds.cube[0])]
    assert vals.size > 0 and np.allclose(vals, 20.0, atol=1e-2)  # mean of 10 and 30 mm
    assert np.isnan(ds.cube[0]).any()  # land stays missing, never zero


def test_block_aggregation_matches_constant_field():
    field = np.full((3600, 7200), 0.5, dtype=np.float32)
    field[:100, :100] = np.nan  # one 5° block fully missing (north-west corner)
    out = block_to_grid(field, north_first=True, grid=G)
    assert out.shape == G.shape and np.isnan(out[-1, 0])  # north-west after flipping
    assert np.allclose(out[np.isfinite(out)], 0.5)


def test_modis_ndvi_hdf4(tmp_path):
    sd_mod = pytest.importorskip("pyhdf.SD")
    tmp = tempfile.mkdtemp(prefix="tt_")
    local = os.path.join(tmp, "f.hdf")
    sd = sd_mod.SD(local, sd_mod.SDC.WRITE | sd_mod.SDC.CREATE)
    sds = sd.create("CMG 0.05 Deg Monthly NDVI", sd_mod.SDC.INT16, (3600, 7200))
    data = np.full((3600, 7200), 6000, dtype=np.int16)
    data[:, :3600] = -3000  # fill on the western half
    sds[:] = data
    sds._FillValue = -3000
    sds.scale_factor = 10000.0
    sds.valid_range = [-2000, 10000]
    sds.endaccess()
    sd.end()
    dest = tmp_path / "MOD13C2.A2010001.061.2020000000000.hdf"
    shutil.copyfile(local, dest)
    shutil.rmtree(tmp, ignore_errors=True)
    out = read_file(PRODUCTS["vegetacao"], dest, G)
    assert np.isnan(out[:, :36]).all()
    assert np.allclose(out[:, 36:], 0.6, atol=1e-4)
