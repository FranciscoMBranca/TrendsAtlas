/**
 * Geometria do mapa: projecção, caminhos SVG e conversões ecrã <-> coordenadas.
 *
 * Projecção Equal Earth (Šavrič, Patterson & Jenny, 2018): preserva ÁREAS.
 * Isto importa num mapa de tendências: numa projecção que incha os pólos, as
 * regiões polares pareceriam maiores do que são e dominariam a leitura.
 */
import { geoEqualEarth, geoPath, type GeoProjection } from "d3-geo";

import type { GridCell } from "@/lib/atlas/data/schema";

/** Largura do sistema de coordenadas SVG; a altura deriva da projecção. */
export const MAP_WIDTH = 1000;

const SPHERE = { type: "Sphere" } as const;

export interface MapGeometry {
  projection: GeoProjection;
  width: number;
  height: number;
}

export function createMapGeometry(): MapGeometry {
  const projection = geoEqualEarth().fitWidth(MAP_WIDTH, SPHERE);
  const [[, top], [, bottom]] = geoPath(projection).bounds(SPHERE);
  // fitWidth deixa o topo em 0 (ou muito perto); a altura é a extensão vertical.
  return { projection, width: MAP_WIDTH, height: Math.ceil(bottom - Math.min(top, 0)) };
}

export type Bbox = readonly [west: number, south: number, east: number, north: number];

const fixed = (value: number): string => value.toFixed(1);

/**
 * Contorno de uma célula como polígono de 4 cantos projectados.
 * Cantos partilhados entre vizinhas dão exactamente o mesmo ponto, sem frestas.
 */
export function cellPathData(projection: GeoProjection, cell: GridCell, stepDeg: number): string {
  const half = stepDeg / 2;
  const corners: [number, number][] = [
    [cell.lon - half, cell.lat + half],
    [cell.lon + half, cell.lat + half],
    [cell.lon + half, cell.lat - half],
    [cell.lon - half, cell.lat - half],
  ];
  const points = corners.map((corner) => projection(corner));
  if (points.some((point) => point === null)) return "";
  return `M${points.map((p) => `${fixed(p![0])},${fixed(p![1])}`).join("L")}Z`;
}

/** Anel ao longo do rectângulo, com pontos intermédios para os lados curvarem como paralelos/meridianos. */
function bboxRing([west, south, east, north]: Bbox, stepDeg = 2.5): [number, number][] {
  const ring: [number, number][] = [];
  const steps = (from: number, to: number) => Math.max(1, Math.ceil(Math.abs(to - from) / stepDeg));
  const lerp = (a: number, b: number, i: number, n: number) => a + ((b - a) * i) / n;

  for (let i = 0, n = steps(west, east); i < n; i++) ring.push([lerp(west, east, i, n), north]);
  for (let i = 0, n = steps(north, south); i < n; i++) ring.push([east, lerp(north, south, i, n)]);
  for (let i = 0, n = steps(east, west); i < n; i++) ring.push([lerp(east, west, i, n), south]);
  for (let i = 0, n = steps(south, north); i < n; i++) ring.push([west, lerp(south, north, i, n)]);
  return ring;
}

/** Caminhos SVG a partir de pontos já projectados. */
function projectedPath(projection: GeoProjection, ring: [number, number][]): string {
  const points = ring.map((coordinate) => projection(coordinate)).filter((p) => p !== null);
  return points.length < 3
    ? ""
    : `M${points.map((p) => `${fixed(p[0])},${fixed(p[1])}`).join("L")}Z`;
}

export const bboxPathData = (projection: GeoProjection, bbox: Bbox): string =>
  projectedPath(projection, bboxRing(bbox));

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const viewBoxToString = ({ x, y, w, h }: ViewBox): string => `${x} ${y} ${w} ${h}`;

/** Ampliação centrada no mapa inteiro (`zoom` >= 1). */
export function viewBoxForZoom({ width, height }: MapGeometry, zoom: number): ViewBox {
  return {
    x: width / 2 - width / (2 * zoom),
    y: height / 2 - height / (2 * zoom),
    w: width / zoom,
    h: height / zoom,
  };
}

/**
 * Enquadra uma região, mantendo a proporção do mapa para não deformar nada.
 * `padding` é a folga em torno da região (0,3 = 30%).
 */
export function viewBoxForBbox(
  { projection, width, height }: MapGeometry,
  bbox: Bbox,
  padding = 0.3,
): ViewBox {
  const points = bboxRing(bbox).flatMap((c) => {
    const p = projection(c);
    return p ? [p] : [];
  });
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const aspect = width / height;
  let w = (maxX - minX) * (1 + padding);
  let h = (maxY - minY) * (1 + padding);
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  // Nunca mais afastado do que o mapa inteiro, nunca mais próximo do que 1/8 dele.
  w = Math.min(Math.max(w, width / 8), width);
  h = w / aspect;

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const x = Math.min(Math.max(cx - w / 2, 0), width - w);
  const y = Math.min(Math.max(cy - h / 2, 0), height - h);
  return { x, y, w, h };
}

/** Chave estável de uma célula na grelha, a partir do centro. */
export const cellKey = (lat: number, lon: number, stepDeg: number): string =>
  `${Math.floor((lat + 90) / stepDeg)}:${Math.floor((lon + 180) / stepDeg)}`;

export function indexCells(grid: readonly GridCell[], stepDeg: number): Map<string, GridCell> {
  return new Map(grid.map((cell) => [cellKey(cell.lat, cell.lon, stepDeg), cell]));
}

/** Célula sob um ponto do mapa (coordenadas SVG), ou `undefined` fora do globo. */
export function cellAtPoint(
  projection: GeoProjection,
  index: ReadonlyMap<string, GridCell>,
  stepDeg: number,
  point: readonly [number, number],
): GridCell | undefined {
  const coordinate = projection.invert?.([point[0], point[1]]);
  if (!coordinate) return undefined;
  const [lon, lat] = coordinate;
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return undefined;
  }
  return index.get(cellKey(lat, lon, stepDeg));
}
