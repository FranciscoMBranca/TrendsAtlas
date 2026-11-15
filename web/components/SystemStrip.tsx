"use client";

import { useQueries } from "@tanstack/react-query";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Thermometer } from "lucide-react";

import { placeSummary, type Selection } from "@/components/ExploreMap";
import { ICONS, unitFor } from "@/components/HomeParts";
import { loadGrid } from "@/lib/atlas/data/load";
import type { GridCell, Manifest, ManifestEntry } from "@/lib/atlas/data/schema";
import { number } from "@/lib/atlas/format";
import { withUnit } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cellPlace, placeName, type Places } from "@/lib/places";

interface Signal {
  trend: number;
  sig: boolean;
  /** Share of the place's area with a significant trend (places only). */
  sigShare?: number;
}

/** The same summary rules as the place card: cell value, area-weighted place mean, or global trend. */
export function signalFor(entry: ManifestEntry, grid: readonly GridCell[] | undefined, sel: Selection, places: Places): Signal | null {
  if (sel.kind === "globe") return { trend: entry.globalTrend, sig: entry.globalP < 0.05 };
  if (!grid) return null;
  if (sel.kind === "cell") {
    const c = grid.find((g) => g.lat === sel.cell.lat && g.lon === sel.cell.lon);
    return c ? { trend: c.trend, sig: c.sig } : null;
  }
  const s = placeSummary(grid, places, sel.key);
  return s ? { trend: s.trend, sig: s.sigShare >= 0.5, sigShare: s.sigShare } : null;
}

/**
 * One place, six signals of the Earth system side by side: direction, how much, and whether it
 * stands out from chance. Never causes. A click switches the map to that variable, same place.
 */
export function SystemStrip({
  manifest,
  places,
  selection,
  currentId,
  onSwitch,
}: {
  manifest: Manifest;
  places: Places;
  selection: Selection;
  currentId: string;
  onSwitch?: (varId: string, sel: Selection) => void;
}) {
  const { lang, audience, t } = useI18n();
  const child = audience === "crianca";
  const grids = useQueries({
    queries: manifest.variables.map((v) => ({
      queryKey: ["atlas-grid", v.id],
      queryFn: () => loadGrid(v.id),
      staleTime: Infinity,
      retry: false,
      enabled: selection.kind !== "globe",
    })),
  });
  const where =
    selection.kind === "globe"
      ? t("mapa.mundo")
      : placeName(places, selection.kind === "place" ? selection.key : cellPlace(places, selection.cell.lat, selection.cell.lon), lang);

  return (
    <section className="system-strip" aria-labelledby="sistema-titulo">
      <h3 id="sistema-titulo">{t(child ? "sistema.titulo_crianca" : "sistema.titulo", { lugar: where, n: manifest.variables.length })}</h3>
      <p className="system-note">{t("sistema.nota")}</p>
      <ul>
        {manifest.variables.map((v, i) => {
          const q = grids[i]!;
          const loading = selection.kind !== "globe" && q.isPending;
          const s = loading ? null : signalFor(v, q.data, selection, places);
          const Icon = ICONS[v.id] ?? Thermometer;
          const Arrow = !s || s.trend === 0 ? ArrowRight : s.trend > 0 ? ArrowUpRight : ArrowDownRight;
          const name = t(`var.${v.id}`);
          return (
            <li key={v.id}>
              <button
                type="button"
                className="system-row"
                data-var={v.id}
                aria-current={v.id === currentId ? "true" : undefined}
                disabled={!onSwitch || v.id === currentId}
                onClick={() => onSwitch?.(v.id, selection)}
              >
                <span className="var-card-icon" aria-hidden="true"><Icon /></span>
                <span className="system-name">
                  {name}
                  {v.isDemo && <small className="system-demo">{t("rotulo.demonstracao")}</small>}
                </span>
                {loading ? (
                  <span className="system-value technical">…</span>
                ) : s ? (
                  <>
                    <span className={`system-dir ${s.trend > 0 ? "is-up" : s.trend < 0 ? "is-down" : ""}`}>
                      <Arrow aria-hidden="true" />
                      {t(s.trend > 0 ? "sistema.sobe" : s.trend < 0 ? "sistema.desce" : "sistema.igual")}
                    </span>
                    {!child && (
                      <span className="system-value">
                        {withUnit(s.trend, unitFor(v.unit), lang)} <small>{t("vars.por_decada")}</small>
                      </span>
                    )}
                    <span className={`system-seal ${s.sig ? "is-sig" : ""}`}>
                      {child
                        ? t(s.sig ? "sistema.sig_crianca" : "sistema.nao_sig_crianca")
                        : s.sigShare !== undefined
                          ? t("sistema.area_sig", { pct: number(s.sigShare * 100, 0) })
                          : t(s.sig ? "sistema.sig" : "sistema.nao_sig")}
                    </span>
                  </>
                ) : (
                  <span className="system-value muted">{t("sistema.sem_dados")}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
