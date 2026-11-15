"""Readers for real NASA files, aggregated to the 5° grid (P02, P03, P18, P19, P20, P21).

| Pipeline id   | Product (short name)                                  | Field       | Conversion            |
| ------------- | ----------------------------------------------------- | ----------- | --------------------- |
| precipitacao  | GPM IMERG Final monthly (GPM_3IMERGM v07, HDF5)        | precipitation | mm/hr -> mm/day     |
| temperatura   | MERRA-2 tavgM_2d_slv_Nx (M2TMNXSLV, NetCDF4)           | T2M         | K -> °C               |
| humidade      | MERRA-2 tavgM_2d_slv_Nx (M2TMNXSLV)                    | QV2M        | kg/kg -> g/kg         |
| aerossois     | MERRA-2 tavgM_2d_aer_Nx (M2TMNXAER)                    | TOTEXTTAU   | none (AOD 550 nm)     |
| gelo_marinho  | MERRA-2 tavgM_2d_ocn_Nx (M2TMNXOCN)                    | FRSEAICE    | fraction -> %         |
| vegetacao     | MODIS Terra CMG monthly NDVI (MOD13C2 v061, HDF4)      | CMG 0.05 Deg Monthly NDVI | /10000  |
| nivel_mar     | NASA-SSH simple grid, weekly, 0.5° (NASA_SSH_REF_SIMPLE_GRID_V11, NetCDF) | ssha | m -> mm, monthly mean of weekly grids (F5) |

Short names, versions and DOIs were checked against NASA's CMR catalogue on 2026-11-15
(the MEaSUREs JPL2205 sea level grids are no longer listed; NASA-SSH v1.1 replaces them).
Field names inside the files are confirmed on the first real run: every reader checks units
and shapes and fails loudly when they do not match. Raw files never go into git; only the aggregated cubes do.
"""

from __future__ import annotations

import datetime as dt
import re
import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np

from . import LABEL_REAL
from .grid import Grid
from .synthetic import Dataset

_IMERG_DATE = re.compile(r"\.(\d{4})(\d{2})\d{2}-S")
_MERRA_DATE = re.compile(r"\.(\d{4})(\d{2})\.nc4$")
_MODIS_DATE = re.compile(r"\.A(\d{4})(\d{3})\.")
_SSH_DATE = re.compile(r"_(\d{4})(\d{2})(\d{2})(?:\d{2})?\.nc$")

MERRA_CITATION = "Global Modeling and Assimilation Office (GMAO), MERRA-2 {coll}, NASA GES DISC, doi:{doi}"


@dataclass(frozen=True)
class Product:
    var_id: str
    short_name: str
    version: str
    field: str
    unit: str
    citation: str
    kind: str = "merra2"  # imerg | merra2 | modis_cmg | ssh5day
    pattern: str = "*.nc4"


PRODUCTS = {
    "precipitacao": Product(
        "precipitacao", "GPM_3IMERGM", "07", "precipitation", "mm/day",
        "Huffman, G.J., et al. GPM IMERG Final Precipitation L3 1 month 0.1 degree x 0.1 degree V07, "
        "NASA GES DISC, doi:10.5067/GPM/IMERG/3B-MONTH/07", kind="imerg", pattern="*.HDF5",
    ),
    "temperatura": Product(
        "temperatura", "M2TMNXSLV", "5.12.4", "T2M", "degC",
        MERRA_CITATION.format(coll="tavgM_2d_slv_Nx", doi="10.5067/AP1B0BA5PD2K"),
    ),
    "humidade": Product(
        "humidade", "M2TMNXSLV", "5.12.4", "QV2M", "g/kg",
        MERRA_CITATION.format(coll="tavgM_2d_slv_Nx", doi="10.5067/AP1B0BA5PD2K"),
    ),
    "aerossois": Product(
        "aerossois", "M2TMNXAER", "5.12.4", "TOTEXTTAU", "1",
        MERRA_CITATION.format(coll="tavgM_2d_aer_Nx", doi="10.5067/FH9A0MLJPC7N"),
    ),
    "gelo_marinho": Product(
        "gelo_marinho", "M2TMNXOCN", "5.12.4", "FRSEAICE", "%",
        MERRA_CITATION.format(coll="tavgM_2d_ocn_Nx", doi="10.5067/4IASLIDL8EEC"),
    ),
    "vegetacao": Product(
        "vegetacao", "MOD13C2", "061", "CMG 0.05 Deg Monthly NDVI", "NDVI",
        "Didan, K. MODIS/Terra Vegetation Indices Monthly L3 Global 0.05Deg CMG V061, "
        "NASA EOSDIS Land Processes DAAC, doi:10.5067/MODIS/MOD13C2.061",
        kind="modis_cmg", pattern="*.hdf",
    ),
    "nivel_mar": Product(
        "nivel_mar", "NASA_SSH_REF_SIMPLE_GRID_V11", "1.1", "ssha", "mm",
        "Willis, J. K., S. Fournier, K. Marlis and E. Killett, NASA-SSH Simple Gridded Sea Surface "
        "Height from Standardized Reference Missions Only, Version 1.1, PO.DAAC, doi:10.5067/NSREF-SG0V11",
        kind="ssh5day", pattern="*.nc",
    ),
}


