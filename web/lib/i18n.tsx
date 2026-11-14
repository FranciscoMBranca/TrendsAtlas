"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { translate, type Lang } from "./catalog";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string, params?: Record<string, string | number>) => string };

const I18nContext = createContext<Ctx | null>(null);

/** SPEC-140: one language for the whole page, switched without reloading. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("pt");
  const t = useCallback((key: string, params?: Record<string, string | number>) => translate(lang, key, params), [lang]);
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}
