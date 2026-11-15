"""Atlas export (schema v3): the files the site reads in web/public/data/<variable>/.

Same contract as the prototype (`web/lib/atlas/data/schema.ts`):
    <variable>/grid_trend.json, series_global.json, regions.json, meta.json and variables.json.

Built from a 5° cube (real, from `terratempo.ingest`, or synthetic) with the formulas of
this package: anomalies (1), cos(lat) weights (2), Theil-Sen (3), Mann-Kendall with
Hamed-Rao (4, 5), Sen CI (6), Benjamini-Hochberg (7), time of emergence (8) and
"how long until detectable" (9).

Usage (from pipeline/):
    python -m terratempo.atlas --out ../web/public/data
Only variables with a real cube in data/cubes/ are written, unless --include-synthetic.
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

from . import LABEL_DEMO
from . import emergence as em
from . import trend
from .anomaly import cos_lat_weights, monthly_anomaly, weighted_mean
from .grid import bbox_to_ring, polygon_mask
from .synthetic import Dataset

SCHEMA_VERSION = 3
ALPHA = 0.05
FDR_Q = 0.10
MIN_YEARS = 10
MAX_HORIZON_YEARS = 100
MIN_VALID_FRACTION = 0.8  # a cell needs 80 % of its months to get a trend
REGIONS_DIR = Path(__file__).resolve().parents[1] / "config" / "regions"

# Pipeline id -> atlas id (the site and its colour palettes use the atlas ids).
ATLAS_ID = {
    "temperatura": "temperature",
    "precipitacao": "precipitation",
    "vegetacao": "vegetation",
    "gelo_marinho": "sea_ice",
    "aerossois": "aerosols",
    "nivel_mar": "sea_level",
}

VARIABLES: dict[str, dict[str, Any]] = {
    "temperature": {
        "name": "Temperatura do ar", "unit": "°C", "trendUnit": "°C por década", "decimals": 2,
        "coverage": "global", "relative": False,
        "copy": {
            "down": "Arrefece", "up": "Aquece",
            "headline": "Mais calor aqui. Menos calor ali.",
            "opening": "O planeta não aquece *ao mesmo ritmo* em todo o lado.",
            "subject": "a temperatura",
            "description": "Temperatura do ar a 2 metros do chão. As anomalias mensais mostram quanto "
                           "cada mês se afastou do normal para esse mês do ano, o que tira a estação da conta.",
        },
        "source": {"name": "NASA MERRA-2", "product": "M2TMNXSLV (reanálise mensal, T2M)",
                   "version": "5.12.4", "doi": "10.5067/AP1B0BA5PD2K",
                   "note": "Reanálise: um modelo ajustado a observações, não uma medição directa."},
    },
    "precipitation": {
        "name": "Precipitação", "unit": "mm/dia", "trendUnit": "mm/dia por década", "decimals": 2,
        "coverage": "global", "relative": True,
        "copy": {
            "down": "Menos chuva", "up": "Mais chuva",
            "headline": "Mais chuva aqui. Menos chuva ali.",
            "opening": "A mesma chuva não cai *da mesma forma* em todo o lado.",
            "subject": "a precipitação",
            "description": "A água que chega à superfície em forma de chuva ou neve. As anomalias mensais "
                           "mostram quanto cada mês se afastou do normal para esse mês do ano.",
        },
        "source": {"name": "NASA GPM IMERG", "product": "GPM_3IMERGM (Final, mensal, 0,1°)",
                   "version": "07", "doi": "10.5067/GPM/IMERG/3B-MONTH/07",
                   "note": "Estimativa de precipitação por satélite, calibrada com pluviómetros."},
    },
    "vegetation": {
        "name": "Vegetação (NDVI)", "unit": "NDVI", "trendUnit": "NDVI por década", "decimals": 3,
        "coverage": "land", "relative": True,
        "copy": {
            "down": "Menos verde", "up": "Mais verde",
            "headline": "Mais verde aqui. Menos verde ali.",
            "opening": "A Terra não esverdece *nem escurece* por igual.",
            "subject": "a vegetação",
            "description": "O NDVI mede o quão verde e densa é a vegetação vista do espaço (0 = solo nu, perto de 1 = floresta densa). Só existe em terra.",
        },
        "source": {"name": "NASA MODIS (Terra)", "product": "MOD13C2 (NDVI mensal, 0,05°)", "version": "061",
                   "doi": "10.5067/MODIS/MOD13C2.061",
                   "note": "Índice de vegetação a partir de reflectâncias do satélite Terra."},
    },
    "sea_ice": {
        "name": "Gelo marinho", "unit": "% da célula", "trendUnit": "% por década", "decimals": 2,
        "coverage": "polar-ocean", "relative": False,
        "copy": {
            "down": "Menos gelo", "up": "Mais gelo",
            "headline": "O gelo marinho não muda por igual nos dois pólos.",
            "opening": "Os dois pólos não perdem gelo *do mesmo modo*.",
            "subject": "o gelo marinho",
            "description": "A fracção de cada célula coberta por gelo do mar, segundo a reanálise MERRA-2 (que usa observações de satélite). Só conta o oceano onde há gelo em algum momento.",
        },
        "source": {"name": "NASA MERRA-2", "product": "M2TMNXOCN (FRSEAICE)", "version": "5.12.4",
                   "doi": "10.5067/4IASLIDL8EEC",
                   "note": "Reanálise: um modelo ajustado a observações, não uma medição directa."},
    },
    "aerosols": {
        "name": "Aerossóis (AOD)", "unit": "AOD", "trendUnit": "AOD por década", "decimals": 3,
        "coverage": "global", "relative": True,
        "copy": {
            "down": "Ar mais limpo", "up": "Ar mais carregado",
            "headline": "Mais partículas no ar aqui. Menos ali.",
            "opening": "O ar não se carrega *de partículas* por igual.",
            "subject": "a carga de aerossóis",
            "description": "A profundidade óptica dos aerossóis (AOD) mede quanta luz as partículas em suspensão bloqueiam na coluna de ar. Não diz de que partículas se trata.",
        },
        "source": {"name": "NASA MERRA-2", "product": "M2TMNXAER (TOTEXTTAU, 550 nm)", "version": "5.12.4",
                   "doi": "10.5067/FH9A0MLJPC7N",
                   "note": "Reanálise com assimilação de observações de aerossóis por satélite."},
    },
    "sea_level": {
        "name": "Nível do mar", "unit": "mm", "trendUnit": "mm por década", "decimals": 1,
        "coverage": "ocean", "relative": False,
        "copy": {
            "down": "Desce", "up": "Sobe",
            "headline": "O mar sobe aqui mais depressa do que ali.",
            "opening": "O mar não sobe *por igual* em todas as costas.",
            "subject": "o nível do mar",
            "description": "A anomalia da altura da superfície do oceano medida por altimetria de satélite (média mensal de grelhas de 5 dias). Só há valor no oceano aberto.",
        },
        "source": {"name": "NASA MEaSUREs", "product": "Gridded Sea Surface Height Anomalies (SLA)", "version": "JPL2205",
                   "doi": "10.5067/SLREF-CDRV3",
                   "note": "Altimetria por satélite; anomalias face a uma média de referência do produto."},
    },
}

DEMO_SOURCE = {"name": "Dados sintéticos de demonstração", "product": "Gerador terratempo.synthetic",
               "version": "1", "doi": "",
               "note": "Estes dados são inventados para testar o pipeline e o site. "
                       "NÃO são medições da NASA e não descrevem o clima real."}


# ---------------------------------------------------------------- helpers
def _r(value: float | None, digits: int = 3) -> float | None:
    return None if value is None or not math.isfinite(value) else round(float(value), digits)


def _rp(p: float) -> float | None:
    return None if not math.isfinite(p) else float(f"{p:.3g}")


def _year(value: float) -> int | None:
    return int(value) if value is not None and math.isfinite(value) else None


@dataclass
class CellStats:
    slope: float  # per month
    ci_low: float
    ci_high: float
    p: float
    f: float


def series_stats(y: np.ndarray) -> CellStats:
    """Formulas 3-6 on one monthly anomaly series (NaN allowed)."""
    slope, _ = trend.theil_sen(y)
    mk = trend.mann_kendall(y, hamed_rao=True)
    lo, hi = trend.sen_confidence_interval(y, mk.var_s)
    return CellStats(slope, lo, hi, mk.p, mk.f)


def first_persistent_year(flags: np.ndarray, years: np.ndarray) -> np.ndarray:
    """Start of the FINAL run of True along axis 0 (formula 8); NaN when the last window is False."""
    run = np.cumprod(flags[::-1].astype(int), axis=0).sum(axis=0)
    n = flags.shape[0]
    start = np.clip(n - run, 0, n - 1)
    return np.where(run > 0, years[start].astype(float), np.nan)


def _years_to_detect(y: np.ndarray, s: CellStats) -> float:
    """Formula 9 for one series; NaN beyond the horizon or with a zero slope."""
    ok = np.isfinite(y)
    t = np.arange(y.size, dtype=float)
    if ok.sum() < 3 or not math.isfinite(s.slope):
        return float("nan")
    resid = y[ok] - s.slope * t[ok]
    resid = resid - np.median(resid)
    sigma = float(np.std(resid, ddof=2))
    years = em.years_remaining(s.slope, sigma, s.f, int(ok.sum()), 12, ALPHA)
    return float(years) if years is not None and years <= MAX_HORIZON_YEARS else float("nan")


# ---------------------------------------------------------------- core
@dataclass
class AtlasResult:
    years: np.ndarray
    lats: np.ndarray
    lons: np.ndarray
    months_iso: list[str]
    stats: list[list[CellStats | None]]
    sig_fdr: np.ndarray
    emergence: np.ndarray
    emergence_fdr: np.ndarray
    years_to_detect: np.ndarray
    sig_by_window: np.ndarray
    sig_fdr_by_window: np.ndarray
    window_years: np.ndarray
    valid: np.ndarray
    anomalies: np.ndarray
    values: np.ndarray


def trim_empty_edges(ds: Dataset) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Drop leading/trailing months with no data at all (e.g. months NASA has not published yet).

    The period shown on the site is then the period that really has data.
    """
    has = np.isfinite(ds.cube).reshape(len(ds.cube), -1).any(axis=1)
    if not has.any():
        raise ValueError("sem_dados")
    idx = np.flatnonzero(has)
    sl = slice(int(idx[0]), int(idx[-1]) + 1)
    return ds.cube[sl].astype(float), ds.years[sl], ds.months[sl]


