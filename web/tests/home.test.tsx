// The home page is rendered from the filters (audience, language); the chat floats and can be
// minimised and closed; every map cell has a place name.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { placeSummary } from "@/components/ExploreMap";
import { FloatingChat } from "@/components/FloatingChat";
import { signalFor } from "@/components/SystemStrip";
import { ChildHome, ExplorerHome, ScientistHome } from "@/components/Homes";
import { Welcome } from "@/components/Shell";
import { loadAtlasData, loadManifest } from "@/lib/atlas/data/load";
import type { AtlasData, Manifest } from "@/lib/atlas/data/schema";
import { I18nProvider } from "@/lib/i18n";
import { cellPlace, placeName, placesSchema, searchPlaces, type Places } from "@/lib/places";
import { diskFetcher } from "@/test/disk";

let data: AtlasData;
let manifest: Manifest;
let places: Places;

beforeAll(async () => {
  data = await loadAtlasData("temperature", diskFetcher);
  manifest = await loadManifest(diskFetcher);
  places = placesSchema.parse(JSON.parse(readFileSync(resolve(__dirname, "../public/data/places.json"), "utf-8")));
});

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
  // Data files are served from disk; the API is "down" so components use the map data.
  vi.stubGlobal("fetch", (url: string) =>
    url.includes("places.json")
      ? Promise.resolve(new Response(JSON.stringify(places)))
      : url.startsWith("/data/")
        ? diskFetcher(url)
        : Promise.reject(new Error("offline")),
  );
});

const wrap = (node: React.ReactNode, prefs?: { lang: string; audience: string }) => {
  if (prefs) window.localStorage.setItem("terra-tempo.prefs", JSON.stringify(prefs));
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider>{node}</I18nProvider>
    </QueryClientProvider>,
  );
};

describe("lugares com nome", () => {
  it("todas as 2 592 células têm um país ou oceano", () => {
    expect(Object.keys(places.cells)).toHaveLength(36 * 72);
    for (const key of Object.values(places.cells)) expect(places.places[key]).toBeDefined();
  });

  it("os nomes existem nos cinco idiomas e a pesquisa ignora acentos", () => {
    expect(placeName(places, cellPlace(places, -12.5, 17.5), "pt")).toBe("Angola");
    expect(placeName(places, "bra", "zh")).toBe("巴西");
    expect(searchPlaces(places, "brasil", "pt")[0]!.key).toBe("bra");
    expect(searchPlaces(places, "Atlantico", "pt").map((h) => h.key)).toContain("atlantico-norte");
  });
});

describe("página principal condicional", () => {
  it("primeira visita: mostra a entrada e grava a escolha", async () => {
    wrap(<Welcome />);
    await act(async () => {});
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Cientista|Scientist/));
    fireEvent.click(screen.getByLabelText("Français"));
    expect(screen.getByText("Voyez comment la planète change.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Commencer/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("terra-tempo.prefs")!)).toEqual({ lang: "fr", audience: "cientista" });
  });

  it("Criança: título simples, botões grandes e sem secção de análise", async () => {
    const { container } = wrap(<ChildHome data={data} manifest={manifest} selectedId="temperature" onSelect={() => {}} />, { lang: "pt", audience: "crianca" });
    await act(async () => {});
    expect(screen.getByText("Como está o nosso planeta?")).toBeInTheDocument();
    expect(container.querySelector("#investigar")).toBeNull();
    expect(container.querySelector("#metodo")).toBeNull();
  });

  it("Explorador: mapa e análise, sem as secções técnicas", async () => {
    const { container } = wrap(<ExplorerHome data={data} manifest={manifest} selectedId="temperature" onSelect={() => {}} />, { lang: "en", audience: "explorador" });
    await act(async () => {});
    expect(screen.getByText("Where is the planet changing?")).toBeInTheDocument();
    expect(container.querySelector("#investigar")).not.toBeNull();
    expect(container.querySelector("#metodo")).toBeNull();
  });

  it("Cientista: tudo, com aviso de que as secções técnicas só existem em português", async () => {
    const { container } = wrap(<ScientistHome data={data} manifest={manifest} selectedId="temperature" onSelect={() => {}} />, { lang: "es", audience: "cientista" });
    await act(async () => {});
    expect(container.querySelector("#investigar")).not.toBeNull();
    expect(container.querySelector("#metodo")).not.toBeNull();
    expect(screen.getByText(/solo existen en portugués/)).toBeInTheDocument();
  });

  it("clicar num país pela pesquisa abre o cartão com o nome e a tendência do mapa", async () => {
    wrap(<ExplorerHome data={data} manifest={manifest} selectedId="temperature" onSelect={() => {}} />, { lang: "pt", audience: "explorador" });
    await act(async () => {});
    const input = screen.getByRole("combobox", { name: /Procurar/ });
    fireEvent.change(input, { target: { value: "Angol" } });
    // Wait for the place list (loaded asynchronously) before choosing with Enter.
    await screen.findByRole("option", { name: /Angola/ }, { timeout: 8000 });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByRole("complementary", { name: "Angola" }, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText(/Tendência no mapa/)).toBeInTheDocument();
  });
});

