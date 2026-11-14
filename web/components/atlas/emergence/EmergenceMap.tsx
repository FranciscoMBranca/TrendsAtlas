import { useCallback, useMemo, useState } from "react";

import type { GridCell } from "@/lib/atlas/data/schema";
import {
  BEYOND_BUCKET,
  DETECTED_FILL,
  HORIZON_BUCKETS,
  NOT_YET_FILL,
  emergenceColor,
  horizonBucket,
  horizonColor,
} from "@/lib/atlas/emergence";
import { createMapGeometry, viewBoxForZoom } from "@/lib/atlas/geo/projection";
import { useLand } from "@/lib/atlas/data/use-atlas-data";

import type { PaintCell } from "../map/CellLayer";
import { MapCanvas } from "../map/MapCanvas";
import { EmergenceTooltip } from "./EmergenceTooltip";

export type EmergenceView = "when" | "left";

interface EmergenceMapProps {
  grid: readonly GridCell[];
  stepDeg: number;
  view: EmergenceView;
  /** Ano da linha do tempo (só conta na vista "when"). */
  year: number;
  firstYear: number;
  lastYear: number;
  /** Primeiro ano com dados (para as frases). */
  firstDataYear: number;
}

export function emergenceLegendItems(view: EmergenceView, firstYear: number, lastYear: number) {
  return view === "when"
    ? { gradient: true as const, first: firstYear, last: lastYear }
    : {
        gradient: false as const,
        swatches: [
          ...HORIZON_BUCKETS.map((b, i) => ({ label: b.label, color: horizonColor(i) })),
          { label: BEYOND_BUCKET.label, color: horizonColor(HORIZON_BUCKETS.length) },
          { label: "já detectável", color: DETECTED_FILL },
        ],
      };
}

export function EmergenceMap({
  grid,
  stepDeg,
  view,
  year,
  firstYear,
  lastYear,
  firstDataYear,
}: EmergenceMapProps) {
  const geometry = useMemo(() => createMapGeometry(), []);
  const land = useLand();
  const [hovered, setHovered] = useState<GridCell | null>(null);

  const paint = useCallback<PaintCell>(
    (cell) => {
      if (view === "when") {
        const emerged = cell.emergence !== null && cell.emergence <= year;
        return {
          fill: emerged ? emergenceColor(cell.emergence!, firstYear, lastYear) : NOT_YET_FILL,
          opacity: 1,
          stipple: false,
        };
      }
      return {
        fill:
          cell.emergence !== null ? DETECTED_FILL : horizonColor(horizonBucket(cell.yearsToDetect)),
        opacity: 1,
        stipple: false,
      };
    },
    [view, year, firstYear, lastYear],
  );

  return (
    <div className="map-canvas">
      <MapCanvas
        grid={grid}
        regions={[]}
        geometry={geometry}
        stepDeg={stepDeg}
        paint={paint}
        land={land.data}
        viewBox={viewBoxForZoom(geometry, 1)}
        hovered={hovered}
        onHover={setHovered}
        label={
          view === "when"
            ? "Mapa do ano em que a tendência de cada célula passou a ser detectável. Cor forte: cedo; pálida: tarde; cinzento: ainda não."
            : "Mapa dos anos de dados que faltam para detectar a tendência de cada célula, se a tendência actual persistir."
        }
      />
      {hovered && <EmergenceTooltip cell={hovered} firstDataYear={firstDataYear} />}
    </div>
  );
}
