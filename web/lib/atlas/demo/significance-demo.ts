/**
 * Motor da demonstração "É significativo?".
 *
 * Fabrica séries sintéticas (recta + ruído branco com semente) e aplica o MESMO
 * teste que o pipeline aplica a cada célula do mapa. Serve para sentir, a mexer,
 * porque é que a mesma tendência pode ser real numa série e acaso noutra.
 */
import {
  fdrBenjaminiHochberg,
  mannKendallSen,
  senLine,
  type TrendResult,
} from "@/lib/atlas/stats/mann-kendall";
import { emergenceOutcome, DEFAULT_MIN_YEARS, type EmergenceOutcome } from "@/lib/atlas/stats/emergence";
import { gaussian, mulberry32 } from "@/lib/atlas/stats/random";

export const MONTHS_PER_DECADE = 120;

export interface DemoParams {
  /** Tendência verdadeira imposta, unidades por década (a demonstração é abstracta: serve para qualquer variável). */
  trendPerDecade: number;
  /** Desvio-padrão do ruído mensal, unidades. */
  noiseSd: number;
  years: number;
  seed: number;
}

export interface DemoOutcome {
  values: number[];
  /** Resultado do teste, convertido para "por década"; null se a série for inválida. */
  result: (TrendResult & { slopePerDecade: number; ciPerDecade: [number, number] }) | null;
  /** Recta de Sen ao longo dos meses (para desenhar). */
  line: number[];
  significant: boolean;
  /** Desde quando é detectável / quanto falta; null com menos anos do que a janela mínima. */
  emergence: EmergenceOutcome | null;
}

export const ALPHA = 0.05;

/** A série da demonstração começa sempre neste ano (só serve para escrever o ano de emergência). */
export const DEMO_FIRST_YEAR = 2001;

export function generateSeries({ trendPerDecade, noiseSd, years, seed }: DemoParams): number[] {
  const noise = gaussian(mulberry32(seed));
  const perMonth = trendPerDecade / MONTHS_PER_DECADE;
  return Array.from({ length: Math.round(years * 12) }, (_, t) => perMonth * t + noiseSd * noise());
}

export function runDemo(params: DemoParams): DemoOutcome {
  const values = generateSeries(params);
  const raw = mannKendallSen(values, ALPHA);
  const { slope, intercept } = senLine(values);
  const line = values.map((_, t) => intercept + slope * t);
  const emergence =
    params.years >= DEFAULT_MIN_YEARS ? emergenceOutcome(values, DEMO_FIRST_YEAR) : null;
  if (!raw) return { values, result: null, line, significant: false, emergence };

  return {
    values,
    line,
    significant: raw.p < ALPHA,
    emergence,
    result: {
      ...raw,
      slopePerDecade: raw.slope * MONTHS_PER_DECADE,
      ciPerDecade: [raw.ciLow * MONTHS_PER_DECADE, raw.ciHigh * MONTHS_PER_DECADE],
    },
  };
}

export interface FalseAlarmOutcome {
  series: number;
  /** Quantas séries SEM tendência real saíram com p < 0,05. */
  rawCount: number;
  /** Quantas sobrevivem ao controlo de falsas descobertas. */
  fdrCount: number;
}

/**
 * Testa `series` séries de puro ruído. Todos os "sinais" encontrados são falsos
 * por construção; é isto que acontece num mapa com milhares de células.
 */
export function simulateFalseAlarms(
  series: number,
  months: number,
  seed: number,
  fdrQ: number,
): FalseAlarmOutcome {
  const noise = gaussian(mulberry32(seed));
  const pValues: number[] = [];
  for (let k = 0; k < series; k++) {
    const values = Array.from({ length: months }, noise);
    const result = mannKendallSen(values, ALPHA);
    if (result) pValues.push(result.p);
  }
  return {
    series: pValues.length,
    rawCount: pValues.filter((p) => p < ALPHA).length,
    fdrCount: fdrBenjaminiHochberg(pValues, fdrQ).filter(Boolean).length,
  };
}
