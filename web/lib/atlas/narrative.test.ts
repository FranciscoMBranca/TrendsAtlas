import { describe, expect, it } from "vitest";

import { makeRegion } from "@/test/factories";
import type { VariableMeta } from "@/lib/atlas/data/schema";

import { describeEmergence, describeRegion, trendVerdict } from "./narrative";

const region = makeRegion;

const precip: VariableMeta = {
  id: "precipitation",
  name: "Precipitação",
  unit: "mm/dia",
  trendUnit: "mm/dia por década",
  decimals: 2,
  coverage: "global",
  palette: "precipitation",
  copy: {
    down: "Menos chuva",
    up: "Mais chuva",
    headline: "",
    opening: "",
    subject: "a precipitação",
    description: "",
  },
};
const level: VariableMeta = {
  ...precip,
  id: "sea_level",
  name: "Nível do mar",
  unit: "mm",
  trendUnit: "mm por década",
  decimals: 1,
  copy: { ...precip.copy, subject: "o nível do mar" },
};

describe("narrativa gerada", () => {
  it("só declara subida ou descida quando o teste a sustenta", () => {
    expect(trendVerdict(0.3, true)).toBe("rising");
    expect(trendVerdict(-0.3, true)).toBe("falling");
    expect(trendVerdict(0.3, false)).toBe("unclear");
  });

  it("descreve uma tendência significativa com tamanho, incerteza e p", () => {
    const text = describeRegion(region({}), precip);
    expect(text).toContain("A precipitação sobe 0,30 mm/dia por década");
    expect(text).toContain("IC 95%: 0,20 a 0,40");
    expect(text).toContain("10% da média");
    expect(text).toContain("o acaso explica mal");
  });

  it("não afirma tendência quando não é significativa", () => {
    const text = describeRegion(region({ sig: false, p: 0.4, ci: [-0.1, 0.5] }), precip);
    expect(text).toContain("pode faltar tempo");
    expect(text).not.toContain("sobe");
  });

  it("aguenta a percentagem em falta (média nula)", () => {
    expect(describeRegion(region({ trendPctOfMean: null }), precip)).not.toContain("da média");
  });

  it("usa o sujeito, a unidade e as casas decimais da variável", () => {
    const text = describeRegion(
      region({ trend: 27.8, ci: [20.1, 35.5], trendPctOfMean: null }),
      level,
    );
    expect(text).toContain("O nível do mar sobe 27,8 mm por década");
    expect(text).toContain("IC 95%: 20,1 a 35,5");
    expect(text).not.toContain("da média");
  });

  it("nunca avança causas físicas", () => {
    const text = describeRegion(region({}), precip).toLowerCase();
    for (const cause of ["devido", "causad", "aquecimento", "el niño"]) {
      expect(text).not.toContain(cause);
    }
  });
});

describe("narrativa da emergência", () => {
  it("diz desde quando é detectável", () => {
    expect(describeEmergence(2013, null, 2001)).toContain("detectável em 2013");
  });

  it("projecta com condicional, nunca como certeza", () => {
    const text = describeEmergence(null, 9, 2001);
    expect(text).toContain("Se a tendência actual e o ruído se mantiverem");
    expect(text).toContain("9 anos");
    expect(describeEmergence(null, 1, 2001)).toContain("1 ano ");
  });

  it("admite quando não consegue estimar", () => {
    expect(describeEmergence(null, null, 2001)).toContain("não permitem estimar");
  });
});
