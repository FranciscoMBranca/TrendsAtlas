import { describe, expect, it } from "vitest";

import { makeCell } from "@/test/factories";

import {
  FADED_OPACITY,
  areaWeight,
  cellOpacity,
  isSignificant,
  significantAreaPercentage,
  trendColor,
  trendExtent,
} from "./scale";

const cell = makeCell;

describe("regras cartográficas", () => {
  it("pondera a área das células pela latitude", () => {
    const grid = [cell({ lat: 0, sig: true }), cell({ lat: 60 })];
    // pesos cos(0)=1 e cos(60°)=0,5 -> 1 / 1,5
    expect(significantAreaPercentage(grid, "raw")).toBeCloseTo(100 / 1.5, 8);
    expect(areaWeight(60)).toBeCloseTo(0.5, 12);
  });

  it("o modo escolhe qual dos dois critérios de significância conta", () => {
    const onlyRaw = cell({ sig: true, sigFdr: false });
    expect(isSignificant(onlyRaw, "raw")).toBe(true);
    expect(isSignificant(onlyRaw, "fdr")).toBe(false);
    expect(significantAreaPercentage([onlyRaw], "fdr")).toBe(0);
  });

  it("esbate as células não significativas só quando o filtro está activo", () => {
    const weak = cell({ sig: false });
    expect(cellOpacity(weak, "raw", true)).toBe(FADED_OPACITY);
    expect(cellOpacity(weak, "raw", false)).toBe(1);
    expect(cellOpacity(cell({ sig: true }), "raw", true)).toBe(1);
  });

  it("a escala é simétrica em torno de zero e nunca colapsa", () => {
    expect(trendExtent([cell({ trend: -0.6 }), cell({ trend: 0.8 })])).toBe(0.8);
    expect(trendExtent([cell({ trend: 0.01 })])).toBe(0.01); // sem mínimo fixo: o NDVI tem tendências assim
    expect(trendExtent([cell({ trend: 0 })])).toBe(1); // tudo zero: evita dividir por zero
  });

  it("a cor mistura o fundo com o extremo certo, em proporção à magnitude", () => {
    expect(trendColor(0.4, 0.8)).toContain("var(--trend-up) 50.0%");
    expect(trendColor(-0.8, 0.8)).toContain("var(--trend-down) 100.0%");
    expect(trendColor(0, 0.8)).toContain("0.0%");
    expect(trendColor(5, 0.8)).toContain("100.0%"); // fora da escala fica no extremo
  });
});
