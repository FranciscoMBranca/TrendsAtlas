"use client";

import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Dices, Shuffle, Target } from "lucide-react";
import { z } from "zod";

import { DATA_BASE_URL } from "@/lib/atlas/data/load";
import { fmt } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const validationSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string(),
  alphaPct: z.number(),
  references: z.array(z.object({ id: z.string(), reference: z.string(), cases: z.number().int(), maxRelDiff: z.number() })),
  falseAlarms: z.array(z.object({ phi: z.number(), sims: z.number().int(), months: z.number().int(), naivePct: z.number(), correctedPct: z.number() })).min(1),
  projection: z.array(z.object({ phi: z.number(), sims: z.number().int(), horizonYears: z.number().int(), coveragePct: z.number() })).min(1),
  shuffledYears: z.array(
    z.object({
      variable: z.string(),
      period: z.object({ start: z.string(), end: z.string() }),
      realPct: z.number(),
      shuffledMeanPct: z.number(),
      shuffledMaxPct: z.number(),
      shuffles: z.number().int(),
    }),
  ),
});
export type ValidationData = z.infer<typeof validationSchema>;

export function useValidation() {
  return useQuery({
    queryKey: ["atlas-validation"],
    queryFn: async () => {
      const r = await fetch(`${DATA_BASE_URL}/validation.json`);
      if (!r.ok) throw new Error(`validation.json: ${r.status}`);
      return validationSchema.parse(await r.json());
    },
    staleTime: Infinity,
    retry: false,
  });
}

/** "Below 1 in 10^k" for tiny differences; "0" when identical. */
export function diffLabel(x: number, lang: Parameters<typeof fmt>[1]): string {
  if (x === 0) return "0";
  const k = Math.floor(-Math.log10(x));
  return k >= 3 ? `< 10⁻${String(k).replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]!)}` : fmt(x, lang, 2);
}

/**
 * "How do we know it is right": shuffled years on the real data, false alarms on noise with no
 * trend, coverage of the projection band, and the formulas against reference libraries.
 * Every number comes from validation.json, produced by the pipeline.
 */
export function Validation({ data }: { data?: ValidationData }) {
  const { lang, audience, t } = useI18n();
  const q = useValidation();
  const v = data ?? q.data;
  if (!v) return null;
  const child = audience === "crianca";
  const scientist = audience === "cientista";
  const p = (x: number) => fmt(x, lang, 3);
  const red = v.falseAlarms[v.falseAlarms.length - 1]!;
  const proj = v.projection;

  return (
    <section id="confianca" className="validation atlas-width" aria-labelledby="confianca-titulo">
      <h2 id="confianca-titulo" className="home-h2">{t(child ? "val.titulo_crianca" : "val.titulo")}</h2>
      <p className="home-h2-sub">{t(child ? "val.sub_crianca" : "val.sub")}</p>
      <div className="validation-grid">
        {v.shuffledYears.length > 0 && (
          <article className="val-card val-wide">
            <span className="var-card-icon" aria-hidden="true"><Shuffle /></span>
            <h3>{t("val.baralhar.titulo")}</h3>
            <p>{t(child ? "val.baralhar.txt_crianca" : "val.baralhar.txt")}</p>
            <ul className="val-bars">
              {v.shuffledYears.map((s) => (
                <li key={s.variable} data-var={s.variable}>
                  <strong>{t(`var.${s.variable}`)}</strong>
                  <div className="val-bar-row">
                    <span className="val-bar-label">{t("val.baralhar.real")}</span>
                    <span className="val-bar"><i className="is-real" style={{ width: `${Math.min(100, s.realPct)}%` }} /></span>
                    <span className="val-bar-n">{p(s.realPct)} %</span>
                  </div>
                  <div className="val-bar-row">
                    <span className="val-bar-label">{t("val.baralhar.baralhado")}</span>
                    <span className="val-bar"><i style={{ width: `${Math.min(100, s.shuffledMaxPct)}%` }} /></span>
                    <span className="val-bar-n">≤ {p(s.shuffledMaxPct)} %</span>
                  </div>
                  {/* Verdict from the numbers: above every shuffle, or within what chance produces. */}
                  <p className={`val-verdict ${s.realPct > s.shuffledMaxPct ? "is-above" : "is-within"}`}>
                    {s.realPct > s.shuffledMaxPct
                      ? t(child ? "val.baralhar.acima_crianca" : "val.baralhar.acima")
                      : t(child ? "val.baralhar.dentro_crianca" : "val.baralhar.dentro")}
                  </p>
                  {!child && (
                    <small className="technical">
                      {t("val.baralhar.nota", {
                        n: s.shuffles,
                        media: p(s.shuffledMeanPct),
                        inicio: s.period.start.slice(0, 4),
                        fim: s.period.end.slice(0, 4),
                      })}
                    </small>
                  )}
                </li>
              ))}
            </ul>
          </article>
        )}

        {!child && (
          <>
            <article className="val-card">
              <span className="var-card-icon" aria-hidden="true"><Dices /></span>
              <h3>{t("val.alarmes.titulo")}</h3>
              <p>{t("val.alarmes.txt", { alvo: p(v.alphaPct), n: red.sims })}</p>
              <table className="stats compact">
                <thead>
                  <tr>
                    <th>{t("val.alarmes.phi")}</th>
                    <th>{t("val.alarmes.sem")}</th>
                    <th>{t("val.alarmes.com")}</th>
                  </tr>
                </thead>
                <tbody>
                  {v.falseAlarms.map((r) => (
                    <tr key={r.phi}>
                      <td>{fmt(r.phi, lang, 2)}</td>
                      <td>{p(r.naivePct)} %</td>
                      <td>{p(r.correctedPct)} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {v.falseAlarms.some((r) => r.correctedPct > 1.5 * v.alphaPct) && <p className="val-limit">{t("val.alarmes.limite")}</p>}
            </article>

            <article className="val-card">
              <span className="var-card-icon" aria-hidden="true"><Target /></span>
              <h3>{t("val.projecao.titulo")}</h3>
              <p className="val-big">{proj.map((r) => `${p(r.coveragePct)} %`).join(" · ")}</p>
              <p>{t("val.projecao.txt", { n: proj[0]!.sims, anos: proj[0]!.horizonYears })}</p>
            </article>

            <article className="val-card">
              <span className="var-card-icon" aria-hidden="true"><BadgeCheck /></span>
              <h3>{t("val.formulas.titulo")}</h3>
              <p>{t("val.formulas.txt")}</p>
              <ul className="val-refs">
                {v.references.map((r) => (
                  <li key={r.id}>
                    <span>{t(`val.ref.${r.id}`)}</span>
                    <code>{diffLabel(r.maxRelDiff, lang)}</code>
                    {scientist && <small className="technical">{r.reference} · {r.cases}</small>}
                  </li>
                ))}
              </ul>
            </article>
          </>
        )}
      </div>
    </section>
  );
}
