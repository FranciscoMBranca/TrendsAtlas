"""P34: pre-computed 5° trend maps (Sen slope per decade + Hamed-Rao MK + FDR q=0.10)."""

from __future__ import annotations

import numpy as np

from . import SCHEMA_VERSION, trend
from .anomaly import monthly_anomaly
from .catalog import PRESETS
from .synthetic import Dataset

FDR_Q = 0.10


def preset_years(ds: Dataset, preset: str) -> tuple[int, int]:
    if preset not in PRESETS:
        raise KeyError(preset)
    end = int(ds.years.max())
    span = PRESETS[preset]
    start = int(ds.years.min()) if span is None else max(int(ds.years.min()), end - span + 1)
    return start, end


def trend_map(ds: Dataset, start: int, end: int) -> dict:
    sel = (ds.years >= start) & (ds.years <= end)
    cube = ds.cube[sel].astype(float)
    anom = monthly_anomaly(cube, ds.months[sel])
    nlat, nlon = ds.grid.shape
    slope = np.full((nlat, nlon), np.nan)
    pval = np.full((nlat, nlon), np.nan)
    for i in range(nlat):
        for j in range(nlon):
            y = anom[:, i, j]
            if np.isfinite(y).sum() < 120:
                continue
            s, _ = trend.theil_sen(y)
            slope[i, j] = s * 120
            pval[i, j] = trend.mann_kendall(y, hamed_rao=True).p
    sig = trend.benjamini_hochberg(pval, FDR_Q)

    def r(a, nd):
        return [[None if not np.isfinite(v) else round(float(v), nd) for v in row] for row in a]

    return {
        "schemaVersion": SCHEMA_VERSION,
        "variavel": ds.id,
        "unidade": ds.unit,
        "rotulo": ds.label,
        "periodo": {"inicio": start, "fim": end},
        "resolucao_graus": ds.grid.resolution,
        "lats": [float(v) for v in ds.grid.lats],
        "lons": [float(v) for v in ds.grid.lons],
        "fdr_q": FDR_Q,
        "declive_decada": r(slope, 4),
        "p": r(pval, 4),
        "significativa": sig.astype(int).tolist(),
    }
