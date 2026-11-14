/**
 * Distribuição normal padrão, sem dependências.
 *
 * O teste de Mann-Kendall converte a estatística S numa variável z e pergunta:
 * "se não houvesse tendência, que probabilidade teria um z tão extremo?".
 * Essa probabilidade (o valor-p) vem da cauda da curva normal.
 */

const SQRT_PI = Math.sqrt(Math.PI);

/** erfc(x) para x >= 0, com boa precisão relativa mesmo em caudas muito pequenas. */
function erfcPositive(x: number): number {
  if (x < 2.5) {
    // Série de erf(x) = 2/√π · e^(−x²) · Σ 2ⁿ x^(2n+1) / (1·3·5···(2n+1)); sem cancelamentos.
    let term = x;
    let sum = x;
    for (let n = 1; n < 200; n++) {
      term *= (2 * x * x) / (2 * n + 1);
      sum += term;
      if (term < 1e-17 * sum) break;
    }
    return 1 - (2 / SQRT_PI) * Math.exp(-x * x) * sum;
  }
  // Fracção contínua para a cauda: erfc(x) = e^(−x²) / (√π · K), K = x + (1/2)/(x + 1/(x + (3/2)/(x + …)))
  let k = x;
  for (let i = 80; i >= 1; i--) k = x + i / 2 / k;
  return Math.exp(-x * x) / (SQRT_PI * k);
}

/** P(Z > z) para Z normal padrão (cauda superior). */
export function normalUpperTail(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const tail = 0.5 * erfcPositive(x);
  return z >= 0 ? tail : 1 - tail;
}

/** Valor-p bilateral: P(|Z| > |z|). */
export const twoSidedP = (z: number): number => Math.min(1, 2 * normalUpperTail(Math.abs(z)));

/**
 * Quantil da normal padrão (inversa da função de distribuição).
 * Algoritmo de Acklam, erro relativo < 1,2e-9.
 */
export function normalQuantile(p: number): number {
  if (p <= 0 || p >= 1) throw new RangeError("p tem de estar em (0, 1)");
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    );
  }
  if (p > 1 - low) return -normalQuantile(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) /
    (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1)
  );
}
