// Data sources: every variable names its NASA product and DOI, and the real/demo status agrees with the data files.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { Sources, sourcesSchema } from "@/components/Sources";
import { manifestSchema } from "@/lib/atlas/data/schema";
import { I18nProvider } from "@/lib/i18n";

const read = (f: string) => JSON.parse(readFileSync(resolve(__dirname, "../public/data", f), "utf-8"));
const s = sourcesSchema.parse(read("sources.json"));
const manifest = manifestSchema.parse(read("variables.json"));

describe("fontes dos dados", () => {
  it("cada variável do site tem produto, versão e DOI da NASA, e o estado bate com o rótulo", () => {
    for (const v of manifest.variables) {
      const src = s.sources.find((x) => x.id === v.id)!;
      expect(src, v.id).toBeDefined();
      expect(src.doi).toMatch(/^10\.5067\//);
      expect(src.status).toBe(v.isDemo ? "pending" : "real");
      if (src.status === "real") expect(src.period).not.toBeNull();
    }
  });

  it("mostra os DOI como ligações e diz quais ainda estão em demonstração", () => {
    window.localStorage.setItem("terra-tempo.prefs", JSON.stringify({ lang: "pt", audience: "explorador" }));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <I18nProvider>
          <Sources data={s} />
        </I18nProvider>
      </QueryClientProvider>,
    );
    for (const src of s.sources) {
      expect(screen.getByRole("link", { name: new RegExp(src.doi.replace(/[.*+?^${}()|[\]\/]/g, "\$&")) })).toHaveAttribute("href", `https://doi.org/${src.doi}`);
    }
    const pending = s.sources.filter((x) => x.status === "pending").length;
    expect(screen.queryAllByText(/ainda em DEMONSTRAÇÃO/)).toHaveLength(pending);
  });
});
