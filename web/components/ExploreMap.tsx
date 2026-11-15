"use client";

import { Globe2, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Chart from "@/components/Chart";
import { childSentence } from "@/components/Result";
import { MapCanvas } from "@/components/atlas/map/MapCanvas";
import type { PaintCell } from "@/components/atlas/map/CellLayer";
import { API_URL, API_VARIABLE, analyseRegion, type Analysis, type Region as ApiRegion } from "@/lib/api";
import type { AtlasData, GridCell, Region } from "@/lib/atlas/data/schema";
import { useLand } from "@/lib/atlas/data/use-atlas-data";
import { createMapGeometry, viewBoxForBbox, viewBoxForZoom } from "@/lib/atlas/geo/projection";
import { areaWeight, trendColor, trendExtent } from "@/lib/atlas/scale";
import { fmt, fmtP, withUnit } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cellPlace, placeName, searchPlaces, usePlaces, type Places } from "@/lib/places";
import { resultSentence } from "@/lib/sentence";

export type Selection = { kind: "cell"; cell: GridCell } | { kind: "place"; key: string } | { kind: "globe" };

/** What a selection means for the API and for the "full analysis" section. */
export function selectionRegion(sel: Selection, step: number): ApiRegion {
  if (sel.kind === "globe") return { tipo: "globo" };
  if (sel.kind === "place") return { tipo: "lugar", chave: sel.key };
  const h = step / 2;
  return { tipo: "rectangulo", oeste: sel.cell.lon - h, sul: sel.cell.lat - h, este: sel.cell.lon + h, norte: sel.cell.lat + h };
}

/** Area-weighted mean trend and significant-area share of the cells of a place (from the map file). */
export function placeSummary(grid: readonly GridCell[], places: Places, key: string) {
  let w = 0;
  let sum = 0;
  let sig = 0;
  for (const c of grid) {
    if (cellPlace(places, c.lat, c.lon) !== key) continue;
    const a = areaWeight(c.lat);
    w += a;
    sum += a * c.trend;
    if (c.sig) sig += a;
  }
  return w > 0 ? { trend: sum / w, sigShare: sig / w } : null;
}

const bboxOfSelection = (sel: Selection, places: Places | undefined, step: number): [number, number, number, number] | null => {
  if (sel.kind === "cell") return [sel.cell.lon - step / 2, sel.cell.lat - step / 2, sel.cell.lon + step / 2, sel.cell.lat + step / 2];
  if (sel.kind === "place" && places) return places.places[sel.key]?.bbox ?? null;
  return null;
};

/**
 * The interactive map at the centre of the home page: click a cell, or pick a country or
 * ocean by name, and the card shows that place's trend for the chosen audience and language.
 */
