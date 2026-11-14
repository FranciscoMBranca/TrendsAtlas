/**
 * Declive de Theil-Sen + teste de Mann-Kendall, no browser.
 *
 * É a mesma matemática de `pipeline/src/terratempo/trend.py`, sem a correcção
 * de autocorrelação de Hamed-Rao (só faz sentido em séries reais; a demonstração
 * usa ruído branco, onde o factor seria 1). Os testes confrontam este ficheiro
 * com resultados do Python (`mann-kendall.fixtures.json`).
 *
 *   - Quanto muda?  Declive de Sen = mediana dos declives de TODOS os pares de pontos.
 *   - É real?       Mann-Kendall conta quantos pares sobem menos quantos descem (S).
 *                   Com S longe de zero, o acaso explica mal os dados.
 */
import { normalQuantile, twoSidedP } from "./normal";

/** Menor número de pontos para o teste fazer sentido (igual ao pipeline). */
export const MIN_SAMPLES = 10;

export interface TrendResult {
  /** Declive de Sen, por passo de tempo. */
  slope: number;
  ciLow: number;
  ciHigh: number;
  /** Valor-p bilateral. */
  p: number;
  z: number;
  s: number;
  varS: number;
  n: number;
}

const median = (sorted: readonly number[]): number => {
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

/** Variância de S sob "sem tendência", com correcção de empates. */
export function varianceS(values: readonly number[]): number {
  const n = values.length;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let ties = 0;
  for (const t of counts.values()) if (t > 1) ties += t * (t - 1) * (2 * t + 5);
  return (n * (n - 1) * (2 * n + 5) - ties) / 18;
}

/** z com correcção de continuidade. */
const zScore = (s: number, varS: number): number =>
  s > 0 ? (s - 1) / Math.sqrt(varS) : s < 0 ? (s + 1) / Math.sqrt(varS) : 0;

/** S de Mann-Kendall: pares que sobem menos pares que descem. Sem alocar nem ordenar. */
function scoreS(values: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < values.length - 1; i++) {
    for (let j = i + 1; j < values.length; j++) s += Math.sign(values[j]! - values[i]!);
  }
  return s;
}

/**
 * Só o teste de Mann-Kendall (sem o declive de Sen): mais rápido, para quando
 * só interessa o valor-p, como nas janelas da emergência. `null` se a série for inválida.
 */
export function mannKendallTest(
  values: readonly number[],
): { s: number; varS: number; z: number; p: number } | null {
  if (values.length < MIN_SAMPLES || !values.every(Number.isFinite)) return null;
  if (Math.min(...values) === Math.max(...values)) return null;
  const s = scoreS(values);
  const varS = varianceS(values);
  const z = zScore(s, varS);
  return { s, varS, z, p: twoSidedP(z) };
}

/** Todos os declives (yj − yi)/(j − i), ordenados. */
function sortedPairSlopes(values: readonly number[]): { slopes: number[]; s: number } {
  const slopes: number[] = [];
  let s = 0;
  for (let i = 0; i < values.length - 1; i++) {
    for (let j = i + 1; j < values.length; j++) {
      const diff = values[j]! - values[i]!;
      s += Math.sign(diff);
      slopes.push(diff / (j - i));
    }
  }
  return { slopes: slopes.sort((a, b) => a - b), s };
}

/**
 * Devolve `null` para séries curtas, com valores inválidos ou constantes
 * (o mesmo critério do pipeline: nunca inventar um resultado).
 */
export function mannKendallSen(values: readonly number[], alpha = 0.05): TrendResult | null {
  const n = values.length;
  if (n < MIN_SAMPLES || !values.every(Number.isFinite)) return null;
  if (Math.min(...values) === Math.max(...values)) return null;

  const { slopes, s } = sortedPairSlopes(values);
  const varS = varianceS(values);
  const z = zScore(s, varS);

  // Intervalo de confiança de Sen (Gilbert, 1987): ranks (N − C)/2 e (N + C)/2.
  const c = normalQuantile(1 - alpha / 2) * Math.sqrt(varS);
  const lowIndex = Math.min(
    Math.max(Math.floor((slopes.length - c) / 2) - 1, 0),
    slopes.length - 1,
  );
  const highIndex = Math.min(Math.max(Math.ceil((slopes.length + c) / 2), 0), slopes.length - 1);

  return {
    slope: median(slopes),
    ciLow: slopes[lowIndex]!,
    ciHigh: slopes[highIndex]!,
    p: twoSidedP(z),
    z,
    s,
    varS,
    n,
  };
}

/** Recta de Sen: declive + intercepto (mediana dos resíduos), para desenhar a tendência. */
export function senLine(values: readonly number[]): { slope: number; intercept: number } {
  const { slopes } = sortedPairSlopes(values);
  const slope = median(slopes);
  const intercept = median(values.map((v, i) => v - slope * i).sort((a, b) => a - b));
  return { slope, intercept };
}

/**
 * Benjamini-Hochberg: marca os valores-p que sobrevivem ao controlo da taxa de
 * falsas descobertas `q`. Com milhares de testes, p < 0,05 deixa passar ~5% de acasos.
 */
export function fdrBenjaminiHochberg(pValues: readonly number[], q: number): boolean[] {
  const m = pValues.length;
  const order = pValues.map((p, index) => ({ p, index })).sort((a, b) => a.p - b.p);
  let cutoff = -1;
  order.forEach(({ p }, rank) => {
    if (p <= (q * (rank + 1)) / m) cutoff = rank;
  });
  const flagged = new Array<boolean>(m).fill(false);
  for (let rank = 0; rank <= cutoff; rank++) flagged[order[rank]!.index] = true;
  return flagged;
}
