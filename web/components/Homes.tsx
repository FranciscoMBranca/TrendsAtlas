"use client";

import { CloudRain, Leaf, Snowflake, Thermometer, Waves, Wind } from "lucide-react";
import { useState } from "react";

import { EmergenceSection } from "@/components/atlas/emergence/EmergenceSection";
import { MethodSection } from "@/components/atlas/MethodSection";
import { Panorama } from "@/components/atlas/Panorama";
import { PresentationLauncher } from "@/components/atlas/PresentationMode";
import { RegionContrast } from "@/components/atlas/RegionContrast";
import { SignificanceDemo } from "@/components/atlas/SignificanceDemo";
import { TrendMap } from "@/components/atlas/TrendMap";
import { VariableSection } from "@/components/atlas/VariableSection";
import { ExploreMap } from "@/components/ExploreMap";
import { Investigate, type InvestigatePreset } from "@/components/Investigate";
import type { Region } from "@/lib/api";
import type { AtlasData, Manifest } from "@/lib/atlas/data/schema";
import { number } from "@/lib/atlas/format";
import { useI18n } from "@/lib/i18n";

const ICONS: Record<string, typeof Thermometer> = {
  temperature: Thermometer,
  precipitation: CloudRain,
  vegetation: Leaf,
  sea_ice: Snowflake,
  aerosols: Wind,
  sea_level: Waves,
};

interface HomeProps {
  data: AtlasData;
  manifest?: Manifest;
  selectedId: string;
  onSelect: (id: string) => void;
}

function Hero({ data, manifest, child }: { data: AtlasData; manifest?: Manifest; child?: boolean }) {
  const { t } = useI18n();
  const entry = manifest?.variables.find((v) => v.id === data.meta.variable.id);
  const pct = entry ? number(entry.significantAreaPct, 0) : null;
  const thing = t(`var.${data.meta.variable.id}`).toLowerCase();
  return (
    <section id="inicio" className={`home-hero atlas-width ${child ? "is-child" : ""}`}>
      <h1>{t(child ? "home.crianca.titulo" : "home.titulo")}</h1>
      <p className="home-sub">{t(child ? "home.crianca.sub" : "home.sub")}</p>
      {pct !== null && (
        <p className="home-fact">
          {child ? t("home.facto_crianca", { pct }) : t("home.facto", { pct, coisa: thing })}
        </p>
      )}
    </section>
  );
}

/** Child: big variable buttons, the map to touch, the year-by-year film. Nothing else. */
export function ChildHome({ data, manifest, selectedId, onSelect }: HomeProps) {
  const { t } = useI18n();
  return (
    <div className="home home-crianca">
      <Hero data={data} manifest={manifest} child />
      {manifest && (
        <section className="atlas-width child-vars" aria-label={t("home.crianca.escolhe")}>
          <p>{t("home.crianca.escolhe")}</p>
          <div>
            {manifest.variables.map((v) => {
              const Icon = ICONS[v.id] ?? Thermometer;
              return (
                <button key={v.id} type="button" aria-pressed={v.id === selectedId} onClick={() => onSelect(v.id)} data-palette={v.id}>
                  <Icon aria-hidden="true" />
                  <span>{t(`var.${v.id}`)}</span>
                  {v.isDemo && <small>{t("rotulo.demonstracao")}</small>}
                </button>
              );
            })}
          </div>
        </section>
      )}
      <ExploreMap data={data} />
      <PresentationLauncher data={data} />
    </div>
  );
}

/** Adult / explorer: the interactive map first, then the year-by-year film and the full analysis. */
export function ExplorerHome({ data, manifest }: HomeProps) {
  const [preset, setPreset] = useState<InvestigatePreset | null>(null);
  const handOver = (regiao: Region, nome: string) => {
    setPreset((p) => ({ regiao, nome, seq: (p?.seq ?? 0) + 1 }));
    requestAnimationFrame(() => document.getElementById("investigar")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  return (
    <div className="home home-explorador">
      <Hero data={data} manifest={manifest} />
      <ExploreMap data={data} onInvestigate={handOver} />
      <PresentationLauncher data={data} />
      <Investigate data={data} preset={preset} />
    </div>
  );
}

/** Scientist: everything, including the detailed atlas sections (tests, FDR, emergence, method). */
export function ScientistHome({ data, manifest, selectedId, onSelect }: HomeProps) {
  const { lang, t } = useI18n();
  const [preset, setPreset] = useState<InvestigatePreset | null>(null);
  const handOver = (regiao: Region, nome: string) => {
    setPreset((p) => ({ regiao, nome, seq: (p?.seq ?? 0) + 1 }));
    requestAnimationFrame(() => document.getElementById("investigar")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  return (
    <div className="home home-cientista">
      <Hero data={data} manifest={manifest} />
      <ExploreMap data={data} onInvestigate={handOver} />
      <PresentationLauncher data={data} />
      <Investigate data={data} preset={preset} />
      {lang !== "pt" && (
        <p className="atlas-width secoes-notice" role="note">
          {t("secoes.so_pt")}
        </p>
      )}
      <div lang="pt">
        {manifest && <Panorama manifest={manifest} selectedId={selectedId} onSelect={onSelect} />}
        <VariableSection data={data} />
        <TrendMap data={data} />
        <EmergenceSection data={data} />
        <RegionContrast data={data} />
        <SignificanceDemo meta={data.meta} />
        <MethodSection data={data} />
      </div>
    </div>
  );
}
