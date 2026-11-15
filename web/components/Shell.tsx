"use client";

import { Baby, Compass, FlaskConical, Languages, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ManifestEntry } from "@/lib/atlas/data/schema";
import { LANGS, LANG_NAMES, REVIEWED, translate, type Lang } from "@/lib/catalog";
import { AUDIENCES, useI18n, type Audience } from "@/lib/i18n";

const AUDIENCE_ICON: Record<Audience, typeof Baby> = { crianca: Baby, explorador: Compass, cientista: FlaskConical };

/** Fixed top bar: brand, what to see, audience and language. Every change re-renders the home page. */
export function TopBar({
  variables,
  selectedId,
  onSelect,
}: {
  variables?: readonly ManifestEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { lang, setLang, audience, setAudience, reopenWelcome, t } = useI18n();
  return (
    <header className="topbar">
      <div className="atlas-width topbar-inner">
        <a href="#inicio" className="wordmark" aria-label="Atlas de Tendências">
          <span className="atlas-mark" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} />
            ))}
          </span>
          <span className="wordmark-text">Atlas de Tendências</span>
        </a>
        <div className="topbar-filters">
          <div className="topbar-group" role="radiogroup" aria-label={t("barra.publico")}>
            {AUDIENCES.map((a) => {
              const Icon = AUDIENCE_ICON[a];
              return (
                <button key={a} type="button" role="radio" aria-checked={a === audience} onClick={() => setAudience(a)} title={t(`publico.${a}.desc`)}>
                  <Icon aria-hidden="true" />
                  <span>{t(`publico.${a}`)}</span>
                </button>
              );
            })}
          </div>
          <label className="topbar-lang">
            <Languages aria-hidden="true" />
            <span className="sr-only">{t("barra.idioma")}</span>
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t("barra.idioma")}>
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANG_NAMES[l]}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="topbar-icon" onClick={reopenWelcome} aria-label={t("barra.inicio")} title={t("barra.inicio")}>
            <Settings2 aria-hidden="true" />
          </button>
        </div>
      </div>
      {variables && (
        <nav className="atlas-width topbar-vars" aria-label={t("barra.variavel")}>
          {variables.map((v) => (
            <button key={v.id} type="button" aria-pressed={v.id === selectedId} onClick={() => onSelect(v.id)} className={`var-chip ${v.isDemo ? "is-demo" : "is-real"}`}>
              <i className="var-swatch" data-palette={v.id} aria-hidden="true" />
              {t(`var.${v.id}`)}
              {v.isDemo && <span className="var-demo">{t("rotulo.demonstracao")}</span>}
            </button>
          ))}
        </nav>
      )}
      {!REVIEWED[lang] && (
        <p className="topbar-notice" role="note">
          {t("traducao.aviso")}
        </p>
      )}
    </header>
  );
}

/** First visit (or the settings button): who is it for, and in which language. */
export function Welcome() {
  const { lang, audience, choose, chosen, t } = useI18n();
  const [pickLang, setPickLang] = useState<Lang>(lang);
  const [pickAudience, setPickAudience] = useState<Audience>(audience);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setPickLang(lang);
    setPickAudience(audience);
  }, [lang, audience, chosen]);
  useEffect(() => {
    if (!chosen) ref.current?.focus();
  }, [chosen]);
  if (chosen) return null;
  // Texts follow the language being picked, so the visitor reads the screen in it at once.
  const tt = (k: string) => (lang === pickLang ? t(k) : translateFor(pickLang, k));
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title" tabIndex={-1} ref={ref}>
      <div className="welcome-panel">
        <span className="technical">ATLAS DE TENDÊNCIAS · NASA · 2000–2025</span>
        <h1 id="welcome-title">{tt("welcome.titulo")}</h1>
        <p className="welcome-sub">{tt("welcome.sub")}</p>

        <fieldset className="welcome-audience">
          <legend>{tt("welcome.publico")}</legend>
          {AUDIENCES.map((a) => {
            const Icon = AUDIENCE_ICON[a];
            return (
              <label key={a} className={`welcome-card ${pickAudience === a ? "is-on" : ""}`}>
                <input type="radio" name="audience" value={a} checked={pickAudience === a} onChange={() => setPickAudience(a)} />
                <Icon aria-hidden="true" />
                <strong>{tt(`publico.${a}`)}</strong>
                <span>{tt(`publico.${a}.desc`)}</span>
              </label>
            );
          })}
        </fieldset>

        <fieldset className="welcome-langs">
          <legend>{tt("welcome.idioma")}</legend>
          {LANGS.map((l) => (
            <label key={l} className={`welcome-lang ${pickLang === l ? "is-on" : ""}`}>
              <input type="radio" name="lang" value={l} checked={pickLang === l} onChange={() => setPickLang(l)} />
              {LANG_NAMES[l]}
            </label>
          ))}
        </fieldset>
        {!REVIEWED[pickLang] && <p className="technical">{translateFor(pickLang, "traducao.aviso")}</p>}

        <button type="button" className="investigate-run welcome-go" onClick={() => choose(pickAudience, pickLang)}>
          {tt("welcome.entrar")} →
        </button>
      </div>
    </div>
  );
}

const translateFor = (l: Lang, k: string) => translate(l, k);
