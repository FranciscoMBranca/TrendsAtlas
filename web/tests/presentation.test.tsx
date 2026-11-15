// SPEC-110 criteria 2, 3 and 4.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { PresentationMode } from "@/components/atlas/PresentationMode";
import { annualSchema, nextYearIndex, yearMean, type AnnualAnomaly } from "@/lib/atlas/annual";
import { loadAtlasData } from "@/lib/atlas/data/load";
import type { AtlasData } from "@/lib/atlas/data/schema";
import { signed } from "@/lib/atlas/format";
import { diskFetcher } from "@/test/disk";

const annual: AnnualAnomaly = annualSchema.parse({
  schemaVersion: 3,
  isDemo: true,
  variable: "temperature",
  unit: "°C",
  baseline: "2000–2002",
  extent: 1,
  cells: [
    [0, 0],
    [60, 0],
  ],
  years: [2000, 2001, 2002],
  values: [
    [-0.5, -0.5],
    [0, null],
    [0.4, 0.8],
  ],
});

let data: AtlasData;
beforeAll(async () => {
  data = await loadAtlasData("temperature", diskFetcher);
});

const setReducedMotion = (reduce: boolean) =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query.includes("reduce"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );

const renderMode = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PresentationMode data={data} annual={annual} onClose={() => {}} />
    </QueryClientProvider>,
  );

afterEach(() => vi.restoreAllMocks());

describe("modo apresentação", () => {
  it("a média do ano é pesada por cos(latitude) e ignora células sem dado", () => {
    const w60 = Math.cos((60 * Math.PI) / 180);
    expect(yearMean(annual, 2)).toBeCloseTo((0.4 + 0.8 * w60) / (1 + w60), 10);
    expect(yearMean(annual, 1)).toBe(0);
    expect(nextYearIndex(1, 3)).toBe(2);
    expect(nextYearIndex(2, 3)).toBeNull();
  });

  it("com movimento reduzido nada se anima e mostra o último ano (critério 3)", () => {
    setReducedMotion(true);
    renderMode();
    expect(screen.getByText("2002")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reproduzir" })).toBeInTheDocument();
  });

  it("o ano e o valor mostrados vêm do ficheiro (critério 2)", () => {
    setReducedMotion(true);
    renderMode();
    const mean = yearMean(annual, 2)!;
    expect(screen.getByText(`${signed(mean, data.meta.variable.decimals)} °C`)).toBeInTheDocument();
  });

  it("um ficheiro de demonstração mostra o rótulo (critério 4)", () => {
    setReducedMotion(false);
    renderMode();
    expect(screen.getByText("DEMONSTRAÇÃO")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
  });
});
