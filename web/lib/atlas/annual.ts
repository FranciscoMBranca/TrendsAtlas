// SPEC-110: data and logic of the presentation mode (yearly anomaly maps).
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { DATA_BASE_URL } from "./data/load";
import type { GridCell } from "./data/schema";
import { areaWeight } from "./scale";

export const annualSchema = z.object({
  schemaVersion: z.literal(3),
  isDemo: z.boolean(),
  variable: z.string(),
  unit: z.string(),
  baseline: z.string(),
  extent: z.number().positive(),
  cells: z.array(z.tuple([z.number(), z.number()])).min(1),
  years: z.array(z.number().int()).min(1),
  values: z.array(z.array(z.number().nullable())),
}).refine((a) => a.values.length === a.years.length && a.values.every((row) => row.length === a.cells.length), {
  message: "values must have one row per year and one value per cell",
});

export type AnnualAnomaly = z.infer<typeof annualSchema>;

/** Playback speeds (ms per year): SPEC-110 asks for 3 levels. */
export const SPEEDS = { lento: 1600, normal: 900, rapido: 450 } as const;
export type Speed = keyof typeof SPEEDS;

/** Area-weighted (cos latitude) mean anomaly of one year; null when no cell has data. */
export function yearMean(a: AnnualAnomaly, yearIndex: number): number | null {
  let num = 0;
  let den = 0;
  a.values[yearIndex]!.forEach((v, i) => {
    if (v === null) return;
    const w = areaWeight(a.cells[i]![0]);
    num += v * w;
    den += w;
  });
  return den > 0 ? num / den : null;
}

/** Next year index when playing; stops (returns null) at the last year. */
export function nextYearIndex(current: number, total: number): number | null {
  return current + 1 < total ? current + 1 : null;
}

/** Grid cells for the map layer; `trend` carries the anomaly of the chosen year. */
export function cellsForYear(a: AnnualAnomaly, yearIndex: number): GridCell[] {
  const row = a.values[yearIndex]!;
  return a.cells.map(([lat, lon], i) => ({
    lat,
    lon,
    trend: row[i] ?? 0,
    p: 1,
    ci: [0, 0] as [number, number],
    sig: false,
    sigFdr: false,
    emergence: null,
    emergenceFdr: null,
    yearsToDetect: null,
  }));
}

export async function loadAnnual(variableId: string, fetcher: (u: string) => Promise<Response> = fetch) {
  const r = await fetcher(`${DATA_BASE_URL}/${variableId}/annual_anomaly.json`);
  if (!r.ok) return null; // variables without a real cube have no yearly maps
  const parsed = annualSchema.safeParse(await r.json());
  return parsed.success ? parsed.data : null;
}

export function useAnnual(variableId: string) {
  return useQuery({
    queryKey: ["atlas-annual", variableId],
    queryFn: () => loadAnnual(variableId),
    staleTime: Infinity,
    retry: false,
  });
}
