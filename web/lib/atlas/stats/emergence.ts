/**
 * Tempo de emergência no browser: desde quando uma tendência é detectável,
 * e quantos anos faltam quando ainda não é.
 *
 * Mesma lógica de `pipeline/src/terratempo/emergence.py`, sem correcção de
 * autocorrelação (a demonstração usa ruído branco). Os testes confrontam os
 * resultados com fixtures geradas pelo Python.
 */
import { normalQuantile } from "./normal";
import { mannKendallTest, MIN_SAMPLES, senLine } from "./mann-kendall";

/** Variância do declive de Sen ≈ 1/0,955 da dos mínimos quadrados em ruído normal. */
const SEN_VARIANCE_RATIO = 1 / 0.955;
export const DEFAULT_MIN_YEARS = 10;
export const DEFAULT_MAX_HORIZON_YEARS = 100;

/** Início da sequência FINAL de `true`, como índice; -1 se a última janela for `false`. */
export function trailingRunStart(flags: readonly boolean[]): number {
  let start = flags.length;
  while (start > 0 && flags[start - 1]) start--;
  return start === flags.length ? -1 : start;
}

/**
 * Primeiro ano a partir do qual a tendência é significativa em todas as janelas
 * expansivas seguintes (2001–2010, 2001–2011, …, até ao fim). `null` se nunca emergiu.
 */
export function emergenceYear(
  values: readonly number[],
  firstYear: number,
  { minYears = DEFAULT_MIN_YEARS, alpha = 0.05 } = {},
): number | null {
  const totalYears = Math.floor(values.length / 12);
  if (totalYears < minYears) return null;

  const flags: boolean[] = [];
  for (let years = minYears; years <= totalYears; years++) {
    const result = mannKendallTest(values.slice(0, years * 12));
    flags.push(result !== null && result.p < alpha);
  }
  const start = trailingRunStart(flags);
  return start < 0 ? null : firstYear + minYears - 1 + start;
}

/**
 * Anos extra de dados até a tendência estimada ser detectável, se ela e o ruído
 * se mantiverem. Projecção condicional: uma ordem de grandeza, não uma previsão.
 * `null` quando não há previsão honesta (declive nulo ou horizonte absurdo).
 */
export function yearsToDetect(
  values: readonly number[],
  { alpha = 0.05, maxHorizonYears = DEFAULT_MAX_HORIZON_YEARS } = {},
): number | null {
  const n = values.length;
  if (n < MIN_SAMPLES) return null;
  const { slope, intercept } = senLine(values);
  if (slope === 0) return null;

  const residuals = values.map((v, t) => v - (intercept + slope * t));
  const mean = residuals.reduce((s, r) => s + r, 0) / n;
  const sigma = Math.sqrt(residuals.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 2));

  const z = normalQuantile(1 - alpha / 2);
  const required = (z * sigma * Math.sqrt(12 * SEN_VARIANCE_RATIO)) / Math.abs(slope);
  const totalYears = Math.cbrt(required ** 2) / 12;
  const extra = Math.max(Math.ceil(totalYears - n / 12), 1);
  return Number.isFinite(extra) && extra <= maxHorizonYears ? extra : null;
}

export interface EmergenceOutcome {
  /** Ano de emergência, ou null se ainda não emergiu. */
  year: number | null;
  /** Só preenchido quando ainda não emergiu. */
  yearsToDetect: number | null;
}

/** Os dois resultados juntos, com a mesma regra do pipeline (horizonte só para quem não emergiu). */
export function emergenceOutcome(values: readonly number[], firstYear: number): EmergenceOutcome {
  const year = emergenceYear(values, firstYear);
  return { year, yearsToDetect: year === null ? yearsToDetect(values) : null };
}
