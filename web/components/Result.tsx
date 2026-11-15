"use client";

import type { Analysis } from "@/lib/api";
import { translate, type Lang } from "@/lib/catalog";
import { fmt, fmtP, withUnit } from "@/lib/format";
import { resultSentence } from "@/lib/sentence";
import Chart from "./Chart";

/** W21: the numbers are always the same; the mode changes how they are said and what is shown. */
export type AudienceMode = "crianca" | "explorador" | "cientista";

function downloadCsv(a: Analysis) {
  const rows = [["t", "anomalia", "tendencia"], ...a.serie.map((p, i) => [p.t, p.anomalia ?? "", a.tendencia_linha[i] ?? ""])];
  const meta = `# Terra Tempo; variavel=${a.variavel}; unidade=${a.unidade}; rotulo=${a.rotulo}\n`;
  const blob = new Blob([meta + rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `terra-tempo-${a.variavel}-${a.rotulo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const ARROW: Record<string, string> = { sobe: "↑", desce: "↓", estavel: "→" };

/** Child sentence: fixed templates, numbers from the API only (no free AI text for children). */
export function childSentence(a: Analysis, lang: Lang): string {
  const t = (k: string, p?: Record<string, string | number>) => translate(lang, k, p);
  const dir = a.frase.chave.split(".").at(-1) ?? "estavel";
  const thing = translate(lang, `var.${a.variavel}`);
  const where = t(a.regiao.tipo === "globo" ? "crianca.onde.globo" : "crianca.onde.regiao");
  const first = t(`crianca.${dir}`, { coisa: thing, onde: where });
  if (dir === "estavel" || a.selo !== "significativa") return first;
  return `${first} ${t("crianca.quanto", { declive: withUnit(Math.abs(a.estatisticas.sen_declive_decada ?? 0), a.unidade, lang) })}`;
}

export default function Result({ a, lang, mode = "explorador" }: { a: Analysis; lang: Lang; mode?: AudienceMode }) {
  const t = (k: string, p?: Record<string, string | number>) => translate(lang, k, p);
  const s = a.estatisticas;
  const u = a.unidade;
  const isDemo = a.rotulo === "demonstracao";
  const child = mode === "crianca";
  const dir = a.frase.chave.split(".").at(-1) ?? "estavel";

  const basic: [string, string][] = [
    [t("tab.sen"), withUnit(s.sen_declive_decada, u, lang)],
    [t("tab.sen_ic"), `${fmt(s.sen_ic_inferior_decada, lang)} … ${fmt(s.sen_ic_superior_decada, lang)}`],
    [t("tab.p_mk"), fmtP(s.p_mann_kendall, lang)],
    [t("tab.n"), String(a.n_pontos)],
  ];
  const full: [string, string][] = [
    ...basic.slice(0, 2),
    [t("tab.ols"), withUnit(s.ols_declive_decada, u, lang)],
    [t("tab.ols_ic"), `${fmt(s.ols_ic_inferior_decada, lang)} … ${fmt(s.ols_ic_superior_decada, lang)}`],
    [t("tab.r2"), fmt(s.r2, lang)],
    [t("tab.p_mk"), fmtP(s.p_mann_kendall, lang)],
    [t("tab.z"), fmt(s.z_mann_kendall, lang)],
    [t("tab.hr"), fmt(s.factor_hamed_rao, lang)],
    [t("tab.p_t"), fmtP(s.p_teste_t, lang)],
    [t("tab.n_ef"), fmt(s.n_efectivo, lang)],
    [t("tab.rho1"), fmt(s.rho1, lang)],
    [t("tab.n"), String(a.n_pontos)],
    [t("tab.celulas"), String(a.regiao.n_celulas)],
  ];
  const rows = mode === "cientista" ? full : basic;

  const proj = a.projeccao;
  const lastProj = proj?.disponivel ? proj.pontos[proj.pontos.length - 1] : undefined;

  return (
    <div className={`result result-${mode}`} aria-live="polite">
      <h4 className="technical">
        {t("res.titulo")} {isDemo && <span className="badge demo">{t("rotulo.demonstracao")}</span>}
      </h4>

      {child ? (
        <p className="sentence sentence-child">
          <span className={`child-arrow arrow-${dir}`} aria-hidden="true">
            {ARROW[dir]}
          </span>{" "}
          {childSentence(a, lang)}
        </p>
      ) : (
        <p className="sentence">{resultSentence(a, lang)}</p>
      )}

      <div className={`seal seal-${a.selo}`}>
        <strong>{child ? t(`crianca.selo.${a.selo}`) : t(`selo.${a.selo}`)}</strong>
        <p className="rule">{child ? t("crianca.regra") : t("regra.valor_p")}</p>
        {!child && a.selo === "resultado_dividido" && <p>{t("selo.dividido_explica")}</p>}
      </div>

      {!child && a.quanto_falta_anos !== null && (
        <div className="note">
          <strong>{t("res.quanto_falta")}</strong>
          <p>{t("res.quanto_falta_txt", { anos: a.quanto_falta_anos })}</p>
        </div>
      )}
      {a.regiao.menor_que_resolucao && <p className="note">{t("res.pequena", { res: a.regiao.resolucao_graus })}</p>}
      {!child && a.aviso_poucos_pontos && <p className="note">{t("res.poucos_pontos")}</p>}

      <Chart
        a={a}
        title={t("res.grafico")}
        showBand={!child}
        showProjection={!child}
        projectionLabel={t("projeccao.titulo")}
      />

      {!child && proj && (
        <div className="note projection-note">
          <strong>{t("projeccao.titulo")}</strong>
          {lastProj ? (
            <p>
              {t("projeccao.texto", {
                valor: withUnit(lastProj.centro, u, lang),
                ano: lastProj.ano,
                inferior: fmt(lastProj.inferior, lang),
                superior: fmt(lastProj.superior, lang),
              })}
            </p>
          ) : (
            <p>{t(`projeccao.${proj.motivo ?? "nao_significativa"}`)}</p>
          )}
          <p className="projection-warning">{t(proj.aviso_chave)}</p>
        </div>
      )}

      {!child && (
        <table className="stats">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <th scope="row">{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button type="button" className="investigate-run secondary" onClick={() => downloadCsv(a)}>
        {t("res.exportar")}
      </button>
    </div>
  );
}