def month_of(path: Path | str) -> tuple[int, int]:
    """(year, month) from an IMERG, MERRA-2, MODIS (AYYYYDDD) or SSH (_YYYYMMDD[HH].nc) file name."""
    name = Path(path).name
    m = _IMERG_DATE.search(name) or _MERRA_DATE.search(name)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = _MODIS_DATE.search(name)
    if m:
        d = dt.date(int(m.group(1)), 1, 1) + dt.timedelta(days=int(m.group(2)) - 1)
        return d.year, d.month
    m = _SSH_DATE.search(name)
    if m:
        return int(m.group(1)), int(m.group(2))
    raise ValueError(f"data_no_nome_desconhecida: {name}")


def to_grid(field: np.ndarray, lats: np.ndarray, lons: np.ndarray, grid: Grid) -> np.ndarray:
    """Aggregate a (lat, lon) field to ``grid`` with a cos(latitude)-weighted mean (formula 2).

    Points with NaN are ignored; a target cell with no valid point is NaN.
    """
    field = np.asarray(field, dtype=float)
    lon2d, lat2d = np.meshgrid(((np.asarray(lons) + 180) % 360) - 180, np.asarray(lats))
    i = np.clip(np.floor((lat2d + 90) / grid.resolution).astype(int), 0, grid.lats.size - 1)
    j = np.clip(np.floor((lon2d + 180) / grid.resolution).astype(int), 0, grid.lons.size - 1)
    w = np.cos(np.deg2rad(lat2d))
    ok = np.isfinite(field)
    num = np.zeros(grid.shape)
    den = np.zeros(grid.shape)
    np.add.at(num, (i[ok], j[ok]), (field * w)[ok])
    np.add.at(den, (i[ok], j[ok]), w[ok])
    with np.errstate(invalid="ignore", divide="ignore"):
        out = num / den
    out[den == 0] = np.nan
    return out


def block_to_grid(field: np.ndarray, north_first: bool, grid: Grid) -> np.ndarray:
    """Fast aggregation for a global regular grid whose cells nest exactly in ``grid``
    (e.g. MODIS CMG 0.05°: 100 x 100 points per 5° cell). Memory stays near one copy."""
    ny, nx = field.shape
    fy, fx = ny // grid.lats.size, nx // grid.lons.size
    if fy * grid.lats.size != ny or fx * grid.lons.size != nx:
        raise ValueError(f"forma_inesperada: {field.shape}")
    data = field[::-1] if north_first else field  # south to north, like grid.lats
    lat = -90 + (np.arange(ny) + 0.5) * 180.0 / ny
    w = np.cos(np.deg2rad(lat))[:, None].astype(np.float32)
    ok = np.isfinite(data)
    num = np.where(ok, data * w, 0).reshape(grid.lats.size, fy, grid.lons.size, fx).sum(axis=(1, 3))
    den = np.where(ok, w, 0).reshape(grid.lats.size, fy, grid.lons.size, fx).sum(axis=(1, 3))
    with np.errstate(invalid="ignore", divide="ignore"):
        out = num / den
    out[den == 0] = np.nan
    return out


def _orient(data: np.ndarray, nlat: int, nlon: int) -> np.ndarray:
    """Return a (lat, lon) array whatever the file's axis order (IMERG V07 stores lon first)."""
    data = np.squeeze(data)
    if data.shape == (nlat, nlon):
        return data
    if data.shape == (nlon, nlat):
        return data.T
    raise ValueError(f"forma_inesperada: {data.shape}, esperava ({nlat}, {nlon})")


