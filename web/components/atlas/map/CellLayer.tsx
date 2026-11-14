import { memo, useMemo } from "react";

import type { GridCell } from "@/lib/atlas/data/schema";
import { cellPathData, type MapGeometry } from "@/lib/atlas/geo/projection";

/** Como desenhar uma célula: cor de preenchimento, opacidade e se leva pontilhado. */
export interface CellPaint {
  fill: string;
  opacity: number;
  stipple: boolean;
}

export type PaintCell = (cell: GridCell) => CellPaint;

interface CellLayerProps {
  grid: readonly GridCell[];
  geometry: MapGeometry;
  stepDeg: number;
  /** Deve ter identidade estável (useCallback): a camada só se redesenha quando muda. */
  paint: PaintCell;
  /** Id do `<pattern>` de pontilhado, definido no SVG que contém esta camada. */
  patternId: string;
}

/**
 * Uma `<path>` por célula, mais uma única camada de pontilhado para as marcadas.
 * Não sabe o que as cores significam; quem a usa decide (tendência, emergência...).
 */
export const CellLayer = memo(function CellLayer({
  grid,
  geometry,
  stepDeg,
  paint,
  patternId,
}: CellLayerProps) {
  const paths = useMemo(
    () => grid.map((cell) => cellPathData(geometry.projection, cell, stepDeg)),
    [grid, geometry, stepDeg],
  );
  const painted = useMemo(() => grid.map(paint), [grid, paint]);
  const stipple = useMemo(
    () => paths.filter((_, i) => painted[i]!.stipple).join(""),
    [paths, painted],
  );

  return (
    <g className="map-cells">
      {grid.map((cell, i) => (
        <path
          key={`${cell.lat}:${cell.lon}`}
          d={paths[i]}
          fill={painted[i]!.fill}
          stroke={painted[i]!.fill}
          strokeWidth={0.4}
          opacity={painted[i]!.opacity}
        />
      ))}
      <path d={stipple} fill={`url(#${patternId})`} className="map-stipple" />
    </g>
  );
});
