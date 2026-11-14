import type { GridCell, Region } from "@/lib/atlas/data/schema";
import { significantAreaPercentage } from "@/lib/atlas/scale";

export interface Highlights {
  /** Região com o maior aumento (só entre as que aumentam), ou null. */
  increase: Region | null;
  /** Região com a maior redução, ou null. */
  decrease: Region | null;
  significantAreaPct: number;
  significantAreaPctFdr: number;
}

/**
 * Os números grandes da abertura, calculados a partir dos dados.
 * O pipeline publica os mesmos valores em `meta.highlights`; um teste garante
 * que os dois caminhos concordam.
 */
export function computeHighlights(
  grid: readonly GridCell[],
  regions: readonly Region[],
): Highlights {
  const rising = regions.filter((r) => r.trend > 0);
  const falling = regions.filter((r) => r.trend < 0);
  const extreme = (list: Region[], pick: (a: number, b: number) => number) =>
    list.reduce<Region | null>(
      (best, r) => (best && pick(best.trend, r.trend) === best.trend ? best : r),
      null,
    );

  return {
    increase: extreme(rising, Math.max),
    decrease: extreme(falling, Math.min),
    significantAreaPct: significantAreaPercentage(grid, "raw"),
    significantAreaPctFdr: significantAreaPercentage(grid, "fdr"),
  };
}
