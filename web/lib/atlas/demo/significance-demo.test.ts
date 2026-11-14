import { describe, expect, it } from "vitest";

import { generateSeries, runDemo, simulateFalseAlarms } from "./significance-demo";

const base = { trendPerDecade: 0.5, noiseSd: 0.5, years: 20, seed: 1 };

describe("demonstração de significância", () => {
  it("é reprodutível: mesma semente, mesma série", () => {
    expect(generateSeries(base)).toEqual(generateSeries(base));
    expect(generateSeries({ ...base, seed: 2 })).not.toEqual(generateSeries(base));
  });

  it("tem 12 meses por ano", () => {
    expect(generateSeries({ ...base, years: 7 })).toHaveLength(84);
  });

  it("sinal forte e ruído baixo: tendência detectada e próxima da verdadeira", () => {
    const { result, significant } = runDemo({ ...base, trendPerDecade: 0.6, noiseSd: 0.2 });
    expect(significant).toBe(true);
    expect(result!.slopePerDecade).toBeGreaterThan(0.5);
    expect(result!.slopePerDecade).toBeLessThan(0.7);
    expect(result!.ciPerDecade[0]).toBeLessThan(result!.slopePerDecade);
    expect(result!.ciPerDecade[1]).toBeGreaterThan(result!.slopePerDecade);
  });

  it("a mesma tendência passa a acaso quando o ruído sobe muito e a série é curta", () => {
    const weak = runDemo({ trendPerDecade: 0.2, noiseSd: 1.5, years: 5, seed: 3 });
    expect(weak.significant).toBe(false);
    expect(weak.result!.ciPerDecade[0]).toBeLessThan(0);
    expect(weak.result!.ciPerDecade[1]).toBeGreaterThan(0);
  });

  it("mais anos estreitam o intervalo de confiança", () => {
    const width = (years: number) => {
      const { result } = runDemo({ ...base, years });
      return result!.ciPerDecade[1] - result!.ciPerDecade[0];
    };
    expect(width(24)).toBeLessThan(width(6));
  });

  it("a recta de Sen tem um ponto por mês", () => {
    const outcome = runDemo(base);
    expect(outcome.line).toHaveLength(outcome.values.length);
  });
});

describe("emergência na demonstração", () => {
  it("emerge se, e só se, o teste do período completo for significativo", () => {
    for (let seed = 1; seed <= 12; seed++) {
      const outcome = runDemo({ trendPerDecade: 0.25, noiseSd: 1, years: 20, seed });
      expect(outcome.emergence!.year !== null).toBe(outcome.significant);
    }
  });

  it("com menos de 10 anos não há janela para medir", () => {
    expect(runDemo({ ...base, years: 8 }).emergence).toBeNull();
  });

  it("só quem não emergiu tem horizonte", () => {
    const strong = runDemo({ trendPerDecade: 0.8, noiseSd: 0.3, years: 20, seed: 1 });
    expect(strong.emergence!.year).not.toBeNull();
    expect(strong.emergence!.yearsToDetect).toBeNull();
  });
});

describe("falsos alarmes em ruído puro", () => {
  const outcome = simulateFalseAlarms(300, 120, 11, 0.1);

  it("com p < 0,05 aparecem ~5% de 'sinais' falsos", () => {
    const rate = outcome.rawCount / outcome.series;
    expect(rate).toBeGreaterThan(0.02);
    expect(rate).toBeLessThan(0.09);
  });

  it("o controlo de falsas descobertas elimina quase todos", () => {
    expect(outcome.fdrCount).toBeLessThanOrEqual(2);
    expect(outcome.fdrCount).toBeLessThan(outcome.rawCount);
  });
});
