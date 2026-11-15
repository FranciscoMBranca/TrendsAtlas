"use client";

import { ArrowRight, CloudRain, Compass, Leaf, MousePointerClick, Snowflake, Sparkles, Thermometer, Waves, Wind } from "lucide-react";

import { Globe } from "@/components/Globe";
import type { Selection } from "@/components/ExploreMap";
import type { AtlasData, GridCell, Manifest } from "@/lib/atlas/data/schema";
import { number } from "@/lib/atlas/format";
import { withUnit } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cellPlace, usePlaces } from "@/lib/places";

export const ICONS: Record<string, typeof Thermometer> = {
  temperature: Thermometer,
  precipitation: CloudRain,
  vegetation: Leaf,
  sea_ice: Snowflake,
  aerosols: Wind,
  sea_level: Waves,
};

/** A request, from the globe or a mission, to open a place on the explore map. */
export interface Pick {
  varId: string;
  sel: Selection;
  seq: number;
}
export type OnPick = (varId: string, sel: Selection) => void;

export const unitFor = (u: string) => ({ "°C": "degC", "mm/dia": "mm/day" })[u] ?? u;

const scrollTo = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView?.({ behavior: "smooth", block: "start" }));

/** Hero: title, two calls to action, three chips with numbers from the files, and the globe. */
export function Hero({ data, manifest, child, onPick }: { data: AtlasData; manifest?: Manifest; child?: boolean; onPick: OnPick }) {
  const { lang, t } = useI18n();
  const places = usePlaces();
  const { meta } = data;
  const entry = manifest?.variables.find((v) => v.id === meta.variable.id);
  const pct = entry ? number(entry.significantAreaPct, 0) : null;
  const thing = t(`var.${meta.variable.id}`).toLowerCase();
  const [y0, y1] = [meta.period.start.slice(0, 4), meta.period.end.slice(0, 4)];
  const pickCell = (cell: GridCell) => {
    const key = places.data ? cellPlace(places.data, cell.lat, cell.lon) : undefined;
    onPick(meta.variable.id, key ? { kind: "place", key } : { kind: "cell", cell });
    scrollTo("explorar");
  };
  return (
    <section id="inicio" className={`home-hero atlas-width ${child ? "is-child" : ""}`}>
      <div className="hero-text">
        <p className="hero-eyebrow">
          <Sparkles aria-hidden="true" /> {t("home.eyebrow", { inicio: y0, fim: y1 })}
          {meta.isDemo && <strong className="hero-demo">{t("rotulo.demonstracao")}</strong>}
        </p>
        <h1>{t(child ? "home.crianca.titulo" : "home.titulo")}</h1>
        <p className="home-sub">{t(child ? "home.crianca.sub" : "home.sub")}</p>
        <div className="hero-ctas">
          <button type="button" className="btn-pop" onClick={() => scrollTo("explorar")}>
            <Compass aria-hidden="true" /> {t("home.cta_mapa")}
          </button>
          <button type="button" className="btn-ghost" onClick={() => scrollTo("missoes")}>
            {t("home.cta_missoes")} <ArrowRight aria-hidden="true" />
          </button>
        </div>
        {pct !== null && (
          <p className="home-fact">{child ? t("home.facto_crianca", { pct }) : t("home.facto", { pct, coisa: thing })}</p>
        )}
      </div>
      <div className="hero-globe">
        <Globe data={data} onPick={pickCell} />
        <div className="hero-chip chip-a">
          <span>{t("chip.tendencia_global")}</span>
          <strong>
            {withUnit(meta.highlights.globalTrend.trend, unitFor(meta.variable.unit), lang)} / {t("globo.decada")}
          </strong>
        </div>
        {pct !== null && (
          <div className="hero-chip chip-b">
            <span>{t("chip.area_sig")}</span>
            <strong>{pct} %</strong>
          </div>
        )}
        <p className="hero-globe-hint technical">
          <MousePointerClick aria-hidden="true" /> {t("globo.dica")}
        </p>
      </div>
    </section>
  );
}

