"""Terra Tempo API (B01, B03, B04, B05, B08).

Read-only, computes region analyses on request by importing the pipeline
package. Returns numbers and message keys, never sentences (SPEC-140).
"""

from __future__ import annotations

import os
import threading
import time
from collections import defaultdict, deque
from functools import lru_cache
from typing import Literal

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, model_validator

from terratempo import SCHEMA_VERSION
from terratempo.analysis import AnalysisError, analyse
from terratempo.anomaly import monthly_anomaly, weighted_mean
from terratempo.catalog import PRESETS, manifest
from terratempo.export import load_datasets
from terratempo.maps import preset_years, trend_map
from terratempo.regions import MAX_VERTICES, region_series

def _env(name: str, default: str = "") -> str:
    """Env value without surrounding spaces or quotes (dashboards often keep the quotes)."""
    return (os.getenv(name) or default).strip().strip("\"'").strip()


def parse_origins(raw: str) -> list[str]:
    """Comma-separated origins. An origin is scheme://host[:port]: no path, no trailing slash."""
    out = []
    for item in raw.split(","):
        item = item.strip().strip("\"'").strip().rstrip("/")
        if item:
            out.append(item)
    return out


ALLOWED_ORIGINS = parse_origins(_env("ALLOWED_ORIGINS", "http://localhost:3000"))
# Optional ONE regex for preview deployments, e.g. ^https://trends-atlas-[a-z0-9-]+\.vercel\.app$
ALLOWED_ORIGIN_REGEX = _env("ALLOWED_ORIGIN_REGEX") or None
RATE_LIMIT_PER_MIN = int(_env("RATE_LIMIT_PER_MIN", "60") or "60")

app = FastAPI(title="Terra Tempo API", version=SCHEMA_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

DATASETS = load_datasets()
_heavy = threading.Semaphore(2)  # 2 vCPU per instance (docs/04)
_hits: dict[str, deque] = defaultdict(deque)


def _error(status: int, key: str, **params) -> HTTPException:
    return HTTPException(status_code=status, detail={"chave": f"erro.{key}", "parametros": params})


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    if request.method == "POST":
        ip = request.client.host if request.client else "?"
        now = time.monotonic()
        q = _hits[ip]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= RATE_LIMIT_PER_MIN:
            return JSONResponse(status_code=429, content={"detail": {"chave": "erro.muitos_pedidos", "parametros": {}}})
        q.append(now)
    return await call_next(request)


def _dataset(var_id: str):
    ds = DATASETS.get(var_id)
    if ds is None:
        raise _error(404, "variavel_desconhecida", variavel=var_id)
    return ds


@app.get("/saude")
def health():
    return {"estado": "ok", "schemaVersion": SCHEMA_VERSION}


@app.get("/variaveis")
def variables():
    return manifest(DATASETS)


@app.get("/variaveis/{var_id}/serie")
def global_series(var_id: str):
    ds = _dataset(var_id)
    g = monthly_anomaly(weighted_mean(ds.cube, ds.grid.lats), ds.months)
    return {
        "schemaVersion": SCHEMA_VERSION, "variavel": var_id, "rotulo": ds.label, "unidade": ds.unit,
        "t": [f"{y:04d}-{m:02d}" for y, m in zip(ds.years, ds.months)],
        "anomalia": [round(float(v), 4) for v in g],
    }


@lru_cache(maxsize=32)
def _cached_map(var_id: str, preset: str) -> dict:
    ds = DATASETS[var_id]
    start, end = preset_years(ds, preset)
    data = trend_map(ds, start, end)
    data["preset"] = preset
    return data


@app.get("/variaveis/{var_id}/mapa")
def trend_map_route(var_id: str, preset: str = "completo"):
    _dataset(var_id)
    if preset not in PRESETS:
        raise _error(422, "preset_invalido", preset=preset)
    with _heavy:
        return _cached_map(var_id, preset)


class Region(BaseModel):
    tipo: Literal["globo", "rectangulo", "poligono"]
    oeste: float | None = Field(default=None, ge=-180, le=180)
    sul: float | None = Field(default=None, ge=-90, le=90)
    este: float | None = Field(default=None, ge=-180, le=180)
    norte: float | None = Field(default=None, ge=-90, le=90)
    coordenadas: list[list[list[float]]] | None = None

    @model_validator(mode="after")
    def check(self):
        if self.tipo == "rectangulo" and None in (self.oeste, self.sul, self.este, self.norte):
            raise ValueError("rectangulo_incompleto")
        if self.tipo == "poligono":
            if not self.coordenadas:
                raise ValueError("poligono_incompleto")
            if sum(len(r) for r in self.coordenadas) > MAX_VERTICES:
                raise ValueError("poligono_grande")
        return self


class AnalysisRequest(BaseModel):
    variavel: str
    regiao: Region
    inicio: int | None = Field(default=None, ge=1950, le=2100)
    fim: int | None = Field(default=None, ge=1950, le=2100)
    meses: list[int] | None = Field(default=None, min_length=1, max_length=12)


@app.post("/regiao/analise")
def region_analysis(req: AnalysisRequest):
    ds = _dataset(req.variavel)
    if req.inicio is not None and req.fim is not None and req.fim < req.inicio:
        raise _error(422, "periodo_invertido")
    try:
        series, info = region_series(ds, req.regiao.model_dump(exclude_none=True))
        with _heavy:
            result = analyse(series, months=req.meses, start_year=req.inicio, end_year=req.fim)
    except AnalysisError as e:
        raise _error(422, e.key, **e.params) from None
    except ValueError as e:
        raise _error(422, str(e)) from None
    if not np.isfinite(series.values).any():
        raise _error(422, "regiao_sem_dados")
    return {
        "schemaVersion": SCHEMA_VERSION,
        "variavel": ds.id,
        "unidade": ds.unit,
        "rotulo": ds.label,
        "regiao": info,
        **result,
    }
