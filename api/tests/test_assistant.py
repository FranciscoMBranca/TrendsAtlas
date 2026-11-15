"""Assistant (B11) without calling a real model: a fake chat-completions client replays answers."""

import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app import assistant, llm
from app import main as api

client = TestClient(api.app)
KEYS = ("AI_PROVIDER", "AI_MODEL", "GROQ_API_KEY", "OPENROUTER_API_KEY")


@pytest.fixture(autouse=True)
def no_keys(monkeypatch):
    for k in KEYS:
        monkeypatch.delenv(k, raising=False)
    api._chat_client.cache_clear()


class FakeClient:
    """Mimics llm.ChatClient.complete: returns the queued assistant messages in order."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def complete(self, messages, tools):
        self.calls.append({"messages": [dict(m) for m in messages], "tools": tools})
        return self.responses.pop(0)


def tool_call(name, args, id_="c1"):
    return {"role": "assistant", "content": None, "_finish": "tool_calls", "_model": "fake",
            "tool_calls": [{"id": id_, "type": "function", "function": {"name": name, "arguments": json.dumps(args)}}]}


def text(t):
    return {"role": "assistant", "content": t, "_finish": "stop", "_model": "fake"}


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


def test_tools_use_the_chat_completions_format():
    for t in assistant.TOOLS:
        assert t["type"] == "function" and t["function"]["parameters"]["type"] == "object"
    assert {t["function"]["name"] for t in assistant.TOOLS} == {"listar_variaveis", "procurar_lugar", "analisar_regiao", "ranking_lugares"}


def test_loop_runs_tools_and_returns_the_final_text():
    fake = FakeClient([tool_call("analisar_regiao", {"variavel": "temperatura", "lugar": "ago"}), text("Em Angola a temperatura sobe.")])
    out = assistant.answer(fake, api.DATASETS, [{"role": "user", "content": "Angola aquece?"}], "pt", "explorador", "temperature")
    assert out["resposta"] == "Em Angola a temperatura sobe." and out["ferramentas"] == ["analisar_regiao"]
    second = fake.calls[1]["messages"]
    assert second[0]["role"] == "system" and "Portuguese" in second[0]["content"] and "temperatura" in second[0]["content"]
    assert second[-2]["role"] == "assistant" and second[-2]["tool_calls"][0]["id"] == "c1"
    result = second[-1]
    assert result["role"] == "tool" and result["tool_call_id"] == "c1"
    assert "sen_declive_por_decada" in json.loads(result["content"])


def test_bad_tool_arguments_go_back_to_the_model_as_an_error():
    bad = tool_call("analisar_regiao", {})
    bad["tool_calls"][0]["function"]["arguments"] = "{not json"
    fake = FakeClient([bad, text("Não consegui analisar.")])
    out = assistant.answer(fake, api.DATASETS, [{"role": "user", "content": "x"}], "pt", "explorador", None)
    assert out["resposta"] == "Não consegui analisar."
    assert "erro" in json.loads(fake.calls[1]["messages"][-1]["content"])


def test_rules_are_in_the_system_prompt():
    s = assistant.system_prompt("en", "crianca", None)
    assert "Never explain causes" in s and "not a climate forecast" in s and "child" in s and "English" in s


def test_provider_choice_follows_the_keys(monkeypatch):
    assert llm.pick_provider() is None
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    assert llm.pick_provider().id == "openrouter"
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    assert llm.pick_provider().id == "groq"  # Groq first when both are set
    monkeypatch.setenv("AI_PROVIDER", "openrouter")
    assert llm.pick_provider().id == "openrouter"
    monkeypatch.setenv("AI_PROVIDER", "groq")
    monkeypatch.delenv("GROQ_API_KEY")
    assert llm.pick_provider() is None  # asked for Groq, but no Groq key


def test_client_sends_the_chat_completions_request(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers.get("authorization")
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={"model": "m", "choices": [{"finish_reason": "stop", "message": {"role": "assistant", "content": "ok"}}]})

    c = llm.ChatClient(llm.PROVIDERS["groq"])
    c._http = httpx.Client(transport=httpx.MockTransport(handler))
    msg = c.complete([{"role": "user", "content": "x"}], assistant.TOOLS)
    assert seen["url"] == "https://api.groq.com/openai/v1/chat/completions" and seen["auth"] == "Bearer test-key"
    assert seen["body"]["model"] == "openai/gpt-oss-120b" and seen["body"]["tools"] == assistant.TOOLS
    assert msg["content"] == "ok" and msg["_finish"] == "stop"


def test_client_maps_429_and_errors(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    for status, exc in ((429, llm.RateLimited), (500, llm.ProviderError)):
        c = llm.ChatClient(llm.PROVIDERS["openrouter"])
        c._http = httpx.Client(transport=httpx.MockTransport(lambda r, s=status: httpx.Response(s, json={})))
        with pytest.raises(exc):
            c.complete([{"role": "user", "content": "x"}], [])


def test_route_is_503_without_any_key():
    r = client.post("/assistente/pergunta", json={"mensagens": [{"role": "user", "content": "olá"}]})
    assert r.status_code == 503 and r.json()["detail"]["chave"] == "erro.assistente_indisponivel"


def test_route_answers_with_a_fake_model(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    fake = FakeClient([tool_call("listar_variaveis", {}), text("Há seis variáveis.")])
    monkeypatch.setattr(api, "_chat_client", lambda _pid: fake)
    r = client.post("/assistente/pergunta", json={"mensagens": [{"role": "user", "content": "Que dados há?"}], "idioma": "pt"})
    assert r.status_code == 200, r.text
    assert r.json()["ferramentas"] == ["listar_variaveis"]


def test_rate_limit_from_the_provider_is_a_429(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")

    class Limited:
        def complete(self, *_):
            raise llm.RateLimited("429")

    monkeypatch.setattr(api, "_chat_client", lambda _pid: Limited())
    r = client.post("/assistente/pergunta", json={"mensagens": [{"role": "user", "content": "x"}]})
    assert r.status_code == 429


def test_filtered_answer_is_not_shown(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    fake = FakeClient([{"role": "assistant", "content": "", "_finish": "content_filter", "_model": "fake"}])
    monkeypatch.setattr(api, "_chat_client", lambda _pid: fake)
    r = client.post("/assistente/pergunta", json={"mensagens": [{"role": "user", "content": "x"}]})
    assert r.status_code == 502


def test_status_route_follows_the_key(monkeypatch):
    assert client.get("/assistente/estado").json() == {"disponivel": False, "fornecedor": None}
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    assert client.get("/assistente/estado").json() == {"disponivel": True, "fornecedor": "openrouter"}
