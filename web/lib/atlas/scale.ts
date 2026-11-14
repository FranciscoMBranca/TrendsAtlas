/**
 * Regras de codificação científica do mapa: o que é "significativo", como se
 * pondera a área e como se traduz uma tendência numa cor.
 * São funções puras para poderem ser testadas sem desenhar nada.
 */
import { scaleLinear } from "d3-scale";

import type { GridCell } from "@/lib/atlas/data/schema";

/**
 * Que critério de significância o mapa usa.
 *  - `raw`: p < 0,05 em cada célula (simples, mas ~5% de falsos positivos por acaso).
 *  - `fdr`: Benjamini-Hochberg, que controla a proporção de falsos positivos.
 */
export type SignificanceMode = "raw" | "fdr";

export const SIGNIFICANCE_MODES: Record<SignificanceMode, { label: string; legend: string }> = {
  raw: { label: "p < 0,05", legend: "p < 0,05, sem correcção para testes múltiplos" },
  fdr: { label: "Com FDR", legend: "controlo de falsas descobertas (Benjamini-Hochberg)" },
};

/** Opacidade das células não significativas quando o filtro está activo. */
export const FADED_OPACITY = 0.15;

export const isSignificant = (cell: GridCell, mode: SignificanceMode): boolean =>
  mode === "fdr" ? cell.sigFdr : cell.sig;

export const cellOpacity = (cell: GridCell, mode: SignificanceMode, onlySignificant: boolean) =>
  onlySignificant && !isSignificant(cell, mode) ? FADED_OPACITY : 1;

/** Peso de área de uma célula: os meridianos convergem, logo a área encolhe com cos(lat). */
export const areaWeight = (lat: number): number => Math.cos((lat * Math.PI) / 180);

/** % da área do globo (ponderada por cos(lat)) com tendência significativa. */
export function significantAreaPercentage(grid: readonly GridCell[], mode: SignificanceMode) {
  const total = grid.reduce((sum, cell) => sum + areaWeight(cell.lat), 0);
  if (total === 0) return 0;
  const flagged = grid.reduce(
    (sum, cell) => sum + (isSignificant(cell, mode) ? areaWeight(cell.lat) : 0),
    0,
  );
  return (100 * flagged) / total;
}

/**
 * Extremo da escala: simétrico, para o zero ficar sempre no centro (cor neutra).
 * Não há mínimo fixo: o NDVI tem tendências de 0,02 e o nível do mar de 70, e cada
 * variável usa a sua própria escala. Se tudo for zero, 1 evita dividir por zero.
 */
export function trendExtent(grid: readonly GridCell[]): number {
  return Math.max(...grid.map((cell) => Math.abs(cell.trend))) || 1;
}

/**
 * Cor de uma tendência: mistura o fundo com a cor da descida ou a da subida (por variável)
 * em proporção à magnitude. Usa `var(--…)` do tema, por isso não precisa de ler o
 * DOM e funciona igual no servidor.
 */
export function trendColor(trend: number, extent: number): string {
  const mix = scaleLinear().domain([0, extent]).range([0, 100]).clamp(true);
  const anchor = trend < 0 ? "var(--trend-down)" : "var(--trend-up)";
  return `color-mix(in oklab, ${anchor} ${mix(Math.abs(trend)).toFixed(1)}%, var(--background))`;
}
