// Named places: every 5° cell is a country or an ocean, in five languages
// (public/data/places.json, built by scripts/build-places.mjs).
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import type { Lang } from "./catalog";

export const placesSchema = z.object({
  schemaVersion: z.literal(1),
  stepDeg: z.number(),
  cells: z.record(z.string()),
  places: z.record(
    z.object({
      kind: z.enum(["country", "ocean"]),
      names: z.record(z.string()),
      bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
      centroid: z.tuple([z.number(), z.number()]),
    }),
  ),
});
export type Places = z.infer<typeof placesSchema>;

export interface PlaceHit {
  key: string;
  name: string;
  kind: "country" | "ocean";
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

/** Key of the place that owns a cell (lat/lon of the cell centre). */
export function cellPlace(places: Places, lat: number, lon: number): string | undefined {
  return places.cells[`${lat},${lon}`];
}

export function placeName(places: Places, key: string | undefined, lang: Lang): string {
  if (!key) return "";
  const p = places.places[key];
  return p ? (p.names[lang] ?? p.names.en ?? key) : key;
}

/** Places whose name (in the chosen language, or any other) matches; exact and prefix first. */
export function searchPlaces(places: Places, query: string, lang: Lang, limit = 8): PlaceHit[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const scored: [number, PlaceHit][] = [];
  for (const [key, p] of Object.entries(places.places)) {
    const own = norm(p.names[lang] ?? "");
    const all = Object.values(p.names).map(norm);
    let score = -1;
    if (own === q) score = 0;
    else if (own.startsWith(q)) score = 1;
    else if (all.some((n) => n.startsWith(q))) score = 2;
    else if (all.some((n) => n.includes(q))) score = 3;
    if (score >= 0) scored.push([score, { key, name: placeName(places, key, lang), kind: p.kind }]);
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name))
    .slice(0, limit)
    .map(([, h]) => h);
}

export function usePlaces() {
  return useQuery({
    queryKey: ["places"],
    queryFn: async () => {
      const r = await fetch("/data/places.json");
      if (!r.ok) throw new Error("places.json");
      return placesSchema.parse(await r.json());
    },
    staleTime: Infinity,
    retry: false,
  });
}
