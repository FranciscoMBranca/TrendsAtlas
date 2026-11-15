"use client";

import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { useEffect, useMemo, useRef, useState } from "react";

import type { AtlasData, GridCell } from "@/lib/atlas/data/schema";
import { useLand } from "@/lib/atlas/data/use-atlas-data";
import { trendExtent } from "@/lib/atlas/scale";
import { withUnit } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cellPlace, placeName, usePlaces } from "@/lib/places";

const AUTO_SPEED = 0.06; // degrees per frame
const unitFor = (u: string) => ({ "°C": "degC", "mm/dia": "mm/day" })[u] ?? u;

type Line = [number, number][];

/** Every ring or line of a GeoJSON object, as plain [lon, lat] lists. */
function linesOf(obj: unknown): Line[] {
  const out: Line[] = [];
  const walk = (g: { type: string; coordinates?: unknown; geometries?: unknown[]; features?: unknown[]; geometry?: unknown }) => {
    if (!g) return;
    if (g.type === "FeatureCollection") (g.features as never[]).forEach((f) => walk(f));
    else if (g.type === "Feature") walk(g.geometry as never);
    else if (g.type === "GeometryCollection") (g.geometries as never[]).forEach((x) => walk(x));
    else if (g.type === "LineString") out.push(g.coordinates as Line);
    else if (g.type === "MultiLineString" || g.type === "Polygon") out.push(...(g.coordinates as Line[]));
    else if (g.type === "MultiPolygon") (g.coordinates as Line[][]).forEach((p) => out.push(...p));
  };
  walk(obj as never);
  return out;
}

const RAD = Math.PI / 180;
const unit = ([lon, lat]: [number, number]) => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)] as const;

/**
 * Interactive 3D globe painted with the real trend of every 5° cell.
 * Turns by itself (unless the visitor prefers reduced motion), turns by dragging,
 * and a click (or Enter on the focused globe) picks the cell under the pointer.
 */
