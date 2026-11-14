import type { AtlasMeta } from "@/lib/atlas/data/schema";

/** Etiqueta honesta sobre a origem dos dados; vem de `meta.isDemo`, nunca fixa no código. */
export function DataBadge({ meta }: { meta: AtlasMeta | undefined }) {
  if (!meta) return null;
  return meta.isDemo ? (
    <span className="data-badge">dados de exemplo</span>
  ) : (
    <span className="data-badge data-badge-real">{meta.source.name}</span>
  );
}
