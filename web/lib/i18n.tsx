"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { LANGS, translate, type Lang } from "./catalog";

/** W21: who the page is for. The home page renders differently for each. */
export type Audience = "crianca" | "explorador" | "cientista";
export const AUDIENCES: Audience[] = ["crianca", "explorador", "cientista"];

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  audience: Audience;
  setAudience: (a: Audience) => void;
  /** False until the visitor picks an audience (first visit shows the welcome screen). */
  chosen: boolean;
  choose: (a: Audience, l: Lang) => void;
  reopenWelcome: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx | null>(null);
const STORE = "terra-tempo.prefs";

const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as string[]).includes(v);
const isAudience = (v: unknown): v is Audience => typeof v === "string" && (AUDIENCES as string[]).includes(v);

/**
 * SPEC-140 + W21: one language and one audience for the whole page, switched without
 * reloading. Remembered in the browser (no personal data) and readable from the URL
 * (`?l=en&p=crianca`) so a link opens in the same view.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt");
  const [audience, setAudienceState] = useState<Audience>("explorador");
  const [chosen, setChosen] = useState(true); // avoids a flash before reading the browser state

  useEffect(() => {
    const url = new URLSearchParams(window.location.search);
    let stored: { lang?: unknown; audience?: unknown } = {};
    try {
      stored = JSON.parse(window.localStorage.getItem(STORE) ?? "{}");
    } catch {
      stored = {};
    }
    const l = url.get("l") ?? stored.lang;
    const a = url.get("p") ?? stored.audience;
    if (isLang(l)) setLangState(l);
    else if (navigator.language?.slice(0, 2) && isLang(navigator.language.slice(0, 2))) setLangState(navigator.language.slice(0, 2) as Lang);
    if (isAudience(a)) setAudienceState(a);
    setChosen(isAudience(a));
  }, []);

  const persist = useCallback((next: { lang: Lang; audience: Audience }) => {
    try {
      window.localStorage.setItem(STORE, JSON.stringify(next));
    } catch {
      /* private mode: preferences live only in memory */
    }
    const url = new URL(window.location.href);
    url.searchParams.set("l", next.lang);
    url.searchParams.set("p", next.audience);
    window.history.replaceState(null, "", url);
    document.documentElement.lang = next.lang === "zh" ? "zh-Hans" : next.lang;
  }, []);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      persist({ lang: l, audience });
    },
    [audience, persist],
  );
  const setAudience = useCallback(
    (a: Audience) => {
      setAudienceState(a);
      persist({ lang, audience: a });
    },
    [lang, persist],
  );
  const choose = useCallback(
    (a: Audience, l: Lang) => {
      setAudienceState(a);
      setLangState(l);
      setChosen(true);
      persist({ lang: l, audience: a });
    },
    [persist],
  );
  const reopenWelcome = useCallback(() => setChosen(false), []);
  const t = useCallback((key: string, params?: Record<string, string | number>) => translate(lang, key, params), [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, audience, setAudience, chosen, choose, reopenWelcome, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}
