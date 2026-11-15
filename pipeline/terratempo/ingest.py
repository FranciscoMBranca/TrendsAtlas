"""Download real NASA monthly files and build the 5° cubes used by the API and the exports.

Works one year at a time: download, aggregate to 5°, then delete the raw files
(unless --keep-raw), so 24 years fit on a small disk (e.g. a GitHub Actions runner).

Credentials never go in the code: earthaccess reads EARTHDATA_USERNAME / EARTHDATA_PASSWORD
from the environment (CI secrets), or ~/.netrc, or asks in the terminal.

Usage (from pipeline/):
    python -m terratempo.ingest --variable precipitacao --start 2001-01 --end 2024-12
    python -m terratempo.ingest --variable temperatura humidade --start 2001-01 --end 2024-12
    python -m terratempo.ingest --variable precipitacao --skip-download   # reuse data/raw/

Raw files go to data/raw/<short_name>/ and cubes to data/cubes/<variable>.npz (repo root).
MERRA-2 temperature and humidity come from the same files: ask for both in one run.
"""

from __future__ import annotations

import argparse
import calendar
import os
import shutil
from pathlib import Path

import numpy as np

from . import LABEL_REAL
from .grid import Grid
from .readers import PRODUCTS, month_of, read_imerg_month, read_merra2_month, save_cube
from .synthetic import Dataset

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
CUBES = ROOT / "data" / "cubes"


def _login():
    try:
        import earthaccess
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise SystemExit('Falta o pacote earthaccess: pip install -e "./pipeline[nasa]"') from exc
    strategy = "environment" if os.getenv("EARTHDATA_USERNAME") and os.getenv("EARTHDATA_PASSWORD") else "all"
    auth = earthaccess.login(strategy=strategy)
    if not getattr(auth, "authenticated", True):
        raise SystemExit("Login no Earthdata falhou: confirme EARTHDATA_USERNAME e EARTHDATA_PASSWORD.")
    return earthaccess


def download_year(ea, short_name: str, version: str, year: int, m0: int, m1: int, dest: Path) -> list[Path]:
    last = f"{year}-{m1:02d}-{calendar.monthrange(year, m1)[1]:02d}"
    granules = ea.search_data(short_name=short_name, version=version, temporal=(f"{year}-{m0:02d}-01", last))
    if not granules:
        print(f"  {year}: sem ficheiros", flush=True)
        return []
    dest.mkdir(parents=True, exist_ok=True)
    return [Path(p) for p in ea.download(granules, str(dest))]


def ingest(var_ids: list[str], start: str, end: str, skip_download: bool, keep_raw: bool,
           resolution: float = 5.0) -> list[Path]:
    products = {v: PRODUCTS[v] for v in var_ids}
    short_names = {p.short_name for p in products.values()}
    if len(short_names) != 1:
        raise SystemExit("Numa execução, só variáveis do mesmo produto (ex.: temperatura e humidade).")
    product = next(iter(products.values()))
    raw = RAW / product.short_name
    grid = Grid.regular(resolution)
    y0, mo0 = map(int, start.split("-"))
    y1, mo1 = map(int, end.split("-"))
    n = (y1 - y0) * 12 + (mo1 - mo0) + 1
    years = np.array([y0 + (mo0 - 1 + k) // 12 for k in range(n)])
    months = np.array([(mo0 - 1 + k) % 12 + 1 for k in range(n)])
    cubes = {v: np.full((n, *grid.shape), np.nan, dtype=np.float32) for v in var_ids}
    got = set()
    ea = None if skip_download else _login()
    pattern = "*.HDF5" if product.short_name == "GPM_3IMERGM" else "*.nc4"

    for year in range(y0, y1 + 1):
        m_start = mo0 if year == y0 else 1
        m_end = mo1 if year == y1 else 12
        folder = raw / str(year)
        files = (sorted(folder.glob(pattern)) + sorted(raw.glob(pattern))) if skip_download else \
            download_year(ea, product.short_name, product.version, year, m_start, m_end, folder)
        for path in files:
            try:
                yy, mm = month_of(path)
            except ValueError:
                continue
            k = (yy - y0) * 12 + (mm - mo0)
            if not 0 <= k < n:
                continue
            for v, p in products.items():
                cubes[v][k] = read_imerg_month(path, grid) if p.short_name == "GPM_3IMERGM" \
                    else read_merra2_month(path, p.field, grid)
            got.add(k)
        print(f"  {year}: {len(files)} ficheiros, {len(got)}/{n} meses", flush=True)
        if not skip_download and not keep_raw:
            shutil.rmtree(folder, ignore_errors=True)

    if not got:
        raise SystemExit("Nenhum mês lido.")
    CUBES.mkdir(parents=True, exist_ok=True)
    written = []
    for v, p in products.items():
        ds = Dataset(v, p.unit, grid, years, months, cubes[v], LABEL_REAL,
                     source=f"{p.short_name} v{p.version}",
                     meta={"citation": p.citation, "missing_months": n - len(got)})
        out = CUBES / f"{v}.npz"
        save_cube(ds, out)
        written.append(out)
        print(f"{out}: {ds.cube.shape}, meses em falta: {n - len(got)}", flush=True)
    return written


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--variable", required=True, nargs="+", choices=sorted(PRODUCTS))
    ap.add_argument("--start", default="2000-01")
    ap.add_argument("--end", default="2025-12")
    ap.add_argument("--skip-download", action="store_true")
    ap.add_argument("--keep-raw", action="store_true")
    args = ap.parse_args()
    ingest(args.variable, args.start, args.end, args.skip_download, args.keep_raw)


if __name__ == "__main__":
    main()