def analyse_cube(ds: Dataset, progress=None) -> AtlasResult:
    values, years, months = trim_empty_edges(ds)
    if values.shape[0] < MIN_YEARS * 12:
        raise ValueError("periodo_curto")
    anomalies = monthly_anomaly(values, months)
    nt, ny, nx = anomalies.shape
    first_year = int(years[0])
    last_year = int(years[-1])
    window_years = np.arange(first_year + MIN_YEARS - 1, last_year + 1)

    valid = np.isfinite(anomalies).sum(axis=0) >= MIN_VALID_FRACTION * nt
    stats: list[list[CellStats | None]] = [[None] * nx for _ in range(ny)]
    p_final = np.full((ny, nx), np.nan)
    p_windows = np.full((window_years.size, ny, nx), np.nan)
    ytd = np.full((ny, nx), np.nan)
    for i in range(ny):
        for j in range(nx):
            if not valid[i, j]:
                continue
            y = anomalies[:, i, j]
            s = series_stats(y)
            stats[i][j] = s
            p_final[i, j] = s.p
            ytd[i, j] = _years_to_detect(y, s)
            for w, end in enumerate(window_years):
                n = (end - first_year + 1) * 12
                p_windows[w, i, j] = s.p if n == nt else trend.mann_kendall(y[:n], hamed_rao=True).p
        if progress:
            progress(i + 1, ny)

    sig = np.isfinite(p_windows) & (p_windows < ALPHA)
    sig_fdr_w = np.stack([trend.benjamini_hochberg(p, FDR_Q) for p in p_windows])
    emergence = first_persistent_year(sig, window_years)
    emergence_fdr = first_persistent_year(sig_fdr_w, window_years)
    ytd = np.where(np.isfinite(emergence), np.nan, ytd)
    months_iso = [f"{int(a):04d}-{int(b):02d}-01" for a, b in zip(years, months)]
    return AtlasResult(years, ds.grid.lats, ds.grid.lons, months_iso, stats,
                       trend.benjamini_hochberg(p_final, FDR_Q), emergence, emergence_fdr, ytd,
                       sig, sig_fdr_w, window_years, valid, anomalies, values)


