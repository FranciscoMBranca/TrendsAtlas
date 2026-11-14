import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLand } from "@/lib/atlas/data/use-atlas-data";
import type { AtlasData, GridCell, Region } from "@/lib/atlas/data/schema";
import { yearOf } from "@/lib/atlas/format";
import { createMapGeometry, viewBoxForBbox, viewBoxForZoom } from "@/lib/atlas/geo/projection";
import {
  SIGNIFICANCE_MODES,
  cellOpacity,
  isSignificant,
  trendColor,
  trendExtent,
  type SignificanceMode,
} from "@/lib/atlas/scale";

import { Legend } from "./Legend";
import type { PaintCell } from "./map/CellLayer";
import { MapCanvas } from "./map/MapCanvas";
import { MapTooltip } from "./map/MapTooltip";
import { RegionStrip } from "./map/RegionStrip";
import { SegmentedControl } from "./map/SegmentedControl";
import { SectionHeader } from "./SectionHeader";

const COVERAGE_LABEL = {
  global: "GRELHA GLOBAL",
  land: "SÓ EM TERRA",
  ocean: "SÓ NO OCEANO",
  "polar-ocean": "OCEANOS POLARES",
} as const;

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

const MODE_OPTIONS = (Object.keys(SIGNIFICANCE_MODES) as SignificanceMode[]).map((value) => ({
  value,
  label: SIGNIFICANCE_MODES[value].label,
}));

/** Secção 02: mapa interactivo das tendências. */
export function TrendMap({ data }: { data: AtlasData }) {
  const { grid, regions, meta } = data;
  const geometry = useMemo(() => createMapGeometry(), []);
  const extent = useMemo(() => trendExtent(grid), [grid]);
  const land = useLand();

  const [mode, setMode] = useState<SignificanceMode>("raw");
  const [onlySignificant, setOnlySignificant] = useState(false);
  const [hovered, setHovered] = useState<GridCell | null>(null);
  const [selected, setSelected] = useState<Region | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);

  const paint = useCallback<PaintCell>(
    (cell) => ({
      fill: trendColor(cell.trend, extent),
      opacity: cellOpacity(cell, mode, onlySignificant),
      stipple: isSignificant(cell, mode),
    }),
    [extent, mode, onlySignificant],
  );

  const viewBox = selected
    ? viewBoxForBbox(geometry, selected.bbox)
    : viewBoxForZoom(geometry, zoom);

  const zoomBy = (delta: number) => {
    setSelected(null);
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
  };
  const select = (region: Region) => {
    setSelected(region);
    setHovered(null);
  };
  const reset = () => {
    setSelected(null);
    setZoom(MIN_ZOOM);
    setHovered(null);
  };

  const period = `${yearOf(meta.period.start)}–${yearOf(meta.period.end)}`;
  const step = `${meta.grid.stepDeg}° × ${meta.grid.stepDeg}°`;

  return (
    <section id="onde" className="map-section atlas-width">
      <div className="map-section-heading">
        <SectionHeader number="02" title="Onde está a mudar" />
        <span className="technical">
          {COVERAGE_LABEL[meta.variable.coverage]} · {step}
        </span>
      </div>
      <div className="map-intro">
        <h3>
          Um planeta. <em>Dois sinais.</em>
        </h3>
        <p>
          {meta.variable.copy.headline}
          <br />A mudança não tem a mesma direcção em todo o lado.
        </p>
      </div>

      <div className="map-controls">
        <div className="control-group">
          <span className="technical">VARIÁVEL</span>
          <span className="control-value">{meta.variable.name}</span>
        </div>
        <div className="control-group">
          <span className="technical">PERÍODO</span>
          <span className="control-value period-value">{period.replace("–", " – ")}</span>
        </div>
        <div className="control-group">
          <span className="technical">CRITÉRIO</span>
          <SegmentedControl
            label="Critério de significância"
            options={MODE_OPTIONS}
            value={mode}
            onChange={setMode}
          />
        </div>
        <label className="control-group significance-control">
          <Switch
            checked={onlySignificant}
            onCheckedChange={setOnlySignificant}
            aria-label="Mostrar só significativas"
          />
          <span>Mostrar só significativas</span>
        </label>
        <span className="control-note">Tendência por década</span>
      </div>

      <div className="map-canvas">
        <MapCanvas
          grid={grid}
          regions={regions}
          geometry={geometry}
          stepDeg={meta.grid.stepDeg}
          paint={paint}
          label={`Mapa de tendências: ${meta.variable.name}. Cor da descida: ${meta.variable.copy.down.toLowerCase()}; cor da subida: ${meta.variable.copy.up.toLowerCase()}; pontos: tendência significativa. As regiões estão também listadas em botões abaixo do mapa.`}
          land={land.data}
          viewBox={viewBox}
          hovered={hovered}
          selectedId={selected?.id ?? null}
          onHover={setHovered}
          onSelectRegion={select}
        />
        <div className="map-tools">
          <Button
            variant="map"
            size="icon"
            aria-label="Ampliar mapa"
            title="Ampliar mapa"
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            <ZoomIn />
          </Button>
          <Button
            variant="map"
            size="icon"
            aria-label="Reduzir mapa"
            title="Reduzir mapa"
            onClick={() => zoomBy(-ZOOM_STEP)}
          >
            <ZoomOut />
          </Button>
          <Button
            variant="map"
            size="icon"
            aria-label="Repor mapa"
            title="Repor mapa"
            onClick={reset}
          >
            <RotateCcw />
          </Button>
        </div>
        {hovered && <MapTooltip cell={hovered} mode={mode} variable={meta.variable} />}
        {selected && (
          <div className="map-selection">
            {selected.name}
            <Button variant="link" size="sm" onClick={reset}>
              Ver mundo <RotateCcw />
            </Button>
          </div>
        )}
      </div>

      <Legend extent={extent} mode={mode} variable={meta.variable} />
      <RegionStrip
        variable={meta.variable}
        regions={regions}
        selectedId={selected?.id ?? null}
        onSelect={select}
      />
      <p className="map-footnote">
        {meta.isDemo ? "Dados de exemplo, não resultados observados. " : ""}
        Projecção Equal Earth: as áreas no mapa são proporcionais às áreas reais.{" "}
        {mode === "raw"
          ? "O pontilhado indica p < 0,05, sem correcção para testes múltiplos: em milhares de células, cerca de 5% aparecem assim só por acaso."
          : `O pontilhado indica as células que sobrevivem ao controlo de falsas descobertas (q = ${meta.method.fdrAlpha}).`}
      </p>
    </section>
  );
}
