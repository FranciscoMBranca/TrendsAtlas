"use client";

import { Pause, Play, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SPEEDS, cellsForYear, nextYearIndex, useAnnual, yearMean, type AnnualAnomaly, type Speed } from "@/lib/atlas/annual";
import type { AtlasData, GridCell } from "@/lib/atlas/data/schema";
import { useLand } from "@/lib/atlas/data/use-atlas-data";
import { number, signed } from "@/lib/atlas/format";
import { createMapGeometry, viewBoxForZoom } from "@/lib/atlas/geo/projection";
import { trendColor } from "@/lib/atlas/scale";
import { useI18n } from "@/lib/i18n";
import { MapCanvas } from "./map/MapCanvas";
import type { PaintCell } from "./map/CellLayer";
import { SegmentedControl } from "./map/SegmentedControl";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** SPEC-110: full-screen yearly anomaly maps, played like a short film. */
export function PresentationMode({ data, annual, onClose }: { data: AtlasData; annual: AnnualAnomaly; onClose: () => void }) {
  const { t } = useI18n();
  const reduced = useMemo(prefersReducedMotion, []);
  const last = annual.years.length - 1;
  const [index, setIndex] = useState(reduced ? last : 0);
  const [playing, setPlaying] = useState(!reduced);
  const [speed, setSpeed] = useState<Speed>("normal");
  const dialogRef = useRef<HTMLDivElement>(null);
  const geometry = useMemo(() => createMapGeometry(), []);
  const viewBox = useMemo(() => viewBoxForZoom(geometry, 1), [geometry]);
  const land = useLand();
  const [hovered, setHovered] = useState<GridCell | null>(null);

  // Stable geometry (drawn once); only the colours change from year to year.
  const grid = useMemo(() => cellsForYear(annual, 0), [annual]);
  const position = useMemo(() => new Map(grid.map((cell, i) => [cell, i])), [grid]);
  const row = annual.values[index]!;
  const paint = useCallback<PaintCell>(
    (cell) => {
      const value = row[position.get(cell) ?? -1];
      return value === null || value === undefined
        ? { fill: "var(--secondary)", opacity: 0.6, stipple: false }
        : { fill: trendColor(value, annual.extent), opacity: 1, stipple: false };
    },
    [position, row, annual.extent],
  );

  // Playback
  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => {
      const next = nextYearIndex(index, annual.years.length);
      if (next === null) setPlaying(false);
      else setIndex(next);
    }, SPEEDS[speed]);
    return () => window.clearTimeout(id);
  }, [playing, index, speed, annual.years.length]);

  // Pause when the tab is hidden (SPEC-110 §3.5)
  useEffect(() => {
    const onVisibility = () => document.hidden && setPlaying(false);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Keyboard: Esc closes, space plays/pauses, arrows step
  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === " " && e.target === dialogRef.current) {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") setIndex((i) => Math.min(last, i + 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, last]);

  const { meta } = data;
  const year = annual.years[index]!;
  const mean = yearMean(annual, index);
  const d = meta.variable.decimals;
  const togglePlay = () => {
    if (!playing && index === last) setIndex(0);
    setPlaying((p) => !p);
  };

  return (
    <div
      ref={dialogRef}
      className="presentation"
      role="dialog"
      aria-modal="true"
      aria-label={`${t("apres.titulo")}: ${t(`var.${meta.variable.id}`)}`}
      tabIndex={-1}
      data-palette={meta.variable.palette}
    >
      <div className="presentation-top">
        <div>
          <span className="technical">{t("apres.titulo")} · {t(`var.${meta.variable.id}`).toUpperCase()}</span>
          {annual.isDemo && <span className="demo-label">{t("rotulo.demonstracao")}</span>}
          <div className="presentation-year" aria-live="polite">
            {year}
          </div>
          <p className="presentation-mean">
            {t("apres.media", { valor: mean === null ? "—" : `${signed(mean, d)} ${annual.unit}` })}
          </p>
        </div>
        <button type="button" className="presentation-close" onClick={onClose} aria-label={t("apres.fechar")}>
          <X />
        </button>
      </div>

      <div className="presentation-map">
        <MapCanvas
          grid={grid}
          regions={[]}
          geometry={geometry}
          stepDeg={meta.grid.stepDeg}
          paint={paint}
          land={land.data}
          viewBox={viewBox}
          hovered={hovered}
          onHover={setHovered}
          label={`${year}. ${t("apres.media", { valor: mean === null ? "—" : `${signed(mean, d)} ${annual.unit}` })}. ${t("apres.escala", { min: `−${number(annual.extent, d)}`, max: `+${number(annual.extent, d)} ${annual.unit}`, base: annual.baseline })}`}
        />
      </div>

      <div className="presentation-legend">
        <span>← {t("apres.frio")}</span>
        <i className="legend-bar" aria-hidden="true" />
        <span>{t("apres.quente")} →</span>
        <span className="technical">
          {t("apres.escala", { min: `−${number(annual.extent, d)}`, max: `+${number(annual.extent, d)} ${annual.unit}`, base: annual.baseline })}
        </span>
      </div>

      <div className="presentation-controls">
        <button type="button" className="presentation-play" onClick={togglePlay} aria-label={playing ? t("apres.pausar") : t("apres.reproduzir")}>
          {playing ? <Pause /> : <Play />}
        </button>
        <input
          type="range"
          min={0}
          max={last}
          value={index}
          aria-label={t("apres.ano")}
          aria-valuetext={String(year)}
          onChange={(e) => {
            setPlaying(false);
            setIndex(Number(e.target.value));
          }}
        />
        <span className="technical">
          {annual.years[0]}–{annual.years[last]}
        </span>
        <SegmentedControl
          label={t("apres.velocidade")}
          value={speed}
          onChange={setSpeed}
          options={[
            { value: "lento", label: t("apres.lento") },
            { value: "normal", label: t("apres.normal") },
            { value: "rapido", label: t("apres.rapido") },
          ]}
        />
      </div>

      <p className="presentation-note">{t("apres.nota", { base: annual.baseline, fonte: meta.source.name })}</p>
    </div>
  );
}

/** Launcher shown under the trend map; only when the variable has yearly maps (real data). */
export function PresentationLauncher({ data }: { data: AtlasData }) {
  const { t } = useI18n();
  const annual = useAnnual(data.meta.variable.id);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  if (!annual.data) return null;
  return (
    <div className="atlas-width presentation-launch">
      <button type="button" className="investigate-run" onClick={() => setOpen(true)}>
        <Play /> {t("apres.botao", { inicio: annual.data.years[0]!, fim: annual.data.years.at(-1)! })}
      </button>
      <span className="technical">{t("apres.descricao")}</span>
      {open && <PresentationMode data={data} annual={annual.data} onClose={() => setOpen(false)} />}
    </div>
  );
}
