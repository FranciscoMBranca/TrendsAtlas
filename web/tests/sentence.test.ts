import { describe, expect, it } from "vitest";
import { CATALOGS, LANGS } from "@/lib/catalog";
import { resultSentence } from "@/lib/sentence";
import { withUnit } from "@/lib/format";
import type { Analysis } from "@/lib/api";

const base = {
  variavel: "temperatura",
  unidade: "degC",
  rotulo: "demonstracao",
  regiao: { tipo: "globo", n_celulas: 2592, resolucao_graus: 5, menor_que_resolucao: false },
  selo: "significativa",
  frase: { chave: "frase.significativa.sobe", parametros: { declive_decada: 0.2345, meses: [6, 7, 8], anos: null } },
} as unknown as Analysis;

describe("result sentence", () => {
  it("uses the number from the API, formatted, and names the months", () => {
    const s = resultSentence(base, "pt");
    expect(s).toContain(withUnit(0.2345, "degC", "pt"));
    expect(s).toContain("Jun, Jul, Ago");
    expect(s).toContain("mundo inteiro");
  });

  it("has no causal words in the result templates (SPEC-101 criterion 3)", () => {
    for (const lang of LANGS) {
      const templates = Object.entries(CATALOGS[lang]).filter(([k]) => /^(frase|res|selo|onde|regra|crianca|projeccao)\./.test(k));
      for (const [, text] of templates) {
        expect(text.toLowerCase()).not.toMatch(/\bcausa|devido a|por culpa de|\bcaused by|\bdue to/);
      }
    }
  });

  it("pt and en catalogues have the same keys", () => {
    expect(Object.keys(CATALOGS.en).sort()).toEqual(Object.keys(CATALOGS.pt).sort());
  });

  it("has the p-value rule in every language (SPEC-101 criterion 9)", () => {
    for (const lang of LANGS) expect(CATALOGS[lang]["regra.valor_p"]).toMatch(/0[.,]05/);
  });
});
