"use client";

import type { Analysis } from "@/lib/api";
import { translate, type Lang } from "@/lib/catalog";
import { fmt, fmtP, withUnit } from "@/lib/format";
import { resultSentence } from "@/lib/sentence";
import Chart from "./Chart";

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

export default function Result({ a, lang }: { a: Analysis; lang: Lang }) {
  const t = (k: string, p?: Record<string, string | number>) => translate(lang, k, p);
  const s = a.estatisticas;
  const u = a.unidade;
  const isDemo = a.rotulo === "demonstracao";
  const rows: [string, string][] = [
    [t("tab.sen"), withUnit(s.sen_declive_decada, u, lang)],
    [t("tab.sen_ic"), `${fmt(s.sen_ic_inferior_decada, lang)} … ${fmt(s.sen_ic_superior_decada, lang)}`],
    [t("tab.ols"), withUnit(s.ols_declive_decada, u, lang)],
    [t("tab.ols_ic"), `${fmt(s.ols_ic_inferior_decada, lang)} … ${fmt(s.ols_ic_superior_decada, lang)}`],
    [t("tab.r2"), fmt(s.r2, lang)],
    [t("tab.p_mk"), fmtP(s.p_mann_kendall, lang)],
    [t("tab.p_t"), fmtP(s.p_teste_t, lang)],
    [t("tab.n"), String(a.n_pontos)],
    [t("tab.celulas"), String(a.regiao.n_celulas)],
  ];

  return (
    <section className="result" aria-live="polite">
      <h2>
        {t("res.titulo")} {isDemo && <span className="badge demo">{t("rotulo.demonstracao")}</span>}
      </h2>
      <p className="sentence">{resultSentence(a, lang)}</p>

      <div className={`seal seal-${a.selo}`}>
        <strong>{t(`selo.${a.selo}`)}</strong>
        <p className="rule">{t("regra.valor_p")}</p>
        {a.selo === "resultado_dividido" && <p>{t("selo.dividido_explica")}</p>}
      </div>

      {a.quanto_falta_anos !== null && (
        <div className="note">
          <strong>{t("res.quanto_falta")}</strong>
          <p>{t("res.quanto_falta_txt", { anos: a.quanto_falta_anos })}</p>
        </div>
      )}
      {a.regiao.menor_que_resolucao && <p className="note">{t("res.pequena", { res: a.regiao.resolucao_graus })}</p>}
      {a.aviso_poucos_pontos && <p className="note">{t("res.poucos_pontos")}</p>}

      <Chart a={a} title={t("res.grafico")} />

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
      <button type="button" onClick={() => downloadCsv(a)}>
        {t("res.exportar")}
      </button>
    </section>
  );
}