describe("chat flutuante", () => {
  const assistantUp = (answer: Response | null) =>
    vi.stubGlobal("fetch", (url: string) =>
      url.endsWith("/assistente/estado")
        ? Promise.resolve(new Response(JSON.stringify({ disponivel: true })))
        : answer
          ? Promise.resolve(answer)
          : Promise.reject(new Error("offline")),
    );

  it("fica escondido enquanto o assistente não está configurado", async () => {
    wrap(<FloatingChat variable="temperature" />, { lang: "pt", audience: "explorador" });
    await act(async () => {});
    expect(screen.queryByRole("button", { name: "Abrir o assistente" })).not.toBeInTheDocument();
  });

  it("abre, minimiza e fecha", async () => {
    assistantUp(null);
    wrap(<FloatingChat variable="temperature" />, { lang: "pt", audience: "explorador" });
    await act(async () => {});
    fireEvent.click(await screen.findByRole("button", { name: "Abrir o assistente" }));
    expect(screen.getByRole("dialog", { name: "Pergunte ao atlas" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Minimizar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Pergunte ao atlas" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.getByRole("button", { name: "Abrir o assistente" })).toBeInTheDocument();
  });

  it("se a pergunta falhar, diz que não foi possível responder", async () => {
    assistantUp(new Response("{}", { status: 502 }));
    wrap(<FloatingChat variable="temperature" />, { lang: "pt", audience: "explorador" });
    await act(async () => {});
    fireEvent.click(await screen.findByRole("button", { name: "Abrir o assistente" }));
    fireEvent.click(screen.getByRole("button", { name: "A temperatura em Angola está a subir?" }));
    expect(await screen.findByText(/não está disponível|Não foi possível/)).toBeInTheDocument();
  });
});

describe("globo, cartões e missões", () => {
  it("os cartões das variáveis mostram o rótulo real ou DEMONSTRAÇÃO de cada variável", () => {
    wrap(<ExplorerHome data={data} manifest={manifest} selectedId="temperature" onSelect={() => {}} />, { lang: "pt", audience: "explorador" });
    const cards = screen.getByRole("region", { name: "O que medimos" });
    for (const v of manifest.variables) {
      const card = cards.querySelector(`[data-var="${v.id}"]`)!;
      expect(card.textContent).toContain(v.isDemo ? "DEMONSTRAÇÃO" : "real");
    }
  });

  it("uma missão pede a variável e o lugar certos", () => {
    const onPick = vi.fn();
    wrap(<ExplorerHome data={data} manifest={manifest} selectedId="temperature" onSelect={() => {}} onPick={onPick} />, { lang: "pt", audience: "explorador" });
    fireEvent.click(screen.getByRole("button", { name: /Chove mais ou menos no Brasil/ }));
    expect(onPick).toHaveBeenCalledWith("precipitation", { kind: "place", key: "bra" });
  });

  it("o pedido de um lugar abre o cartão no mapa", async () => {
    wrap(
      <ExplorerHome data={data} manifest={manifest} selectedId="temperature" onSelect={() => {}} pick={{ varId: "temperature", sel: { kind: "place", key: "ago" }, seq: 1 }} />,
      { lang: "pt", audience: "explorador" },
    );
    expect(await screen.findByRole("complementary", { name: "Angola" }, { timeout: 8000 })).toBeInTheDocument();
  });

  it("o globo tem nome acessível e roda com o teclado", () => {
    wrap(<ExplorerHome data={data} manifest={manifest} selectedId="temperature" onSelect={() => {}} />, { lang: "pt", audience: "explorador" });
    const globe = screen.getByRole("img", { name: /Globo interactivo/ });
    fireEvent.keyDown(globe, { key: "ArrowLeft" });
    expect(globe).toHaveAttribute("tabindex", "0");
  });
});

describe("o mesmo lugar em todas as variáveis", () => {
  it("o resumo de cada variável usa as mesmas regras do cartão (média por área, maioria significativa)", () => {
    const entry = manifest.variables.find((v) => v.id === "temperature")!;
    const s = signalFor(entry, data.grid, { kind: "place", key: "ago" }, places)!;
    const ref = placeSummary(data.grid, places, "ago")!;
    expect(s.trend).toBeCloseTo(ref.trend, 10);
    expect(s.sig).toBe(ref.sigShare >= 0.5);
    expect(signalFor(entry, data.grid, { kind: "globe" }, places)).toEqual({ trend: entry.globalTrend, sig: entry.globalP < 0.05 });
    // A variable with no cell in the place says so instead of inventing a value.
    expect(signalFor(entry, [], { kind: "place", key: "ago" }, places)).toBeNull();
  });

  it("ao abrir um lugar mostra todas as variáveis, com o rótulo DEMONSTRAÇÃO onde é preciso", async () => {
    const onPick = vi.fn();
    wrap(
      <ExplorerHome data={data} manifest={manifest} selectedId="temperature" onSelect={() => {}} onPick={onPick} pick={{ varId: "temperature", sel: { kind: "place", key: "ago" }, seq: 1 }} />,
      { lang: "pt", audience: "explorador" },
    );
    const strip = await screen.findByRole("region", { name: /Angola: 6 sinais do sistema terrestre/ }, { timeout: 8000 });
    for (const v of manifest.variables) {
      const row = strip.querySelector(`[data-var="${v.id}"]`)!;
      expect(row).toBeTruthy();
      if (v.isDemo) expect(row.textContent).toContain("DEMONSTRAÇÃO");
    }
    fireEvent.click(strip.querySelector('[data-var="precipitation"]')!);
    expect(onPick).toHaveBeenCalledWith("precipitation", { kind: "place", key: "ago" });
  });
});
