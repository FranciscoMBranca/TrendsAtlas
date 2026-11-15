"""Assistant (B11) without calling the model: a fake client replays tool calls."""

import json
from types import SimpleNamespace as NS

from fastapi.testclient import TestClient

from app import assistant
from app import main as api

client = TestClient(api.app)


class FakeClient:
    """Mimics client.beta.messages.create: returns the queued responses in order."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []
        self.beta = NS(messages=NS(create=self._create))

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        return self.responses.pop(0)


def tool_use(name, args, id_="t1"):
    return NS(stop_reason="tool_use", model=assistant.MODEL, content=[NS(type="tool_use", name=name, input=args, id=id_)])


def text(t):
    return NS(stop_reason="end_turn", model=assistant.MODEL, content=[NS(type="text", text=t)])


def test_tools_return_numbers_from_the_pipeline():
    tools = assistant.make_tools(api.DATASETS)
    assert tools["procurar_lugar"]({"nome": "Angola"})[0]["chave"] == "ago"
    r = tools["analisar_regiao"]({"variavel": "temperatura", "lugar": "globo"})
    assert r["rotulo"] in {"real", "demonstracao"} and r["sen_declive_por_decada"] is not None
    assert r["selo"] in {"significativa", "ainda_nao_significativa", "sem_tendencia_clara", "resultado_dividido"}
    bad = tools["analisar_regiao"]({"variavel": "temperatura", "lugar": "xyz"})
    assert bad["erro"] == "lugar_desconhecido"
    rank = tools["ranking_lugares"]({"variavel": "temperatura", "n": 3})
    assert len(rank["mais_sobem"]) == 3 and rank["mais_sobem"][0]["declive_por_decada"] >= rank["mais_descem"][0]["declive_por_decada"]


def test_loop_runs_tools_and_returns_the_final_text():
    fake = FakeClient([tool_use("analisar_regiao", {"variavel": "temperatura", "lugar": "ago"}), text("Em Angola a temperatura sobe.")])
    out = assistant.answer(fake, api.DATASETS, [{"role": "user", "content": "Angola aquece?"}], "pt", "explorador", "temperature")
    assert out["resposta"] == "Em Angola a temperatura sobe." and out["ferramentas"] == ["analisar_regiao"]
    second = fake.calls[1]
    result = second["messages"][-1]["content"][0]
    assert result["type"] == "tool_result" and "sen_declive_por_decada" in json.loads(result["content"])
    assert "Portuguese" in second["system"] and "temperatura" in second["system"]
    assert second["model"] == assistant.MODEL and second["fallbacks"] == "default"


def test_rules_are_in_the_system_prompt():
    s = assistant.system_prompt("en", "crianca", None)
    assert "Never explain causes" in s and "not a climate forecast" in s and "child" in s and "English" in s


def test_route_is_503_without_api_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    r = client.post("/assistente/pergunta", json={"mensagens": [{"role": "user", "content": "olá"}]})
    assert r.status_code == 503 and r.json()["detail"]["chave"] == "erro.assistente_indisponivel"


def test_route_answers_with_a_fake_model(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    fake = FakeClient([tool_use("listar_variaveis", {}), text("Há temperatura, precipitação e humidade.")])
    monkeypatch.setattr(api, "_anthropic_client", lambda: fake)
    r = client.post("/assistente/pergunta", json={"mensagens": [{"role": "user", "content": "Que dados há?"}], "idioma": "pt"})
    assert r.status_code == 200, r.text
    assert r.json()["ferramentas"] == ["listar_variaveis"]


def test_refusal_is_not_shown_as_an_answer(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    fake = FakeClient([NS(stop_reason="refusal", model=assistant.MODEL, content=[])])
    monkeypatch.setattr(api, "_anthropic_client", lambda: fake)
    r = client.post("/assistente/pergunta", json={"mensagens": [{"role": "user", "content": "x"}]})
    assert r.status_code == 502


def test_status_route_follows_the_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    assert client.get("/assistente/estado").json() == {"disponivel": False}
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    assert client.get("/assistente/estado").json() == {"disponivel": True}
