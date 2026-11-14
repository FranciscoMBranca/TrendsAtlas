# Terra Tempo (TrendsAtlas)

**What is changing here, by how much, and is it more than noise?**

Terra Tempo is a "data detective" for Earth system trends, built for the NASA Space Apps challenge *Earth system trends*. You answer three questions (what, where, when) and get the series, the trend, two significance tests, a plain-language sentence and, when the trend is not yet significant, how many more years it would take to detect it *if the trend continues*.

> ⚠️ **Status: early prototype. All data shown today is SYNTHETIC and labelled "DEMO" on every screen.** Real NASA readers (MERRA-2 temperature, GPM IMERG precipitation) are the next step (backlog P00, P02, P03).

## What works now

| Area | Done | Plan IDs |
| --- | --- | --- |
| Pipeline (Python) | Monthly anomalies, cos(latitude) weighting, Theil-Sen, Mann-Kendall with Hamed-Rao, Sen CI, Benjamini-Hochberg, OLS + R² + t-test with lag-1 correction, "years until detectable", season trend (chosen months, one value per year), labelled synthetic generator, versioned export, 5° pre-computed maps | P05, P06 (5°), P07, P08, P10, P11, P22, P29, P34, P36 |
| API (FastAPI) | `/saude`, `/variaveis`, `/variaveis/{id}/serie`, `/variaveis/{id}/mapa`, `POST /regiao/analise` (globe, rectangle or GeoJSON polygon, period, optional months); returns keys, never sentences; CORS, rate limit, input validation | B01, B03, B04, B05, B08 (partial B10) |
| Website (Next.js + Leaflet) | 3-question detective flow, whole world / cell / rectangle, month shortcuts and custom months, result sentence, seal, p-value rule, chart with band, stats table, CSV export, interactive 5° map with preset periods and "significant only", PT/EN switch without reload, DEMO banner, degraded mode when the API is down | W01–W04, W06–W08, W20, W30, W32, W37, W38, W40 (partial W16, W17) |
| Automation | CI (pytest, vitest, typecheck, build, gitleaks), `CLAUDE.md`, agents in `.claude/agents/` | D01, D02, D04 |

Formulas are documented in [docs/05-metodo-e-formulas.md](docs/05-metodo-e-formulas.md) and validated in tests against `scipy` and `pymannkendall`.

## Run locally

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -e "pipeline[dev]" -r api/requirements.txt httpx   # on Linux/macOS: .venv/bin/python
.venv/Scripts/python -m uvicorn app.main:app --app-dir api --port 8000
```

```bash
cd web
npm install
npm run dev        # http://localhost:3000 ; set NEXT_PUBLIC_API_URL if the API is elsewhere
```

Tests:

```bash
cd pipeline && ../.venv/Scripts/python -m pytest -q
cd api && ../.venv/Scripts/python -m pytest -q
cd web && npm test && npm run typecheck
```

Regenerate the static maps used by the site (and by degraded mode):

```bash
cd pipeline && ../.venv/Scripts/python -m terratempo.export --out ../web/public/data
```

## Repository layout

```
pipeline/   Python package `terratempo`: every formula lives here, once
api/        FastAPI app; imports the pipeline, never re-implements it
web/        Next.js site (Vercel); static maps in web/public/data
docs/       Plan: vision, decisions, method, architecture, roadmap, backlog
specs/      Specifications (SPEC-000 template and examples)
.claude/    Agent definitions for development with Claude Code
```

## Honesty rules

1. Demo data is always labelled; nothing is shown as real without proof.
2. We never explain causes: only where, how much, and whether it is significant.
3. Projections are conditional ("if the trend continues"), never climate forecasts.
4. Every number in a sentence comes from a computation.

## Data

Planned sources (not yet integrated, to be confirmed in P00): NASA MERRA-2 (`M2TMNXSLV`), GPM IMERG (`GPM_3IMERGM` v07), MERRA-2 aerosols or MODIS Aqua. Citations will be added when each reader is real. Base map © OpenStreetMap contributors.
