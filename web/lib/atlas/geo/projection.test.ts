import { geoPath } from "d3-geo";
import { describe, expect, it } from "vitest";

import { makeCell } from "@/test/factories";

import {
  MAP_WIDTH,
  bboxPathData,
  cellAtPoint,
  cellPathData,
  createMapGeometry,
  indexCells,
  viewBoxForBbox,
  viewBoxForZoom,
} from "./projection";

const geometry = createMapGeometry();
const cell = (lat: number, lon: number) => makeCell({ lat, lon, p: 1, ci: [0, 0] });

/** Área de um polígono SVG "M x,y L x,y … Z" (fórmula do cordão). */
function polygonArea(path: string): number {
  const points = path
    .replace(/[MZ]/g, "")
    .split("L")
    .map((pair) => pair.split(",").map(Number) as [number, number]);
  let sum = 0;
  points.forEach(([x1, y1], i) => {
    const [x2, y2] = points[(i + 1) % points.length]!;
    sum += x1 * y2 - x2 * y1;
  });
  return Math.abs(sum) / 2;
}

describe("projecção Equal Earth", () => {
  it("ocupa a largura definida e tem proporção ~2:1", () => {
    expect(geometry.width).toBe(MAP_WIDTH);
    expect(geometry.width / geometry.height).toBeGreaterThan(1.9);
    expect(geometry.width / geometry.height).toBeLessThan(2.2);
  });

  it("preserva áreas: a razão entre células segue cos(lat)", () => {
    const equator = polygonArea(cellPathData(geometry.projection, cell(2.5, 0), 5));
    const mid = polygonArea(cellPathData(geometry.projection, cell(62.5, 0), 5));
    // Área exacta de uma faixa de latitude: ∝ sin(lat2) − sin(lat1).
    const band = (a: number, b: number) =>
      Math.sin((b * Math.PI) / 180) - Math.sin((a * Math.PI) / 180);
    expect(mid / equator).toBeCloseTo(band(60, 65) / band(0, 5), 1);
  });

  it("células vizinhas partilham cantos (sem frestas)", () => {
    const west = cellPathData(geometry.projection, cell(2.5, 2.5), 5);
    const east = cellPathData(geometry.projection, cell(2.5, 7.5), 5);
    const corners = (path: string) => path.replace(/[MZ]/g, "").split("L");
    // canto nordeste da oeste == canto noroeste da este
    expect(corners(west)[1]).toBe(corners(east)[0]);
  });

  it("uma célula projectada devolve-se a si própria pelo ponto central", () => {
    const index = indexCells([cell(2.5, 132.5), cell(-87.5, -177.5)], 5);
    const centre = geometry.projection([132.5, 2.5])!;
    expect(cellAtPoint(geometry.projection, index, 5, centre)?.lon).toBe(132.5);
    const corner = geometry.projection([-177.5, -87.5])!;
    expect(cellAtPoint(geometry.projection, index, 5, corner)?.lat).toBe(-87.5);
  });

  it("fora do globo não devolve célula", () => {
    const index = indexCells([cell(0, 0)], 5);
    expect(cellAtPoint(geometry.projection, index, 5, [-50, -50])).toBeUndefined();
  });
});

describe("enquadramento", () => {
  it("zoom 1 mostra o mapa inteiro; zoom 2 mostra metade, centrada", () => {
    expect(viewBoxForZoom(geometry, 1)).toEqual({
      x: 0,
      y: 0,
      w: geometry.width,
      h: geometry.height,
    });
    const two = viewBoxForZoom(geometry, 2);
    expect(two.w).toBe(geometry.width / 2);
    expect(two.x).toBe(geometry.width / 4);
  });

  it("uma região fica dentro do enquadramento, sem deformar o mapa", () => {
    const bbox = [135, -10, 180, 12] as const;
    const box = viewBoxForBbox(geometry, bbox);
    expect(box.w / box.h).toBeCloseTo(geometry.width / geometry.height, 6);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.w).toBeLessThanOrEqual(geometry.width + 1e-9);
    const [x, y] = geometry.projection([157, 1])!;
    expect(x).toBeGreaterThan(box.x);
    expect(x).toBeLessThan(box.x + box.w);
    expect(y).toBeGreaterThan(box.y);
    expect(y).toBeLessThan(box.y + box.h);
  });

  it("o contorno de uma região é um caminho fechado", () => {
    const path = bboxPathData(geometry.projection, [135, -10, 180, 12]);
    expect(path.startsWith("M")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(geoPath(geometry.projection)({ type: "Sphere" })).toBeTruthy();
  });
});
