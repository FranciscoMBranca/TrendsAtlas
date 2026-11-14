"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  analyseRegion,
  getManifest,
  getMap,
  type Analysis,
  type ApiError,
  type Manifest,
  type Region,
  type TrendMap,
} from "@/lib/api";
import { LANGS, translate, type Lang } from "@/lib/catalog";
import { fmt, unitLabelLang } from "@/lib/format";
import { SCALE_MAX, colour } from "@/lib/colour";
import Result from "./Result";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

const SEASONS: { key: string; months: number[] }[] = [
  { key: "DJF", months: [12, 1, 2] },
  { key: "MAM", months: [3, 4, 5] },
  { key: "JJA", months: [6, 7, 8] },
  { key: "SON", months: [9, 10, 11] },
];

export default function Detective() {
  const [lang, setLang] = useState<Lang>("pt");
  const t = (k: string, p?: Record<string, string | number>) => translate(lang, k, p);

  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [apiOk, setApiOk] = useState(true);
  const [step, setStep] = useState(1);
  const [variable, setVariable] = useState("temperatura");
  const [preset, setPreset] = useState("completo");
  const [trendMap, setTrendMap] = useState<TrendMap | null>(null);
  const [onlySig, setOnlySig] = useState(false);
  const [mode, setMode] = useState<"celula" | "rectangulo">("celula");
  const [region, setRegion] = useState<Region | null>(null);
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [months, setMonths] = useState<number[] | null>(null);
  const [custom, setCustom] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getManifest().then(({ manifest, apiOk }) => {
      setManifest(manifest);
      setApiOk(apiOk);
    });
  }, []);

  useEffect(() => {
    getMap(variable, preset).then(setTrendMap).catch(() => setTrendMap(null));
  }, [variable, preset]);

  const meta = useMemo(() => manifest?.variaveis.find((v) => v.id === variable), [manifest, variable]);

  useEffect(() => {
    if (meta) {
      setStart(meta.periodo.inicio);
      setEnd(meta.periodo.fim);
    }
  }, [meta]);

  const years = meta ? Array.from({ length: meta.periodo.fim - meta.periodo.inicio + 1 }, (_, i) => meta.periodo.inicio + i) : [];
  const shortPeriod = start !== null && end !== null && end - start + 1 < 10;

  async function run() {
    if (!region) return;
    setBusy(true);
    setError(null);
    const r = await analyseRegion({
      variavel: variable,
      regiao: region,
      inicio: start ?? undefined,
      fim: end ?? undefined,
      meses: months ?? undefined,
    });
    setBusy(false);
    if (r.ok) {
      setResult(r.data);
      setStep(4);
    } else {
      setError(r.error);
      if (r.error.chave === "erro.rede") setApiOk(false);
    }
  }

  function toggleMonth(m: number) {
    const cur = new Set(months ?? []);
    if (cur.has(m)) cur.delete(m);
    else cur.add(m);
    const list = [...cur].sort((a, b) => a - b);
    setMonths(list.length === 0 || list.length === 12 ? null : list);
  }

  const regionText = (r: Region | null) => {
    if (!r) return t("p2.nenhuma");
    if (r.tipo === "globo") return t("p2.mundo");
    if (r.tipo === "rectangulo")
      return `${fmt(r.sul, lang)}°…${fmt(r.norte, lang)}° lat, ${fmt(r.oeste, lang)}°…${fmt(r.este, lang)}° lon`;
    return "polygon";
  };

  const max = SCALE_MAX[variable] ?? 1;
  const unit = meta ? unitLabelLang(meta.unidade, lang) : "";

  return (
    <div className="app">
      <header>
        <div>
          <h1>{t("app.titulo")}</h1>
          <p className="subtitle">{t("app.subtitulo")}</p>
        </div>
        <div className="lang" role="group" aria-label="Language">
          {LANGS.map((l) => (
            <button key={l} type="button" aria-pressed={l === lang} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {manifest?.contem_demonstracao && <div className="banner demo" role="status">{t("app.demo")}</div>}
      {!apiOk && <div className="banner warn" role="alert">{t("app.degradado")}</div>}

      <main className="layout">
        <section className="panel">
          {step === 1 && (
            <fieldset>
              <legend>{t("p1.titulo")}</legend>
              {manifest?.variaveis.map((v) => (
                <label key={v.id} className="choice">
                  <input type="radio" name="var" checked={variable === v.id} onChange={() => setVariable(v.id)} />
                  <span>
                    <strong>{t(`var.${v.id}`)}</strong>{" "}
                    {v.rotulo === "demonstracao" && <span className="badge demo">{t("rotulo.demonstracao")}</span>}
                    <br />
                    <small>{t(`def.${v.id}`)}</small>
                    <br />
                    <small className="muted">{v.produto_candidato}</small>
                  </span>
                </label>
              ))}
              <div className="nav">
                <button type="button" onClick={() => setStep(2)}>{t("passo.seguinte")}</button>
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset>
              <legend>{t("p2.titulo")}</legend>
              <p>{t("p2.ajuda")}</p>
              <div className="row">
                <button type="button" onClick={() => setRegion({ tipo: "globo" })} aria-pressed={region?.tipo === "globo"}>
                  {t("p2.mundo")}
                </button>
                <button type="button" onClick={() => setMode("celula")} aria-pressed={mode === "celula"}>
                  {t("p2.celula")}
                </button>
                <button type="button" onClick={() => setMode("rectangulo")} aria-pressed={mode === "rectangulo"}>
                  {t("p2.rectangulo")}
                </button>
              </div>
              <p>
                <strong>{t("p2.escolhido")}:</strong> {regionText(region)}
              </p>
              <div className="nav">
                <button type="button" onClick={() => setStep(1)}>{t("passo.anterior")}</button>
                <button type="button" disabled={!region} onClick={() => setStep(3)}>{t("passo.seguinte")}</button>
              </div>
            </fieldset>
          )}

          {step === 3 && (
            <fieldset>
              <legend>{t("p3.titulo")}</legend>
              <div className="row">
                <label>
                  {t("p3.inicio")}{" "}
                  <select value={start ?? ""} onChange={(e) => setStart(Number(e.target.value))}>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </label>
                <label>
                  {t("p3.fim")}{" "}
                  <select value={end ?? ""} onChange={(e) => setEnd(Number(e.target.value))}>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </label>
              </div>
              <p className={shortPeriod ? "error" : "muted"}>{shortPeriod ? t("erro.periodo_curto", { minimo: 10 }) : t("p3.minimo")}</p>

              <p><strong>{t("p3.meses")}</strong></p>
              <div className="row">
                <button type="button" aria-pressed={months === null && !custom} onClick={() => { setMonths(null); setCustom(false); }}>
                  {t("p3.todos")}
                </button>
                {SEASONS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={!custom && JSON.stringify(months) === JSON.stringify([...s.months].sort((a, b) => a - b))}
                    onClick={() => { setMonths([...s.months].sort((a, b) => a - b)); setCustom(false); }}
                  >
                    {s.months.map((m) => t(`mes.${m}`)).join("–")}
                  </button>
                ))}
                <button type="button" aria-pressed={custom} onClick={() => setCustom(true)}>{t("p3.escolher")}</button>
              </div>
              {custom && (
                <div className="months">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <label key={m}>
                      <input type="checkbox" checked={months?.includes(m) ?? false} onChange={() => toggleMonth(m)} /> {t(`mes.${m}`)}
                    </label>
                  ))}
                </div>
              )}
              {months && <p className="note">{t("p3.aviso_estacao")}</p>}
              {error && <p className="error" role="alert">{t(error.chave, error.parametros)}</p>}
              <div className="nav">
                <button type="button" onClick={() => setStep(2)}>{t("passo.anterior")}</button>
                <button type="button" disabled={shortPeriod || busy || !apiOk} onClick={run}>
                  {busy ? "…" : t("passo.analisar")}
                </button>
              </div>
            </fieldset>
          )}

          {step === 4 && result && (
            <>
              <Result a={result} lang={lang} />
              <div className="nav">
                <button type="button" onClick={() => setStep(3)}>{t("passo.anterior")}</button>
                <button type="button" onClick={() => { setResult(null); setRegion(null); setStep(1); }}>{t("passo.recomecar")}</button>
              </div>
            </>
          )}
        </section>

        <section className="mapcol">
          <div className="row">
            <label>
              {t("mapa.preset")}{" "}
              <select value={preset} onChange={(e) => setPreset(e.target.value)}>
                {(manifest?.presets ?? ["completo"]).map((p) => <option key={p} value={p}>{t(`preset.${p}`)}</option>)}
              </select>
            </label>
            <label>
              <input type="checkbox" checked={onlySig} onChange={(e) => setOnlySig(e.target.checked)} /> {t("mapa.so_significativas")}
            </label>
          </div>
          <MapView map={trendMap} onlySignificant={onlySig} mode={mode} region={region} onRegion={(r) => { setRegion(r); if (step < 2) setStep(2); }} />
          <div className="legend" aria-label={t("mapa.legenda")}>
            <span>{t("mapa.legenda")}: {t(`var.${variable}`)}</span>
            <div className="ramp">
              {[-1, -0.5, 0, 0.5, 1].map((k) => (
                <span key={k} style={{ background: colour(k * max, max) }}>{(k * max > 0 ? "+" : "") + fmt(k * max, lang, 2)} {unit}</span>
              ))}
            </div>
            {trendMap?.rotulo === "demonstracao" && <span className="badge demo">{t("rotulo.demonstracao")}</span>}
          </div>
          <p className="muted small">{t("mapa.regra")}</p>
        </section>
      </main>
      <footer>{t("rodape")}</footer>
    </div>
  );
}