def _series(dates: list[str], values: np.ndarray, digits: int) -> list[dict[str, Any]]:
    """{date, anomaly} points; months without data are left out (the schema has no nulls)."""
    return [{"date": m, "anomaly": _r(v, digits)} for m, v in zip(dates, values) if math.isfinite(v)]


def annual_anomalies(r: "AtlasResult", ds: Dataset, digits: int) -> dict[str, Any]:
    """SPEC-110: one map per year with the mean of that year's monthly anomalies.

    A cell-year needs at least 10 of 12 months; years with no valid cell are left out.
    The colour scale is symmetric and fixed for all years (98th percentile of |values|).
    """
    years_u = sorted({int(y) for y in r.years})
    keep_cells = [(i, j) for i in range(r.lats.size) for j in range(r.lons.size) if r.valid[i, j]]
    out_years, out_values = [], []
    for yr in years_u:
        sel = r.years == yr
        block = r.anomalies[sel]
        count = np.isfinite(block).sum(axis=0)
        with np.errstate(invalid="ignore"):
            mean = np.where(count >= 10, np.nanmean(np.where(np.isfinite(block), block, np.nan), axis=0), np.nan)
        vals = [_r(mean[i, j], digits) for i, j in keep_cells]
        if all(v is None for v in vals):
            continue
        out_years.append(yr)
        out_values.append(vals)
    flat = np.array([v for row in out_values for v in row if v is not None], dtype=float)
    extent = float(np.percentile(np.abs(flat), 98)) if flat.size else 1.0
    return {
        "schemaVersion": SCHEMA_VERSION,
        "isDemo": ds.label == LABEL_DEMO,
        "variable": ATLAS_ID.get(ds.id, ds.id),
        "unit": VARIABLES[ATLAS_ID[ds.id]]["unit"],
        "baseline": f"{years_u[0]}–{years_u[-1]}",
        "extent": _r(extent, digits),
        "cells": [[_r(r.lats[i], 2), _r(r.lons[j], 2)] for i, j in keep_cells],
        "years": out_years,
        "values": out_values,
    }


