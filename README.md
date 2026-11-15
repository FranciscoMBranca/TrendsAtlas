# Terra Tempo (TrendsAtlas)

**What is changing here, by how much, and is it more than noise?**

Terra Tempo is a "data detective" for Earth system trends, built for the NASA Space Apps challenge *Earth system trends*. You answer three questions (what, where, when) and get the series, the trend, two significance tests, a plain-language sentence and, when the trend is not yet significant, how many more years it would take to detect it *if the trend continues*.

> **Live:** https://trends-atlas.vercel.app (site) · https://trendsatlas-production.up.railway.app (API)
>
> **Status:** temperature and precipitation use **real NASA data** (2000–2025). Vegetation, sea ice,
> aerosols and sea level have working readers but still show synthetic data, labelled **DEMO** on every
> screen, until the "Dados NASA" workflow is run for them.

## What works now

| Area | Done | Plan IDs |
| --- | --- | --- |
| Pipeline (Python) | Monthly anomalies, cos(latitude) weighting, Theil-Sen, Mann-Kendall with Hamed-Rao, Sen CI, Benjamini-Hochberg, OLS + R² + t-test with lag-1 correction, "years until detectable", season trend (chosen months, one value per year), labelled synthetic generator, versioned export, 5° pre-computed maps | P05, P06 (5°), P07, P08, P10, P11, P22, P29, P34, P36 |
| API (FastAPI) | `/saude`, `/variaveis`, `/variaveis/{id}/serie`, `/variaveis/{id}/mapa`, `POST /regiao/analise` (globe, rectangle or GeoJSON polygon, period, optional months); returns keys, never sentences; CORS, rate limit, input validation | B01, B03, B04, B05, B08 (partial B10) |
| Website (Next.js + Leaflet) | 3-question detective flow, whole world / cell / rectangle, month shortcuts and custom months, result sentence, seal, p-value rule, chart with band, stats table, CSV export, interactive 5° map with preset periods and "significant only", PT/EN switch without reload, DEMO banner, degraded mode when the API is down | W01–W04, W06–W08, W20, W30, W32, W37, W38, W40 (partial W16, W17) |
| Automation | CI (pytest, vitest, typecheck, build, gitleaks), `CLAUDE.md`, agents in `.claude/agents/` | D01, D02, D04 |
| Home page (2026-11) | Audience modes (child, explorer, scientist) and five languages (pt, en, es, fr, zh); 3D globe painted with the real trend of each 5° cell; named places (242 countries, 8 oceans and seas); guided missions; one place across all six variables; year-by-year presentation mode | — |
| Validation shown on the site | `terratempo.validation` writes `validation.json`: shuffled years on the real data, false alarms on trend-free noise, projection band coverage, formulas against SciPy and pymannkendall. The site shows the full tables, including where the method falls short | — |
| Real NASA data | `Dados NASA` GitHub Actions workflow: downloads with Earthdata secrets, aggregates to 5° year by year, regenerates the site files and validation, opens a pull request | D06 |

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

Every variable comes from a public NASA product. Short names, versions and DOIs were checked in NASA's
CMR catalogue on 2026-11-15; the site lists them in its "Sources" section from `web/public/data/sources.json`.

| Variable | Product (short name) | Version | Field | DOI | On the site |
| --- | --- | --- | --- | --- | --- |
| Air temperature | MERRA-2 `M2TMNXSLV` | 5.12.4 | `T2M` | [10.5067/AP1B0BA5PD2K](https://doi.org/10.5067/AP1B0BA5PD2K) | real |
| Precipitation | GPM IMERG Final `GPM_3IMERGM` | 07 | `precipitation` | [10.5067/GPM/IMERG/3B-MONTH/07](https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07) | real |
| Vegetation (NDVI) | MODIS Terra `MOD13C2` | 061 | `CMG 0.05 Deg Monthly NDVI` | [10.5067/MODIS/MOD13C2.061](https://doi.org/10.5067/MODIS/MOD13C2.061) | demo until ingested |
| Sea ice | MERRA-2 `M2TMNXOCN` | 5.12.4 | `FRSEAICE` | [10.5067/4IASLIDL8EEC](https://doi.org/10.5067/4IASLIDL8EEC) | demo until ingested |
| Aerosols (AOD) | MERRA-2 `M2TMNXAER` | 5.12.4 | `TOTEXTTAU` | [10.5067/FH9A0MLJPC7N](https://doi.org/10.5067/FH9A0MLJPC7N) | demo until ingested |
| Sea level | NASA-SSH simple grid `NASA_SSH_REF_SIMPLE_GRID_V11` | 1.1 | `ssha` | [10.5067/NSREF-SG0V11](https://doi.org/10.5067/NSREF-SG0V11) | demo until ingested |

The older MEaSUREs sea level grids (JPL2205) are no longer in the catalogue; NASA-SSH v1.1 replaces them.
Other resources: borders and coastlines from Natural Earth; country names from `i18n-iso-countries` (ISO 3166).
