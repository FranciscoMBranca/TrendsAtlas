"""P02 / P03: readers for real NASA monthly files, aggregated to the 5° grid.

- GPM IMERG monthly (GPM_3IMERGM v07, HDF5): Grid/precipitation, mm/hr -> mm/day (formula 12).
- MERRA-2 monthly single-level diagnostics (M2TMNXSLV, NetCDF4): T2M in K -> °C (formula 12),
  QV2M in kg/kg -> g/kg.

Product names and field names come from docs/03 and are still "to confirm" in P00:
the readers check units and shapes and fail loudly when they do not match.
Raw files never go into git (see .gitignore); only the aggregated cubes do.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np

from . import LABEL_REAL
from .grid import Grid
from .synthetic import Dataset

_IMERG_DATE = re.compile(r"\.(\d{4})(\d{2})\d{2}-S")
_MERRA_DATE = re.compile(r"\.(\d{4})(\d{2})\.nc4$")


@dataclass(frozen=True)
class Product:
    var_id: str
    short_name: str
    version: str
    field: str
    unit: str
    citation: str


PRODUCTS = {
    "precipitacao": Product(
        "precipitacao", "GPM_3IMERGM", "07", "precipitation", "mm/day",
        "Huffman, G.J., et al. GPM IMERG Final Precipitation L3 1 month 0.1 degree x 0.1 degree V07, "
        "NASA GES DISC, doi:10.5067/GPM/IMERG/3B-MONTH/07",
    ),
    "temperatura": Product(
        "temperatura", "M2TMNXSLV", "5.12.4", "T2M", "degC",
        "Global Modeling and Assimilation Office (GMAO), MERRA-2 tavgM_2d_slv_Nx, NASA GES DISC, "
        "doi:10.5067/AP1B0BA5PD2K",
    ),
    "humidade": Product(
        "humidade", "M2TMNXSLV", "5.12.4", "QV2M", "g/kg",
        "Global Modeling and Assimilation Office (GMAO), MERRA-2 tavgM_2d_slv_Nx, NASA GES DISC, "
        "doi:10.5067/AP1B0BA5PD2K",
    ),
}


def month_of(path: Path | str) -> tuple[int, int]:
    """(year, month) from an IMERG or MERRA-2 file name."""
    name = Path(path).name
    m = _IMERG_DATE.search(name) or _MERRA_DATE.search(name)
    if not m:
        raise ValueError(f"data_no_nome_desconhecida: {name}")
    return int(m.group(1)), int(m.group(2))


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


def read_merra2_month(path: Path | str, field: str, grid: Grid) -> np.ndarray:
    from netCDF4 import Dataset as NC

    # In-memory open, for the same non-ASCII path reason as above.
    with NC("merra2.nc4", memory=Path(path).read_bytes()) as nc:
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
    return to_grid(data, lats, lons, grid)


def build_dataset(var_id: str, files: Iterable[Path | str], resolution: float = 5.0) -> Dataset:
    """Read every monthly file of one variable into a labelled ``real`` cube."""
    product = PRODUCTS[var_id]
    grid = Grid.regular(resolution)
    by_month = {month_of(p): Path(p) for p in files}
    if not by_month:
        raise ValueError("sem_ficheiros")
    months_sorted = sorted(by_month)
    y0, m0 = months_sorted[0]
    y1, m1 = months_sorted[-1]
    n = (y1 - y0) * 12 + (m1 - m0) + 1
    cube = np.full((n, *grid.shape), np.nan, dtype=np.float32)
    years = np.array([y0 + (m0 - 1 + k) // 12 for k in range(n)])
    months = np.array([(m0 - 1 + k) % 12 + 1 for k in range(n)])
    for (y, m), path in by_month.items():
        k = (y - y0) * 12 + (m - m0)
        if product.short_name == "GPM_3IMERGM":
            cube[k] = read_imerg_month(path, grid)
        else:
            cube[k] = read_merra2_month(path, product.field, grid)
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