export function ExploreMap({
  data,
  onInvestigate,
  pick,
}: {
  data: AtlasData;
  onInvestigate?: (r: ApiRegion, name: string) => void;
  /** A place to open, from the globe or a mission (applied once per `seq`, for its variable). */
  pick?: { varId: string; sel: Selection; seq: number } | null;
}) {
  const { lang, audience, t } = useI18n();
  const places = usePlaces();
  const land = useLand();
  const { grid, meta } = data;
  const step = meta.grid.stepDeg;
  const geometry = useMemo(() => createMapGeometry(), []);
  const extent = useMemo(() => trendExtent(grid), [grid]);
  const [hovered, setHovered] = useState<GridCell | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const child = audience === "crianca";
  const unit = meta.variable.unit;
  const d = meta.variable.decimals;

  // A new variable clears the selection, unless a place was asked for it (globe or mission).
  const applied = useRef(0);
  const prevVar = useRef(meta.variable.id);
  useEffect(() => {
    const id = meta.variable.id;
    if (pick && pick.seq !== applied.current && pick.varId === id) {
      applied.current = pick.seq;
      setSelection(pick.sel);
    } else if (prevVar.current !== id) setSelection(null);
    prevVar.current = id;
  }, [pick, meta.variable.id]);

  const selectedKey = selection?.kind === "place" ? selection.key : null;
  const paint = useCallback<PaintCell>(
    (cell) => ({
      fill: trendColor(cell.trend, extent),
      opacity: selectedKey && places.data && cellPlace(places.data, cell.lat, cell.lon) !== selectedKey ? 0.3 : 1,
      stipple: audience === "cientista" && cell.sig,
    }),
    [extent, selectedKey, places.data, audience],
  );

  const box = selection ? bboxOfSelection(selection, places.data, step) : null;
  const highlight: Region[] = box
    ? [{ id: "sel", name: "", bbox: box } as unknown as Region]
    : [];
  // Zoom to the place with generous context around it (never closer than ~60° across).
  const viewBox = useMemo(
    () => (selection?.kind === "place" && box ? viewBoxForBbox(geometry, padBox(box)) : viewBoxForZoom(geometry, 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geometry, selection, box?.join(",")],
  );

  const hoverName = hovered && places.data ? placeName(places.data, cellPlace(places.data, hovered.lat, hovered.lon), lang) : "";
  const varName = t(`var.${meta.variable.id}`);

  return (
    <section id="explorar" className="explore atlas-width" aria-label={t("mapa.descricao", { coisa: varName.toLowerCase() })}>
      <div className="explore-tools">
        <PlaceSearch places={places.data} onPick={(key) => setSelection({ kind: "place", key })} />
        <button type="button" className="explore-chip" onClick={() => setSelection({ kind: "globe" })} aria-pressed={selection?.kind === "globe"}>
          <Globe2 aria-hidden="true" /> {t("mapa.mundo")}
        </button>
        <p className="explore-hover technical" aria-live="polite">
          {hovered
            ? t("mapa.aqui", { lugar: hoverName, valor: withUnit(hovered.trend, unitFor(unit), lang) })
            : t(child ? "mapa.dica_crianca" : "mapa.dica")}
        </p>
      </div>

      <div className={`explore-body ${selection ? "has-card" : ""}`}>
        <div className="explore-map">
          <MapCanvas
            grid={grid}
            regions={highlight}
            geometry={geometry}
            stepDeg={step}
            paint={paint}
            land={land.data}
            viewBox={viewBox}
            hovered={hovered}
            selectedId={highlight.length ? "sel" : null}
            onHover={setHovered}
            onSelectCell={(cell) => setSelection({ kind: "cell", cell })}
            label={t("mapa.descricao", { coisa: varName.toLowerCase() })}
          />
          <div className="explore-legend" aria-hidden="true">
            <span>−{fmt(extent, lang, 2)}</span>
            <i />
            <span>+{fmt(extent, lang, 2)} {meta.variable.unit}</span>
            <span className="technical">
              {t("mapa.legenda_periodo", { inicio: meta.period.start.slice(0, 4), fim: meta.period.end.slice(0, 4) })}
            </span>
          </div>
        </div>
        {selection && places.data && (
          <PlaceCard
            key={JSON.stringify(selection.kind === "cell" ? [selection.cell.lat, selection.cell.lon] : selection)}
            data={data}
            places={places.data}
            selection={selection}
            onClose={() => setSelection(null)}
            onInvestigate={onInvestigate}
          />
        )}
      </div>
    </section>
  );
}

function padBox([w, s, e, n]: [number, number, number, number]): [number, number, number, number] {
  const cx = (w + e) / 2;
  const cy = (s + n) / 2;
  const half = Math.max((e - w) * 1.2, (n - s) * 1.6, 60) / 2;
  const clampLon = (v: number) => Math.max(-180, Math.min(180, v));
  const clampLat = (v: number) => Math.max(-85, Math.min(85, v));
  return [clampLon(cx - half), clampLat(cy - half / 1.6), clampLon(cx + half), clampLat(cy + half / 1.6)];
}

/** Units as written in the atlas files ("°C", "mm/dia") mapped to the API units used by the formatter. */
function unitFor(atlasUnit: string): string {
  return { "°C": "degC", "mm/dia": "mm/day" }[atlasUnit] ?? atlasUnit;
}

function PlaceSearch({ places, onPick }: { places: Places | undefined; onPick: (key: string) => void }) {
  const { lang, audience, t } = useI18n();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const hits = useMemo(() => (places ? searchPlaces(places, q, lang) : []), [places, q, lang]);
  const listId = "place-search-list";
  const inputRef = useRef<HTMLInputElement>(null);
  const pick = (key: string) => {
    onPick(key);
    setQ(places ? placeName(places, key, lang) : "");
    setOpen(false);
  };
  return (
    <div className="place-search">
      <Search aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={t(audience === "crianca" ? "mapa.procurar_crianca" : "mapa.procurar")}
        placeholder={t(audience === "crianca" ? "mapa.procurar_crianca" : "mapa.procurar")}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((i) => Math.min(i + 1, hits.length - 1));
          else if (e.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
          else if (e.key === "Enter" && hits[active]) {
            e.preventDefault();
            pick(hits[active].key);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && q.length >= 2 && (
        <ul id={listId} role="listbox" className="place-search-list">
          {hits.length === 0 && <li className="technical">{t("mapa.sem_resultados")}</li>}
          {hits.map((h, i) => (
            <li
              key={h.key}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(h.key);
              }}
            >
              {h.name}
              <span className="technical">{h.kind === "ocean" ? "≈" : h.key.toUpperCase()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlaceCard({
  data,
  places,
  selection,
  onClose,
  onInvestigate,
}: {
  data: AtlasData;
  places: Places;
  selection: Selection;
  onClose: () => void;
  onInvestigate?: (r: ApiRegion, name: string) => void;
}) {
  const { lang, audience, t } = useI18n();
  const { meta, grid } = data;
  const child = audience === "crianca";
  const scientist = audience === "cientista";
  const unit = unitFor(meta.variable.unit);
  const apiVar = API_VARIABLE[meta.variable.id];
  const region = selectionRegion(selection, meta.grid.stepDeg);
  const [result, setResult] = useState<Analysis | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "fail">(apiVar && API_URL ? "loading" : "idle");

  const title =
    selection.kind === "globe"
      ? t("mapa.mundo")
      : selection.kind === "place"
        ? placeName(places, selection.key, lang)
        : t("card.titulo_celula", {
            lugar: placeName(places, cellPlace(places, selection.cell.lat, selection.cell.lon), lang),
            res: meta.grid.stepDeg,
          });

  const fromMap =
    selection.kind === "cell"
      ? { trend: selection.cell.trend, sig: selection.cell.sig }
      : selection.kind === "place"
        ? (() => {
            const s = placeSummary(grid, places, selection.key);
            return s ? { trend: s.trend, sig: s.sigShare >= 0.5 } : null;
          })()
        : { trend: meta.highlights.globalTrend.trend, sig: meta.highlights.globalTrend.p < 0.05 };

  useEffect(() => {
    if (!apiVar || !API_URL) return;
    let alive = true;
    analyseRegion({ variavel: apiVar, regiao: region }).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setResult(r.data);
        setState("done");
      } else setState("fail");
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dir = result ? (result.frase.chave.split(".").at(-1) ?? "estavel") : fromMap && fromMap.trend > 0 ? "sobe" : "desce";

  return (
    <aside className={`place-card place-card-${audience}`} aria-live="polite" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <button type="button" onClick={onClose} aria-label={t("card.fechar")}>
          <X />
        </button>
      </header>
      {meta.isDemo && <p className="place-card-demo">{t("card.demo")}</p>}

      {result ? (
        <>
          {child ? (
            <p className="place-card-sentence child">
              <span className={`child-arrow arrow-${dir}`} aria-hidden="true">
                {{ sobe: "↑", desce: "↓", estavel: "→" }[dir]}
              </span>{" "}
              {childSentence(result, lang)}
            </p>
          ) : (
            <p className="place-card-sentence">{resultSentence(result, lang)}</p>
          )}
          <div className={`seal seal-${result.selo}`}>
            <strong>{child ? t(`crianca.selo.${result.selo}`) : t(`selo.${result.selo}`)}</strong>
            {!child && <p className="rule">{t("regra.valor_p")}</p>}
          </div>
          {!child && (
            <Chart a={result} title={t("res.grafico")} showBand showProjection={scientist} projectionLabel={t("projeccao.titulo")} />
          )}
          {scientist && (
            <table className="stats compact">
              <tbody>
                <tr><th scope="row">{t("tab.sen")}</th><td>{withUnit(result.estatisticas.sen_declive_decada, result.unidade, lang)}</td></tr>
                <tr><th scope="row">{t("tab.sen_ic")}</th><td>{fmt(result.estatisticas.sen_ic_inferior_decada, lang)} … {fmt(result.estatisticas.sen_ic_superior_decada, lang)}</td></tr>
                <tr><th scope="row">{t("tab.p_mk")}</th><td>{fmtP(result.estatisticas.p_mann_kendall, lang)}</td></tr>
                <tr><th scope="row">{t("tab.p_t")}</th><td>{fmtP(result.estatisticas.p_teste_t, lang)}</td></tr>
                <tr><th scope="row">{t("tab.celulas")}</th><td>{result.regiao.n_celulas}</td></tr>
              </tbody>
            </table>
          )}
        </>
      ) : (
        fromMap && (
          <>
            <p className="place-card-sentence">
              {child && (
                <span className={`child-arrow arrow-${dir}`} aria-hidden="true">
                  {dir === "sobe" ? "↑" : "↓"}{" "}
                </span>
              )}
              {t("card.do_mapa", { valor: withUnit(fromMap.trend, unit, lang) })}
            </p>
            <p className="technical">{t(fromMap.sig ? "card.sig_mapa" : "card.nsig_mapa")}</p>
            {state === "loading" && <p className="technical">{t("card.a_calcular")}</p>}
            {state === "fail" && <p className="technical">{t("card.sem_api")}</p>}
          </>
        )
      )}

      {!child && onInvestigate && apiVar && (
        <button type="button" className="investigate-run secondary" onClick={() => onInvestigate(region, title)}>
          {t("card.ver_detalhe")}
        </button>
      )}
    </aside>
  );
}
