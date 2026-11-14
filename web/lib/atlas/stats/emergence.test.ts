import { describe, expect, it } from "vitest";

import fixtures from "./emergence.fixtures.json";
import { emergenceOutcome, emergenceYear, trailingRunStart, yearsToDetect } from "./emergence";
import { gaussian, mulberry32 } from "./random";

describe("emergência: igualdade com o pipeline Python", () => {
  for (const { name, values, expected } of fixtures) {
    it(name, () => {
      const outcome = emergenceOutcome(values, 2001);
      expect(outcome.year).toBe(expected.emergence);
      expect(outcome.yearsToDetect).toBe(expected.yearsToDetect);
    });
  }
});

describe("persistência", () => {
  it("o início da sequência final de verdadeiros", () => {
    expect(trailingRunStart([false, true, false, true, true])).toBe(3);
    expect(trailingRunStart([true, true, true])).toBe(0);
    expect(trailingRunStart([true, true, false])).toBe(-1);
    expect(trailingRunStart([])).toBe(-1);
  });
});

describe("propriedades", () => {
  const noise = gaussian(mulberry32(5));
  const series = (decade: number, sd: number) =>
    Array.from({ length: 288 }, (_, t) => (decade / 120) * t + sd * noise());

  it("sinal forte emerge cedo; sem tendência raramente emerge", () => {
    expect(emergenceYear(series(0.8, 1), 2001)).toBeLessThanOrEqual(2013);
    const flat = Array.from({ length: 40 }, () => emergenceYear(series(0, 1), 2001));
    expect(flat.filter((y) => y !== null).length / flat.length).toBeLessThan(0.2);
  });

  it("séries curtas não têm emergência", () => {
    expect(emergenceYear(series(0.8, 1).slice(0, 96), 2001)).toBeNull();
  });

  it("tendência mais forte precisa de menos anos extra", () => {
    const base = Array.from({ length: 288 }, () => noise());
    const horizon = (decade: number) => yearsToDetect(base.map((v, t) => v + (decade / 120) * t))!;
    expect(horizon(0.02)).toBeGreaterThan(horizon(0.04));
    expect(horizon(0.04)).toBeGreaterThan(horizon(0.08));
  });

  it("sem previsão quando o declive é nulo", () => {
    expect(yearsToDetect(Array.from({ length: 120 }, (_, t) => (t % 2 ? 1 : -1)))).toBeNull();
  });
});
