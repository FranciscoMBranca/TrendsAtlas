import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { loadAtlasData, loadManifest } from "@/lib/atlas/data/load";
import type { AtlasData } from "@/lib/atlas/data/schema";
import { diskFetcher } from "@/test/disk";

import { Opening } from "./Opening";
import { Panorama } from "./Panorama";
import { VariableSwitcher } from "./VariableSwitcher";
import { EmergenceSection } from "./emergence/EmergenceSection";
import { SignificanceDemo } from "./SignificanceDemo";
import { TrendMap } from "./TrendMap";

let data: AtlasData;

beforeAll(async () => {
  data = await loadAtlasData("precipitation", diskFetcher);
});

const withQuery = (node: React.ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>
);

describe("componentes do atlas", () => {
  it("a abertura assume dados de exemplo quando meta.isDemo é verdadeiro", async () => {
    // Vegetation still has no real reader: its files stay synthetic.
    const demo = await loadAtlasData("vegetation", diskFetcher);
    expect(demo.meta.isDemo).toBe(true);
    render(<Opening data={demo} />);
    expect(screen.getByText("dados de exemplo")).toBeInTheDocument();
    expect(screen.getByText(/aqui com dados sintéticos/i)).toBeInTheDocument();
    expect(screen.queryByText(/medida pela NASA/)).not.toBeInTheDocument();
  });

  it("com dados reais a abertura nomeia a fonte e não diz 'dados de exemplo'", () => {
    // Precipitation comes from NASA GPM IMERG (data/cubes, workflow "Dados NASA").
    expect(data.meta.isDemo).toBe(false);
    render(<Opening data={data} />);
    expect(screen.queryByText("dados de exemplo")).not.toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(data.meta.source.name)).length).toBeGreaterThan(0);
  });

  it("a abertura não inventa números enquanto os dados carregam", () => {
    render(<Opening data={undefined} />);
    expect(screen.getAllByText("A carregar dados")).toHaveLength(3);
  });

  it("o mapa desenha uma célula por posição da grelha e alterna o critério", () => {
    const { container } = render(withQuery(<TrendMap data={data} />));
    expect(container.querySelectorAll(".map-cells > path[stroke-width]").length).toBe(
      data.grid.length,
    );

    const fdr = screen.getByRole("radio", { name: "Com FDR" });
    fireEvent.click(fdr);
    expect(fdr).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByText(/falsas descobertas/, { selector: ".map-footnote" }),
    ).toBeInTheDocument();
  });

  it("escolher uma região mostra o seu nome e permite voltar ao mundo", () => {
    render(withQuery(<TrendMap data={data} />));
    const first = data.regions[0]!;
    fireEvent.click(screen.getByRole("button", { name: (name) => name.startsWith(first.name) }));
    expect(screen.getByRole("button", { name: /Ver mundo/ })).toBeInTheDocument();
  });

  it("a demonstração dá um veredicto e simula falsos alarmes", () => {
    const { container } = render(<SignificanceDemo meta={data.meta} />);
    expect(container.querySelector(".demo-verdict")).toHaveTextContent(/Significativa/);
    fireEvent.click(screen.getByRole("button", { name: "Sem tendência" }));
    fireEvent.click(screen.getByRole("button", { name: "Simular" }));
    expect(screen.getAllByRole("status").at(-1)).toHaveTextContent(/de 400 aparecem/);
  });

  it("a secção de emergência mostra números coerentes com os metadados e alterna de vista", () => {
    const { container } = render(withQuery(<EmergenceSection data={data} />));
    const last = data.meta.emergence.byYear.at(-1)!;
    expect(container.querySelector(".emergence-metrics")).toHaveTextContent(
      `${Math.round(last.pctEmerged)}%`,
    );
    expect(container.querySelectorAll(".map-cells > path[stroke-width]").length).toBe(
      data.grid.length,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Quanto falta" }));
    expect(screen.getByRole("list", { name: "Anos até detectar" })).toBeInTheDocument();
    expect(screen.queryByLabelText("ANO")).not.toBeInTheDocument();
  });
});

describe("várias variáveis", () => {
  it("o selector marca a variável activa e avisa quando se escolhe outra", async () => {
    const { variables } = await loadManifest(diskFetcher);
    const picked: string[] = [];
    render(
      <VariableSwitcher
        variables={variables}
        selectedId="sea_ice"
        onSelect={(id) => picked.push(id)}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Variável" });
    expect(within(nav).getAllByRole("button")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Gelo marinho" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Nível do mar" }));
    expect(picked).toEqual(["sea_level"]);
  });

  it("o panorama mostra uma linha por variável e é honesto sobre dados de exemplo", async () => {
    const manifest = await loadManifest(diskFetcher);
    const picked: string[] = [];
    render(
      <Panorama manifest={manifest} selectedId="temperature" onSelect={(id) => picked.push(id)} />,
    );
    expect(screen.getAllByRole("row")).toHaveLength(7); // cabeçalho + 6
    expect(screen.getByText(/Dados de demonstração sintéticos/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Aerossóis/ }));
    expect(picked).toEqual(["aerosols"]);
  });

  it("a abertura e o mapa usam os textos e unidades da variável", async () => {
    const sea = await loadAtlasData("sea_ice", diskFetcher);
    render(withQuery(<TrendMap data={sea} />));
    expect(screen.getByText(/O gelo recua aqui/)).toBeInTheDocument();
    expect(screen.getByText("← Menos gelo")).toBeInTheDocument();
    expect(screen.getByText("% por década")).toBeInTheDocument();
    expect(screen.getByText("OCEANOS POLARES", { exact: false })).toBeInTheDocument();
  });
});
