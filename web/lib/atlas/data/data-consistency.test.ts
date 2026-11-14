/**
 * Testes de contrato sobre os ficheiros REAIS em public/data, para TODAS as variáveis.
 * Apanham dados mal formados e confirmam que o site e o pipeline dizem o mesmo.
 */
import { describe, expect, it } from "vitest";

import { computeHighlights } from "@/lib/atlas/highlights";
import { senLine } from "@/lib/atlas/stats/mann-kendall";
import { diskFetcher } from "@/test/disk";

import { AtlasDataError, loadAtlasData, loadManifest } from "./load";

const manifest = await loadManifest(diskFetcher);

describe("variables.json", () => {
  it("cumpre o contrato e lista as seis variáveis do atlas", () => {
    expect(manifest.variables.map((v) => v.id)).toEqual([
      "temperature",
      "precipitation",
      "vegetation",
      "sea_ice",
      "aerosols",
      "sea_level",
    ]);
  });

  it("os valores do resumo são percentagens válidas", () => {
    for (const v of manifest.variables) {
      expect(v.significantAreaPctFdr).toBeGreaterThanOrEqual(0);
      expect(v.significantAreaPct).toBeLessThanOrEqual(100);
      expect(v.pendingAreaPct).toBeGreaterThanOrEqual(0);
    }
  });
});

describe.each(manifest.variables.map((v) => [v.id] as const))("ficheiros de %s", (variableId) => {
  const ready = loadAtlasData(variableId, diskFetcher);

  it("cumprem o contrato (zod) e descrevem esta variável", async () => {
    const data = await ready;
    expect(data.meta.variable.id).toBe(variableId);
    expect(data.meta.variable.palette).toBe(variableId);
    expect(data.grid.length).toBe(data.meta.grid.cells);
    expect(data.series.length).toBe(data.meta.period.months);
    expect(data.regions.length).toBeGreaterThanOrEqual(3);
  });

  it("a grelha não tem posições repetidas nem excede a grelha global", async () => {
    const { grid, meta } = await ready;
    const keys = new Set(grid.map((c) => `${c.lat}:${c.lon}`));
    expect(keys.size).toBe(grid.length);
    expect(grid.length).toBeLessThanOrEqual(meta.grid.nLat * meta.grid.nLon);
    if (meta.variable.coverage === "global")
      expect(grid.length).toBe(meta.grid.nLat * meta.grid.nLon);
    else expect(grid.length).toBeLessThan(meta.grid.nLat * meta.grid.nLon);
  });

  it("os intervalos de confiança contêm a estimativa", async () => {
    const { grid, meta } = await ready;
    const tol = 10 ** -(meta.variable.decimals + 1);
    for (const c of grid) {
      expect(c.ci[0]).toBeLessThanOrEqual(c.trend + tol);
      expect(c.ci[1]).toBeGreaterThanOrEqual(c.trend - tol);
    }
  });

  it("o FDR nunca marca células com p acima de q (propriedade do Benjamini-Hochberg)", async () => {
    const { grid, meta } = await ready;
    for (const c of grid.filter((cell) => cell.sigFdr)) {
      expect(c.p).toBeLessThanOrEqual(meta.method.fdrAlpha);
    }
  });

  it("emergir exige significância no período completo", async () => {
    const { grid } = await ready;
    for (const c of grid) {
      expect(c.emergence !== null).toBe(c.sig);
      expect(c.emergenceFdr !== null).toBe(c.sigFdr);
    }
  });

  it("o resumo do índice coincide com o meta.json da variável", async () => {
    const { meta } = await ready;
    const entry = manifest.variables.find((v) => v.id === variableId)!;
    expect(entry.globalTrend).toBe(meta.highlights.globalTrend.trend);
    expect(entry.significantAreaPctFdr).toBe(meta.highlights.significantAreaPctFdr);
    expect(entry.pendingAreaPct).toBe(meta.emergence.pendingAreaPct);
  });

  it("os destaques calculados no site coincidem com os do pipeline", async () => {
    const { grid, regions, meta } = await ready;
    const mine = computeHighlights(grid, regions);
    const theirs = meta.highlights;
    expect(mine.increase?.id).toBe(theirs.regionIncrease?.regionId);
    expect(mine.decrease?.id).toBe(theirs.regionDecrease?.regionId);
    expect(mine.significantAreaPct).toBeCloseTo(theirs.significantAreaPct, 0);
    expect(mine.significantAreaPctFdr).toBeCloseTo(theirs.significantAreaPctFdr, 0);
  });

  it("a recta de Sen da série global (TypeScript) dá a tendência global do pipeline (Python)", async () => {
    const { series, meta } = await ready;
    const { slope } = senLine(series.map((p) => p.anomaly));
    const digits = meta.variable.decimals;
    expect(slope * 120).toBeCloseTo(meta.highlights.globalTrend.trend, digits);
  });
});

describe("carregamento defensivo", () => {
  it("rejeita ficheiros que não cumprem o contrato, com mensagem útil", async () => {
    const broken = (url: string) =>
      Promise.resolve(new Response(url.endsWith("meta.json") ? "{}" : "[]"));
    await expect(loadAtlasData("precipitation", broken)).rejects.toThrow(AtlasDataError);
  });

  it("rejeita respostas HTTP de erro", async () => {
    const notFound = () => Promise.resolve(new Response("", { status: 404 }));
    await expect(loadAtlasData("precipitation", notFound)).rejects.toThrow(/404/);
  });

  it("rejeita um meta.json que descreve outra variável", async () => {
    const swapped = (url: string) => diskFetcher(url.replace("/sea_ice/", "/temperature/"));
    await expect(loadAtlasData("sea_ice", swapped)).rejects.toThrow(/descreve 'temperature'/);
  });
});
