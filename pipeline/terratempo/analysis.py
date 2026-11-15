"""Region analysis chain (SPEC-101, SPEC-102): anomalies -> trend tests -> seal.

The output contains numbers and message keys only, never sentences
(the site translates keys with its catalogue, SPEC-140).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from . import emergence, projection, seasonal, trend
from .anomaly import monthly_anomaly

MIN_YEARS = 10
FEW_POINTS_YEARS = 15  # SPEC-102 point 8 (proposal, to be fixed by the team)
# Above this many missing years the seal says "no clear trend" instead of
# "not yet significant". Proposal, to be approved by the Science owner.
MAX_YEARS_REMAINING = 50
P_RULE = trend.ALPHA

SEALS = ("significativa", "ainda_nao_significativa", "sem_tendencia_clara",
         "dados_insuficientes", "resultado_dividido")


class AnalysisError(ValueError):
    """Raised with a message key (e.g. ``periodo_curto``) when no result can be given."""

    def __init__(self, key: str, **params):
        super().__init__(key)
        self.key = key
        self.params = params


@dataclass
class Series:
    """A monthly series (raw values, not anomalies) with its calendar."""

    values: np.ndarray
    years: np.ndarray
    months: np.ndarray


def _finite(x: float) -> float | None:
    return float(x) if x is not None and math.isfinite(x) else None


def _seal(p_mk: float, p_t: float, years_left: int | None) -> str:
    mk_sig = p_mk < P_RULE
    t_sig = p_t < P_RULE
    if mk_sig and t_sig:
        return "significativa"
    if mk_sig != t_sig:
        return "resultado_dividido"
    if years_left is None or years_left > MAX_YEARS_REMAINING:
        return "sem_tendencia_clara"
    return "ainda_nao_significativa"


def analyse(series: Series, months: list[int] | None = None,
            start_year: int | None = None, end_year: int | None = None) -> dict:
    """Run the full chain of formulas 1, 3-6, 9, 13, 14 and 17 on one series."""
    years = np.asarray(series.years)
    mons = np.asarray(series.months)
    vals = np.asarray(series.values, dtype=float)
    sel = np.ones(years.shape, dtype=bool)
    if start_year is not None:
        sel &= years >= start_year
    if end_year is not None:
        sel &= years <= end_year
    years, mons, vals = years[sel], mons[sel], vals[sel]
    if years.size == 0:
        raise AnalysisError("periodo_sem_dados")
    if end_year is not None and start_year is not None and end_year - start_year + 1 < MIN_YEARS:
        raise AnalysisError("periodo_curto", minimo=MIN_YEARS)

    chosen = seasonal.normalise_months(months)
    anomalies = monthly_anomaly(vals, mons)  # always over all months first (SPEC-102 p.1)

    excluded: list[dict] = []
    if chosen is None:
        ok = np.isfinite(anomalies)
        y = anomalies
        t = np.arange(y.size, dtype=float)
        steps_per_year = 12
        n_years = float(ok.sum()) / 12.0
        labels = [f"{int(a):04d}-{int(b):02d}" for a, b in zip(years, mons)]
    else:
        ss = seasonal.seasonal_series(anomalies, years, mons, chosen)
        y = ss.values
        t = ss.years.astype(float)
        steps_per_year = 1
        n_years = float(y.size)
        excluded = ss.excluded
        labels = [str(int(a)) for a in ss.years]

    if n_years < MIN_YEARS:
        raise AnalysisError("periodo_curto", minimo=MIN_YEARS)

    per_decade = 10 * steps_per_year
    slope, intercept = trend.theil_sen(y, t)
    mk = trend.mann_kendall(y, hamed_rao=True)
    ci_lo, ci_hi = trend.sen_confidence_interval(y, mk.var_s, t=t)
    lin = trend.linear_trend(y, t)

    ok = np.isfinite(y)
    res = y[ok] - (intercept + slope * t[ok])
    sigma = float(np.std(res, ddof=2)) if res.size > 2 else float("nan")
    n_steps = int(ok.sum())
    sig_both = mk.p < P_RULE and lin.p < P_RULE
    years_left = None
    if not sig_both:
        years_left = emergence.years_remaining(slope, sigma, mk.f, n_steps, steps_per_year)
    seal = _seal(mk.p, lin.p, years_left)

    direction = "sobe" if slope > 0 else ("desce" if slope < 0 else "estavel")

    # SPEC-120: conditional projection, hidden unless the trend is significant.
    if seal == "significativa":
        last_year = int(t[ok][-1]) if steps_per_year == 1 else int(years.max())
        proj = projection.project(y, t, steps_per_year, last_year)
        for pt in [proj["inicio"], *proj["pontos"]]:
            for k in ("centro", "inferior", "superior"):
                pt[k] = _finite(pt[k])
    else:
        proj = {"condicional": True, "aviso_chave": projection.NOTICE_KEY, "disponivel": False,
                "motivo": "nao_significativa", "pontos": []}
    tc = float(np.nanmean(t[ok]))
    yc = intercept + slope * tc
    line = [_finite(intercept + slope * ti) for ti in t]
    band_lo = [_finite(yc + ci_lo * (ti - tc)) if ti >= tc else _finite(yc + ci_hi * (ti - tc)) for ti in t]
    band_hi = [_finite(yc + ci_hi * (ti - tc)) if ti >= tc else _finite(yc + ci_lo * (ti - tc)) for ti in t]

    return {
        "meses": list(chosen) if chosen else None,
        "passo": "ano" if steps_per_year == 1 else "mes",
        "n_pontos": n_steps,
        "n_anos": int(round(n_years)) if steps_per_year == 1 else round(n_years, 2),
        "anos_excluidos": excluded,
        "aviso_poucos_pontos": bool(steps_per_year == 1 and n_years < FEW_POINTS_YEARS),
        "periodo": {"inicio": int(years.min()), "fim": int(years.max())},
        "serie": [{"t": lab, "anomalia": _finite(v)} for lab, v in zip(labels, y)],
        "tendencia_linha": line,
        "banda_inferior": band_lo,
        "banda_superior": band_hi,
        "estatisticas": {
            "sen_declive_decada": _finite(slope * per_decade),
            "sen_ic_inferior_decada": _finite(ci_lo * per_decade),
            "sen_ic_superior_decada": _finite(ci_hi * per_decade),
            "ols_declive_decada": _finite(lin.slope * per_decade),
            "ols_ic_inferior_decada": _finite(lin.ci_low * per_decade),
            "ols_ic_superior_decada": _finite(lin.ci_high * per_decade),
            "r2": _finite(lin.r2),
            "p_mann_kendall": _finite(mk.p),
            "p_teste_t": _finite(lin.p),
            "z_mann_kendall": _finite(mk.z),
            "factor_hamed_rao": _finite(mk.f),
            "n_efectivo": _finite(lin.n_eff),
            "rho1": _finite(lin.rho1),
        },
        "selo": seal,
        "regra_valor_p": P_RULE,
        "quanto_falta_anos": years_left if seal == "ainda_nao_significativa" else None,
        "projeccao": proj,
        "frase": {
            "chave": f"frase.{seal}.{direction}",
            "parametros": {
                "declive_decada": _finite(slope * per_decade),
                "meses": list(chosen) if chosen else None,
                "anos": years_left if seal == "ainda_nao_significativa" else None,
            },
        },
    }
