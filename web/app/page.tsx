"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AtlasFooter } from "@/components/atlas/AtlasFooter";
import { DataGate } from "@/components/atlas/DataGate";
import { FloatingChat } from "@/components/FloatingChat";
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
  const select = (id: string) => {
    const next = new URLSearchParams(window.location.search);
    next.set("v", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const Home = HOMES[audience];

  return (
    <div data-palette={selectedId} data-audience={audience}>
      <TopBar variables={variables} selectedId={selectedId} onSelect={select} />
      <main>
        <DataGate query={query}>
          {(data) => <Home data={data} manifest={manifest.data} selectedId={selectedId} onSelect={select} />}
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
