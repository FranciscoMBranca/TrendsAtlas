/** Exportação dos dados do mapa e das regiões para CSV (abre em qualquer folha de cálculo). */
import type { GridCell, Region, VariableMeta } from "@/lib/atlas/data/schema";

const cell = (value: string | number | boolean | null): string => {
  if (value === null) return "";
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (header: string[], rows: (string | number | boolean | null)[][]): string =>
  [header, ...rows].map((row) => row.map(cell).join(",")).join("\n") + "\n";

/** "°C por década" -> "°C_por_decada": um nome de coluna seguro para folhas de cálculo. */
const column = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9°%]+/g, "_");

export const gridToCsv = (grid: readonly GridCell[], variable: VariableMeta): string =>
  toCsv(
    [
      "lat",
      "lon",
      `tendencia_${column(variable.trendUnit)}`,
      "p",
      "ic95_inferior",
      "ic95_superior",
      "sig",
      "sig_fdr",
    ],
    grid.map((c) => [c.lat, c.lon, c.trend, c.p, c.ci[0], c.ci[1], c.sig, c.sigFdr]),
  );

export const regionsToCsv = (regions: readonly Region[], variable: VariableMeta): string =>
  toCsv(
    [
      "id",
      "nome",
      "oeste",
      "sul",
      "este",
      "norte",
      `tendencia_${column(variable.trendUnit)}`,
      "p",
      "ic95_inferior",
      "ic95_superior",
      "sig",
      `media_${column(variable.unit)}`,
      "tendencia_pct_da_media",
      "celulas",
    ],
    regions.map((r) => [
      r.id,
      r.name,
      ...r.bbox,
      r.trend,
      r.p,
      r.ci[0],
      r.ci[1],
      r.sig,
      r.meanValue,
      r.trendPctOfMean,
      r.cells,
    ]),
  );

/** Faz o browser descarregar `content` como ficheiro. Só no cliente. */
export function downloadText(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
