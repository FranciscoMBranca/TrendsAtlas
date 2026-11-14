"""P11 / P34: versioned export of the manifest, global series and pre-computed maps.

Usage:  python -m terratempo.export --out ../web/public/data
"""

from __future__ import annotations

import argparse
import os
import json
import time
from pathlib import Path

from . import SCHEMA_VERSION
from .anomaly import monthly_anomaly, weighted_mean
from .catalog import PRESETS, manifest
from .maps import preset_years, trend_map
from .readers import load_cube
from .synthetic import DEMO_VARIABLES, make_dataset


# An empty TERRATEMPO_CUBES (as left by some dashboards) means "use the default".
CUBES_DIR = Path((os.getenv("TERRATEMPO_CUBES") or "").strip().strip("\"'") or Path(__file__).resolve().parents[2] / "data" / "cubes")


def load_datasets() -> dict:
    """Real cube (data/cubes/<id>.npz, label "real") when it exists, labelled synthetic otherwise."""
    out = {}
    for vid in DEMO_VARIABLES:
        cube = CUBES_DIR / f"{vid}.npz"
        out[vid] = load_cube(cube) if cube.exists() else make_dataset(vid)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="../web/public/data")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    datasets = load_datasets()
    (out / "manifest.json").write_text(json.dumps(manifest(datasets), ensure_ascii=False), "utf-8")
    for vid, ds in datasets.items():
        g = monthly_anomaly(weighted_mean(ds.cube, ds.grid.lats), ds.months)
        series = {
            "schemaVersion": SCHEMA_VERSION, "variavel": vid, "rotulo": ds.label,
            "unidade": ds.unit,
            "t": [f"{y:04d}-{m:02d}" for y, m in zip(ds.years, ds.months)],
            "anomalia": [round(float(v), 4) for v in g],
        }
        (out / f"serie-{vid}-globo.json").write_text(json.dumps(series), "utf-8")
        for preset in PRESETS:
            t0 = time.perf_counter()
            start, end = preset_years(ds, preset)
            data = trend_map(ds, start, end)
            data["preset"] = preset
            (out / f"mapa-{vid}-{preset}.json").write_text(json.dumps(data), "utf-8")
            print(f"{vid} {preset}: {time.perf_counter() - t0:.1f}s")


if __name__ == "__main__":
    main()
