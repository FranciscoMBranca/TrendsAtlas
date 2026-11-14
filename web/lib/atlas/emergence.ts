/**
 * Regras do tempo de emergência para o site: cores, intervalos e resumo.
 * (O cálculo estatístico vive no pipeline; aqui só se lê e se codifica.)
 */
import type { GridCell } from "@/lib/atlas/data/schema";
import { areaWeight } from "@/lib/atlas/scale";

/** Fundo das células que ainda não emergiram. */
export const NOT_YET_FILL = "var(--secondary)";

/** Intervalos de "anos até detectar". Acima do último, ou sem previsão, fica o balde final. */
export const HORIZON_BUCKETS = [
  { maxYears: 5, label: "até 5 anos", strength: 90 },
  { maxYears: 10, label: "6 a 10 anos", strength: 70 },
  { maxYears: 20, label: "11 a 20 anos", strength: 50 },
  { maxYears: 30, label: "21 a 30 anos", strength: 30 },
] as const;

export const BEYOND_BUCKET = { label: "mais de 30 anos ou sem previsão", strength: 12 } as const;

/** Índice do balde (0..HORIZON_BUCKETS.length). O último é "além do horizonte / sem previsão". */
export function horizonBucket(yearsToDetect: number | null): number {
  if (yearsToDetect === null) return HORIZON_BUCKETS.length;
  const index = HORIZON_BUCKETS.findIndex((bucket) => yearsToDetect <= bucket.maxYears);
  return index === -1 ? HORIZON_BUCKETS.length : index;
}

const mixWithBackground = (anchor: string, strength: number) =>
  `color-mix(in oklab, ${anchor} ${strength.toFixed(0)}%, var(--background))`;

/** Emergiu cedo = cor forte; emergiu tarde = cor pálida. */
export function emergenceColor(year: number, firstYear: number, lastYear: number): string {
  const span = Math.max(1, lastYear - firstYear);
  const earliness = 1 - (year - firstYear) / span; // 1 = primeira janela, 0 = última
  return mixWithBackground("var(--primary)", 30 + 70 * earliness);
}

/** Pendentes: quanto mais perto de ser detectável, mais forte o castanho. */
export function horizonColor(bucket: number): string {
  const strength =
    bucket < HORIZON_BUCKETS.length ? HORIZON_BUCKETS[bucket]!.strength : BEYOND_BUCKET.strength;
  return mixWithBackground("var(--trend-down)", strength);
}

/** Já detectado, no mapa do horizonte: um tom discreto, para destacar o que falta. */
export const DETECTED_FILL = mixWithBackground("var(--primary)", 22);

export interface EmergenceSummary {
  /** % da área (ponderada por cos lat) com tendência já detectável. */
  emergedPct: number;
  /** Mediana, ponderada pela área, do ano de emergência entre as que emergiram. */
  medianYear: number | null;
  /** Área ainda sem tendência detectável, em %. */
  pendingPct: number;
  /** A área pendente repartida por horizonte; as percentagens somam `pendingPct`. */
  buckets: { label: string; pct: number }[];
}

export function summarizeEmergence(grid: readonly GridCell[]): EmergenceSummary {
  const total = grid.reduce((sum, c) => sum + areaWeight(c.lat), 0);
  const pct = (weight: number) => (total === 0 ? 0 : (100 * weight) / total);

  const bucketWeights = new Array<number>(HORIZON_BUCKETS.length + 1).fill(0);
  const emerged: { year: number; weight: number }[] = [];
  for (const cell of grid) {
    const weight = areaWeight(cell.lat);
    if (cell.emergence !== null) emerged.push({ year: cell.emergence, weight });
    else bucketWeights[horizonBucket(cell.yearsToDetect)]! += weight;
  }

  const emergedWeight = emerged.reduce((s, e) => s + e.weight, 0);
  let median: number | null = null;
  let running = 0;
  for (const { year, weight } of emerged.sort((a, b) => a.year - b.year)) {
    running += weight;
    if (running >= emergedWeight / 2) {
      median = year;
      break;
    }
  }

  const labels = [...HORIZON_BUCKETS.map((b) => b.label), BEYOND_BUCKET.label];
  const buckets = labels.map((label, i) => ({ label, pct: pct(bucketWeights[i]!) }));
  return {
    emergedPct: pct(emergedWeight),
    medianYear: median,
    pendingPct: buckets.reduce((s, b) => s + b.pct, 0),
    buckets,
  };
}
