import type { Lang } from "./catalog";

const LOCALE: Record<Lang, string> = { pt: "pt-PT", en: "en-GB" };

export function unitLabel(unit: string): string {
  return { degC: "°C", "mm/day": "mm/dia", "g/kg": "g/kg", "1": "" }[unit] ?? unit;
}

export function unitLabelLang(unit: string, lang: Lang): string {
  if (unit === "mm/day") return lang === "pt" ? "mm/dia" : "mm/day";
  return unitLabel(unit);
}

export function fmt(value: number | null | undefined, lang: Lang, digits = 3): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(LOCALE[lang], { maximumSignificantDigits: digits }).format(value);
}

export function fmtP(p: number | null | undefined, lang: Lang): string {
  if (p === null || p === undefined || !Number.isFinite(p)) return "—";
  if (p < 0.001) return lang === "pt" ? "< 0,001" : "< 0.001";
  return new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: 3, minimumFractionDigits: 3 }).format(p);
}

export function withUnit(value: number | null | undefined, unit: string, lang: Lang): string {
  const u = unitLabelLang(unit, lang);
  const sign = value !== null && value !== undefined && value > 0 ? "+" : "";
  return `${sign}${fmt(value, lang)}${u ? " " + u : ""}`;
}
