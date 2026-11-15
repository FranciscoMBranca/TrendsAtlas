// W21 (audience modes) and SPEC-120 criteria 3 and 4 on the result screen.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Result, { childSentence } from "@/components/Result";
import type { Analysis } from "@/lib/api";
import { CATALOGS, LANGS } from "@/lib/catalog";

const base = (significant: boolean): Analysis =>
  ({
    schemaVersion: "0.1.0",
    variavel: "temperatura",
    unidade: "degC",
    rotulo: "real",
    regiao: { tipo: "globo", n_celulas: 2592, resolucao_graus: 5, menor_que_resolucao: false },
    meses: null,
    passo: "mes",
    n_pontos: 312,
    aviso_poucos_pontos: false,
    periodo: { inicio: 2000, fim: 2025 },
    serie: [
      { t: "2000-01", anomalia: -0.2 },
      { t: "2025-12", anomalia: 0.3 },
    ],
    tendencia_linha: [-0.2, 0.25],
    banda_inferior: [-0.25, 0.2],
    banda_superior: [-0.15, 0.3],
    estatisticas: {
      sen_declive_decada: 0.176,
      sen_ic_inferior_decada: 0.07,
      sen_ic_superior_decada: 0.28,
      ols_declive_decada: 0.18,
      ols_ic_inferior_decada: 0.1,
      ols_ic_superior_decada: 0.26,
      r2: 0.4,
      p_mann_kendall: 0.002,
      p_teste_t: 0.001,
      z_mann_kendall: 3.1,
      factor_hamed_rao: 2.4,
      n_efectivo: 120,
      rho1: 0.4,
    },
    selo: significant ? "significativa" : "ainda_nao_significativa",
    regra_valor_p: 0.05,
    quanto_falta_anos: significant ? null : 12,
    projeccao: significant
      ? {
          condicional: true,
          aviso_chave: "projeccao.aviso",
          disponivel: true,
          motivo: null,
          horizonte_anos: 2,
          pontos: [
            { ano: 2026, centro: 0.27, inferior: 0.2, superior: 0.34 },
            { ano: 2027, centro: 0.29, inferior: 0.2, superior: 0.38 },
          ],
        }
      : { condicional: true, aviso_chave: "projeccao.aviso", disponivel: false, motivo: "nao_significativa", pontos: [] },
    frase: {
      chave: significant ? "frase.significativa.sobe" : "frase.ainda_nao_significativa.sobe",
      parametros: { declive_decada: 0.176, meses: null, anos: significant ? null : 12 },
    },
  }) as Analysis;

describe("modos de público", () => {
  it("Criança: frase simples, sem valores-p, sem tabela e sem projecção", () => {
    const { container } = render(<Result a={base(true)} lang="pt" mode="crianca" />);
    expect(screen.getByText(/está a subir no planeta inteiro/)).toBeInTheDocument();
    expect(screen.queryByText(/Valor-p/)).not.toBeInTheDocument();
    expect(container.querySelector("table")).toBeNull();
    expect(screen.queryByText("Isto não é uma previsão do clima.")).not.toBeInTheDocument();
  });

  it("Explorador e Cientista mostram os mesmos números; o Cientista mostra mais linhas", () => {
    const { container, unmount } = render(<Result a={base(true)} lang="pt" mode="explorador" />);
    const explorerRows = container.querySelectorAll("tbody tr").length;
    expect(screen.getAllByText(/0,176/).length).toBeGreaterThan(0);
    unmount();
    const sci = render(<Result a={base(true)} lang="pt" mode="cientista" />);
    expect(sci.container.querySelectorAll("tbody tr").length).toBeGreaterThan(explorerRows);
    expect(screen.getByText(/Hamed-Rao \(autocorrelação\)/)).toBeInTheDocument();
    expect(screen.getAllByText(/0,176/).length).toBeGreaterThan(0);
  });

  it("a frase da criança usa o número da API", () => {
    expect(childSentence(base(true), "pt")).toContain("0,176");
  });
});

describe("projecção condicional (SPEC-120)", () => {
  it("com tendência significativa mostra a projecção e o aviso (critério 4)", () => {
    render(<Result a={base(true)} lang="pt" mode="explorador" />);
    expect(screen.getAllByText("Se a tendência continuar").length).toBeGreaterThan(0);
    expect(screen.getByText("Isto não é uma previsão do clima.")).toBeInTheDocument();
    expect(screen.getByText(/em 2027/)).toBeInTheDocument();
  });

  it("sem tendência significativa não desenha a projecção mas mantém o aviso (critério 3)", () => {
    const { container } = render(<Result a={base(false)} lang="pt" mode="cientista" />);
    expect(container.querySelector(".proj-line")).toBeNull();
    expect(screen.getByText("Sem tendência significativa não mostramos projecção.")).toBeInTheDocument();
    expect(screen.getByText("Isto não é uma previsão do clima.")).toBeInTheDocument();
  });

  it("o aviso existe em todos os idiomas", () => {
    for (const lang of LANGS) expect(CATALOGS[lang]["projeccao.aviso"]).toBeTruthy();
  });
});
