import { geoGraticule10, geoPath, type GeoPermissibleObjects } from "d3-geo";
import {
  useId,
  useMemo,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

import type { GridCell, Region } from "@/lib/atlas/data/schema";
import {
  bboxPathData,
  cellAtPoint,
  cellPathData,
  indexCells,
  viewBoxToString,
  type MapGeometry,
  type ViewBox,
} from "@/lib/atlas/geo/projection";
import { CellLayer, type PaintCell } from "./CellLayer";

const PARALLEL_LABELS = [60, 30, 0, -30, -60] as const;

const parallelText = (lat: number) =>
  lat === 0 ? "0°" : `${Math.abs(lat)}° ${lat > 0 ? "N" : "S"}`;

interface MapCanvasProps {
  grid: readonly GridCell[];
  regions: readonly Region[];
  geometry: MapGeometry;
  stepDeg: number;
  paint: PaintCell;
  land: GeoPermissibleObjects | undefined;
  viewBox: ViewBox;
  hovered: GridCell | null;
  selectedId?: string | null;
  onHover: (cell: GridCell | null) => void;
  onSelectRegion?: (region: Region) => void;
  /** Called when a cell is clicked or tapped (interactive explore map). */
  onSelectCell?: (cell: GridCell) => void;
  /** Descrição para leitores de ecrã. */
  label: string;
}

export function MapCanvas({
  grid,
  regions,
  geometry,
  stepDeg,
  paint,
  land,
  viewBox,
  hovered,
  selectedId = null,
  onHover,
  onSelectRegion,
  onSelectCell,
  label,
}: MapCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  // Cada mapa tem o seu padrão: ids repetidos na página fariam um mapa usar o padrão do outro.
  const patternId = `dots-${useId().replace(/:/g, "")}`;
  const { projection } = geometry;

  const shapes = useMemo(() => {
    const path = geoPath(projection);
    return {
      sphere: path({ type: "Sphere" }) ?? "",
      graticule: path(geoGraticule10()) ?? "",
      land: land ? (path(land) ?? "") : "",
      regions: regions.map((region) => bboxPathData(projection, region.bbox)),
    };
  }, [projection, land, regions]);

  const index = useMemo(() => indexCells(grid, stepDeg), [grid, stepDeg]);

  /** Converte a posição do rato/dedo em coordenadas do SVG (respeita o zoom do viewBox). */
  function cellUnder(event: MouseEvent | PointerEvent): GridCell | undefined {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return undefined;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return cellAtPoint(projection, index, stepDeg, [point.x, point.y]);
  }

  const activate = (region: Region) => (event: MouseEvent | KeyboardEvent) => {
    if ("key" in event && event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    onSelectRegion?.(region);
  };

  // Com zoom, o pontilhado e as legendas mantêm o tamanho no ecrã (em vez de crescerem com o mapa).
  const screenScale = viewBox.w / geometry.width;
  const dotSpacing = 5 * screenScale;
  const labelSize = (10 * viewBox.w) / 1100;

  return (
    <svg
      ref={svgRef}
      className="world-map"
      viewBox={viewBoxToString(viewBox)}
      role="img"
      aria-label={label}
      onPointerMove={(event) => onHover(cellUnder(event) ?? null)}
      onPointerLeave={() => onHover(null)}
      onClick={(event) => {
        const cell = cellUnder(event) ?? null;
        onHover(cell);
        if (cell && onSelectCell) onSelectCell(cell);
      }}
    >
      <defs>
        <pattern
          id={patternId}
          width={dotSpacing}
          height={dotSpacing}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={dotSpacing / 2}
            cy={dotSpacing / 2}
            r={dotSpacing * 0.13}
            className="map-dot"
          />
        </pattern>
      </defs>
      <path d={shapes.sphere} className="map-sphere" />
      <CellLayer
        grid={grid}
        geometry={geometry}
        stepDeg={stepDeg}
        paint={paint}
        patternId={patternId}
      />
      <path d={shapes.graticule} className="map-graticule" />
      <path d={shapes.land} className="map-land" />
      <path d={shapes.sphere} className="map-frame" />

      {PARALLEL_LABELS.map((lat) => {
        const point = projection([-180, lat]);
        return point ? (
          <text
            key={lat}
            x={point[0] + 6}
            y={point[1] - 3}
            className="map-parallel"
            style={{ fontSize: labelSize }}
          >
            {parallelText(lat)}
          </text>
        ) : null;
      })}

      {hovered && <path d={cellPathData(projection, hovered, stepDeg)} className="map-hover" />}

      {regions.map((region, i) => (
        <path
          key={region.id}
          d={shapes.regions[i]}
          className={`region-outline ${selectedId === region.id ? "selected" : ""}`}
          tabIndex={0}
          role="button"
          aria-label={`Explorar ${region.name}`}
          onClick={activate(region)}
          onKeyDown={activate(region)}
        />
      ))}
    </svg>
  );
}
