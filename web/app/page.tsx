"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AtlasFooter } from "@/components/atlas/AtlasFooter";
import { AtlasHeader } from "@/components/atlas/AtlasHeader";
import { DataGate } from "@/components/atlas/DataGate";
import { EmergenceSection } from "@/components/atlas/emergence/EmergenceSection";
import { MethodSection } from "@/components/atlas/MethodSection";
import { PresentationLauncher } from "@/components/atlas/PresentationMode";
import { Opening } from "@/components/atlas/Opening";
import { Panorama } from "@/components/atlas/Panorama";
import { RegionContrast } from "@/components/atlas/RegionContrast";
import { SignificanceDemo } from "@/components/atlas/SignificanceDemo";
import { TrendMap } from "@/components/atlas/TrendMap";
import { VariableSection } from "@/components/atlas/VariableSection";
import { Investigate } from "@/components/Investigate";
import { useAtlasData, useManifest } from "@/lib/atlas/data/use-atlas-data";
import { DEFAULT_VARIABLE, pickVariable } from "@/lib/atlas/variables";

/** The chosen variable lives in the URL (`/?v=sea_ice`): shareable, and "back" works. */
function Atlas() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const v = params.get("v") ?? undefined;
  const manifest = useManifest();
  const variables = manifest.data?.variables;
  const selectedId = variables ? pickVariable(variables, v) : (v ?? DEFAULT_VARIABLE);
  const query = useAtlasData(selectedId);
  const select = (id: string) => router.replace(`${pathname}?v=${id}`, { scroll: false });

  return (
    <div data-palette={selectedId}>
      <AtlasHeader variables={variables} selectedId={selectedId} onSelect={select} />
      <main>
        <Opening data={query.data} />
        {manifest.data && <Panorama manifest={manifest.data} selectedId={selectedId} onSelect={select} />}
        <DataGate query={query}>
          {(data) => (
            <>
              <VariableSection data={data} />
              <TrendMap data={data} />
              <PresentationLauncher data={data} />
              <EmergenceSection data={data} />
              <Investigate data={data} />
              <RegionContrast data={data} />
              <SignificanceDemo meta={data.meta} />
              <MethodSection data={data} />
            </>
          )}
        </DataGate>
      </main>
      <AtlasFooter meta={query.data?.meta} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Atlas />
    </Suspense>
  );
}