/** "01 / 02 / 03": how to read the site, in three short steps. */
export function Steps() {
  const { t } = useI18n();
  return (
    <section className="home-steps atlas-width" aria-labelledby="passos-titulo">
      <h2 id="passos-titulo" className="home-h2">{t("passos.titulo")}</h2>
      <ol>
        {[1, 2, 3].map((n) => (
          <li key={n}>
            <span className="step-n" aria-hidden="true">{String(n).padStart(2, "0")}</span>
            <strong>{t(`passos.${n}.t`)}</strong>
            <p>{t(`passos.${n}.d`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** One card per variable: icon, global trend and significant area from variables.json, real or demo label. */
export function VariableCards({ manifest, selectedId, onSelect, child }: { manifest?: Manifest; selectedId: string; onSelect: (id: string) => void; child?: boolean }) {
  const { lang, t } = useI18n();
  if (!manifest) return null;
  return (
    <section className={`var-cards atlas-width ${child ? "is-child" : ""}`} aria-labelledby="vars-titulo">
      <h2 id="vars-titulo" className="home-h2">{t(child ? "home.crianca.escolhe" : "vars.titulo")}</h2>
      <div className="var-cards-grid">
        {manifest.variables.map((v) => {
          const Icon = ICONS[v.id] ?? Thermometer;
          return (
            <button key={v.id} type="button" className="var-card" data-var={v.id} aria-pressed={v.id === selectedId} onClick={() => onSelect(v.id)}>
              <span className="var-card-icon" aria-hidden="true"><Icon /></span>
              <span className="var-card-name">{t(`var.${v.id}`)}</span>
              {!child && (
                <>
                  <span className="var-card-trend">
                    {withUnit(v.globalTrend, unitFor(v.unit), lang)} <small>{t("vars.por_decada")}</small>
                  </span>
                  <span className="var-card-area">{t("vars.area", { pct: number(v.significantAreaPct, 0) })}</span>
                </>
              )}
              <span className={`var-card-badge ${v.isDemo ? "is-demo" : "is-real"}`}>
                {v.isDemo ? t("rotulo.demonstracao") : t("rotulo.real")}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

interface Mission {
  id: string;
  varId: string;
  sel: Selection;
}
const MISSIONS: Mission[] = [
  { id: "artico_temp", varId: "temperature", sel: { kind: "place", key: "oceano-artico" } },
  { id: "portugal_temp", varId: "temperature", sel: { kind: "place", key: "prt" } },
  { id: "brasil_chuva", varId: "precipitation", sel: { kind: "place", key: "bra" } },
  { id: "gelo_artico", varId: "sea_ice", sel: { kind: "place", key: "oceano-artico" } },
  { id: "mar_global", varId: "sea_level", sel: { kind: "globe" } },
  { id: "aerossois_india", varId: "aerosols", sel: { kind: "place", key: "ind" } },
];

/** Guided questions: each one switches the variable and opens the place on the map. The answer comes from the data. */
export function Missions({ manifest, onMission }: { manifest?: Manifest; onMission: OnPick }) {
  const { t } = useI18n();
  const available = MISSIONS.filter((m) => manifest?.variables.some((v) => v.id === m.varId));
  if (!available.length) return null;
  return (
    <section id="missoes" className="missions atlas-width" aria-labelledby="missoes-titulo">
      <h2 id="missoes-titulo" className="home-h2">{t("missoes.titulo")}</h2>
      <p className="home-h2-sub">{t("missoes.sub")}</p>
      <div className="missions-grid">
        {available.map((m, i) => {
          const Icon = ICONS[m.varId] ?? Thermometer;
          const demo = manifest?.variables.find((v) => v.id === m.varId)?.isDemo;
          return (
            <button
              key={m.id}
              type="button"
              className="mission"
              data-var={m.varId}
              onClick={() => {
                onMission(m.varId, m.sel);
                scrollTo("explorar");
              }}
            >
              <span className="mission-n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <span className="var-card-icon" aria-hidden="true"><Icon /></span>
              <strong>{t(`missao.${m.id}`)}</strong>
              <span className="mission-meta">
                {t(`var.${m.varId}`)}
                {demo && <em> · {t("rotulo.demonstracao")}</em>}
              </span>
              <span className="mission-go">
                {t("missoes.ir")} <ArrowRight aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
