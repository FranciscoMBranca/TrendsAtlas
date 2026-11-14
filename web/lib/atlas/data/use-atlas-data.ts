import { useQuery } from "@tanstack/react-query";
import type { GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

import { DATA_BASE_URL, loadAtlasData, loadManifest } from "./load";

/** Dados científicos do atlas. São estáticos: nunca ficam "velhos" durante a visita. */
export function useAtlasData(variableId: string | undefined) {
  return useQuery({
    queryKey: ["atlas-data", variableId],
    queryFn: () => loadAtlasData(variableId as string),
    enabled: variableId !== undefined,
    staleTime: Infinity,
    retry: false,
  });
}

/** O índice das variáveis: decide o selector e o painel comparativo. */
export function useManifest() {
  return useQuery({
    queryKey: ["atlas-manifest"],
    queryFn: () => loadManifest(),
    staleTime: Infinity,
    retry: false,
  });
}

/** Contornos de terra (TopoJSON). Só decoração: se falhar, o mapa continua útil. */
export function useLand() {
  return useQuery({
    queryKey: ["atlas-land"],
    queryFn: async (): Promise<GeoPermissibleObjects> => {
      const response = await fetch(`${DATA_BASE_URL}/land.json`);
      if (!response.ok) throw new Error(`land.json: resposta ${response.status}`);
      const topology = (await response.json()) as Topology<{ land: GeometryCollection }>;
      return feature(topology, topology.objects.land);
    },
    staleTime: Infinity,
    retry: false,
  });
}
