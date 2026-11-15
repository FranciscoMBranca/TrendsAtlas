"""Chat model providers for the assistant: Groq or OpenRouter.

Both speak the same chat-completions format (messages, tools with JSON Schema, tool_calls),
so one small HTTP client serves both. Choose with AI_PROVIDER ("groq" or "openrouter");
when it is not set, the first provider with a key wins (Groq, then OpenRouter).

Secrets live only in the host's variables (Railway): GROQ_API_KEY, OPENROUTER_API_KEY.
Their values never reach logs or responses.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

import httpx


@dataclass(frozen=True)
class Provider:
    id: str
    url: str
    key_env: str
    default_model: str
    extra_headers: tuple[tuple[str, str], ...] = ()


PROVIDERS: dict[str, Provider] = {
    "groq": Provider(
        "groq", "https://api.groq.com/openai/v1/chat/completions", "GROQ_API_KEY", "openai/gpt-oss-120b",
    ),
    # "openrouter/free" routes to a free model that supports tools (free models come and go).
    "openrouter": Provider(
        "openrouter", "https://openrouter.ai/api/v1/chat/completions", "OPENROUTER_API_KEY", "openrouter/free",
        extra_headers=(("X-Title", "Atlas de Tendencias"),),
    ),
}


class ProviderError(Exception):
    """The provider failed (network, 5xx, bad answer)."""


class RateLimited(ProviderError):
    """The provider said 429 (free tiers have tight limits)."""


def _env(name: str) -> str:
    return (os.getenv(name) or "").strip().strip("\"'").strip()


def pick_provider() -> Provider | None:
    """The configured provider, or None when no key is set (the chat then stays hidden)."""
    wanted = _env("AI_PROVIDER").lower()
    if wanted:
        p = PROVIDERS.get(wanted)
        return p if p and _env(p.key_env) else None
    return next((p for p in PROVIDERS.values() if _env(p.key_env)), None)


class ChatClient:
    """complete(messages, tools) -> the assistant message (dict) of the first choice."""

    def __init__(self, provider: Provider, model: str | None = None, timeout: float = 60.0):
        self.provider = provider
        self.model = model or _env("AI_MODEL") or provider.default_model
        self._http = httpx.Client(timeout=timeout)

    def complete(self, messages: list[dict], tools: list[dict]) -> dict[str, Any]:
        headers = {"Authorization": f"Bearer {_env(self.provider.key_env)}", "Content-Type": "application/json"}
        headers.update(dict(self.provider.extra_headers))
        body = {"model": self.model, "messages": messages, "tools": tools, "tool_choice": "auto",
                "temperature": 0.2, "max_tokens": 1200}
        try:
            r = self._http.post(self.provider.url, json=body, headers=headers)
        except httpx.HTTPError as exc:
            raise ProviderError(type(exc).__name__) from None
        if r.status_code == 429:
            raise RateLimited("429")
        if r.status_code >= 400:
            raise ProviderError(str(r.status_code))
        try:
            data = r.json()
            choice = data["choices"][0]
        except (ValueError, KeyError, IndexError):
            raise ProviderError("resposta_invalida") from None
        msg = dict(choice.get("message") or {})
        msg["_finish"] = choice.get("finish_reason")
        msg["_model"] = data.get("model") or self.model
        return msg
