"use client";

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
import { Hero, Missions, Steps, VariableCards, type OnPick, type Pick } from "@/components/HomeParts";
import { Investigate, type InvestigatePreset } from "@/components/Investigate";
import { Sources } from "@/components/Sources";
import { Validation } from "@/components/Validation";
import type { Region } from "@/lib/api";
import type { AtlasData, Manifest } from "@/lib/atlas/data/schema";
import { useI18n } from "@/lib/i18n";

const noop: OnPick = () => {};

interface HomeProps {
  data: AtlasData;
  manifest?: Manifest;
  selectedId: string;
  onSelect: (id: string) => void;
  pick?: Pick | null;
  onPick?: OnPick;
}

/** Child: big variable buttons, the map to touch, the year-by-year film. Nothing else. */
export function ChildHome({ data, manifest, selectedId, onSelect, pick, onPick = noop }: HomeProps) {
  return (
    <div className="home home-crianca">
      <Hero data={data} manifest={manifest} child onPick={onPick} />
      <VariableCards manifest={manifest} selectedId={selectedId} onSelect={onSelect} child />
      <ExploreMap data={data} pick={pick} manifest={manifest} onSwitch={onPick} />
      <Missions manifest={manifest} onMission={onPick} />
      <PresentationLauncher data={data} />
      <Validation />
      <Sources />
    </div>
  );
}

/** Adult / explorer: the interactive map first, then the year-by-year film and the full analysis. */
export function ExplorerHome({ data, manifest, selectedId, onSelect, pick, onPick = noop }: HomeProps) {
  const [preset, setPreset] = useState<InvestigatePreset | null>(null);
  const handOver = (regiao: Region, nome: string) => {
    setPreset((p) => ({ regiao, nome, seq: (p?.seq ?? 0) + 1 }));
    requestAnimationFrame(() => document.getElementById("investigar")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  return (
    <div className="home home-explorador">
      <Hero data={data} manifest={manifest} onPick={onPick} />
      <Steps />
      <VariableCards manifest={manifest} selectedId={selectedId} onSelect={onSelect} />
      <ExploreMap data={data} onInvestigate={handOver} pick={pick} manifest={manifest} onSwitch={onPick} />
      <Missions manifest={manifest} onMission={onPick} />
      <PresentationLauncher data={data} />
      <Investigate data={data} preset={preset} />
      <Validation />
      <Sources />
    </div>
  );
}

/** Scientist: everything, including the detailed atlas sections (tests, FDR, emergence, method). */
export function ScientistHome({ data, manifest, selectedId, onSelect, pick, onPick = noop }: HomeProps) {
  const { lang, t } = useI18n();
  const [preset, setPreset] = useState<InvestigatePreset | null>(null);
  const handOver = (regiao: Region, nome: string) => {
    setPreset((p) => ({ regiao, nome, seq: (p?.seq ?? 0) + 1 }));
    requestAnimationFrame(() => document.getElementById("investigar")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  return (
    <div className="home home-cientista">
      <Hero data={data} manifest={manifest} onPick={onPick} />
      <VariableCards manifest={manifest} selectedId={selectedId} onSelect={onSelect} />
      <ExploreMap data={data} onInvestigate={handOver} pick={pick} manifest={manifest} onSwitch={onPick} />
      <Missions manifest={manifest} onMission={onPick} />
      <PresentationLauncher data={data} />
      <Investigate data={data} preset={preset} />
      <Validation />
      <Sources />
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