def _area_pct(flags: np.ndarray, r: AtlasResult) -> float:
    w = np.broadcast_to(cos_lat_weights(r.lats)[:, None], r.valid.shape)
    total = float(w[r.valid].sum())
    return round(100.0 * float(w[flags & r.valid].sum()) / total, 1) if total else 0.0


def _series_emergence(y: np.ndarray, r: AtlasResult) -> tuple[int | None, int | None]:
    first_year = int(r.years[0])
    ps = np.array([trend.mann_kendall(y[: (end - first_year + 1) * 12], hamed_rao=True).p
                   for end in r.window_years])
    year = first_persistent_year((ps < ALPHA)[:, None], r.window_years)[0]
    if math.isfinite(year):
        return int(year), None
    return None, _year(_years_to_detect(y, series_stats(y)))


def build_files(ds: Dataset, atlas_id: str, r: AtlasResult, regions: list[dict]) -> dict[str, Any]:
    spec = VARIABLES[atlas_id]
    d = spec["decimals"] + 2
    dec = 120  # months per decade
    is_demo = ds.label == LABEL_DEMO

    cells = []
    for i, lat in enumerate(r.lats):
        for j, lon in enumerate(r.lons):
            s = r.stats[i][j]
            if s is None or not math.isfinite(s.slope):
                continue
            cells.append({
                "lat": _r(lat, 2), "lon": _r(lon, 2), "trend": _r(s.slope * dec, d), "p": _rp(s.p),
                "ci": [_r(s.ci_low * dec, d), _r(s.ci_high * dec, d)],
                "sig": bool(s.p < ALPHA), "sigFdr": bool(r.sig_fdr[i, j]),
                "emergence": _year(r.emergence[i, j]), "emergenceFdr": _year(r.emergence_fdr[i, j]),
                "yearsToDetect": _year(r.years_to_detect[i, j]),
            })

    global_anom = weighted_mean(r.anomalies, r.lats, r.valid)
    g = series_stats(global_anom)

    region_out = []
    for reg in regions:
        mask, _ = polygon_mask(ds.grid, [bbox_to_ring(*reg["bbox"])])
        mask &= r.valid
        if not mask.any():
            continue
        y = weighted_mean(r.anomalies, r.lats, mask)
        s = series_stats(y)
        mean_value = float(np.nanmean(weighted_mean(r.values, r.lats, mask)))
        t = s.slope * dec
        e_year, e_left = _series_emergence(y, r)
        region_out.append({
            "id": reg["id"], "name": reg["name"], "bbox": list(reg["bbox"]),
            "trend": _r(t, d), "p": _rp(s.p), "ci": [_r(s.ci_low * dec, d), _r(s.ci_high * dec, d)],
            "sig": bool(s.p < ALPHA), "meanValue": _r(mean_value, d),
            "trendPctOfMean": _r(100.0 * t / mean_value, 1) if spec["relative"] and mean_value > 0 else None,
            "cells": int(mask.sum()), "emergence": e_year, "yearsToDetect": e_left,
            "series": _series(r.months_iso, y, d),
        })

    ups = [x for x in region_out if x["trend"] is not None and x["trend"] > 0]
    downs = [x for x in region_out if x["trend"] is not None and x["trend"] < 0]
    pick = lambda x: {"regionId": x["id"], "name": x["name"], "trend": x["trend"]} if x else None  # noqa: E731
    sig_raw = np.isfinite(r.sig_by_window[-1]) & r.sig_by_window[-1]

    by_year = [{
        "year": int(yr),
        "pctSeen": _area_pct(r.sig_by_window[w], r),
        "pctSeenFdr": _area_pct(r.sig_fdr_by_window[w], r),
        "pctEmerged": _area_pct(np.isfinite(r.emergence) & (r.emergence <= yr), r),
        "pctEmergedFdr": _area_pct(np.isfinite(r.emergence_fdr) & (r.emergence_fdr <= yr), r),
    } for w, yr in enumerate(r.window_years)]
    pending = r.valid & ~np.isfinite(r.emergence)

    meta = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "pipelineVersion": "terratempo",
        "isDemo": is_demo,
        "source": DEMO_SOURCE if is_demo else spec["source"],
        "variable": {"id": atlas_id, "name": spec["name"], "unit": spec["unit"], "trendUnit": spec["trendUnit"],
                     "decimals": spec["decimals"], "coverage": spec["coverage"], "palette": atlas_id,
                     "copy": spec["copy"]},
        "period": {"start": r.months_iso[0][:7], "end": r.months_iso[-1][:7], "months": len(r.months_iso)},
        "grid": {"stepDeg": ds.grid.resolution, "nLat": int(r.lats.size), "nLon": int(r.lons.size),
                 "cells": len(cells)},
        "method": {"trend": "Theil-Sen", "test": "Mann-Kendall", "autocorrelationCorrection": "Hamed-Rao",
                   "alpha": ALPHA, "fdrAlpha": FDR_Q,
                   "anomalies": "valor menos a média do mesmo mês do calendário",
                   "areaWeighting": "cos(latitude)"},
        "emergence": {"minYears": MIN_YEARS, "maxHorizonYears": MAX_HORIZON_YEARS,
                      "chanceLevelPct": round(100 * ALPHA, 1), "byYear": by_year,
                      "pendingAreaPct": _area_pct(pending, r),
                      "pendingWithForecastPct": _area_pct(pending & np.isfinite(r.years_to_detect), r)},
        "highlights": {
            "regionIncrease": pick(max(ups, key=lambda x: x["trend"]) if ups else None),
            "regionDecrease": pick(min(downs, key=lambda x: x["trend"]) if downs else None),
            "significantAreaPct": _area_pct(sig_raw, r),
            "significantAreaPctFdr": _area_pct(r.sig_fdr, r),
            "globalTrend": {"trend": _r(g.slope * dec, d), "p": _rp(g.p),
                            "ci": [_r(g.ci_low * dec, d), _r(g.ci_high * dec, d)]},
        },
    }
    return {
        "grid_trend.json": cells,
        "series_global.json": _series(r.months_iso, global_anom, d),
        "regions.json": region_out,
        "meta.json": meta,
        "annual_anomaly.json": annual_anomalies(r, ds, spec["decimals"] + 1),
    }


