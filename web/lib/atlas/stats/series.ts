/** Utilitários para séries mensais. */

/** Média móvel centrada; as pontas, sem janela completa, ficam `null`. */
export function movingAverage(values: readonly number[], window: number): (number | null)[] {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const start = i - half;
    const end = start + window;
    if (start < 0 || end > values.length) return null;
    let sum = 0;
    for (let k = start; k < end; k++) sum += values[k]!;
    return sum / window;
  });
}

/** Média pesada: `weights[i]` multiplica `values[i]`. */
export function weightedMean(values: readonly number[], weights: readonly number[]): number {
  let total = 0;
  let sum = 0;
  values.forEach((v, i) => {
    total += weights[i]!;
    sum += v * weights[i]!;
  });
  return total === 0 ? 0 : sum / total;
}
