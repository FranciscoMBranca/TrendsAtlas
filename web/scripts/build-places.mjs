// Names every 5° cell (country or ocean) and builds a searchable list of places in
// pt, en, es, fr and zh. Run once when the grid or the borders change:
//   node scripts/build-places.mjs
// Writes web/public/data/places.json (site) and pipeline/terratempo/places.json (API / assistant).
// Country names: i18n-iso-countries (ISO 3166). Borders: public/data/world_50m.json.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { geoBounds, geoCentroid, geoContains } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const countries = require("i18n-iso-countries");
const LANGS = ["pt", "en", "es", "fr", "zh"];
for (const l of LANGS) countries.registerLocale(require(`i18n-iso-countries/langs/${l}.json`));

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const topo = JSON.parse(fs.readFileSync(path.join(root, "public/data/world_50m.json"), "utf8"));
const features = feature(topo, topo.objects.countries).features;

// Oceans and seas: names written here, by hand, in the five languages.
const OCEANS = {
  "oceano-artico": { pt: "Oceano Árctico", en: "Arctic Ocean", es: "Océano Ártico", fr: "Océan Arctique", zh: "北冰洋" },
  "oceano-austral": { pt: "Oceano Antárctico", en: "Southern Ocean", es: "Océano Antártico", fr: "Océan Austral", zh: "南冰洋" },
  "atlantico-norte": { pt: "Atlântico Norte", en: "North Atlantic", es: "Atlántico Norte", fr: "Atlantique Nord", zh: "北大西洋" },
  "atlantico-sul": { pt: "Atlântico Sul", en: "South Atlantic", es: "Atlántico Sur", fr: "Atlantique Sud", zh: "南大西洋" },
  "pacifico-norte": { pt: "Pacífico Norte", en: "North Pacific", es: "Pacífico Norte", fr: "Pacifique Nord", zh: "北太平洋" },
  "pacifico-sul": { pt: "Pacífico Sul", en: "South Pacific", es: "Pacífico Sur", fr: "Pacifique Sud", zh: "南太平洋" },
  "indico": { pt: "Oceano Índico", en: "Indian Ocean", es: "Océano Índico", fr: "Océan Indien", zh: "印度洋" },
  "mediterraneo": { pt: "Mar Mediterrâneo", en: "Mediterranean Sea", es: "Mar Mediterráneo", fr: "Mer Méditerranée", zh: "地中海" },
};
const OCEAN_BBOX = {
  "oceano-artico": [-180, 66, 180, 90],
  "oceano-austral": [-180, -90, 180, -60],
  "atlantico-norte": [-100, 0, 20, 66],
  "atlantico-sul": [-70, -60, 20, 0],
  "pacifico-norte": [-180, 0, -100, 66],
  "pacifico-sul": [-180, -60, -70, 0],
  "indico": [20, -60, 147, 30],
  "mediterraneo": [-6, 30, 36, 46],
};

/** Ocean for a point outside every country (rules by latitude and longitude). */
function oceanAt(lon, lat) {
  if (lat >= 66) return "oceano-artico";
  if (lat <= -60) return "oceano-austral";
  if (lat > 30 && lat < 46 && lon > -6 && lon < 36) return "mediterraneo";
  if (lon >= 20 && lon < 147 && lat < 30) return "indico";
  if (lat >= 0) return lon >= -100 && lon < 20 ? "atlantico-norte" : "pacifico-norte";
  return lon >= -70 && lon < 20 ? "atlantico-sul" : "pacifico-sul";
}

function countryNames(a3, fallback) {
  const a2 = countries.alpha3ToAlpha2(a3);
  const names = {};
  for (const l of LANGS) {
    const alias = a2 ? countries.getName(a2, l, { select: "alias" }) : undefined;
    names[l] = alias || (a2 ? countries.getName(a2, l) : undefined) || fallback;
  }
  return names;
}

const places = {};
for (const f of features) {
  const a3 = f.properties.a3;
  if (!a3 || a3 === "-99") continue;
  const key = a3.toLowerCase();
  const [[w, s], [e, n]] = geoBounds(f);
  const bbox = w <= e ? [w, s, e, n] : [-180, s, 180, n]; // crosses the antimeridian
  const [clon, clat] = geoCentroid(f);
  places[key] = { kind: "country", names: countryNames(a3, f.properties.name), bbox: bbox.map((v) => +v.toFixed(2)), centroid: [+clon.toFixed(2), +clat.toFixed(2)] };
}
for (const [key, names] of Object.entries(OCEANS)) {
  const b = OCEAN_BBOX[key];
  places[key] = { kind: "ocean", names, bbox: b, centroid: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] };
}

const STEP = 5;
const cells = {};
for (let lat = -90 + STEP / 2; lat < 90; lat += STEP) {
  for (let lon = -180 + STEP / 2; lon < 180; lon += STEP) {
    const hit = features.find((f) => f.properties.a3 && f.properties.a3 !== "-99" && geoContains(f, [lon, lat]));
    cells[`${lat},${lon}`] = hit ? hit.properties.a3.toLowerCase() : oceanAt(lon, lat);
  }
}

const out = { schemaVersion: 1, stepDeg: STEP, languages: LANGS, source: "Natural Earth 1:50m (world-atlas) + ISO 3166 (i18n-iso-countries)", cells, places };
const json = JSON.stringify(out);
fs.writeFileSync(path.join(root, "public/data/places.json"), json);
fs.writeFileSync(path.join(root, "../pipeline/terratempo/places.json"), json);
const named = Object.values(cells).filter((k) => places[k]?.kind === "country").length;
console.log(`places: ${Object.keys(places).length} lugares; células: ${Object.keys(cells).length} (${named} em países)`);
