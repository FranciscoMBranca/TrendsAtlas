import { describe, expect, it } from "vitest";

import { makeCell } from "@/test/factories";

import {
  BEYOND_BUCKET,
  HORIZON_BUCKETS,
  emergenceColor,
  horizonBucket,
  horizonColor,
  summarizeEmergence,
} from "./emergence";

describe("baldes do horizonte", () => {
  it("coloca cada previsão no intervalo certo", () => {
    expect(horizonBucket(1)).toBe(0);
    expect(horizonBucket(5)).toBe(0);
    expect(horizonBucket(6)).toBe(1);
    expect(horizonBucket(30)).toBe(3);
    expect(horizonBucket(31)).toBe(HORIZON_BUCKETS.length);
  });

  it("sem previsão cai no balde final", () => {
    expect(horizonBucket(null)).toBe(HORIZON_BUCKETS.length);
  });
});

describe("cores da emergência", () => {
  it("emergir cedo dá cor mais forte do que emergir tarde", () => {
    expect(emergenceColor(2010, 2010, 2024)).toContain("100%");
    expect(emergenceColor(2024, 2010, 2024)).toContain("30%");
    expect(emergenceColor(2017, 2010, 2024)).toContain("65%");
  });

  it("estar perto de ser detectável pesa mais do que estar longe", () => {
    expect(horizonColor(0)).toContain("90%");
    expect(horizonColor(HORIZON_BUCKETS.length)).toContain(`${BEYOND_BUCKET.strength}%`);
  });
});

describe("resumo da emergência", () => {
  const grid = [
    makeCell({ lat: 0, emergence: 2010 }),
    makeCell({ lat: 0, emergence: 2020 }),
    makeCell({ lat: 0, emergence: 2024 }),
    makeCell({ lat: 0, yearsToDetect: 4 }),
    makeCell({ lat: 0, yearsToDetect: 50 }),
    makeCell({ lat: 0, yearsToDetect: null }),
  ];

  it("emergidas e pendentes somam 100%", () => {
    const summary = summarizeEmergence(grid);
    expect(summary.emergedPct).toBeCloseTo(50, 8);
    expect(summary.pendingPct).toBeCloseTo(50, 8);
    expect(summary.emergedPct + summary.pendingPct).toBeCloseTo(100, 8);
  });

  it("a mediana é a das que emergiram", () => {
    expect(summarizeEmergence(grid).medianYear).toBe(2020);
  });

  it("reparte as pendentes pelos baldes", () => {
    const { buckets } = summarizeEmergence(grid);
    expect(buckets[0]!.pct).toBeCloseTo(100 / 6, 8);
    expect(buckets.at(-1)!.pct).toBeCloseTo(200 / 6, 8);
  });

  it("pondera pela área: uma célula polar pesa menos", () => {
    const summary = summarizeEmergence([
      makeCell({ lat: 0, emergence: 2012 }),
      makeCell({ lat: 80, yearsToDetect: 3 }),
    ]);
    expect(summary.emergedPct).toBeGreaterThan(80);
  });

  it("sem emergências não há mediana", () => {
    expect(summarizeEmergence([makeCell({ yearsToDetect: 5 })]).medianYear).toBeNull();
  });
});
