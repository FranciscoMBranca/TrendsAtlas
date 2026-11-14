import type { Analysis } from "./api";
import { translate, type Lang } from "./catalog";
import { withUnit } from "./format";

export function monthList(months: number[], lang: Lang): string {
  return months.map((m) => translate(lang, `mes.${m}`)).join(", ");
}

/** Build the result sentence from the API key and numbers only (SPEC-101 criterion 4). */
export function resultSentence(a: Analysis, lang: Lang): string {
  const name = translate(lang, `var.${a.variavel}`);
  const p = a.frase.parametros;
  return translate(lang, a.frase.chave, {
    variavel: name,
    variavel_min: name.charAt(0).toLowerCase() + name.slice(1),
    declive: withUnit(p.declive_decada, a.unidade, lang),
    onde: translate(lang, a.regiao.tipo === "globo" ? "onde.globo" : "onde.regiao"),
    meses: p.meses ? translate(lang, "onde.meses", { lista: monthList(p.meses, lang) }) : "",
    anos: p.anos ?? "",
  });
}