def read_imerg_month(path: Path | str, grid: Grid) -> np.ndarray:
    import h5py

    # Open through a Python file object: the HDF5 C library cannot open non-ASCII
    # Windows paths (e.g. a user folder with "ç").
    with open(path, "rb") as fh, h5py.File(fh, "r") as f:
        g = f["Grid"]
        ds = g["precipitation"]
        lats, lons = g["lat"][:], g["lon"][:]
        data = _orient(ds[:], lats.size, lons.size).astype(float)
        units = ds.attrs.get("units", b"")
        units = (units.decode() if isinstance(units, bytes) else str(units)).strip().lower().replace(" ", "")
        fill = ds.attrs.get("_FillValue", None)
    if fill is not None:
        data[data == np.asarray(fill).item()] = np.nan
    data[data < 0] = np.nan
    if units in {"mm/hr", "mm/h", "mmhr-1", "mmh-1"}:
        data = data * 24.0
    elif units not in {"mm/day", "mm/d"}:
        raise ValueError(f"unidades_inesperadas: '{units}'")
    return to_grid(data, lats, lons, grid)


def _open_nc(path: Path | str):
    from netCDF4 import Dataset as NC

    # In-memory open, for the same non-ASCII path reason as above.
    return NC("in-memory.nc", memory=Path(path).read_bytes())


def read_merra2_month(path: Path | str, field: str, grid: Grid) -> np.ndarray:
    with _open_nc(path) as nc:
        var = nc.variables[field]
        var.set_auto_mask(True)
        data = np.ma.filled(var[:].astype(float), np.nan)
        lats, lons = nc.variables["lat"][:], nc.variables["lon"][:]
        units = str(getattr(var, "units", "")).strip()
    data = _orient(data, lats.size, lons.size)
    data[np.abs(data) > 1e14] = np.nan
    if field == "T2M":
        if units != "K":
            raise ValueError(f"unidades_inesperadas: '{units}'")
        data = data - 273.15
    elif field == "QV2M":
        if units not in {"kg kg-1", "kg/kg"}:
            raise ValueError(f"unidades_inesperadas: '{units}'")
        data = data * 1000.0
    elif field == "TOTEXTTAU":
        if units not in {"1", ""}:
            raise ValueError(f"unidades_inesperadas: '{units}'")
        data[data < 0] = np.nan
    elif field == "FRSEAICE":
        if units not in {"1", ""}:
            raise ValueError(f"unidades_inesperadas: '{units}'")
        data = np.clip(data, 0, 1) * 100.0  # fraction of the tile -> % of the cell
    return to_grid(data, lats, lons, grid)


def read_modis_ndvi_month(path: Path | str, field: str, grid: Grid) -> np.ndarray:
    """MOD13C2 CMG (HDF4): NDVI stored as int16 x 10000 on a 0.05° global grid, north first."""
    import os
    import shutil
    import tempfile

    from pyhdf.SD import SD, SDC

    # pyhdf only opens paths: copy to an ASCII temporary path first (non-ASCII user folders).
    tmp = tempfile.mkdtemp(prefix="tt_")
    local = os.path.join(tmp, "f.hdf")
    shutil.copyfile(path, local)
    try:
        sd = SD(local, SDC.READ)
        sds = sd.select(field)
        raw = sds.get().astype(np.float32)
        attrs = sds.attributes()
        sd.end()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    fill = attrs.get("_FillValue", -3000)
    lo, hi = attrs.get("valid_range", (-2000, 10000))
    raw[(raw == fill) | (raw < lo) | (raw > hi)] = np.nan
    scale = float(attrs.get("scale_factor", 10000.0))
    data = raw / scale if scale > 1 else raw * scale  # MODIS writes 10000 meaning "divide by"
    if raw.shape != (3600, 7200):
        raise ValueError(f"forma_inesperada: {raw.shape}")
    return block_to_grid(data, north_first=True, grid=grid)


