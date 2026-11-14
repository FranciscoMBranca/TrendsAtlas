import type { ReactNode } from "react";

import { AtlasDataError } from "@/lib/atlas/data/load";
import type { AtlasData } from "@/lib/atlas/data/schema";
import type { useAtlasData } from "@/lib/atlas/data/use-atlas-data";

interface DataGateProps {
  query: ReturnType<typeof useAtlasData>;
  children: (data: AtlasData) => ReactNode;
}

/** Mostra o estado de carregamento ou o erro; só desenha o conteúdo com dados válidos. */
export function DataGate({ query, children }: DataGateProps) {
  if (query.data) return <>{children(query.data)}</>;

  if (query.isError) {
    const detail = query.error instanceof AtlasDataError ? query.error.message : null;
    return (
      <div className="atlas-width data-state" role="alert">
        <strong>Não foi possível ler os dados.</strong>
        <p>Verifique os ficheiros em public/data e volte a carregar a página.</p>
        {detail && <p className="technical">{detail}</p>}
      </div>
    );
  }
  return (
    <div className="atlas-width data-state" role="status">
      A preparar a cartografia…
    </div>
  );
}