def _write(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def write_manifest(out: Path) -> Path:
    """variables.json from every <variable>/meta.json on disk (real and demo side by side)."""
    order = ["temperature", "precipitation", "vegetation", "sea_ice", "aerosols", "sea_level"]
    entries = []
    for vid in order:
        mp = out / vid / "meta.json"
        if not mp.exists():
            continue
        m = json.loads(mp.read_text(encoding="utf-8"))
        e = m["emergence"]
        entries.append({
            "id": vid, "name": m["variable"]["name"], "unit": m["variable"]["unit"],
            "trendUnit": m["variable"]["trendUnit"], "decimals": m["variable"]["decimals"],
            "coverage": m["variable"]["coverage"], "isDemo": m["isDemo"], "source": m["source"]["name"],
            "globalTrend": m["highlights"]["globalTrend"]["trend"], "globalP": m["highlights"]["globalTrend"]["p"],
            "significantAreaPct": m["highlights"]["significantAreaPct"],
            "significantAreaPctFdr": m["highlights"]["significantAreaPctFdr"],
            "pendingAreaPct": e["pendingAreaPct"],
            "firstEmergenceYear": next((y["year"] for y in e["byYear"] if y["pctEmergedFdr"] >= 50), None),
            "chanceLevelPct": e["chanceLevelPct"],
        })
    path = out / "variables.json"
    _write(path, {"schemaVersion": SCHEMA_VERSION, "variables": entries})
    return path


def export_variable(ds: Dataset, out: Path, progress=None) -> Path:
    atlas_id = ATLAS_ID[ds.id]
    regions = json.loads((REGIONS_DIR / f"{atlas_id}.json").read_text(encoding="utf-8"))
    r = analyse_cube(ds, progress)
    folder = out / atlas_id
    folder.mkdir(parents=True, exist_ok=True)
    for name, payload in build_files(ds, atlas_id, r, regions).items():
        _write(folder / name, payload)
    return folder


def main() -> None:
    from .export import load_datasets

    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="../web/public/data")
    ap.add_argument("--include-synthetic", action="store_true")
    args = ap.parse_args()
    out = Path(args.out)
    for vid, ds in load_datasets().items():
        if vid not in ATLAS_ID or (ds.label == LABEL_DEMO and not args.include_synthetic):
            continue
        print(f"{vid} ({ds.label}) -> {out / ATLAS_ID[vid]}", flush=True)
        export_variable(ds, out, progress=lambda i, n: print(f"  {i}/{n}", end="\r", flush=True))
        print()
    write_manifest(out)


if __name__ == "__main__":
    main()
