"""Download real NASA monthly files and build the 5° cubes used by the API and the exports.

Credentials never go in the code: earthaccess reads EARTHDATA_USERNAME / EARTHDATA_PASSWORD,
or ~/.netrc, or asks in the terminal.

Usage (from pipeline/):
    python -m terratempo.ingest --variable precipitacao --start 2001-01 --end 2024-12
    python -m terratempo.ingest --variable temperatura --start 2001-01 --end 2024-12
    python -m terratempo.ingest --variable humidade --skip-download   # reuses the MERRA-2 files

Raw files go to data/raw/<short_name>/ and cubes to data/cubes/<variable>.npz (repo root).
"""

from __future__ import annotations

import argparse
import calendar
from pathlib import Path

from .readers import PRODUCTS, build_dataset, save_cube

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
CUBES = ROOT / "data" / "cubes"


def download(short_name: str, version: str, start: str, end: str, dest: Path) -> None:
    try:
        import earthaccess
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise SystemExit('Falta o pacote earthaccess: pip install -e "./pipeline[nasa]"') from exc
    y, m = map(int, end.split("-"))
    last = f"{end}-{calendar.monthrange(y, m)[1]:02d}"
    earthaccess.login()
    granules = earthaccess.search_data(short_name=short_name, version=version, temporal=(f"{start}-01", last))
    if not granules:
        raise SystemExit(f"Sem ficheiros para {short_name} v{version} entre {start} e {end}.")
    dest.mkdir(parents=True, exist_ok=True)
    print(f"{len(granules)} ficheiros; a descarregar para {dest}")
    earthaccess.download(granules, str(dest))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--variable", required=True, choices=sorted(PRODUCTS))
    ap.add_argument("--start", default="2001-01")
    ap.add_argument("--end", default="2024-12")
    ap.add_argument("--skip-download", action="store_true")
    args = ap.parse_args()
    product = PRODUCTS[args.variable]
    raw = RAW / product.short_name
    if not args.skip_download:
        download(product.short_name, product.version, args.start, args.end, raw)
    pattern = "*.HDF5" if product.short_name == "GPM_3IMERGM" else "*.nc4"
    files = sorted(raw.glob(pattern))
    ds = build_dataset(args.variable, files)
    CUBES.mkdir(parents=True, exist_ok=True)
    out = CUBES / f"{args.variable}.npz"
    save_cube(ds, out)
    print(f"{out}: {ds.cube.shape}, {int(ds.years.min())}-{int(ds.years.max())}, "
          f"meses em falta: {ds.meta.get('missing_months')}")


if __name__ == "__main__":
    main()
