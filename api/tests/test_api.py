import numpy as np
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/saude").json()["estado"] == "ok"


def test_manifest_marks_demo():
    m = client.get("/variaveis").json()
    assert m["schemaVersion"]
    assert m["contem_demonstracao"] is True
    assert {v["id"] for v in m["variaveis"]} >= {"temperatura", "precipitacao"}


def test_world_analysis_matches_global_series():
    r = client.post("/regiao/analise", json={"variavel": "temperatura", "regiao": {"tipo": "globo"}})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["rotulo"] == "demonstracao"
    g = client.get("/variaveis/temperatura/serie").json()
    assert np.allclose([p["anomalia"] for p in body["serie"]], g["anomalia"], atol=1e-3)
    assert body["selo"] in {"significativa", "ainda_nao_significativa", "sem_tendencia_clara",
                            "resultado_dividido"}
    assert body["regra_valor_p"] == 0.05


def test_rectangle_with_months():
    r = client.post("/regiao/analise", json={
        "variavel": "aerossois",
        "regiao": {"tipo": "rectangulo", "oeste": -95, "sul": 40, "este": -85, "norte": 50},
        "meses": [6, 7, 8],
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["passo"] == "ano" and body["meses"] == [6, 7, 8]


def test_short_period_error_key():
    r = client.post("/regiao/analise", json={"variavel": "temperatura", "regiao": {"tipo": "globo"},
                                             "inicio": 2018, "fim": 2024})
    assert r.status_code == 422
    assert r.json()["detail"]["chave"] == "erro.periodo_curto"


def test_unknown_variable():
    r = client.post("/regiao/analise", json={"variavel": "xpto", "regiao": {"tipo": "globo"}})
    assert r.status_code == 404


def test_invalid_months_rejected():
    r = client.post("/regiao/analise", json={"variavel": "temperatura", "regiao": {"tipo": "globo"},
                                             "meses": [13]})
    assert r.status_code == 422


def test_polygon():
    ring = [[10, -18], [24, -18], [24, -5], [10, -5], [10, -18]]
    r = client.post("/regiao/analise", json={"variavel": "precipitacao",
                                             "regiao": {"tipo": "poligono", "coordenadas": [ring]}})
    assert r.status_code == 200, r.text
    assert r.json()["regiao"]["n_celulas"] > 1
