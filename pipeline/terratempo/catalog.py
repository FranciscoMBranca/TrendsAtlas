"""Variable manifest (B03 / P11). Names and texts are keys; the site translates them."""

from __future__ import annotations

from . import LABEL_DEMO, SCHEMA_VERSION

# Candidate products come from docs/03-variaveis-e-dados.md and are NOT yet
# confirmed (P00). Until a real reader exists every variable is a labelled demo.
VARIABLES = {
    "temperatura": {
        "unidade": "degC",
        "produto_candidato": "MERRA-2 M2TMNXSLV (T2M)",
        "relativa": False,
        "camada": 1,
    },
    "precipitacao": {
        "unidade": "mm/day",
        "produto_candidato": "GPM IMERG GPM_3IMERGM v07",
        "relativa": True,
        "camada": 1,
    },
    "humidade": {
        "unidade": "g/kg",
        "produto_candidato": "MERRA-2 M2TMNXSLV (QV2M, a confirmar)",
        "relativa": True,
        "camada": 1,
    },
    "aerossois": {
        "unidade": "1",
        "produto_candidato": "MERRA-2 aerossóis ou MODIS Aqua MYD08_M3 (a confirmar, D13)",
        "relativa": True,
        "camada": 2,
    },
}

PRESETS = {
    "completo": None,
    "ultimos20": 20,
    "ultimos10": 10,
}


def manifest(datasets: dict) -> dict:
    """Build the manifest from loaded datasets (ids -> synthetic.Dataset)."""
    items = []
    for vid, ds in datasets.items():
        meta = VARIABLES[vid]
        items.append({
            "id": vid,
            "unidade": meta["unidade"],
            "fonte": ds.source,
            "produto_candidato": meta["produto_candidato"],
            "resolucao_graus": ds.grid.resolution,
            "periodo": {"inicio": int(ds.years.min()), "fim": int(ds.years.max())},
            "rotulo": ds.label,
            "camada": meta["camada"],
        })
    any_demo = any(i["rotulo"] == LABEL_DEMO for i in items)
    return {"schemaVersion": SCHEMA_VERSION, "contem_demonstracao": any_demo,
            "presets": list(PRESETS), "variaveis": items}
