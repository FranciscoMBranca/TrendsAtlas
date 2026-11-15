"""Evidence that the atlas numbers can be trusted, written to validation.json for the site.

Every number in the file is computed here, from simulations with a known answer, from
reference libraries, or from the real cubes. Nothing is typed by hand.

1. Reference checks: our formulas against SciPy (and pymannkendall when installed).
2. False alarms on pure red noise (no trend): how often each test says "significant".
3. Projection band coverage in simulations where the true line is known.
4. Shuffled years on the REAL cubes: with the years in random order any trend is destroyed,
   so the significant area that remains is what chance alone produces.

Usage: python -m terratempo.validation --out ../web/public/data [--shuffles 10]
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from scipy import stats

from . import trend
from .anomaly import cos_lat_weights, monthly_anomaly
from .atlas import ALPHA, ATLAS_ID, MIN_VALID_FRACTION, trim_empty_edges
from .export import CUBES_DIR
from .projection import project
from .readers import load_cube

SCHEMA_VERSION = 1


def _ar1(n: int, phi: float, sd: float, rng: np.random.Generator) -> np.ndarray:
    e = rng.normal(0, sd * np.sqrt(1 - phi**2), n)
    x = np.empty(n)
    x[0] = rng.normal(0, sd)
    for k in range(1, n):
        x[k] = phi * x[k - 1] + e[k]
    return x


def _rel(a: float, b: float) -> float:
    return abs(a - b) / max(abs(b), 1e-300)


def reference_checks(cases: int = 50, seed: int = 1) -> list[dict[str, Any]]:
    """Largest relative difference between our formulas and the reference libraries."""
    rng = np.random.default_rng(seed)
    worst = {"theil_sen": 0.0, "sen_ci": 0.0, "linear": 0.0, "fdr": 0.0, "mk": 0.0, "hamed_rao": 0.0}
    try:
        import pymannkendall as pmk
    except ImportError:  # optional: only in the dev extra
        pmk = None
    hr_cases = 0
    for _ in range(cases):
        n = int(rng.integers(120, 313))
        y = 0.004 * np.arange(n) + _ar1(n, 0.5, 1.0, rng)
        s, _ = trend.theil_sen(y)
        ref = stats.theilslopes(y, alpha=0.95)
        worst["theil_sen"] = max(worst["theil_sen"], _rel(s, ref.slope))
        mk0 = trend.mann_kendall(y, hamed_rao=False)
        lo, hi = trend.sen_confidence_interval(y, mk0.var_s)
        worst["sen_ci"] = max(worst["sen_ci"], _rel(lo, ref.low_slope), _rel(hi, ref.high_slope))
        lt = trend.linear_trend(y, autocorrelation=False)
        lr = stats.linregress(np.arange(n), y)
        worst["linear"] = max(worst["linear"], _rel(lt.slope, lr.slope), _rel(lt.p, lr.pvalue))
        p = rng.uniform(size=500) ** 3
        worst["fdr"] = max(worst["fdr"], float(np.mean(trend.benjamini_hochberg(p, 0.10) != (stats.false_discovery_control(p) <= 0.10))))
        if pmk is not None:
            worst["mk"] = max(worst["mk"], _rel(mk0.p, pmk.original_test(y).p))
            ref_hr = pmk.hamed_rao_modification_test(y)
            if ref_hr.var_s / pmk.original_test(y).var_s >= 1:  # pymannkendall lets the factor drop below 1; we do not
                hr_cases += 1
                worst["hamed_rao"] = max(worst["hamed_rao"], _rel(trend.mann_kendall(y).p, ref_hr.p))
    out = [
        {"id": "theil_sen", "reference": "scipy.stats.theilslopes", "cases": cases, "maxRelDiff": worst["theil_sen"]},
        {"id": "sen_ci", "reference": "scipy.stats.theilslopes (95 %)", "cases": cases, "maxRelDiff": worst["sen_ci"]},
        {"id": "linear", "reference": "scipy.stats.linregress", "cases": cases, "maxRelDiff": worst["linear"]},
        {"id": "fdr", "reference": "scipy.stats.false_discovery_control", "cases": cases, "maxRelDiff": worst["fdr"]},
    ]
    if pmk is not None:
        out.append({"id": "mk", "reference": "pymannkendall.original_test", "cases": cases, "maxRelDiff": worst["mk"]})
        out.append({"id": "hamed_rao", "reference": "pymannkendall.hamed_rao_modification_test", "cases": hr_cases, "maxRelDiff": worst["hamed_rao"]})
    return out


def false_alarms(sims: int = 400, n: int = 312, seed: int = 7) -> list[dict[str, Any]]:
    """Share of trend-free red-noise series called significant (the target is 5 %)."""
    out = []
    for phi in (0.0, 0.3, 0.6):
        rng = np.random.default_rng(seed)
        naive = corrected = 0
        for _ in range(sims):
            y = _ar1(n, phi, 1.0, rng)
            naive += trend.mann_kendall(y, hamed_rao=False).p < ALPHA
            corrected += trend.mann_kendall(y, hamed_rao=True).p < ALPHA
        out.append({"phi": phi, "sims": sims, "months": n, "naivePct": round(100 * naive / sims, 1),
                    "correctedPct": round(100 * corrected / sims, 1)})
    return out


def projection_coverage(sims: int = 400, seed: int = 42) -> list[dict[str, Any]]:
    """How often the true line value at the last projected year falls inside the 95 % band."""
    out = []
    n, slope = 288, 0.002
    t = np.arange(float(n))
    for phi in (0.0, 0.5):
        rng = np.random.default_rng(seed)
        hits = 0
        horizon = 0
        for _ in range(sims):
            p = project(slope * t + _ar1(n, phi, 0.3, rng), t, 12, 2024)
            last = p["pontos"][-1]
            horizon = p["horizonte_anos"]
            truth = slope * (t[-1] + 12 * horizon)
            hits += last["inferior"] <= truth <= last["superior"]
        out.append({"phi": phi, "sims": sims, "horizonYears": horizon, "coveragePct": round(100 * hits / sims, 2)})
    return out


def _sig_area_pct(anoms: np.ndarray, valid: np.ndarray, w: np.ndarray) -> float:
    sig = np.zeros(valid.shape, dtype=bool)
    for i, j in zip(*np.nonzero(valid)):
        sig[i, j] = trend.mann_kendall(anoms[:, i, j], hamed_rao=True).p < ALPHA
    return 100.0 * float(w[sig].sum()) / float(w[valid].sum())


def shuffled_years(var_id: str, shuffles: int = 10, seed: int = 11, progress=None) -> dict[str, Any] | None:
    """Real cube vs the same cube with whole years in random order (complete years only)."""
    path = CUBES_DIR / f"{var_id}.npz"
    if not path.exists():
        return None
    ds = load_cube(path)
    values, years, months = trim_empty_edges(ds)
    first = int(np.flatnonzero(months == 1)[0])
    n_years = (len(months) - first) // 12
    sl = slice(first, first + n_years * 12)
    values, years, months = values[sl], years[sl], months[sl]
    anoms = monthly_anomaly(values, months)
    valid = np.isfinite(anoms).sum(axis=0) >= MIN_VALID_FRACTION * anoms.shape[0]
    w = np.broadcast_to(cos_lat_weights(ds.grid.lats)[:, None], valid.shape)
    real = _sig_area_pct(anoms, valid, w)
    rng = np.random.default_rng(seed)
    blocks = anoms.reshape(n_years, 12, *anoms.shape[1:])
    shuffled = []
    for k in range(shuffles):
        order = rng.permutation(n_years)
        shuffled.append(_sig_area_pct(blocks[order].reshape(anoms.shape), valid, w))
        if progress:
            progress(var_id, k + 1, shuffles)
    return {
        "variable": ATLAS_ID[var_id],
        "period": {"start": f"{int(years[0])}-01", "end": f"{int(years[-1])}-12"},
        "realPct": round(real, 1),
        "shuffledMeanPct": round(float(np.mean(shuffled)), 1),
        "shuffledMaxPct": round(float(np.max(shuffled)), 1),
        "shuffles": shuffles,
    }


def build(shuffles: int = 10, progress=None) -> dict[str, Any]:
    real = []
    for vid in ATLAS_ID:
        r = shuffled_years(vid, shuffles, progress=progress)
        if r is not None and load_cube(CUBES_DIR / f"{vid}.npz").label == "real":
            real.append(r)
    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "alphaPct": round(100 * ALPHA, 1),
        "references": reference_checks(),
        "falseAlarms": false_alarms(),
        "projection": projection_coverage(),
        "shuffledYears": real,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", required=True)
    ap.add_argument("--shuffles", type=int, default=10)
    a = ap.parse_args()
    payload = build(a.shuffles, progress=lambda v, k, n: print(f"{v}: baralhado {k}/{n}", flush=True))
    out = Path(a.out) / "validation.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"escrito {out}")


if __name__ == "__main__":
    main()
