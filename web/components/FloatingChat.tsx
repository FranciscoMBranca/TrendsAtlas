"use client";

import { Maximize2, MessageCircle, Minus, Send, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { API_URL } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string; tools?: string[]; error?: boolean };
type Status = "closed" | "open" | "minimized";

const MAX_HISTORY = 10;

/** B11 / W14: the assistant, in a floating panel that can be minimised and closed. */
export function FloatingChat({ variable }: { variable: string }) {
  const { lang, audience, t } = useI18n();
  const [status, setStatus] = useState<Status>("closed");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight });
  }, [messages, busy]);
  useEffect(() => {
    if (status === "open") inputRef.current?.focus();
  }, [status]);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const history = [...messages.filter((m) => !m.error), { role: "user" as const, content: question }];
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setBusy(true);
    try {
      if (!API_URL) throw new Error("no-api");
      const r = await fetch(`${API_URL}/assistente/pergunta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagens: history.slice(-MAX_HISTORY).map(({ role, content }) => ({ role, content })),
          idioma: lang,
          publico: audience,
          variavel: variable,
        }),
      });
      if (r.status === 503) throw new Error("unavailable");
      if (!r.ok) throw new Error("error");
      const body = (await r.json()) as { resposta: string | null; ferramentas?: string[] };
      if (!body.resposta) throw new Error("error");
      const answer = body.resposta;
      setMessages((m) => [...m, { role: "assistant", content: answer, tools: body.ferramentas }]);
    } catch (e) {
      const key = e instanceof Error && (e.message === "unavailable" || e.message === "no-api") ? "chat.indisponivel" : "chat.erro";
      setMessages((m) => [...m, { role: "assistant", content: t(key), error: true }]);
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

  if (status === "closed") {
    return (
      <button type="button" className="chat-bubble" onClick={() => setStatus("open")} aria-label={t("chat.abrir")} title={t("chat.abrir")}>
        <MessageCircle aria-hidden="true" />
      </button>
    );
  }

  if (status === "minimized") {
    return (
      <div className="chat-mini" role="region" aria-label={t("chat.titulo")}>
        <button type="button" className="chat-mini-open" onClick={() => setStatus("open")}>
          <MessageCircle aria-hidden="true" /> {t("chat.titulo")}
          {messages.length > 0 && <span className="chat-count">{messages.length}</span>}
        </button>
        <button type="button" onClick={() => setStatus("open")} aria-label={t("chat.abrir")}>
          <Maximize2 aria-hidden="true" />
        </button>
        <button type="button" onClick={() => setStatus("closed")} aria-label={t("chat.fechar")}>
          <X aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <section
      className="chat-panel"
      role="dialog"
      aria-label={t("chat.titulo")}
      onKeyDown={(e) => e.key === "Escape" && setStatus("minimized")}
    >
      <header>
        <strong>{t("chat.titulo")}</strong>
        <div>
          <button type="button" onClick={() => setStatus("minimized")} aria-label={t("chat.minimizar")} title={t("chat.minimizar")}>
            <Minus aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setStatus("closed")} aria-label={t("chat.fechar")} title={t("chat.fechar")}>
            <X aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="chat-list" ref={listRef} aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>{t("chat.vazio")}</p>
            {["chat.exemplo1", "chat.exemplo2", "chat.exemplo3"].map((k) => (
              <button key={k} type="button" onClick={() => void ask(t(k))}>
                {t(k)}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-${m.role} ${m.error ? "is-error" : ""}`}>
            <p>{m.content}</p>
            {m.tools && m.tools.length > 0 && <span className="technical">{t("chat.ferramentas", { lista: m.tools.join(", ") })}</span>}
          </div>
        ))}
        {busy && <div className="chat-msg chat-assistant is-busy">{t("chat.a_pensar")}</div>}
      </div>

      <form onSubmit={submit} className="chat-form">
        <textarea
          ref={inputRef}
          rows={2}
          value={input}
          maxLength={1000}
          placeholder={t("chat.placeholder")}
          aria-label={t("chat.placeholder")}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(input);
            }
          }}
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label={t("chat.enviar")}>
          <Send aria-hidden="true" />
        </button>
      </form>
      <p className="chat-notice technical">{t("chat.aviso")}</p>
    </section>
  );
}
