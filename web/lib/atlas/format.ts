/** Formatação de números em português europeu. */

export const number = (value: number, digits = 2): string =>
  value.toLocaleString("pt-PT", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Número com sinal explícito e o menos tipográfico (−), para alinhar tendências. */
export const signed = (value: number, digits = 2): string =>
  `${value >= 0 ? "+" : "−"}${number(Math.abs(value), digits)}`;

/** Valor-p legível: valores muito pequenos passam a "< 0,001". */
export const formatP = (p: number): string => (p < 0.001 ? "< 0,001" : number(p, 3));

/** "2001-01" -> 2001 */
export const yearOf = (period: string): number => Number(period.slice(0, 4));