def read_ssh_5day(path: Path | str, field: str, grid: Grid) -> np.ndarray:
    """Gridded sea surface height anomaly (NASA-SSH weekly 0.5°, or the older MEaSUREs 5-day 1/6°):
    metres -> mm, on the 5° grid. Grid points with no altimeter data (counts = 0) are missing."""
    with _open_nc(path) as nc:
        var = nc.variables[field if field in nc.variables else "SLA"]  # SLA: older MEaSUREs files
        var.set_auto_mask(True)
        data = np.ma.filled(var[:].astype(float), np.nan)
        pick = lambda *names: next(n for n in names if n in nc.variables)  # noqa: E731
        lats = np.asarray(nc.variables[pick("latitude", "Latitude", "lat")][:], dtype=float)
        lons = np.asarray(nc.variables[pick("longitude", "Longitude", "lon")][:], dtype=float)
        units = str(getattr(var, "units", "")).strip().lower()
        n_obs = np.ma.filled(nc.variables["counts"][:].astype(float), 0.0) if "counts" in nc.variables else None
    data = _orient(data, lats.size, lons.size)
    if n_obs is not None:
        data = np.where(_orient(n_obs, lats.size, lons.size) > 0, data, np.nan)
    if units in {"m", "meters", "metre", "metres"}:
        data = data * 1000.0
    elif units not in {"mm", "millimeters"}:
        raise ValueError(f"unidades_inesperadas: '{units}'")
    return to_grid(data, lats, lons, grid)


def read_file(product: Product, path: Path | str, grid: Grid) -> np.ndarray:
    if product.kind == "imerg":
        return read_imerg_month(path, grid)
    if product.kind == "modis_cmg":
        return read_modis_ndvi_month(path, product.field, grid)
    if product.kind == "ssh5day":
        return read_ssh_5day(path, product.field, grid)
    return read_merra2_month(path, product.field, grid)


def mask_never_ice(cube: np.ndarray, threshold: float = 1.0) -> np.ndarray:
    """Sea ice: cells that never reach ``threshold`` % ice are outside the variable's coverage."""
    with np.errstate(invalid="ignore"):
        peak = np.nanmax(cube, axis=0)
    out = cube.copy()
    out[:, ~(peak >= threshold)] = np.nan
    return out


def build_dataset(var_id: str, files: Iterable[Path | str], resolution: float = 5.0) -> Dataset:
    """Read every file of one variable into a labelled ``real`` monthly cube.

    Several files in the same month (5-day sea-level grids) are averaged (formula F5).
    """
    product = PRODUCTS[var_id]
    grid = Grid.regular(resolution)
    by_month: dict[tuple[int, int], list[Path]] = {}
    for p in files:
        by_month.setdefault(month_of(p), []).append(Path(p))
    if not by_month:
        raise ValueError("sem_ficheiros")
    months_sorted = sorted(by_month)
    y0, m0 = months_sorted[0]
    y1, m1 = months_sorted[-1]
    n = (y1 - y0) * 12 + (m1 - m0) + 1
    cube = np.full((n, *grid.shape), np.nan, dtype=np.float32)
    years = np.array([y0 + (m0 - 1 + k) // 12 for k in range(n)])
    months = np.array([(m0 - 1 + k) % 12 + 1 for k in range(n)])
    for (y, m), paths in by_month.items():
        k = (y - y0) * 12 + (m - m0)
        stack = np.stack([read_file(product, p, grid) for p in paths])
        with warnings.catch_warnings():  # cells with no data in any file stay NaN
            warnings.simplefilter("ignore", RuntimeWarning)
            cube[k] = np.nanmean(stack, axis=0) if len(paths) > 1 else stack[0]
    if var_id == "gelo_marinho":
        cube = mask_never_ice(cube).astype(np.float32)
    return Dataset(var_id, product.unit, grid, years, months, cube, LABEL_REAL,
                   source=f"{product.short_name} v{product.version}",
                   meta={"citation": product.citation, "missing_months": n - len(by_month)})


def save_cube(ds: Dataset, path: Path | str) -> None:
    np.savez_compressed(
        path, cube=ds.cube, years=ds.years, months=ds.months, resolution=ds.grid.resolution,
        var_id=ds.id, unit=ds.unit, label=ds.label, source=ds.source,
        citation=ds.meta.get("citation", ""),
    )


def load_cube(path: Path | str) -> Dataset:
    z = np.load(path, allow_pickle=False)
    grid = Grid.regular(float(z["resolution"]))
    return Dataset(str(z["var_id"]), str(z["unit"]), grid, z["years"], z["months"], z["cube"],
                   str(z["label"]), source=str(z["source"]), meta={"citation": str(z["citation"])})
