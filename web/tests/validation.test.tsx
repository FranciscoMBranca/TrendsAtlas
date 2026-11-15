// "How we know it is right": the section only shows numbers read from validation.json.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { Validation, diffLabel, validationSchema } from "@/components/Validation";
import { I18nProvider } from "@/lib/i18n";

const v = validationSchema.parse(JSON.parse(readFileSync(resolve(__dirname, "../public/data/validation.json"), "utf-8")));

const wrap = (audience: string) => {
  window.localStorage.setItem("terra-tempo.prefs", JSON.stringify({ lang: "pt", audience }));
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider>
        <Validation data={v} />
      </I18nProvider>
    </QueryClientProvider>,
  );
};

beforeEach(() => window.localStorage.clear());

describe("como sabemos que está certo", () => {
  it("o ficheiro cumpre o contrato e os anos baralhados ficam abaixo dos reais", () => {
    expect(v.shuffledYears.length).toBeGreaterThan(0);
    for (const s of v.shuffledYears) expect(s.shuffledMaxPct).toBeLessThan(s.realPct);
    for (const r of v.references.filter((x) => ["theil_sen", "sen_ci", "linear", "fdr"].includes(x.id))) expect(r.maxRelDiff).toBeLessThan(1e-8);
  });

  it("o explorador vê os quatro cartões com os números do ficheiro", () => {
    wrap("explorador");
    expect(screen.getByRole("heading", { name: "Como sabemos que está certo" })).toBeInTheDocument();
    const s = v.shuffledYears[0]!;
    const real = new Intl.NumberFormat("pt-PT", { maximumSignificantDigits: 3 }).format(s.realPct);
    expect(screen.getAllByText(`${real} %`).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Alarmes falsos em ruído sem tendência" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "A banda da projecção acerta" })).toBeInTheDocument();
  });

  it("a criança só vê a experiência de baralhar", () => {
    wrap("crianca");
    expect(screen.getByRole("heading", { name: "Como sabemos que não é sorte?" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Alarmes falsos em ruído sem tendência" })).not.toBeInTheDocument();
  });

  it("diferenças minúsculas aparecem como potências de dez", () => {
    expect(diffLabel(0, "pt")).toBe("0");
    expect(diffLabel(3e-14, "pt")).toBe("< 10⁻¹³");
    expect(diffLabel(1.8e-15, "pt")).toBe("< 10⁻¹⁴");
  });
});
