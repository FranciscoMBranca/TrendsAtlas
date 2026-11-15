"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Thermometer } from "lucide-react";
import { z } from "zod";

import { ICONS } from "@/components/HomeParts";
import { DATA_BASE_URL } from "@/lib/atlas/data/load";
import { useI18n } from "@/lib/i18n";

export const sourcesSchema = z.object({
  schemaVersion: z.literal(1),
  checkedInCmr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sources: z
    .array(
      z.object({
        id: z.string(),
        status: z.enum(["real", "pending"]),
        name: z.string(),
        product: z.string(),
        field: z.string(),
        version: z.string(),
        doi: z.string(),
        citation: z.string(),
        note: z.string(),
        period: z.object({ start: z.string(), end: z.string(), months: z.number().int() }).nullable(),
      }),
    )
    .min(1),
});
export type SourcesData = z.infer<typeof sourcesSchema>;

const LOCALE = { pt: "pt-PT", en: "en-GB", es: "es-ES", fr: "fr-FR", zh: "zh-CN" } as const;

export function useSources() {
  return useQuery({
    queryKey: ["atlas-sources"],
    queryFn: async () => {
      const r = await fetch(`${DATA_BASE_URL}/sources.json`);
      if (!r.ok) throw new Error(`sources.json: ${r.status}`);
      return sourcesSchema.parse(await r.json());
    },
    staleTime: Infinity,
    retry: false,
  });
}

/** Where every variable comes from: NASA product, version, DOI (checked in NASA's CMR) and how to cite it. */
export function Sources({ data }: { data?: SourcesData }) {
  const { lang, audience, t } = useI18n();
  const q = useSources();
  const s = data ?? q.data;
  if (!s || audience === "crianca") return null;
  const scientist = audience === "cientista";
  const checked = new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${s.checkedInCmr}T00:00:00Z`));
  return (
    <section id="fontes-dados" className="sources atlas-width" aria-labelledby="fontes-titulo">
      <h2 id="fontes-titulo" className="home-h2">{t("fontes.titulo")}</h2>
      <p className="home-h2-sub">{t("fontes.sub", { data: checked })}</p>
      <ul className="sources-grid">
        {s.sources.map((src) => {
          const Icon = ICONS[src.id] ?? Thermometer;
          return (
            <li key={src.id} className="source-card" data-var={src.id}>
              <div className="source-head">
                <span className="var-card-icon" aria-hidden="true"><Icon /></span>
                <div>
                  <strong>{t(`var.${src.id}`)}</strong>
                  <span className={`source-status ${src.status === "real" ? "is-real" : "is-pending"}`}>
                    {src.status === "real" && src.period
                      ? t("fontes.real", { inicio: src.period.start, fim: src.period.end })
                      : t("fontes.pendente")}
                  </span>
                </div>
              </div>
              <dl>
                <dt>{t("fontes.produto")}</dt>
                <dd>
                  {src.name} · <code>{src.product}</code>
                </dd>
                <dt>{t("fontes.versao")}</dt>
                <dd>
                  {src.version} · <code>{src.field}</code>
                </dd>
                <dt>DOI</dt>
                <dd>
                  <a href={`https://doi.org/${src.doi}`} target="_blank" rel="noopener noreferrer">
                    {src.doi} <ExternalLink aria-hidden="true" />
                  </a>
                </dd>
              </dl>
              {scientist && (
                <p className="source-cite">
                  <span>{t("fontes.citar")}</span> {src.citation}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="sources-other">{t("fontes.outros")}</p>
    </section>
  );
}
