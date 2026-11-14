/**
 * Números pseudo-aleatórios com semente: a mesma semente dá sempre os mesmos
 * dados, o que torna a demonstração reprodutível (e testável).
 */

/** mulberry32: gerador pequeno e rápido, uniforme em [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruído normal (média 0, desvio 1) pelo método de Box-Muller. */
export function gaussian(random: () => number): () => number {
  return () => {
    const u = 1 - random(); // evita log(0)
    const v = random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}
