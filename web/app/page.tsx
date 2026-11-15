"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AtlasFooter } from "@/components/atlas/AtlasFooter";
import { DataGate } from "@/components/atlas/DataGate";
import { FloatingChat } from "@/components/FloatingChat";
import type { Selection } from "@/components/ExploreMap";
import type { Pick } from "@/components/HomeParts";
import { ChildHome, ExplorerHome, ScientistHome } from "@/components/Homes";
import { TopBar, Welcome } from "@/components/Shell";
import { useAtlasData, useManifest } from "@/lib/atlas/data/use-atlas-data";
import { DEFAULT_VARIABLE, pickVariable } from "@/lib/atlas/variables";
import { useI18n } from "@/lib/i18n";

const HOMES = { crianca: ChildHome, explorador: ExplorerHome, cientista: ScientistHome } as const;

/**
 * The home page is rendered from the filters: audience (child / explorer / scientist),
 * language and variable. The variable lives in the URL (`?v=`), audience and language too
 * (`?p=` and `?l=`), so a link opens in the same view.
 */
function Atlas() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { audience } = useI18n();
  const v = params.get("v") ?? undefined;
  const manifest = useManifest();
  const variables = manifest.data?.variables;
  const selectedId = variables ? pickVariable(variables, v) : (v ?? DEFAULT_VARIABLE);
  const query = useAtlasData(selectedId);
  const [pick, setPick] = useState<Pick | null>(null);
  const go = (id: string) => {
    const next = new URLSearchParams(window.location.search);
    next.set("v", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  // Choosing a variable by hand forgets any pending place; the globe and missions set one.
  const select = (id: string) => {
    setPick(null);
    go(id);
  };
  const onPick = (varId: string, sel: Selection) => {
    setPick((p) => ({ varId, sel, seq: (p?.seq ?? 0) + 1 }));
    if (varId !== selectedId) go(varId);
  };
  const Home = HOMES[audience];

  return (
    <div data-palette={selectedId} data-audience={audience}>
      <TopBar variables={variables} selectedId={selectedId} onSelect={select} />
      <main>
        <DataGate query={query}>
          {(data) => <Home data={data} manifest={manifest.data} selectedId={selectedId} onSelect={select} pick={pick} onPick={onPick} />}
        </DataGate>
      </main>
      <AtlasFooter meta={query.data?.meta} />
      <FloatingChat variable={selectedId} />
      <Welcome />
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