export function Globe({ data, onPick }: { data: AtlasData; onPick?: (cell: GridCell) => void }) {
  const { lang, t } = useI18n();
  const places = usePlaces();
  const land = useLand();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotation = useRef<[number, number]>([-15, -15]);
  const dragging = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const hoverRef = useRef(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const [size, setSize] = useState(420);
  const [hover, setHover] = useState<{ cell: GridCell; x: number; y: number } | null>(null);
  const step = data.meta.grid.stepDeg;
  const extent = useMemo(() => trendExtent(data.grid), [data.grid]);
  const graticule = useMemo(() => geoGraticule10(), []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize(Math.max(240, Math.min(560, Math.floor(entry!.contentRect.width)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const styles = getComputedStyle(canvas);
    const up = styles.getPropertyValue("--trend-up").trim() || "#ae4024";
    const down = styles.getPropertyValue("--trend-down").trim() || "#295e90";
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const projection = geoOrthographic().fitExtent([[6, 6], [size - 6, size - 6]], { type: "Sphere" }).precision(2);
    const path = geoPath(projection, ctx);
    let frame = 0;
    let last = "";
    // Cells grouped by colour and 8 opacity bins: ~16 fills per frame instead of thousands.
    const BINS = 8;
    const cells = data.grid
      .map((c) => ({ c, a: Math.min(1, Math.abs(c.trend) / extent) }))
      .filter(({ a }) => a >= 0.03)
      .map(({ c, a }) => ({ c, up: c.trend >= 0, bin: Math.min(BINS - 1, Math.floor(a * BINS)) }));
    const h = step / 2;
    const prep = (lines: Line[]) => lines.map((pts) => ({ pts, u: pts.map(unit) }));
    const landLines = land.data ? prep(linesOf(land.data)) : [];
    // The graticule as dense lines (every 2°), so the curves stay round without resampling.
    const gratLines = prep(
      linesOf(graticule).map((l) => {
        const dense: Line = [];
        for (let j = 0; j < l.length - 1; j++) {
          const [a, b] = [l[j]!, l[j + 1]!];
          const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / 2));
          for (let k = 0; k < n; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
        }
        dense.push(l[l.length - 1]!);
        return dense;
      }),
    );

    const draw = () => {
      const key = rotation.current.join(",");
      if (key === last) return;
      last = key;
      projection.rotate(rotation.current);
      const centre: [number, number] = [-rotation.current[0], -rotation.current[1]];
      const [cx, cy, cz] = unit(centre);
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath();
      path({ type: "Sphere" });
      ctx.fillStyle = "#f3efe6";
      ctx.fill();
      const paths = Array.from({ length: BINS * 2 }, () => new Path2D());
      for (const { c, up: isUp, bin } of cells) {
        // Only the front of the globe, a little inside the edge (no clipping needed there).
        const u = unit([c.lon, c.lat]);
        if (u[0] * cx + u[1] * cy + u[2] * cz < 0.09) continue;
        const ring: [number, number][] = [
          [c.lon - h, c.lat - h], [c.lon, c.lat - h], [c.lon + h, c.lat - h], [c.lon + h, c.lat],
          [c.lon + h, c.lat + h], [c.lon, c.lat + h], [c.lon - h, c.lat + h], [c.lon - h, c.lat],
        ];
        const p2 = paths[(isUp ? BINS : 0) + bin]!;
        ring.forEach((pt, j) => {
          const xy = projection(pt);
          if (!xy) return;
          if (j === 0) p2.moveTo(xy[0], xy[1]);
          else p2.lineTo(xy[0], xy[1]);
        });
        p2.closePath();
      }
      paths.forEach((p2, k) => {
        const bin = k % BINS;
        ctx.globalAlpha = 0.15 + 0.85 * ((bin + 0.5) / BINS);
        ctx.fillStyle = k >= BINS ? up : down;
        ctx.fill(p2);
      });
      ctx.globalAlpha = 1;
      const stroke = (lines: { pts: Line; u: (readonly [number, number, number])[] }[], colour: string, width: number) => {
        ctx.beginPath();
        for (const { pts, u } of lines) {
          let pen = false;
          for (let j = 0; j < pts.length; j++) {
            const v = u[j]!;
            if (v[0] * cx + v[1] * cy + v[2] * cz <= 0.02) {
              pen = false;
              continue;
            }
            const xy = projection(pts[j]!)!;
            if (pen) ctx.lineTo(xy[0], xy[1]);
            else ctx.moveTo(xy[0], xy[1]);
            pen = true;
          }
        }
        ctx.strokeStyle = colour;
        ctx.lineWidth = width;
        ctx.stroke();
      };
      stroke(gratLines, "rgba(27,31,35,0.08)", 0.6);
      stroke(landLines, "rgba(27,31,35,0.55)", 0.7);
      ctx.beginPath();
      path({ type: "Sphere" });
      ctx.strokeStyle = "#1b1f23";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    const loop = () => {
      if (!reduce && !dragging.current && !hoverRef.current && !document.hidden) {
        rotation.current = [rotation.current[0] + AUTO_SPEED, rotation.current[1]];
      }
      draw();
      frame = requestAnimationFrame(loop);
    };
    loop();

    const toLonLat = (ev: PointerEvent | MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const p = projection.invert?.([ev.clientX - r.left, ev.clientY - r.top]);
      return p && Number.isFinite(p[0]) ? p : null;
    };
    const cellAt = (lon: number, lat: number) => {
      const clat = Math.floor((lat + 90) / step) * step - 90 + step / 2;
      const clon = Math.floor((lon + 180) / step) * step - 180 + step / 2;
      return data.grid.find((c) => c.lat === clat && c.lon === clon) ?? null;
    };
    const down_ = (ev: PointerEvent) => {
      dragging.current = { x: ev.clientX, y: ev.clientY, moved: false };
      canvas.setPointerCapture(ev.pointerId);
    };
    const move = (ev: PointerEvent) => {
      const d = dragging.current;
      if (d) {
        const dx = ev.clientX - d.x;
        const dy = ev.clientY - d.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
        rotation.current = [rotation.current[0] + dx * 0.35, Math.max(-75, Math.min(75, rotation.current[1] - dy * 0.35))];
        d.x = ev.clientX;
        d.y = ev.clientY;
        return;
      }
      const ll = toLonLat(ev);
      const cell = ll ? cellAt(ll[0], ll[1]) : null;
      const r = canvas.getBoundingClientRect();
      setHover(cell ? { cell, x: ev.clientX - r.left, y: ev.clientY - r.top } : null);
    };
    const up_ = (ev: PointerEvent) => {
      const d = dragging.current;
      dragging.current = null;
      if (d && !d.moved && onPickRef.current) {
        const ll = toLonLat(ev);
        const cell = ll ? cellAt(ll[0], ll[1]) : null;
        if (cell) onPickRef.current(cell);
      }
    };
    const enter = () => (hoverRef.current = true);
    const leave = () => {
      hoverRef.current = false;
      setHover(null);
    };
    canvas.addEventListener("pointerdown", down_);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up_);
    canvas.addEventListener("pointerenter", enter);
    canvas.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", down_);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up_);
      canvas.removeEventListener("pointerenter", enter);
      canvas.removeEventListener("pointerleave", leave);
    };
  }, [size, data.grid, extent, graticule, land.data, step]);

  // Keyboard: arrows turn the globe; Enter picks the cell at the centre of the view.
  const onKey = (e: React.KeyboardEvent) => {
    const [l, p] = rotation.current;
    if (e.key === "ArrowLeft") rotation.current = [l + 10, p];
    else if (e.key === "ArrowRight") rotation.current = [l - 10, p];
    else if (e.key === "ArrowUp") rotation.current = [l, Math.max(-75, p - 10)];
    else if (e.key === "ArrowDown") rotation.current = [l, Math.min(75, p + 10)];
    else if (e.key === "Enter" && onPick) {
      const lon = -l;
      const lat = -p;
      const clat = Math.floor((lat + 90) / step) * step - 90 + step / 2;
      const clon = Math.floor(((((lon + 180) % 360) + 360) % 360) / step) * step - 180 + step / 2;
      const cell = data.grid.find((c) => c.lat === clat && c.lon === clon);
      if (cell) onPick(cell);
    } else return;
    e.preventDefault();
  };

  const hoverName = hover && places.data ? placeName(places.data, cellPlace(places.data, hover.cell.lat, hover.cell.lon), lang) : "";
  return (
    <div className="globe" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        role="img"
        tabIndex={0}
        aria-label={t("globo.descricao", { coisa: t(`var.${data.meta.variable.id}`).toLowerCase() })}
        onKeyDown={onKey}
      />
      {hover && (
        <div className="globe-tip" style={{ left: hover.x, top: hover.y }} aria-hidden="true">
          <strong>{hoverName}</strong>
          <span>{withUnit(hover.cell.trend, unitFor(data.meta.variable.unit), lang)} / {t("globo.decada")}</span>
        </div>
      )}
    </div>
  );
}
