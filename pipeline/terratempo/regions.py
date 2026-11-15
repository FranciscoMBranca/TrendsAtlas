"""Turn a region request (globe, bbox, GeoJSON polygon) into an area-weighted series (F3)."""

from __future__ import annotations

import numpy as np

from .analysis import Series
from .anomaly import weighted_mean
from . import places
from .grid import bbox_to_ring, polygon_mask
from .synthetic import Dataset

MAX_VERTICES = 2000


def region_series(ds: Dataset, region: dict) -> tuple[Series, dict]:
    """Return the region's mean series and info flags.

    ``region`` is one of:
      {"tipo": "globo"}
      {"tipo": "rectangulo", "oeste": .., "sul": .., "este": .., "norte": ..}
      {"tipo": "poligono", "coordenadas": [[[lon, lat], ...], ...]}  (GeoJSON Polygon)
      {"tipo": "lugar", "chave": "ago"}  (a country by ISO 3166 alpha-3, or an ocean key)
    """
    kind = region.get("tipo")
    small = False
    if kind == "globo":
        mask = None
    elif kind == "rectangulo":
        w, s, e, n = (float(region[k]) for k in ("oeste", "sul", "este", "norte"))
        if not (-90 <= s < n <= 90) or not (-180 <= w < e <= 180):
            raise ValueError("rectangulo_invalido")
        mask, small = polygon_mask(ds.grid, [bbox_to_ring(w, s, e, n)])
    elif kind == "poligono":
        rings = region.get("coordenadas") or []
        if not rings or len(rings[0]) < 4:
            raise ValueError("poligono_invalido")
        if sum(len(r) for r in rings) > MAX_VERTICES:
            raise ValueError("poligono_grande")
        mask, small = polygon_mask(ds.grid, rings)
    elif kind == "lugar":
        mask, small = places.mask(ds.grid, str(region.get("chave", "")))
    else:
        raise ValueError("regiao_invalida")
    values = weighted_mean(ds.cube, ds.grid.lats, mask)
    n_cells = int(np.prod(ds.grid.shape)) if mask is None else int(mask.sum())
    info = {
        "tipo": kind,
        "n_celulas": n_cells,
        "resolucao_graus": ds.grid.resolution,
        "menor_que_resolucao": bool(small),
    }
    if kind == "lugar":
        info["lugar"] = region.get("chave")
    return Series(values, ds.years, ds.months), info
