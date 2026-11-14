import { describe, expect, it } from "vitest";

import fixtures from "./mann-kendall.fixtures.json";
import { fdrBenjaminiHochberg, mannKendallSen, senLine, varianceS } from "./mann-kendall";
import { normalQuantile, normalUpperTail, twoSidedP } from "./normal";
import { gaussian, mulberry32 } from "./random";
import { movingAverage, weightedMean } from "./series";

describe("distribuição normal", () => {
  it("coincide com valores de referência", () => {
    expect(normalUpperTail(0)).toBeCloseTo(0.5, 12);
    expect(twoSidedP(1.959963984540054)).toBeCloseTo(0.05, 10);
    expect(twoSidedP(2.575829303548901)).toBeCloseTo(0.01, 10);
    expect(normalQuantile(0.975)).toBeCloseTo(1.959963984540054, 7);
    expect(normalQuantile(0.5)).toBeCloseTo(0, 12);
  });

  it("mantém precisão relativa nas caudas muito pequenas", () => {
    // P(|Z| > 10) = 1,523970604832e-23 (valor de referência do scipy)
    expect(twoSidedP(10) / 1.523970604832105e-23).toBeCloseTo(1, 6);
    // A fronteira entre os dois métodos de cálculo (x = 2,5·√2 ≈ 3,54) é contínua.
    expect(twoSidedP(3.5355) / twoSidedP(3.5356)).toBeCloseTo(1, 3);
  });

  it("o quantil é a inversa da função de distribuição", () => {
    for (const p of [0.001, 0.02, 0.3, 0.8, 0.999]) {
      expect(1 - normalUpperTail(normalQuantile(p))).toBeCloseTo(p, 8);
    }
  });
});

describe("Mann-Kendall + Sen: igualdade com o pipeline Python", () => {
  for (const { name, values, expected } of fixtures) {
    it(name, () => {
      const result = mannKendallSen(values)!;
      expect(result.s).toBe(expected.s);
      expect(result.slope).toBeCloseTo(expected.slope, 12);
      expect(result.ciLow).toBeCloseTo(expected.ciLow, 12);
      expect(result.ciHigh).toBeCloseTo(expected.ciHigh, 12);
      expect(result.varS).toBeCloseTo(expected.varS, 8);
      expect(result.z).toBeCloseTo(expected.z, 10);
      // Em p minúsculos comparamos a razão (precisão relativa), não a diferença.
      expect(result.p / expected.p).toBeCloseTo(1, 5);
    });
  }
});

describe("casos limite", () => {
  it("não inventa resultados: série curta, constante ou inválida devolve null", () => {
    expect(mannKendallSen([1, 2, 3])).toBeNull();
    expect(mannKendallSen(new Array(30).fill(2))).toBeNull();
    expect(mannKendallSen([...new Array(29).fill(1), Number.NaN])).toBeNull();
  });

  it("uma recta perfeita tem declive exacto e p minúsculo", () => {
    const line = Array.from({ length: 40 }, (_, i) => 3 + 0.5 * i);
    const result = mannKendallSen(line)!;
    expect(result.slope).toBeCloseTo(0.5, 12);
    expect(result.p).toBeLessThan(1e-12);
    expect(senLine(line).intercept).toBeCloseTo(3, 12);
  });

  it("a variância de S desconta empates", () => {
    const noTies = varianceS([1, 2, 3, 4, 5]);
    expect(noTies).toBeCloseTo((5 * 4 * 15) / 18, 12);
    expect(varianceS([1, 1, 1, 2, 3])).toBeLessThan(noTies);
  });
});

describe("Benjamini-Hochberg", () => {
  it("é mais exigente do que p < 0,05 para os sinais marginais", () => {
    // 3 sinais fortes + ruído; p = 0,045 passa o limiar de 0,05, mas o de BH no rank 4 é 0,04.
    const p = [0.0001, 0.0004, 0.002, 0.045, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    expect(fdrBenjaminiHochberg(p, 0.1)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it("devolve na ordem original e sem alterar a entrada", () => {
    const p = [0.9, 0.0001, 0.8];
    expect(fdrBenjaminiHochberg(p, 0.1)).toEqual([false, true, false]);
    expect(p).toEqual([0.9, 0.0001, 0.8]);
  });
});

describe("aleatoriedade com semente", () => {
  it("a mesma semente dá a mesma sequência; sementes diferentes divergem", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(mulberry32(8)()).not.toBe(mulberry32(7)());
  });

  it("o ruído gaussiano tem média ≈ 0 e desvio ≈ 1", () => {
    const noise = gaussian(mulberry32(1));
    const draws = Array.from({ length: 20000 }, noise);
    const mean = draws.reduce((s, v) => s + v, 0) / draws.length;
    const variance = draws.reduce((s, v) => s + (v - mean) ** 2, 0) / draws.length;
    expect(mean).toBeCloseTo(0, 1);
    expect(variance).toBeCloseTo(1, 1);
  });
});

describe("séries", () => {
  it("média móvel centrada deixa as pontas vazias", () => {
    expect(movingAverage([1, 2, 3, 4, 5], 3)).toEqual([null, 2, 3, 4, null]);
  });
  it("média pesada", () => {
    expect(weightedMean([1, 3], [1, 3])).toBe(2.5);
    expect(weightedMean([5], [0])).toBe(0);
  });
});
