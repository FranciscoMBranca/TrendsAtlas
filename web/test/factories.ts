/** Fábricas de dados para testes: um valor completo e válido, ajustável campo a campo. */
import type { GridCell, Region } from "@/lib/atlas/data/schema";

export const makeCell = (overrides: Partial<GridCell> = {}): GridCell => ({
  lat: 0,
  lon: 0,
  trend: 0,
  p: 0.5,
  ci: [-0.5, 0.5],
  sig: false,
  sigFdr: false,
  emergence: null,
  emergenceFdr: null,
  yearsToDetect: null,
  ...overrides,
});

export const makeRegion = (overrides: Partial<Region> = {}): Region => ({
  id: "r",
  name: "R",
  bbox: [0, 0, 10, 10],
  trend: 0.3,
  p: 0.001,
  ci: [0.2, 0.4],
  sig: true,
  meanValue: 3,
  trendPctOfMean: 10,
  cells: 4,
  emergence: 2013,
  yearsToDetect: null,
  series: [{ date: "2001-01-01", anomaly: 0 }],
  ...overrides,
});
