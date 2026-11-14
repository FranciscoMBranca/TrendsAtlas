"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Region, TrendMap } from "@/lib/api";
import { SCALE_MAX, colour } from "@/lib/colour";

type Mode = "celula" | "rectangulo";

export default function MapView({
  map,
  onlySignificant,
  mode,
  region,
  onRegion,
}: {
  map: TrendMap | null;
  onlySignificant: boolean;
  mode: Mode;
  region: Region | null;
  onRegion: (r: Region) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const cellsRef = useRef<L.LayerGroup | null>(null);
  const selRef = useRef<L.Layer | null>(null);
  const firstCorner = useRef<L.LatLng | null>(null);
  const modeRef = useRef(mode);
  const onRegionRef = useRef(onRegion);
  const resRef = useRef(5);
  modeRef.current = mode;
  onRegionRef.current = onRegion;

  useEffect(() => {
    if (!el.current || mapRef.current) return;
    const m = L.map(el.current, {
      center: [10, 0],
      zoom: 2,
      minZoom: 1,
      worldCopyJump: false,
      maxBounds: [[-90, -200], [90, 200]],
      preferCanvas: true,
      keyboard: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 8,
    }).addTo(m);
    cellsRef.current = L.layerGroup().addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const res = resRef.current;
      if (modeRef.current === "celula") {
        const s = Math.floor((lat + 90) / res) * res - 90;
        const w = Math.floor((lng + 180) / res) * res - 180;
        onRegionRef.current({ tipo: "rectangulo", oeste: w, sul: s, este: w + res, norte: s + res });
        return;
      }
      if (!firstCorner.current) {
        firstCorner.current = e.latlng;
        return;
      }
      const a = firstCorner.current;
      firstCorner.current = null;
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      const oeste = clamp(Math.min(a.lng, lng), -180, 180);
      const este = clamp(Math.max(a.lng, lng), -180, 180);
      const sul = clamp(Math.min(a.lat, lat), -90, 90);
      const norte = clamp(Math.max(a.lat, lat), -90, 90);
      if (este - oeste < 0.01 || norte - sul < 0.01) return;
      onRegionRef.current({ tipo: "rectangulo", oeste, sul, este, norte });
    });
    mapRef.current = m;
    return () => {
      m.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const group = cellsRef.current;
    if (!group) return;
    group.clearLayers();
    if (!map) return;
    resRef.current = map.resolucao_graus;
    const half = map.resolucao_graus / 2;
    const max = SCALE_MAX[map.variavel] ?? 1;
    map.lats.forEach((lat, i) => {
      map.lons.forEach((lon, j) => {
        const v = map.declive_decada[i][j];
        if (v === null) return;
        const sig = map.significativa[i][j] === 1;
        L.rectangle(
          [
            [lat - half, lon - half],
            [lat + half, lon + half],
          ],
          {
            stroke: false,
            fillColor: colour(v, max),
            fillOpacity: onlySignificant && !sig ? 0.05 : 0.55,
            interactive: false,
          },
        ).addTo(group);
      });
    });
  }, [map, onlySignificant]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    if (selRef.current) {
      m.removeLayer(selRef.current);
      selRef.current = null;
    }
    if (region && region.tipo === "rectangulo") {
      selRef.current = L.rectangle(
        [
          [region.sul, region.oeste],
          [region.norte, region.este],
        ],
        { color: "#111", weight: 2, fill: false, dashArray: "4 3" },
      ).addTo(m);
    }
  }, [region]);

  return <div ref={el} className="map" role="application" aria-label="Mapa de tendências" />;
}
