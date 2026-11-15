"use client";

import { useEffect, useMemo, useState } from "react";
import { analyseRegion, API_URL, type Analysis, type ApiError, type Region } from "@/lib/api";
import { LANGS } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import type { AtlasData } from "@/lib/atlas/data/schema";
import { SectionHeader } from "./atlas/SectionHeader";
import { SegmentedControl } from "./atlas/map/SegmentedControl";
import Result, { type AudienceMode } from "./Result";

/** Atlas variable id (prototype data) -> API variable id (Phase 0 pipeline). */
export const API_VARIABLE: Record<string, string> = {
  temperature: "temperatura",
  precipitation: "precipitacao",
  aerosols: "aerossois",
};

const SEASONS: Record<string, number[] | null> = {
  all: null,
  djf: [1, 2, 12],
  mam: [3, 4, 5],
  jja: [6, 7, 8],
  son: [9, 10, 11],
};

type RegionMode = "globo" | "exemplo" | "rectangulo";

/**
 * SPEC-101 / SPEC-102: the data detective. The user picks where, when and which
 * months; the API runs the trend tests and returns numbers and message keys.
 */
export function Investigate({ data }: { data: AtlasData }) {
  const { lang, setLang, t } = useI18n();
  const atlasVar = data.meta.variable.id;
  const apiVar = API_VARIABLE[atlasVar];
  const firstYear = Number(data.meta.period.start.slice(0, 4));
  const lastYear = Number(data.meta.period.end.slice(0, 4));
  const years = useMemo(() => Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i), [firstYear, lastYear]);

  const [mode, setMode] = useState<RegionMode>("globo");
  const [exampleId, setExampleId] = useState(data.regions[0]?.id ?? "");
  const [box, setBox] = useState({ oeste: -20, sul: -20, este: 30, norte: 10 });
  const [start, setStart] = useState(firstYear);
  const [end, setEnd] = useState(lastYear);
  const [season, setSeason] = useState("all");
  const [custom, setCustom] = useState<number[]>([]);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [apiUp, setApiUp] = useState<boolean | null>(null);
  const [audience, setAudience] = useState<AudienceMode>("explorador");

  useEffect(() => {
    setResult(null);
    setError(null);
    setExampleId(data.regions[0]?.id ?? "");
  }, [atlasVar, data.regions]);

  useEffect(() => {
    let alive = true;
    fetch(`${API_URL}/saude`)
      .then((r) => alive && setApiUp(r.ok))
      .catch(() => alive && setApiUp(false));
    return () => {
      alive = false;
    };
  }, []);

  const months = season === "custom" ? (custom.length === 0 || custom.length === 12 ? null : custom) : SEASONS[season];
  const shortPeriod = end - start + 1 < 10;

  function region(): Region {
    if (mode === "globo") return { tipo: "globo" };
    if (mode === "exemplo") {
      const r = data.regions.find((x) => x.id === exampleId) ?? data.regions[0]!;
      const [oeste, sul, este, norte] = r.bbox;
      return { tipo: "rectangulo", oeste, sul, este, norte };
    }
    return { tipo: "rectangulo", ...box };
  }

  async function run() {
    if (!apiVar) return;
    setBusy(true);
    setError(null);
    const r = await analyseRegion({ variavel: apiVar, regiao: region(), inicio: start, fim: end, meses: months ?? undefined });
    setBusy(false);
    if (r.ok) setResult(r.data);
    else {
      setResult(null);
      setError(r.error);
      if (r.error.chave === "erro.rede") setApiUp(false);
    }
  }

  const toggleMonth = (m: number) =>
    setCustom((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m].sort((a, b) => a - b)));

  return (
    <section id="investigar" className="investigate atlas-width" lang={lang}>
      <div className="section-heading-row">
        <SectionHeader number="→" title={t("inv.rotulo")} />
        <div className="investigate-toggles">
        <SegmentedControl
          label={t("modo.rotulo")}
          value={audience}
          onChange={setAudience}
          options={[
            { value: "crianca", label: t("modo.crianca") },
            { value: "explorador", label: t("modo.explorador") },
            { value: "cientista", label: t("modo.cientista") },
          ]}
        />
        <div className="segmented" role="radiogroup" aria-label="Idioma / Language">
          {LANGS.map((l) => (
            <button key={l} type="button" role="radio" aria-checked={l === lang} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        </div>
      </div>

      <div className="section-intro">
        <h3>
          {t("inv.titulo")} <em>{t("inv.titulo_em")}</em>
        </h3>
        <p>{t("inv.intro")}</p>
      </div>

      {!apiVar ? (
        <p className="investigate-note" role="status">
          {t("inv.indisponivel", { variavel: data.meta.variable.name })}
        </p>
      ) : (
        <>
          {apiUp === false && (
            <p className="investigate-note investigate-warn" role="alert">
              {t("app.degradado")}
            </p>
          )}
          <div className="investigate-form">
            <fieldset>
              <legend className="technical">{t("inv.onde")}</legend>
              <SegmentedControl
                label={t("inv.onde")}
                value={mode}
                onChange={setMode}
                options={[
                  { value: "globo", label: t("p2.mundo") },
                  { value: "exemplo", label: t("inv.exemplo") },
                  { value: "rectangulo", label: t("inv.rectangulo") },
                ]}
              />
              {mode === "exemplo" && (
                <label className="investigate-field">
                  <span className="technical">{t("inv.exemplo")}</span>
                  <select value={exampleId} onChange={(e) => setExampleId(e.target.value)}>
                    {data.regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {mode === "rectangulo" && (
                <div className="investigate-box">
                  {(["oeste", "sul", "este", "norte"] as const).map((k) => (
                    <label key={k} className="investigate-field">
                      <span className="technical">{t(`inv.${k}`)}</span>
                      <input
                        type="number"
                        step="0.5"
                        min={k === "sul" || k === "norte" ? -90 : -180}
                        max={k === "sul" || k === "norte" ? 90 : 180}
                        value={box[k]}
                        onChange={(e) => setBox((b) => ({ ...b, [k]: Number(e.target.value) }))}
                      />
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset>
              <legend className="technical">{t("inv.quando")}</legend>
              <div className="investigate-box">
                <label className="investigate-field">
                  <span className="technical">{t("p3.inicio")}</span>
                  <select value={start} onChange={(e) => setStart(Number(e.target.value))}>
                    {years.map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </select>
                </label>
                <label className="investigate-field">
                  <span className="technical">{t("p3.fim")}</span>
                  <select value={end} onChange={(e) => setEnd(Number(e.target.value))}>
                    {years.map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </select>
                </label>
              </div>
              <p className={shortPeriod ? "investigate-error" : "technical"}>
                {shortPeriod ? t("erro.periodo_curto", { minimo: 10 }) : t("p3.minimo")}
              </p>
            </fieldset>

            <fieldset>
              <legend className="technical">{t("p3.meses")}</legend>
              <SegmentedControl
                label={t("p3.meses")}
                value={season}
                onChange={setSeason}
                options={[
                  { value: "all", label: t("p3.todos") },
                  ...(["djf", "mam", "jja", "son"] as const).map((k) => ({
                    value: k,
                    label: SEASONS[k]!.slice().sort((a, b) => ((a + 1) % 12) - ((b + 1) % 12)).map((m) => t(`mes.${m}`)).join("–"),
                  })),
                  { value: "custom", label: t("p3.escolher") },
                ]}
              />
              {season === "custom" && (
                <div className="investigate-months">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <label key={m}>
                      <input type="checkbox" checked={custom.includes(m)} onChange={() => toggleMonth(m)} /> {t(`mes.${m}`)}
                    </label>
                  ))}
                </div>
              )}
              {months && <p className="technical">{t("p3.aviso_estacao")}</p>}
            </fieldset>

            <div>
              <button type="button" className="investigate-run" disabled={busy || shortPeriod || apiUp === false} onClick={run}>
                {busy ? "…" : t("passo.analisar")}
              </button>
            </div>
          </div>

          {error && (
            <p className="investigate-error" role="alert">
              {t(error.chave, error.parametros)}
            </p>
          )}
          {result && <Result a={result} lang={lang} mode={audience} />}
        </>
      )}
    </section>
  );
}
