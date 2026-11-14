import { describe, expect, it } from "vitest";

import type { ManifestEntry } from "@/lib/atlas/data/schema";

import { DEFAULT_VARIABLE, pickVariable } from "./variables";

const entry = (id: string): ManifestEntry => ({
  id,
  name: id,
  unit: "",
  trendUnit: "",
  decimals: 2,
  coverage: "global",
  isDemo: true,
  source: "",
  globalTrend: 0,
  globalP: 1,
  significantAreaPct: 0,
  significantAreaPctFdr: 0,
  pendingAreaPct: 100,
  firstEmergenceYear: null,
  chanceLevelPct: 5,
});

describe("pickVariable", () => {
  const all = [entry("sea_ice"), entry(DEFAULT_VARIABLE), entry("aerosols")];

  it("respeita a variável pedida quando existe", () => {
    expect(pickVariable(all, "aerosols")).toBe("aerosols");
  });
  it("um ?v= inventado cai na variável de defeito", () => {
    expect(pickVariable(all, "ozono")).toBe(DEFAULT_VARIABLE);
    expect(pickVariable(all)).toBe(DEFAULT_VARIABLE);
  });
  it("sem a variável de defeito usa a primeira do índice", () => {
    expect(pickVariable([entry("sea_ice"), entry("aerosols")], "x")).toBe("sea_ice");
  });
});
